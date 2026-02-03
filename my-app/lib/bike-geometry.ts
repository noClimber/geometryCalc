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
  'pedalRight',
  'pedalLeft',
  'knee',
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
const SEATPOST_LENGTH = 200 // mm
const SADDLE_LENGTH = 255 // mm
const SADDLE_SETBACK = 30 // mm

// Pedale
const PEDAL_WIDTH = 50 // mm (Gesamt-Breite der Pedal-Anzeige)

// Fahrerdaten
const RIDER_INSEAM = 890 // mm (Innenbeinlänge vom Schritt bis Fußsohle)
const RIDER_HEIGHT = 1800 // mm (Gesamtkörpergröße)
const UPPER_LEG_RATIO = 0.53 // Oberschenkel-Anteil an Innenbeinlänge
const LOWER_LEG_RATIO = 0.47 // Unterschenkel-Anteil an Innenbeinlänge

// Oberkörper-Proportionen
const HEAD_RATIO = 0.12 // Kopfhöhe als Anteil der Körpergröße
const NECK_RATIO = 0.055 // Halslänge als Anteil der Körpergröße
const HEAD_WIDTH_RATIO = 0.7 // Kopfbreite relativ zur Kopfhöhe
const UPPER_ARM_RATIO = 0.186 // Oberarm-Länge als Anteil der Körpergröße (ca. 18.6%)
const LOWER_ARM_RATIO = 0.146 // Unterarm-Länge als Anteil der Körpergröße (ca. 14.6%)
const TORSO_ANGLE = 30 // Grad (Oberkörperneigung relativ zur X-Achse)

// Schuh & Cleat (Kontaktpunkt Fuß-Pedal)
const CLEAT_SETBACK = 120 // mm (Abstand Pedalachse → Fußballen, nach hinten)
const CLEAT_DROP = 15 // mm (Vertikaler Abstand Pedalachse → Fußsohle)
const FOOT_ANGLE_DEFAULT = 10 // Grad (Standard-Fußwinkel, leicht nach unten)

const SHOE_EXT_AFT = 20 // mm (Wie weit über den Cleat hinaus zeigt der Schuh nach hinten?)

