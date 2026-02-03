import type { CockpitSetup } from '@/types/bike'

/** Min/Max-Grenzwerte pro Cockpit-Feld (mm bzw. Grad). */
export const COCKPIT_LIMITS: Record<keyof CockpitSetup, { min: number; max: number; step?: number }> = {
  spacerHeight:   { min: 0,   max: 5000,  step: 5 },  // Spacerhöhe (mm)
  headsetCap:     { min: 0,   max: 15,  step: 1 },  // Steuersatzabdeckung (mm)
  stemLength:     { min: 40,  max: 1500, step: 5 }, // Vorbaulänge (mm)
  stemAngle:      { min: -25, max: 25,  step: 1 }, // Vorbauwinkel (Grad)
  handlebarReach: { min: 50,  max: 100, step: 5 },  // Lenker Reach (mm)
  handlebarDrop:  { min: 100, max: 160, step: 5 }, // Lenker Drop (mm)
}

/**
 * Begrenzt einen Cockpit-Wert auf die erlaubte Min/Max-Spanne.
 */
export function clampCockpitValue(
  field: keyof CockpitSetup,
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
  }
}
