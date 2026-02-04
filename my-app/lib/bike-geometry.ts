import type { BikeData, AlignmentMode } from '@/types/bike'

// ════════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ════════════════════════════════════════════════════════════════════════════

/** 2D-Punkt in SVG-Koordinaten (X rechts, Y nach unten). */
export type Point2D = { x: number; y: number }

/** Verbindung zwischen zwei Punkten (für Linien im SVG). */
export type Segment = { from: string; to: string }

/** Ergebnis der Rahmen-/Cockpit-Berechnung: alle Punkte + Linien-Segmente. */
export type BikeGeometryResult = {
  points: Record<string, Point2D>
  segments: Segment[]
  riderSegments?: Segment[] // Optional: Fahrer-Segmente (separate Farbe)
  kneeAngle?: number // Optional: Kniewinkel in Grad (aktueller Pedalwinkel)
  kneeAngleAt90?: number // Kniewinkel bei Pedalwinkel 90°
  kneeAngleAt270?: number // Kniewinkel bei Pedalwinkel 270°
  saddleHandlebarDrop?: number // Überhöhung: Y-Abstand Sattel zu Lenker in mm
  kneeTopedalXAt0?: number // X-Abstand Knie zu Pedal bei 0° Pedalstellung in mm
  shoulderAngle?: number // Schulterwinkel: Hüftgelenk→Schulter→Ellbogen in Grad
  elbowAngle?: number // Ellbogenwinkel: Schulter→Ellbogen→Hand in Grad
}

/** Punkt-IDs, die als Räder gezeichnet werden (Kreise). */
export const WHEEL_POINT_IDS = ['frontWheel', 'rearWheel'] as const

/** Punkt-IDs für hervorgehobene Key-Points (kleine Kreise). */
export const KEY_POINT_IDS = [
  'bb',
  'headTubeTop',
  'stemFront',
  'handlebarCenter',
  'seatTubeTop',
  'headTubeBottom',
  'spacerUp',
  'frontWheel',
  'rearWheel',
  'seatPostTop',
  'saddleTop',
  'hipJoint',
  'pedalRight',
  'pedalLeft',
  'knee',
  'kneeNew',
  'footContact',
  'cleatTop',
  'cleatBottom',
  'hip',
  'shoulder',
  'neckTop',
  'headCenter',
  'elbow',
] as const

// Skalierungsfaktor: mm → SVG-Einheiten
export const SCALE = 0.8

// Default-Werte für fehlende Geometriedaten
const DEFAULT_FRONT_CENTER = 600
const DEFAULT_CHAINSTAY_LENGTH = 410
const DEFAULT_HEADTUBE_LENGTH = 0

// Cockpit-Konstanten
const HEADSET_BEARING_DIAMETER = 31.8 // mm
const HANDLEBAR_ARC_STEPS = 12

// Sattel & Sattelstütze
const SEATPOST_LENGTH = 240 // mm
const SADDLE_LENGTH = 255 // mm
const SADDLE_SETBACK = 40 // mm

// Pedale
const PEDAL_WIDTH = 50 // mm (Gesamt-Breite der Pedal-Anzeige)

// ──────────────────────────────────────────────────────────────────────────
// FAHRER-ANATOMIE
// ──────────────────────────────────────────────────────────────────────────
// HINWEIS: Körpergröße, Innenbeinlänge, Oberkörperwinkel und Schuhdicke
// kommen aus bike.rider und werden in der Berechnung verwendet.

// Beinlängen-Verhältnisse (prozentual zur Innenbeinlänge)
const UPPER_LEG_RATIO = 0.56 // Oberschenkel: 56% der Innenbeinlänge
const LOWER_LEG_RATIO = 0.44 // Unterschenkel: 44% der Innenbeinlänge

// Oberkörper-Proportionen (prozentual zur Körpergröße)
const HEAD_RATIO = 0.12      // Kopfhöhe: 12%
const NECK_RATIO = 0.055     // Halslänge: 5.5%
const HEAD_WIDTH_RATIO = 0.7 // Kopfbreite: 70% der Kopfhöhe

// Arm-Proportionen (prozentual zur Körpergröße)
const UPPER_ARM_RATIO = 0.186 // Oberarm: 18.6%
const LOWER_ARM_RATIO = 0.146 // Unterarm: 14.6%

// Schuh & Cleat (Kontaktpunkt Fuß-Pedal)
const CLEAT_SETBACK = 130        // mm - Abstand Pedalachse → Fußballen (nach hinten)
const FOOT_ANGLE_DEFAULT = 10    // Grad - Standard-Fußwinkel (leicht nach unten)
const SHOE_EXT_AFT = 20          // mm - Schuh-Verlängerung hinter Cleat (aktuell ungenutzt)

// ════════════════════════════════════════════════════════════════════════════
// Warnschwellen für biomechanische Messungen
// ════════════════════════════════════════════════════════════════════════════

// Re-exportiere Schwellenwerte aus zentraler Definition
export {
  KNEE_90_MIN,
  KNEE_90_MAX,
  KNEE_90_MIN_WARNING,
  KNEE_90_MAX_WARNING,
  KNEE_270_MIN,
  KNEE_270_MIN_WARNING,
} from './warning-thresholds'

// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

/** Konvertiert Grad in Bogenmaß (Radiant). */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** 
 * Berechnet horizontale Distanz aus Hypotenuse und vertikalem Offset.
 * Verwendet den Satz des Pythagoras: x = sqrt(hypotenuse² - y²)
 */