// ════════════════════════════════════════════════════════════════════════════
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
  const { geometry, cockpit } = bike
  const {
    stack,
    reach,
    headTubeAngle,
    seatTubeAngle,
    bbDrop,
    chainstayLength = DEFAULT_CHAINSTAY_LENGTH,
    frontCenter = DEFAULT_FRONT_CENTER,
  } = geometry

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

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SATTEL & SATTELSTÜTZE
  // ──────────────────────────────────────────────────────────────────────────

  const seatPostLength = SEATPOST_LENGTH * SCALE
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
  const seatPos = points.seatPostTop
  
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
  
  // Berechne Knie-Position mittels Zwei-Kreis-Schnitt (inverse Kinematik)
  const footPos = points.footContact
  
  const dx = seatPos.x - footPos.x
  const dy = seatPos.y - footPos.y
  const distFootToSeat = Math.sqrt(dx * dx + dy * dy)

  // Prüfe, ob die Beinlängen geometrisch erreichbar sind
  let kneePos: Point2D

  if (distFootToSeat > totalLegLength) {
    // Bein zu kurz → strecke maximal aus
    const ratio = lowerLegLength / totalLegLength
    kneePos = {
      x: footPos.x + dx * ratio,
      y: footPos.y + dy * ratio,
    }
  } else if (distFootToSeat < Math.abs(lowerLegLength - upperLegLength)) {
    // Unmöglich (zu nah) → setze Knie in die Mitte
    kneePos = {
      x: (footPos.x + seatPos.x) / 2,
      y: (footPos.y + seatPos.y) / 2,
    }
  } else {
    // Normale Position: Zwei-Kreis-Schnitt
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
  // 7. OBERKÖRPER (Torso, Hals, Kopf, Arme)
  // ──────────────────────────────────────────────────────────────────────────

  const headHeight = RIDER_HEIGHT * HEAD_RATIO * SCALE
  const neckLength = RIDER_HEIGHT * NECK_RATIO * SCALE
  const torsoLength = (RIDER_HEIGHT - RIDER_INSEAM - headHeight / SCALE - neckLength / SCALE) * SCALE
  
  // Hüfte = Sitzposition (seatPostTop)
  points.hip = points.seatPostTop
  
  // Schulter: vom Hüftpunkt aus nach vorne/oben (einstellbare Oberkörperneigung)
  const torsoAngle = toRadians(TORSO_ANGLE) // Oberkörperneigung relativ zur X-Achse
  points.shoulder = {
    x: points.hip.x + torsoLength * Math.cos(torsoAngle),
    y: points.hip.y - torsoLength * Math.sin(torsoAngle),
  }
  
  // Hals: von Schulter nach oben/vorne
  const neckAngle = toRadians(60) // Halswinkel (aufrechter)
  points.neckTop = {
    x: points.shoulder.x + neckLength * Math.cos(neckAngle),
    y: points.shoulder.y - neckLength * Math.sin(neckAngle),
  }
  
  // Kopf: Ellipse als Verlängerung vom Hals (im gleichen Winkel)
  const headWidth = headHeight * HEAD_WIDTH_RATIO
  points.headCenter = {
    x: points.neckTop.x + (headHeight / 2) * Math.cos(neckAngle),
    y: points.neckTop.y - (headHeight / 2) * Math.sin(neckAngle),
  }
  
  // Arme: Inverse Kinematik von Schulter zu handlebarCenter
  const handPos = points.handlebarCenter
  const shoulderPos = points.shoulder
  
  const armDx = handPos.x - shoulderPos.x
  const armDy = handPos.y - shoulderPos.y
  const armDist = Math.sqrt(armDx * armDx + armDy * armDy)
  
  const upperArmScaled = RIDER_HEIGHT * UPPER_ARM_RATIO * SCALE
  const lowerArmScaled = RIDER_HEIGHT * LOWER_ARM_RATIO * SCALE
  const totalArmLength = upperArmScaled + lowerArmScaled
  
  let elbowPos: Point2D
  
  if (armDist > totalArmLength) {
    // Arm zu kurz → strecke maximal aus
    const ratio = upperArmScaled / totalArmLength
    elbowPos = {
      x: shoulderPos.x + armDx * ratio,
      y: shoulderPos.y + armDy * ratio,
    }
  } else if (armDist < Math.abs(upperArmScaled - lowerArmScaled)) {
    // Unmöglich (zu nah) → Ellbogen in die Mitte
    elbowPos = {
      x: (shoulderPos.x + handPos.x) / 2,
      y: (shoulderPos.y + handPos.y) / 2,
    }
  } else {
    // Normale Position: Zwei-Kreis-Schnitt
    const a = armDist
    const b = upperArmScaled
    const c = lowerArmScaled
    
    const cosAlphaArm = (a * a + b * b - c * c) / (2 * a * b)
    const alphaArm = Math.acos(Math.max(-1, Math.min(1, cosAlphaArm)))
    
    const baseAngleArm = Math.atan2(armDy, armDx)
    
    // Ellbogen nach unten (positive Rotation für natürliche Armhaltung)
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

  // Fahrer-Beine und Oberkörper (separate Array für grüne Farbe)
  const riderSegments: Segment[] = [
    // Beine
    { from: 'cleatTop', to: 'cleatBottom' },        // Cleat-Verbindung (Pedal → Schuhsohle)
    { from: 'cleatBottom', to: 'footContact' },     // Fußballen (Cleat → Kontaktpunkt)
    { from: 'footContact', to: 'knee' },            // Unterschenkel
    { from: 'knee', to: 'seatPostTop' },            // Oberschenkel
    // Oberkörper
    { from: 'hip', to: 'shoulder' },                // Torso
    { from: 'shoulder', to: 'neckTop' },            // Hals
    // Arme
    { from: 'shoulder', to: 'elbow' },              // Oberarm
    { from: 'elbow', to: 'handlebarCenter' },       // Unterarm
  ]

  return { points, segments, riderSegments }
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
