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






  // ─── 4) Cockpit: Spacer + Steuersatz + Vorbau + Lenker ──────────────────────
  // Oberkante Spacer/Abdeckung (von Head Tube Top nach oben)

  const spacerUp = (cockpit.spacerHeight + cockpit.headsetCap + 31.8 / 2) * SCALE
  const spacerUpDx = spacerUp * Math.cos(deg(headTubeAngle))
  const spacerUpDy = spacerUp * Math.sin(deg(headTubeAngle));


  points.spacerUp = {
    x: points.headTubeTop.x - spacerUpDx,
    y: points.headTubeTop.y - spacerUpDy,
  }

  // Vorbau-Ende (Stem-Front): Vorbauwinkel aus der Horizontalen
  // Konvention: negativer Winkel = Rise (Vorbau nach oben/hinten). Ersetze durch deine Sin/Cos-Formel.
  const stemRad = deg(cockpit.stemAngle)
  const stemDx = Math.cos(Math.abs(stemRad)) * cockpit.stemLength * SCALE
  const stemDy = Math.sin(Math.abs(stemRad)) * cockpit.stemLength * SCALE
  points.stemFront = {
    x: points.spacerUp.x + stemDx,
    y: points.spacerUp.y + stemDy,
  }

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
  
    // gemeinsame Y-Position für beide Räder (wie Hinterrad)
  const wheelY = -bbDrop * SCALE

  // Front-Wheel X aus Pythagoras: frontCenter ist Hypotenuse (Abstand BB->Vorderrad).
  // x = sqrt(frontCenter^2 - wheelY^2)
    const frontCenterLen = (frontCenter || 600) * SCALE
    const frontCenterLenX = Math.sqrt(Math.max(0, frontCenterLen * frontCenterLen - wheelY * wheelY))
    points.frontWheel = { 
      x: Math.abs(frontCenterLenX), 
      y: wheelY, 
    }

  // ─── 6) Hinterradachse – BB-Drop + Kettenstrebe ────────────────────────────
    const rearWheelLen = (chainstayLength || 410) * SCALE
    const rearWheelLenX = Math.sqrt(Math.max(0, rearWheelLen * rearWheelLen - wheelY * wheelY))
    points.rearWheel = { 
      x: -Math.abs(rearWheelLenX), 
      y: wheelY, 
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