function calculateHorizontalDistance(hypotenuse: number, verticalOffset: number): number {
  return Math.sqrt(Math.max(0, hypotenuse * hypotenuse - verticalOffset * verticalOffset))
}

/**
 * Berechnet den Kniewinkel für einen spezifischen Pedalwinkel.
 * 
 * Verwendet inverse Kinematik (IK) um die Position von Knie und Hüfte zu berechnen,
 * basierend auf den anatomischen Beinlängen (Innenbeinlänge + Hüftgelenk-Offset).
 * 
 * @param pedalAngleDeg - Pedalwinkel in Grad (0° = vorne, 90° = unten, 180° = hinten, 270° = oben)
 * @param crankLength - Kurbellänge in mm
 * @param seatPos - Position des Sattels (Sattel-Mittelpunkt)
 * @param bbPos - Position des Tretlagers (Bottom Bracket)
 * @param riderInseam - Innenbeinlänge des Fahrers in mm
 * @param cleatDrop - Schuhdicke in mm (Pedalachse → Fußsohle)
 * @param hipJointOffsetScaled - Offset vom Sattel zum Hüftgelenk in SVG-Einheiten (bereits skaliert)
 * @param torsoAngleRad - Oberkörperwinkel in Radiant (relativ zur Horizontalen)
 * @returns Kniewinkel in Grad (Innenwinkel zwischen Unter- und Oberschenkel)
 */
function calculateKneeAngleAtPedalAngle(
  pedalAngleDeg: number,
  crankLength: number,
  seatPos: Point2D,
  bbPos: Point2D,
  riderInseam: number,
  cleatDrop: number,
  hipJointOffsetScaled: number,
  torsoAngleRad: number
): number {
  const pedalAngleRad = toRadians(pedalAngleDeg)
  const crankScaled = crankLength * SCALE
  
  // Pedalposition
  const pedalPos: Point2D = {
    x: bbPos.x + Math.cos(pedalAngleRad) * crankScaled,
    y: bbPos.y + Math.sin(pedalAngleRad) * crankScaled,
  }
  
  // Fußposition (vereinfacht, ohne dynamischen Fußwinkel)
  const cleatSetback = CLEAT_SETBACK * SCALE
  const cleatDropScaled = cleatDrop * SCALE
  const baseDynamicFootAngle = FOOT_ANGLE_DEFAULT * (1 + Math.sin(pedalAngleRad)) / 2
  const footAngleRad = toRadians(baseDynamicFootAngle)
  
  const cleatBottomPos: Point2D = {
    x: pedalPos.x,
    y: pedalPos.y - cleatDropScaled,
  }
  
  const footPos: Point2D = {
    x: cleatBottomPos.x - cleatSetback * Math.cos(footAngleRad),
    y: cleatBottomPos.y - cleatSetback * Math.sin(footAngleRad),
  }
  
  // Hüftgelenk-Position berechnen
  const hipJointPos: Point2D = {
    x: seatPos.x + hipJointOffsetScaled * Math.cos(torsoAngleRad),
    y: seatPos.y - hipJointOffsetScaled * Math.sin(torsoAngleRad),
  }
  
  // Beinlängen (anatomisch korrekt: Inseam + Offset zum Hüftgelenk)
  const anatomicalInseam = riderInseam + hipJointOffsetScaled / SCALE
  const lowerLegLength = anatomicalInseam * LOWER_LEG_RATIO * SCALE
  const upperLegLength = anatomicalInseam * UPPER_LEG_RATIO * SCALE
  const totalLegLength = lowerLegLength + upperLegLength
  
  // Knie-Position berechnen (von hipJoint zu footPos)
  const dx = hipJointPos.x - footPos.x
  const dy = hipJointPos.y - footPos.y
  const distFootToHip = Math.sqrt(dx * dx + dy * dy)
  
  let kneePos: Point2D
  
  if (distFootToHip > totalLegLength) {
    const ratio = lowerLegLength / totalLegLength
    kneePos = {
      x: footPos.x + dx * ratio,
      y: footPos.y + dy * ratio,
    }
  } else if (distFootToHip < Math.abs(lowerLegLength - upperLegLength)) {
    kneePos = {
      x: (footPos.x + hipJointPos.x) / 2,
      y: (footPos.y + hipJointPos.y) / 2,
    }
  } else {
    const a = distFootToHip
    const b = lowerLegLength
    const c = upperLegLength
    const cosAlpha = (a * a + b * b - c * c) / (2 * a * b)
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)))
    const baseAngle = Math.atan2(dy, dx)
    kneePos = {
      x: footPos.x + b * Math.cos(baseAngle + alpha),
      y: footPos.y + b * Math.sin(baseAngle + alpha),
    }
  }
  
  // Kniewinkel berechnen
  const kneeToFoot = {
    x: footPos.x - kneePos.x,
    y: footPos.y - kneePos.y,
  }
  const kneeToHip = {
    x: hipJointPos.x - kneePos.x,
    y: hipJointPos.y - kneePos.y,
  }
  const angleToFoot = Math.atan2(kneeToFoot.y, kneeToFoot.x)
  const angleToHip = Math.atan2(kneeToHip.y, kneeToHip.x)
  let kneeAngle = Math.abs((angleToHip - angleToFoot) * 180 / Math.PI)
  if (kneeAngle > 180) kneeAngle = 360 - kneeAngle
  
  return kneeAngle
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION FUNCTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Berechnet alle geometrischen Punkte und Verbindungslinien für ein Fahrrad.
 * 
 * Koordinatensystem:
 * - Ursprung (0,0) = Tretlager (Bottom Bracket)
 * - X-Achse: rechts = vorn (positiv)
 * - Y-Achse: unten (positiv, SVG-Standard)
 * 
 * @param bike - Fahrrad-Daten (Geometrie + Cockpit-Setup)
 * @param alignmentMode - Ausrichtungsmodus (aktuell nicht verwendet)
 * @returns Objekt mit allen berechneten Punkten und Segmenten
 */
