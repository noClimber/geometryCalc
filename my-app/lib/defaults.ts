import type { CockpitSetup, RiderSetup } from '@/types/bike'

/** Default-Bike-Auswahl beim Start. */
export const DEFAULT_BIKE_SELECTION = {
  brand: 'Cannondale',
  model: 'SuperSix Evo4',
  size: '58',
} as const

/** Min/Max-Grenzwerte pro Cockpit-Feld (mm bzw. Grad). */
export const COCKPIT_LIMITS: Record<Exclude<keyof CockpitSetup, 'handPosition'>, { min: number; max: number; step?: number }> = {
  spacerHeight:   { min: 0,   max: 5000,  step: 5 },  // Spacerhöhe (mm)
  headsetCap:     { min: 0,   max: 15,  step: 1 },  // Steuersatzabdeckung (mm)
  stemLength:     { min: 40,  max: 1500, step: 5 }, // Vorbaulänge (mm)
  stemAngle:      { min: -25, max: 25,  step: 1 }, // Vorbauwinkel (Grad)
  handlebarReach: { min: 50,  max: 100, step: 5 },  // Lenker Reach (mm)
  handlebarDrop:  { min: 100, max: 160, step: 5 }, // Lenker Drop (mm)
  crankLength:    { min: 165, max: 175, step: 2.5 }, // Kurbellänge (mm)
  pedalAngle:     { min: 0,   max: 360, step: 2 },  // Pedalwinkel (Grad)
  seatPostLength: { min: 100, max: 400, step: 5 },  // Sattelstütze (mm)
}

/** Default-Werte für das Cockpit-Setup. */
export const DEFAULT_COCKPIT: CockpitSetup = {
  spacerHeight: 30,       // 30mm Spacer
  headsetCap: 5,          // 5mm Steuersatzabdeckung
  stemLength: 80,        // 80mm Vorbau
  stemAngle: -6,          // -6° Vorbauwinkel
  handlebarReach: 75,     // 75mm Lenker Reach
  handlebarDrop: 125,     // 125mm Lenker Drop
  crankLength: 165,       // 165mm Kurbellänge
  pedalAngle: 0,         // 0° Pedalwinkel
  handPosition: 'hoods',  // Standard: Hoods
  seatPostLength: 210,    // 240mm Sattelstütze
}

/** Default-Werte für die Fahrerdaten. */
export const DEFAULT_RIDER: RiderSetup = {
  riderHeight: 1830,    // 1830mm (183cm)
  riderInseam: 890,     // 890mm (89cm)
  torsoAngle: 30,       // 30° Oberkörperwinkel
  shoeThickness: 15,    // 15mm Schuhdicke
}

// ══════════════════════════════════════════════════════════════════════════
// KOMPONENTEN DEFAULTS
// ══════════════════════════════════════════════════════════════════════════

/** Cockpit-Konstanten (mm). */
export const COCKPIT_CONSTANTS = {
  headsetBearingDiameter: 31.8,  // Steuersatzlager-Durchmesser
  handlebarArcSteps: 12,         // Anzahl Segmente für Lenker-Bogen
} as const

/** Sattel & Sattelstütze Konstanten (mm). */
export const SADDLE_CONSTANTS = {
  saddleLength: 255,     // Sattellänge
  saddleSetback: 80,     // Sattel-Versatz nach hinten
} as const

/** Pedal-Konstanten (mm). */
export const PEDAL_CONSTANTS = {
  pedalWidth: 50,        // Pedal-Breite (Gesamt-Breite der Pedal-Anzeige)
} as const

/**
 * Begrenzt einen Cockpit-Wert auf die erlaubte Min/Max-Spanne.
 */
export function clampCockpitValue(
  field: Exclude<keyof CockpitSetup, 'handPosition'>,
  value: number
): number {
  const { min, max } = COCKPIT_LIMITS[field]
  return Math.max(min, Math.min(max, value))
}

/**
 * Begrenzt ein ganzes Cockpit-Setup auf die erlaubten Grenzwerte.
 */
export function clampCockpitSetup(cockpit: CockpitSetup): CockpitSetup {
  return {
    spacerHeight:   clampCockpitValue('spacerHeight',   cockpit.spacerHeight),
    headsetCap:     clampCockpitValue('headsetCap',     cockpit.headsetCap),
    stemLength:     clampCockpitValue('stemLength',     cockpit.stemLength),
    stemAngle:      clampCockpitValue('stemAngle',      cockpit.stemAngle),
    handlebarReach: clampCockpitValue('handlebarReach', cockpit.handlebarReach),
    handlebarDrop:  clampCockpitValue('handlebarDrop', cockpit.handlebarDrop),
    crankLength:    clampCockpitValue('crankLength',    cockpit.crankLength),
    pedalAngle:     clampCockpitValue('pedalAngle',     cockpit.pedalAngle),
    handPosition:   cockpit.handPosition ?? 'hoods',
    seatPostLength: clampCockpitValue('seatPostLength', cockpit.seatPostLength),
  }
}
