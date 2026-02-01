import type { BikeData, AlignmentMode } from '@/types/bike'

/** 2D-Punkt in SVG-Koordinaten (X rechts, Y nach unten). */
export type Point2D = { x: number; y: number }

/** Verbindung zwischen zwei Punkten (für Linien). */
export type Segment = { from: string; to: string }

/** Ergebnis der Rahmen-/Cockpit-Berechnung: alle Punkte + Linien-Segmente. */
export type BikeGeometryResult = {
  points: Record<string, Point2D>
  segments: Segment[]
}

/** Punkt-IDs, die als Räder gezeichnet werden (Kreis). */
export const WHEEL_POINT_IDS = ['frontWheel', 'rearWheel'] as const

/** Punkt-IDs für hervorgehobene Key-Points (kleiner Kreis). */
export const KEY_POINT_IDS = [
  'bb',
  'headTubeTop',
  'stemFront',
  'handlebarCenter',
  'seatTubeTop',
  'headTubeBottom',
] as const

export const SCALE = 0.8 // mm → SVG-Einheiten

/** Grad → Bogenmaß */
function deg(angle: number): number {
  return (angle * Math.PI) / 180
}

/**
 * Berechnet alle Punkte und Segmente für ein Bike (Rahmen + Cockpit).
 * Koordinatensystem: BB im Ursprung, X nach rechts (vorn), Y nach unten (SVG).
 *
 * Du kannst die einzelnen Berechnungsblöcke durch deine eigenen Sin/Cos-Formeln ersetzen.
 * Später erweiterbar um: Fahrer, Hinterbau-Details, etc. (einfach weitere Punkte + Segmente anhängen).
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
    forkLength,
    bbDrop,
    chainstayLength,
    frontCenter,
  } = geometry

  const points: Record<string, Point2D> = {}
  const segments: Segment[] = []

  // ─── 1) Tretlager (BB) – Referenzpunkt ─────────────────────────────────────
  points.bb = { x: 0, y: 0 }

  // ─── 2) Oberkante Steuerrohr (Head Tube Top) – Stack/Reach ───────────────────
  points.headTubeTop = {
    x: reach * SCALE,
    y: -stack * SCALE,
  }

  // ─── 3) Vorderradachse (Fork-Ende) – Lenkkopfwinkel + Gabelänge ─────────────
  const htaRad = deg(headTubeAngle)

  // headTubeBottom: Ende des Steuerrohrs (Richtung des StackUp, entgegengesetzt)
  const headTubeLen = geometry.topTubeLength ?? 0
  points.headTubeBottom = {
    x: points.headTubeTop.x + Math.cos(htaRad) * headTubeLen * SCALE,
    y: points.headTubeTop.y + Math.sin(htaRad) * headTubeLen * SCALE,
  }

  // Berechne vordere Radposition:
  // Wenn `frontCenter` gegeben ist, ist das der Abstand vom BB (Ursprung) zur Vorderradachse.
  // Dann liegt die Y-Position immer auf -bbDrop (wie beim Hinterrad) und X wird aus Pythagoras
  // bestimmt: frontCenter^2 = x^2 + bbDrop^2.
  if (frontCenter) {
    const R = frontCenter * SCALE
    const y = -bbDrop * SCALE
    const x = Math.sqrt(Math.max(0, R * R - y * y))
    points.frontWheel = { x, y }
  } else {
    // Fallback: berechne das Vorderrad aus Gabel-Länge/-Richtung von headTubeBottom
    // und setze die Y-Position auf -bbDrop. Die tatsächliche Gabel-Länge und der Winkel
    // ergeben sich dann aus headTubeBottom -> frontWheel und werden nur zum Zeichnen verwendet.
    const forkDx = Math.cos(htaRad) * forkLength * SCALE
    const forkDy = Math.sin(htaRad) * forkLength * SCALE
    const fx = points.headTubeBottom.x + forkDx
    points.frontWheel = {
      x: fx,
      y: -bbDrop * SCALE,
    }
  }

  // ─── 4) Cockpit: Spacer + Steuersatz + Vorbau + Lenker ──────────────────────
  // Oberkante Spacer/Abdeckung (von Head Tube Top nach oben)

  const stackUp = (cockpit.spacerHeight + cockpit.headsetCap + 31.8 / 2) * SCALE
  const stackUpDx = stackUp * Math.cos(deg(headTubeAngle))
  const stackUpDy = stackUp * Math.sin(deg(headTubeAngle));


  points.stemFront = {
    x: points.headTubeTop.x - stackUpDx,
    y: points.headTubeTop.y - stackUpDy,
  }

  // Vorbau-Ende (Stem-Front): Vorbauwinkel aus der Horizontalen
  // Konvention: negativer Winkel = Rise (Vorbau nach oben/hinten). Ersetze durch deine Sin/Cos-Formel.
  const stemRad = deg(cockpit.stemAngle)
  const stemDx = -Math.cos(Math.abs(stemRad)) * cockpit.stemLength * SCALE
  const stemDy = -Math.sin(Math.abs(stemRad)) * cockpit.stemLength * SCALE
  //points.stemFront = {
  //  x: stackTop.x + stemDx,
  //  y: stackTop.y + stemDy,
  //}

  // Lenkermitte: vom Vorbau-Ende um Lenker-Reach (vorwärts) und Drop (nach unten)
  points.handlebarCenter = {
    x: points.stemFront.x + cockpit.handlebarReach * SCALE,
    y: points.stemFront.y + cockpit.handlebarDrop * SCALE,
  }

  // ─── 5) Sattelrohr-Oberkante (Seat Tube Top) – Sitzrohrwinkel ───────────────
  // Platzhalter: effektive Sitzrohrlänge (nicht in Geometrie vorhanden).
  // Ersetze durch deine Formel (z. B. aus Stack/Reach/SATT-Winkel).
  const seatTubeLength = 520 * SCALE // typisch ~500–600 mm
  const staRad = deg(seatTubeAngle)
  points.seatTubeTop = {
    x: -Math.cos(staRad) * seatTubeLength,
    y: -Math.sin(staRad) * seatTubeLength,
  }

  // ─── 5.1) Vorderes Ende des Oberrohrs (Top Tube Front)
  // Verwende `topTubeLength` aus den Geometriedaten (ETT-ähnlich) und lege den Punkt
  // horizontal hinter die Oberkante des Steuerrohrs. Optionaler kleiner Y-Offset
  // repräsentiert die Unterseite des Rohres (hier: 5 mm).
  

  // ─── 6) Hinterradachse – BB-Drop + Kettenstrebe ────────────────────────────
  const chainstayLen = (chainstayLength || 410) * SCALE
  points.rearWheel = {
    x: -chainstayLen,
    // bbDrop wird hier negativ gerechnet: positive Angabe bedeutet "BB unter Achse",
    // im SVG-Koordinatensystem (Y nach unten) muss das als negativer Versatz verwendet werden.
    y: -bbDrop * SCALE,
  }

  // ─── Segmente (Linien) – Rahmen + Cockpit ───────────────────────────────────
  segments.push(
    { from: 'bb', to: 'headTubeTop' },
    { from: 'headTubeTop', to: 'headTubeBottom' },
    { from: 'headTubeBottom', to: 'frontWheel' },
    { from: 'bb', to: 'seatTubeTop' },
    { from: 'seatTubeTop', to: 'rearWheel' },
    { from: 'bb', to: 'rearWheel' },
    { from: 'headTubeTop', to: 'stemFront' },
    { from: 'stemFront', to: 'handlebarCenter' },
    // zusätzliche Linie: Oberkante Sattelrohr -> Oberkante Steuerrohr
    { from: 'seatTubeTop', to: 'headTubeTop' }
  )

  return { points, segments }
}
