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
const SEATPOST_LENGTH = 250 // mm
const SADDLE_LENGTH = 255 // mm
const SADDLE_SETBACK = 20 // mm

// Pedale
const PEDAL_WIDTH = 50 // mm (Gesamt-Breite der Pedal-Anzeige)

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
  // 6. SEGMENTE (Verbindungslinien)
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

  return { points, segments }
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