export function calculateBikeGeometry(
  bike: BikeData,
  alignmentMode: AlignmentMode
): BikeGeometryResult {
  const { geometry, cockpit, rider } = bike
  const {
    stack,
    reach,
    headTubeAngle,
    seatTubeAngle,
    bbDrop,
    chainstayLength = DEFAULT_CHAINSTAY_LENGTH,
    frontCenter = DEFAULT_FRONT_CENTER,
  } = geometry

  // ──────────────────────────────────────────────────────────────────────────
  // FAHRER-PARAMETER (aus bike.rider)
  // ──────────────────────────────────────────────────────────────────────────
  const RIDER_HEIGHT = rider.riderHeight    // mm - Körpergröße
  const RIDER_INSEAM = rider.riderInseam    // mm - Innenbeinlänge (Schritt bis Boden)
  const TORSO_ANGLE = rider.torsoAngle      // Grad - Oberkörperneigung
  const CLEAT_DROP = rider.shoeThickness    // mm - Schuhdicke (Pedalachse → Fußsohle)

  const points: Record<string, Point2D> = {}
  const segments: Segment[] = []

  // ──────────────────────────────────────────────────────────────────────────
  // 1. RAHMEN-BASIS-PUNKTE
  // ──────────────────────────────────────────────────────────────────────────

  // Tretlager = Koordinaten-Ursprung
  points.bb = { x: 0, y: 0 }

  // Oberkante Steuerrohr (aus Stack/Reach definiert)
  points.headTubeTop = {
    x: reach * SCALE,
    y: -stack * SCALE,
  }

  // Unterkante Steuerrohr (entlang Lenkkopfwinkel)
  const headTubeAngleRad = toRadians(headTubeAngle)
  const headTubeLen = (geometry.headTubeLength ?? DEFAULT_HEADTUBE_LENGTH) * SCALE
  points.headTubeBottom = {
    x: points.headTubeTop.x + Math.cos(headTubeAngleRad) * headTubeLen,
    y: points.headTubeTop.y + Math.sin(headTubeAngleRad) * headTubeLen,
  }

  // Oberkante Sattelrohr (entlang Sitzrohrwinkel)
  const seatTubeAngleRad = toRadians(seatTubeAngle)
  const seatTubeLength = geometry.seatTubeLength * SCALE
  points.seatTubeTop = {
    x: -Math.cos(seatTubeAngleRad) * seatTubeLength,
    y: -Math.sin(seatTubeAngleRad) * seatTubeLength,
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. LAUFRÄDER
  // ──────────────────────────────────────────────────────────────────────────

  // Gemeinsame Y-Position beider Räder (BB-Drop bestimmt die Höhe)
  const wheelY = -bbDrop * SCALE

  // Vorderrad (aus Front Center berechnet)
  const frontCenterScaled = frontCenter * SCALE
  const frontWheelX = calculateHorizontalDistance(frontCenterScaled, wheelY)
  points.frontWheel = {
    x: Math.abs(frontWheelX),
    y: wheelY,
  }

  // Hinterrad (aus Kettenstreben-Länge berechnet)
  const chainstayScaled = chainstayLength * SCALE
  const rearWheelX = calculateHorizontalDistance(chainstayScaled, wheelY)
  points.rearWheel = {
    x: -Math.abs(rearWheelX),
    y: wheelY,
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. COCKPIT (Spacer, Vorbau, Lenker)
  // ──────────────────────────────────────────────────────────────────────────

  // Oberkante Spacer-Stack (oberhalb Steuerrohr)
  const spacerStackHeight = (
    cockpit.spacerHeight +
    cockpit.headsetCap +
    HEADSET_BEARING_DIAMETER / 2
  ) * SCALE
  
  const spacerOffsetX = spacerStackHeight * Math.cos(headTubeAngleRad)
  const spacerOffsetY = spacerStackHeight * Math.sin(headTubeAngleRad)
  
  points.spacerUp = {
    x: points.headTubeTop.x - spacerOffsetX,
    y: points.headTubeTop.y - spacerOffsetY,
  }

  // Vorbau-Ende (Stem Front)
  const stemAngleRad = toRadians(cockpit.stemAngle)
  const stemAngleTotal = headTubeAngleRad - stemAngleRad
  const stemLengthScaled = cockpit.stemLength * SCALE
  
  const stemOffsetX = Math.sin(stemAngleTotal) * stemLengthScaled
  const stemOffsetY = -Math.cos(stemAngleTotal) * stemLengthScaled
  
  points.stemFront = {
    x: points.spacerUp.x + stemOffsetX,
    y: points.spacerUp.y + stemOffsetY,
  }

  // Lenkermitte (Handlebar Center)
  points.handlebarCenter = {
    x: points.stemFront.x + cockpit.handlebarReach * SCALE,
    y: points.stemFront.y,
  }

  // Lenker-Drop als Halbkreis-Bogen
  createHandlebarArc(points, segments, cockpit.handlebarDrop)
  
  // Endpunkt des Lenkerbogens (für Drops-Griffposition)
  const dropEndId = `handlebarArc${HANDLEBAR_ARC_STEPS}`
  if (points[dropEndId]) {
    points.handlebarDropEnd = points[dropEndId]
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SATTEL & SATTELSTÜTZE
  // ──────────────────────────────────────────────────────────────────────────

  const seatPostLength = cockpit.seatPostLength * SCALE
  points.seatPostTop = {
    x: points.seatTubeTop.x - Math.cos(seatTubeAngleRad) * seatPostLength,
    y: points.seatTubeTop.y - Math.sin(seatTubeAngleRad) * seatPostLength,
  }

  const saddleSetback = SADDLE_SETBACK * SCALE
  const saddleLength = SADDLE_LENGTH * SCALE
  
  points.saddleLenFwd = {
    x: points.seatPostTop.x + saddleLength / 2 - saddleSetback,
    y: points.seatPostTop.y,
  }
  
  points.saddleLenAft = {
    x: points.saddleLenFwd.x - saddleLength,
    y: points.saddleLenFwd.y,
  }

  // Sattel-Mittelpunkt unter Berücksichtigung des Setbacks
  points.saddleTop = {
    x: points.seatPostTop.x - saddleSetback,
    y: points.seatPostTop.y,
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. KURBEL & PEDALE
  // ──────────────────────────────────────────────────────────────────────────

  const crankLength = cockpit.crankLength * SCALE
  const pedalAngleRad = toRadians(cockpit.pedalAngle)

  // Rechte und linke Kurbel (180° versetzt)
  points.pedalRight = {
    x: points.bb.x + Math.cos(pedalAngleRad) * crankLength,
    y: points.bb.y + Math.sin(pedalAngleRad) * crankLength,
  }
  
  points.pedalLeft = {
    x: points.bb.x + Math.cos(pedalAngleRad + Math.PI) * crankLength,
    y: points.bb.y + Math.sin(pedalAngleRad + Math.PI) * crankLength,
  }

  // Pedal-Anzeige (horizontale Linien an Kurbelenden)
  const pedalHalfWidth = (PEDAL_WIDTH / 2) * SCALE
  
  points.pedalRightTop = {
    x: points.pedalRight.x - pedalHalfWidth,
    y: points.pedalRight.y,
  }
  points.pedalRightBottom = {
    x: points.pedalRight.x + pedalHalfWidth,
    y: points.pedalRight.y,
  }
  
  points.pedalLeftTop = {
    x: points.pedalLeft.x - pedalHalfWidth,
    y: points.pedalLeft.y,
  }
  points.pedalLeftBottom = {
    x: points.pedalLeft.x + pedalHalfWidth,
    y: points.pedalLeft.y,
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 6. FAHRER (Beine & Fuß)
  // ──────────────────────────────────────────────────────────────────────────

  const lowerLegLength = RIDER_INSEAM * LOWER_LEG_RATIO * SCALE
  const upperLegLength = RIDER_INSEAM * UPPER_LEG_RATIO * SCALE

  // Fußposition: Cleat-Kontaktpunkt liegt hinter und unter der Pedalachse
  const pedalPos = points.pedalRight
  // Sitzposition für Bein-/Knie-Berechnungen: Sattel-Mittelpunkt
  const seatPos = points.saddleTop
  
  // Berechne vorläufige Distanz für Fußwinkel-Optimierung
  const dxPedalSeat = seatPos.x - pedalPos.x
  const dyPedalSeat = seatPos.y - pedalPos.y
  const distPedalToSeat = Math.sqrt(dxPedalSeat * dxPedalSeat + dyPedalSeat * dyPedalSeat)
  
  // Fußwinkel: wenn Bein zu kurz ist, muss Fuß mehr gestreckt werden
  const totalLegLength = lowerLegLength + upperLegLength
  const stretch = distPedalToSeat / totalLegLength
  
  // Dynamischer Fußwinkel basierend auf Pedalposition:
  // - Bei 90° (unten): voller FOOT_ANGLE_DEFAULT
  // - Bei 270° (oben): 0° (horizontal)
  // - Bei 0° und 180°: FOOT_ANGLE_DEFAULT / 2
  const baseDynamicFootAngle = FOOT_ANGLE_DEFAULT * (1 + Math.sin(pedalAngleRad)) / 2
  
  const footAngle = stretch > 1.0 
    ? baseDynamicFootAngle + (stretch - 1.0) * 30 // Bei Streckung: Fuß stärker nach unten
    : baseDynamicFootAngle
  
  const footAngleRad = toRadians(footAngle)
  const cleatSetback = CLEAT_SETBACK * SCALE
  const cleatDrop = CLEAT_DROP * SCALE
  
  // Cleat-Verbindung: vertikale Linie vom Pedal nach unten (nur cleatDrop)
  points.cleatTop = {
    x: pedalPos.x,
    y: pedalPos.y,
  }
  // Cleat nach oben (invertiertes Vorzeichen), da Y positiv nach unten läuft
  points.cleatBottom = {
    x: pedalPos.x,
    y: pedalPos.y - cleatDrop,
  }

  // Fußkontaktpunkt am Ende der Cleat-Verbindung, versetzt um cleatSetback in Fußrichtung
  points.footContact = {
    x: points.cleatBottom.x - cleatSetback * Math.cos(footAngleRad),
    y: points.cleatBottom.y - cleatSetback * Math.sin(footAngleRad),
  }
  
  // Unterschenkel: vom Fußkontakt zum Knie
  // Oberschenkel: vom Knie zur Sattelstütze (oben)
  
  // ──────────────────────────────────────────────────────────────────────────
  // KNIE-POSITION: Inverse Kinematik (Zwei-Kreis-Schnitt)
  // ──────────────────────────────────────────────────────────────────────────
  // Gegeben: Fußposition, Sattelposition, Unter- und Oberschenkellänge
  // Gesucht: Knieposition (Schnittpunkt zweier Kreise)
  
  const footPos = points.footContact
  const dx = seatPos.x - footPos.x
  const dy = seatPos.y - footPos.y
  const distFootToSeat = Math.sqrt(dx * dx + dy * dy)

  // Prüfe geometrische Erreichbarkeit (Bein zu kurz/lang?)
  let kneePos: Point2D

  if (distFootToSeat > totalLegLength) {
    // FALL 1: Distanz zu groß → Bein maximal gestreckt
    const ratio = lowerLegLength / totalLegLength
    kneePos = {
      x: footPos.x + dx * ratio,
      y: footPos.y + dy * ratio,
    }
  } else if (distFootToSeat < Math.abs(lowerLegLength - upperLegLength)) {
    // FALL 2: Distanz zu klein → ungültige Geometrie (Knie in Mitte)
    kneePos = {
      x: (footPos.x + seatPos.x) / 2,
      y: (footPos.y + seatPos.y) / 2,
    }
  } else {
    // FALL 3: Normale Position → Zwei-Kreis-Schnitt (Kosinussatz)
    // Dreieck: Fußkontakt - Knie - Sattel
    // a = Fuß→Sattel (Hypotenuse/bekannte Distanz)
    // b = Fuß→Knie (Unterschenkel)
    // c = Knie→Sattel (Oberschenkel)
    
    const a = distFootToSeat
    const b = lowerLegLength
    const c = upperLegLength

    // Cosinus-Satz für Winkel alpha am Fußkontakt: c² = a² + b² - 2ab*cos(alpha)
    // Umgestellt: cos(alpha) = (a² + b² - c²) / (2ab)
    const cosAlpha = (a * a + b * b - c * c) / (2 * a * b)
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)))

    // Winkel der Linie Fuß→Sattel
    const baseAngle = Math.atan2(dy, dx)

    // Knie-Position: rotiere von Fußkontakt aus um alpha
    // (Nutze positive Rotation, damit Knie nach vorne zeigt)
    kneePos = {
      x: footPos.x + b * Math.cos(baseAngle + alpha),
      y: footPos.y + b * Math.sin(baseAngle + alpha),
    }
  }

  points.knee = kneePos

  // ──────────────────────────────────────────────────────────────────────────
  // KNIEWINKEL: Winkel zwischen Unterschenkel und Oberschenkel
  // ──────────────────────────────────────────────────────────────────────────
  
  const kneeToFoot = {
    x: footPos.x - kneePos.x,
    y: footPos.y - kneePos.y,
  }
  const kneeToSeat = {
    x: seatPos.x - kneePos.x,
    y: seatPos.y - kneePos.y,
  }
  
  // Berechne Winkel mit atan2 (gibt Richtung in Radiant)
  const angleToFoot = Math.atan2(kneeToFoot.y, kneeToFoot.x)
  const angleToSeat = Math.atan2(kneeToSeat.y, kneeToSeat.x)
  let kneeAngleDeg = Math.abs((angleToSeat - angleToFoot) * 180 / Math.PI)
  
  // Normalisiere auf 0-180° (Innenwinkel)
  if (kneeAngleDeg > 180) kneeAngleDeg = 360 - kneeAngleDeg

  // ──────────────────────────────────────────────────────────────────────────
  // 7. OBERKÖRPER (Torso, Hals, Kopf, Arme)
  // ──────────────────────────────────────────────────────────────────────────

  const headHeight = RIDER_HEIGHT * HEAD_RATIO * SCALE
  const neckLength = RIDER_HEIGHT * NECK_RATIO * SCALE
  const torsoLength = (RIDER_HEIGHT - RIDER_INSEAM - headHeight / SCALE - neckLength / SCALE) * SCALE
  
  // Hüfte (visuell) = Sattel-Mittelpunkt
  points.hip = points.saddleTop
  
  // Hüftgelenk (anatomisch korrekt): 9,5% der Innenbeinlänge vom Sattel nach vorne/oben
  // entlang des Oberkörperwinkels (Torso-Vektor)
  const torsoAngle = toRadians(TORSO_ANGLE)
  const hipJointOffset = RIDER_INSEAM * 0.095 * SCALE // 9,5% Offset für anatomisches Hüftgelenk
  points.hipJoint = {
    x: points.saddleTop.x + hipJointOffset * Math.cos(torsoAngle),
    y: points.saddleTop.y - hipJointOffset * Math.sin(torsoAngle),
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // ANATOMISCH KORREKTE BEIN-BERECHNUNG (vom Hüftgelenk)
  // ──────────────────────────────────────────────────────────────────────────
  // Die alte Berechnung (knee, saddleTop) dient als Basis-Check.
  // Die neue Berechnung (kneeNew, hipJoint) ist anatomisch präziser und wird
  // für die finale Kniewinkel-Anzeige verwendet.

  const hipJointPos = points.hipJoint
  const dxHipFoot = hipJointPos.x - footPos.x
  const dyHipFoot = hipJointPos.y - footPos.y
  const distHipToFoot = Math.sqrt(dxHipFoot * dxHipFoot + dyHipFoot * dyHipFoot)

  // Anatomische Beinlänge = Innenbeinlänge + Hüftgelenk-Offset
  const anatomicalInseam = RIDER_INSEAM + hipJointOffset / SCALE
  const newLowerLegLength = anatomicalInseam * LOWER_LEG_RATIO * SCALE
  const newUpperLegLength = anatomicalInseam * UPPER_LEG_RATIO * SCALE
  const newTotalLegLength = newLowerLegLength + newUpperLegLength

  // Knie-Position via IK (von Hüftgelenk zu Fußkontakt)
  let kneeNewPos: Point2D

  if (distHipToFoot > newTotalLegLength) {
    // FALL 1: Maximal gestreckt
    const ratio = newLowerLegLength / newTotalLegLength
    kneeNewPos = {
      x: footPos.x + dxHipFoot * ratio,
      y: footPos.y + dyHipFoot * ratio,
    }
  } else if (distHipToFoot < Math.abs(newLowerLegLength - newUpperLegLength)) {
    // FALL 2: Ungültige Geometrie
    kneeNewPos = {
      x: (footPos.x + hipJointPos.x) / 2,
      y: (footPos.y + hipJointPos.y) / 2,
    }
  } else {
    // FALL 3: Zwei-Kreis-Schnitt (Kosinussatz)
    const a = distHipToFoot
    const b = newLowerLegLength
    const c = newUpperLegLength

    const cosAlphaNew = (a * a + b * b - c * c) / (2 * a * b)
    const alphaNew = Math.acos(Math.max(-1, Math.min(1, cosAlphaNew)))
    const baseAngleNew = Math.atan2(dyHipFoot, dxHipFoot)

    kneeNewPos = {
      x: footPos.x + b * Math.cos(baseAngleNew + alphaNew),
      y: footPos.y + b * Math.sin(baseAngleNew + alphaNew),
    }
  }

  points.kneeNew = kneeNewPos
  
  // Neuer Kniewinkel berechnen (an kneeNew statt knee)
  const kneeNewToFoot = {
    x: footPos.x - kneeNewPos.x,
    y: footPos.y - kneeNewPos.y,
  }
  const kneeNewToHip = {
    x: hipJointPos.x - kneeNewPos.x,
    y: hipJointPos.y - kneeNewPos.y,
  }
  const angleNewToFoot = Math.atan2(kneeNewToFoot.y, kneeNewToFoot.x)
  const angleNewToHip = Math.atan2(kneeNewToHip.y, kneeNewToHip.x)
  let kneeAngleDegNew = Math.abs((angleNewToHip - angleNewToFoot) * 180 / Math.PI)
  if (kneeAngleDegNew > 180) kneeAngleDegNew = 360 - kneeAngleDegNew
  
  // ──────────────────────────────────────────────────────────────────────────
  
  // Schulter: vom Hüftpunkt entlang Oberkörperwinkel
  points.shoulder = {
    x: points.hip.x + torsoLength * Math.cos(torsoAngle),
    y: points.hip.y - torsoLength * Math.sin(torsoAngle),
  }
  
  // Hals: von Schulter nach oben (60° aufrechter als Oberkörper)
  const neckAngle = toRadians(60)
  points.neckTop = {
    x: points.shoulder.x + neckLength * Math.cos(neckAngle),
    y: points.shoulder.y - neckLength * Math.sin(neckAngle),
  }
  
  // Kopf-Zentrum: mittig vom Hals-Ende
  const headWidth = headHeight * HEAD_WIDTH_RATIO
  points.headCenter = {
    x: points.neckTop.x + (headHeight / 2) * Math.cos(neckAngle),
    y: points.neckTop.y - (headHeight / 2) * Math.sin(neckAngle),
  }
  
  // ──────────────────────────────────────────────────────────────────────────
  // ARM-POSITION: Inverse Kinematik (Schulter → Ellbogen → Lenker)
  // ──────────────────────────────────────────────────────────────────────────
  
  const handPos = cockpit.handPosition === 'drops' && points.handlebarDropEnd
    ? points.handlebarDropEnd
    : points.handlebarCenter
  const shoulderPos = points.shoulder
  
  const armDx = handPos.x - shoulderPos.x
  const armDy = handPos.y - shoulderPos.y
  const armDist = Math.sqrt(armDx * armDx + armDy * armDy)
  
  const upperArmScaled = RIDER_HEIGHT * UPPER_ARM_RATIO * SCALE
  const lowerArmScaled = RIDER_HEIGHT * LOWER_ARM_RATIO * SCALE
  const totalArmLength = upperArmScaled + lowerArmScaled
  
  let elbowPos: Point2D
  
  if (armDist > totalArmLength) {
    // FALL 1: Maximal gestreckt
    const ratio = upperArmScaled / totalArmLength
    elbowPos = {
      x: shoulderPos.x + armDx * ratio,
      y: shoulderPos.y + armDy * ratio,
    }
  } else if (armDist < Math.abs(upperArmScaled - lowerArmScaled)) {
    // FALL 2: Ungültige Geometrie
    elbowPos = {
      x: (shoulderPos.x + handPos.x) / 2,
      y: (shoulderPos.y + handPos.y) / 2,
    }
  } else {
    // FALL 3: Zwei-Kreis-Schnitt (Kosinussatz)
    const a = armDist
    const b = upperArmScaled
    const c = lowerArmScaled
    
    const cosAlphaArm = (a * a + b * b - c * c) / (2 * a * b)
    const alphaArm = Math.acos(Math.max(-1, Math.min(1, cosAlphaArm)))
    const baseAngleArm = Math.atan2(armDy, armDx)
    
    // Ellbogen nach unten (natürliche Armhaltung)
    elbowPos = {
      x: shoulderPos.x + b * Math.cos(baseAngleArm + alphaArm),
      y: shoulderPos.y + b * Math.sin(baseAngleArm + alphaArm),
    }
  }
  
  points.elbow = elbowPos

  // ──────────────────────────────────────────────────────────────────────────
  // 8. SEGMENTE (Verbindungslinien)
  // ──────────────────────────────────────────────────────────────────────────

  // Rahmen
  segments.push(
    { from: 'bb', to: 'headTubeTop' },              // Oberrohr
    { from: 'headTubeTop', to: 'headTubeBottom' },  // Steuerrohr
    { from: 'headTubeBottom', to: 'frontWheel' },   // Gabel
    { from: 'bb', to: 'seatTubeTop' },              // Sitzrohr
    { from: 'seatTubeTop', to: 'rearWheel' },       // Sitzstrebe
    { from: 'bb', to: 'rearWheel' },                // Kettenstrebe
    { from: 'seatTubeTop', to: 'headTubeTop' },     // Oberrohr (alternative Darstellung)
  )

  // Cockpit
  segments.push(
    { from: 'headTubeTop', to: 'spacerUp' },        // Spacer-Stack
    { from: 'spacerUp', to: 'stemFront' },          // Vorbau
    { from: 'stemFront', to: 'handlebarCenter' },   // Lenker-Extension
  )

  // Sattel & Sattelstütze
  segments.push(
    { from: 'seatTubeTop', to: 'seatPostTop' },     // Sattelstütze
    { from: 'saddleLenFwd', to: 'saddleLenAft' },   // Sattel
  )

  // Kurbel & Pedale
  segments.push(
    { from: 'bb', to: 'pedalRight' },               // Rechte Kurbel
    { from: 'bb', to: 'pedalLeft' },                // Linke Kurbel
    { from: 'pedalRightTop', to: 'pedalRightBottom' },  // Rechtes Pedal
    { from: 'pedalLeftTop', to: 'pedalLeftBottom' },    // Linkes Pedal
  )

  // ──────────────────────────────────────────────────────────────────────────
  // FAHRER-SEGMENTE (separate Darstellung, typischerweise grün)
  // ──────────────────────────────────────────────────────────────────────────
  const riderSegments: Segment[] = [
    // Fuß & Cleat
    { from: 'cleatTop', to: 'cleatBottom' },
    { from: 'cleatBottom', to: 'footContact' },
    
    // Beine (anatomisch korrekt vom Hüftgelenk)
    { from: 'footContact', to: 'kneeNew' },
    { from: 'kneeNew', to: 'hipJoint' },
    
    // Oberkörper
    { from: 'hip', to: 'shoulder' },
    { from: 'shoulder', to: 'neckTop' },
    
    // Arme
    { from: 'shoulder', to: 'elbow' },
    { from: 'elbow', to: cockpit.handPosition === 'drops' && points.handlebarDropEnd ? 'handlebarDropEnd' : 'handlebarCenter' },
  ]

  // Berechne Kniewinkel bei 90° und 270° Kurbelstellung
  const kneeAngleAt90 = calculateKneeAngleAtPedalAngle(
    90,
    cockpit.crankLength,
    points.saddleTop,
    points.bb,
    RIDER_INSEAM,
    CLEAT_DROP,
    hipJointOffset,
    torsoAngle
  )
  
  const kneeAngleAt270 = calculateKneeAngleAtPedalAngle(
    270,
    cockpit.crankLength,
    points.saddleTop,
    points.bb,
    RIDER_INSEAM,
    CLEAT_DROP,
    hipJointOffset,
    torsoAngle
  )

  // ──────────────────────────────────────────────────────────────────────────
  // ÜBERHÖHUNG: Y-Abstand zwischen Sattel und Lenker
  // ──────────────────────────────────────────────────────────────────────────
  // Positiver Wert = Sattel höher als Lenker (SVG: Y nach unten positiv)
  const saddleHandlebarDrop = (points.handlebarCenter.y - points.saddleTop.y) / SCALE

  // ──────────────────────────────────────────────────────────────────────────
  // KNIE-ZU-PEDAL X-ABSTAND BEI 0° PEDALSTELLUNG
  // ──────────────────────────────────────────────────────────────────────────
  // Berechne Knie-Position bei Pedalwinkel 0° (Pedal vorne)
  const pedalAngle0Rad = toRadians(0)
  const pedalAt0: Point2D = {
    x: points.bb.x + Math.cos(pedalAngle0Rad) * crankLength,
    y: points.bb.y + Math.sin(pedalAngle0Rad) * crankLength,
  }
  
  // Fußposition bei 0° (vereinfacht: gleiche Cleat-Logik wie bei aktueller Pedalstellung)
  const baseDynamicFootAngleAt0 = FOOT_ANGLE_DEFAULT * (1 + Math.sin(pedalAngle0Rad)) / 2
  const footAngleAt0Rad = toRadians(baseDynamicFootAngleAt0)
  
  const cleatBottomAt0: Point2D = {
    x: pedalAt0.x,
    y: pedalAt0.y - cleatDrop,
  }
  
  const footPosAt0: Point2D = {
    x: cleatBottomAt0.x - cleatSetback * Math.cos(footAngleAt0Rad),
    y: cleatBottomAt0.y - cleatSetback * Math.sin(footAngleAt0Rad),
  }
  
  // Knie-Position via IK bei 0°
  const dxHipFootAt0 = hipJointPos.x - footPosAt0.x
  const dyHipFootAt0 = hipJointPos.y - footPosAt0.y
  const distHipToFootAt0 = Math.sqrt(dxHipFootAt0 * dxHipFootAt0 + dyHipFootAt0 * dyHipFootAt0)
  
  let kneePosAt0: Point2D
  
  if (distHipToFootAt0 > newTotalLegLength) {
    const ratio = newLowerLegLength / newTotalLegLength
    kneePosAt0 = {
      x: footPosAt0.x + dxHipFootAt0 * ratio,
      y: footPosAt0.y + dyHipFootAt0 * ratio,
    }
  } else if (distHipToFootAt0 < Math.abs(newLowerLegLength - newUpperLegLength)) {
    kneePosAt0 = {
      x: (footPosAt0.x + hipJointPos.x) / 2,
      y: (footPosAt0.y + hipJointPos.y) / 2,
    }
  } else {
    const a = distHipToFootAt0
    const b = newLowerLegLength
    const c = newUpperLegLength
    const cosAlphaAt0 = (a * a + b * b - c * c) / (2 * a * b)
    const alphaAt0 = Math.acos(Math.max(-1, Math.min(1, cosAlphaAt0)))
    const baseAngleAt0 = Math.atan2(dyHipFootAt0, dxHipFootAt0)
    kneePosAt0 = {
      x: footPosAt0.x + b * Math.cos(baseAngleAt0 + alphaAt0),
      y: footPosAt0.y + b * Math.sin(baseAngleAt0 + alphaAt0),
    }
  }
  
  // X-Abstand: Knie zu Pedal (in mm, positiv = Knie vor Pedal)
  const kneeTopedalXAt0 = -(kneePosAt0.x - pedalAt0.x) / SCALE

  // ──────────────────────────────────────────────────────────────────────────
  // SCHULTERWINKEL: Winkel zwischen Hüftgelenk→Schulter und Schulter→Ellbogen
  // ──────────────────────────────────────────────────────────────────────────
  const shoulderToHip = {
    x: hipJointPos.x - shoulderPos.x,
    y: hipJointPos.y - shoulderPos.y,
  }
  const shoulderToElbow = {
    x: elbowPos.x - shoulderPos.x,
    y: elbowPos.y - shoulderPos.y,
  }
  const angleToHip = Math.atan2(shoulderToHip.y, shoulderToHip.x)
  const angleToElbow = Math.atan2(shoulderToElbow.y, shoulderToElbow.x)
  let shoulderAngle = Math.abs((angleToElbow - angleToHip) * 180 / Math.PI)
  if (shoulderAngle > 180) shoulderAngle = 360 - shoulderAngle

  // ──────────────────────────────────────────────────────────────────────────
  // ELLBOGENWINKEL: Winkel zwischen Schulter→Ellbogen und Ellbogen→Hand
  // ──────────────────────────────────────────────────────────────────────────
  const elbowToShoulder = {
    x: shoulderPos.x - elbowPos.x,
    y: shoulderPos.y - elbowPos.y,
  }
  const elbowToHand = {
    x: handPos.x - elbowPos.x,
    y: handPos.y - elbowPos.y,
  }
  const angleToShoulder = Math.atan2(elbowToShoulder.y, elbowToShoulder.x)
  const angleToHand = Math.atan2(elbowToHand.y, elbowToHand.x)
  let elbowAngle = Math.abs((angleToHand - angleToShoulder) * 180 / Math.PI)
  if (elbowAngle > 180) elbowAngle = 360 - elbowAngle

  return { 
    points, 
    segments, 
    riderSegments, 
    kneeAngle: kneeAngleDegNew, 
    kneeAngleAt90, 
    kneeAngleAt270,
    saddleHandlebarDrop,
    kneeTopedalXAt0,
    shoulderAngle,
    elbowAngle
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SPECIALIZED HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Erstellt einen Halbkreis-Bogen für den Lenker-Drop.
 * Fügt die Bogen-Punkte dynamisch zu points hinzu und verbindet sie mit Segmenten.
 */
function createHandlebarArc(
  points: Record<string, Point2D>,
  segments: Segment[],
  handlebarDrop: number
): void {
  const dropScaled = handlebarDrop * SCALE
  
  // Nur zeichnen wenn Drop signifikant ist
  if (Math.abs(dropScaled) < 0.001) return

  const centerX = points.handlebarCenter.x
  const centerY = points.handlebarCenter.y
  const radius = Math.abs(dropScaled) / 2
  const arcCenterY = centerY + Math.sign(dropScaled) * radius

  const arcIds: string[] = []
  
  for (let i = 0; i <= HANDLEBAR_ARC_STEPS; i++) {
    const progress = i / HANDLEBAR_ARC_STEPS
    const angle = -Math.PI / 2 + progress * Math.PI // -90° bis +90°
    
    const pointId = `handlebarArc${i}`
    // @ts-ignore - Dynamische Zuweisung von Punkt-IDs
    points[pointId] = {
      x: centerX + radius * Math.cos(angle),
      y: arcCenterY + radius * Math.sin(angle),
    }
    arcIds.push(pointId)
  }

  // Verbinde Lenker-Mitte mit erstem Bogen-Punkt
  segments.push({ from: 'handlebarCenter', to: arcIds[0] })
  
  // Verbinde alle Bogen-Punkte untereinander
  for (let i = 0; i < arcIds.length - 1; i++) {
    segments.push({ from: arcIds[i], to: arcIds[i + 1] })
  }
}
