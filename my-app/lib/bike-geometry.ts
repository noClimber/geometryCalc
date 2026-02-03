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
  'spacerUp',
  'frontWheel',
  'rearWheel',
  'seatPostTop',
  'pedalRight',
  'pedalLeft',
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
  const headTubeLen = geometry.headTubeLength ?? 0
  points.headTubeBottom = {
    x: points.headTubeTop.x + Math.cos(htaRad) * headTubeLen * SCALE,
    y: points.headTubeTop.y + Math.sin(htaRad) * headTubeLen * SCALE,
  }








  // ─── 4) Cockpit: Spacer + Steuersatz + Vorbau + Lenker ──────────────────────
  // Oberkante Spacer/Abdeckung (von Head Tube Top nach oben)
  const spacerUp = (cockpit.spacerHeight + cockpit.headsetCap + 31.8 / 2) * SCALE
  const headTubeAngleRad = deg(headTubeAngle)
  const spacerUpDx = spacerUp * Math.cos(headTubeAngleRad)
  const spacerUpDy = spacerUp * Math.sin(headTubeAngleRad)


  points.spacerUp = {
    x: points.headTubeTop.x - spacerUpDx,
    y: points.headTubeTop.y - spacerUpDy,
  }

// Vorbau-Ende (Stem-Front)
const stemRad = deg(cockpit.stemAngle)
const stemAngleTotal = headTubeAngleRad - stemRad  // Minus hier!

const stemDx = Math.sin(stemAngleTotal) * cockpit.stemLength * SCALE
const stemDy = -Math.cos(stemAngleTotal) * cockpit.stemLength * SCALE

points.stemFront = {
  x: points.spacerUp.x + stemDx,
  y: points.spacerUp.y + stemDy,
}

  // Lenkermitte: vom Vorbau-Ende um Lenker-Reach (vorwärts) und Drop (nach unten)
  points.handlebarCenter = {
    x: points.stemFront.x + cockpit.handlebarReach * SCALE,
    y: points.stemFront.y,
  }

  // Halbkreis-förmiger Lenker von `handlebarCenter` nach unten um `handlebarDrop`
  const hbDrop = (cockpit.handlebarDrop || 0) * SCALE
  if (Math.abs(hbDrop) > 0.001) {
    const hbX = points.handlebarCenter.x
    const hbY = points.handlebarCenter.y
    const r = Math.abs(hbDrop) / 2
    const cx = hbX
    const cy = hbY + Math.sign(hbDrop) * r
    const steps = 12
    const arcIds: string[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const theta = -Math.PI / 2 + t * Math.PI // -90° -> +90°
      const x = cx + r * Math.cos(theta)
      const y = cy + r * Math.sin(theta)
      const id = `handlebarArc${i}`
      // @ts-ignore dynamic assignment
      points[id] = { x, y }
      arcIds.push(id)
    }
    // Verbinde handlebarCenter -> erster Arc-Punkt und alle Arc-Punkte untereinander
    segments.push({ from: 'handlebarCenter', to: arcIds[0] })
    for (let i = 0; i < arcIds.length - 1; i++) {
      segments.push({ from: arcIds[i], to: arcIds[i + 1] })
    }
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

    const seatPostTopLen = 250 * SCALE
    points.seatPostTop = {
    x: -Math.cos(staRad) * seatPostTopLen + points.seatTubeTop.x,
    y: -Math.sin(staRad) * seatPostTopLen + points.seatTubeTop.y,
    }

    const saddleSetback = 20 * SCALE

    const saddleLen = 255 * SCALE
    points.saddleLenFwd = {
    x: points.seatPostTop.x + saddleLen / 2 - saddleSetback,
    y: points.seatPostTop.y,
    }

    points.saddleLenAft = {
    x: points.saddleLenFwd.x - saddleLen,
    y: points.saddleLenFwd.y,
    }

    // ─── Pedale (Crank + Pedal) – Länge 165mm, Winkel einstellbar ─────────────
    const crankLength = 165 * SCALE
    const pedalAngleRad = deg(23)
    // zwei Pedale entgegengesetzt um das BB
    points.pedalRight = {
      x: points.bb.x + Math.cos(pedalAngleRad) * crankLength,
      y: points.bb.y + Math.sin(pedalAngleRad) * crankLength,
    }
    points.pedalLeft = {
      x: points.bb.x + Math.cos(pedalAngleRad + Math.PI) * crankLength,
      y: points.bb.y + Math.sin(pedalAngleRad + Math.PI) * crankLength,
    }

    // Pedal-Anzeige: 50mm lange Linie, immer parallel zur Y-Achse (vertikal), zentriert am Kurbelende
    const pedalHalf = 25 * SCALE // 50mm / 2
    points.pedalRightTop = {
      x: points.pedalRight.x - pedalHalf,
      y: points.pedalRight.y,
    }
    points.pedalRightBottom = {
      x: points.pedalRight.x + pedalHalf,
      y: points.pedalRight.y,
    }
    points.pedalLeftTop = {
      x: points.pedalLeft.x - pedalHalf,
      y: points.pedalLeft.y,
    }
    points.pedalLeftBottom = {
      x: points.pedalLeft.x + pedalHalf,
      y: points.pedalLeft.y,
    }

    
  // ─── Segmente (Linien) – Rahmen + Cockpit ───────────────────────────────────
  segments.push(
    { from: 'bb', to: 'headTubeTop' },
    { from: 'headTubeTop', to: 'headTubeBottom' },
    { from: 'headTubeBottom', to: 'frontWheel' },
    { from: 'bb', to: 'seatTubeTop' },
    { from: 'seatTubeTop', to: 'rearWheel' },
    { from: 'bb', to: 'rearWheel' },
    { from: 'headTubeTop', to: 'spacerUp' },
    { from: 'spacerUp', to: 'stemFront' },
    { from: 'stemFront', to: 'handlebarCenter' },
    { from: 'seatTubeTop', to: 'seatPostTop' },
    { from: 'saddleLenFwd', to: 'saddleLenAft' },
    { from: 'seatTubeTop', to: 'headTubeTop' },
    { from: 'bb', to: 'pedalRight' }, 
    { from: 'bb', to: 'pedalLeft' },        { from: 'pedalRightTop', to: 'pedalRightBottom' },
    { from: 'pedalLeftTop', to: 'pedalLeftBottom' }
  )




  return { points, segments }
}
