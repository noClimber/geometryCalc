// ════════════════════════════════════════════════════════════════════════════
// SPRUNGGELENKWINKEL
// ════════════════════════════════════════════════════════════════════════════
/**
 * Sprunggelenkwinkel (cleatBottom→footContact und footContact→kneeNew)
 *
 * Kritisch: < 60° (unrealistische Geometrie)
 */
export const ANKLE_MIN = 50;
/**
 * Zentrale Definition aller Warnschwellen für biomechanische Messungen.
 * 
 * Farbcodierung:
 * - Grau/Normal: Optimaler Bereich
 * - Gelb: Warnung - suboptimal aber akzeptabel
 * - Rot: Kritisch - außerhalb empfohlener Grenzen
 */

// ════════════════════════════════════════════════════════════════════════════
// KNIEWINKEL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Kniewinkel bei 90° Pedalstellung (Pedal unten)
 * 
 * Optimaler Bereich: 137-149°
 * - ROT: < 134° oder > 153° (zu stark gebeugt oder zu gestreckt)
 * - GELB: 134-137° oder 149-153° (grenzwertig)
 * - GRAU: 137-149° (optimal)
 */
export const KNEE_90_MIN = 134           // Absolute Untergrenze (rot)
export const KNEE_90_MIN_WARNING = 137   // Warnbereich Untergrenze (gelb)
export const KNEE_90_MAX_WARNING = 149   // Warnbereich Obergrenze (gelb)
export const KNEE_90_MAX = 153           // Absolute Obergrenze (rot)

/**
 * Kniewinkel bei 270° Pedalstellung (Pedal oben)
 * 
 * Optimaler Bereich: > 67°
 * - ROT: ≤ 60° (zu stark gebeugt)
 * - GELB: 60-67° (grenzwertig)
 * - GRAU: > 67° (optimal)
 */
export const KNEE_270_MIN = 60           // Absolute Untergrenze (rot)
export const KNEE_270_MIN_WARNING = 67   // Warnbereich Untergrenze (gelb)

// ════════════════════════════════════════════════════════════════════════════
// ÜBERHÖHUNG (Sattel-Lenker Y-Abstand)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Überhöhung: Vertikaler Abstand zwischen Sattel und Lenker
 * 
 * Optimaler Bereich: < 90mm
 * - ROT: > 130mm (sehr aggressive Position)
 * - GELB: 90-130mm (sportlich/aggressiv)
 * - GRAU: < 90mm (komfortabel)
 */
export const SADDLE_HANDLEBAR_DROP_WARNING = 90   // Warnbereich (gelb ab diesem Wert)
export const SADDLE_HANDLEBAR_DROP_CRITICAL = 130 // Kritischer Bereich (rot ab diesem Wert)

// ════════════════════════════════════════════════════════════════════════════
// KNIE-ZU-PEDAL X-ABSTAND BEI 0° (KNIE ÜBER PEDALACHSE)
// ════════════════════════════════════════════════════════════════════════════

/**
 * X-Abstand zwischen Knie und Pedalachse bei 0° Pedalstellung
 * 
 * Optimaler Bereich: ≥ 0mm (Knie vor oder über Pedalachse)
 * - GELB: < 0mm (Knie hinter Pedalachse - kann zu Knieproblemen führen)
 * - GRAU: ≥ 0mm (optimal)
 */
export const KNEE_PEDAL_X_MIN_WARNING = 0 // Warnung wenn Knie hinter Pedal

// ════════════════════════════════════════════════════════════════════════════
// SCHULTERWINKEL (Hüftgelenk → Schulter → Ellbogen)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Schulterwinkel: Winkel zwischen Oberkörper und Oberarm
 * 
 * Optimaler Bereich: 85-100°
 * - ROT: < 75° oder > 110° (extreme Position)
 * - GELB: 75-85° oder 100-110° (grenzwertig)
 * - GRAU: 85-100° (optimal)
 */
export const SHOULDER_ANGLE_MIN = 75           // Absolute Untergrenze (rot)
export const SHOULDER_ANGLE_MIN_WARNING = 85   // Warnbereich Untergrenze (gelb)
export const SHOULDER_ANGLE_MAX_WARNING = 100  // Warnbereich Obergrenze (gelb)
export const SHOULDER_ANGLE_MAX = 110          // Absolute Obergrenze (rot)

// ════════════════════════════════════════════════════════════════════════════
// ELLBOGENWINKEL (Schulter → Ellbogen → Hand)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ellbogenwinkel: Winkel zwischen Oberarm und Unterarm
 * 
 * Optimaler Bereich: 140-160°
 * - ROT: > 170° (zu gestreckt - keine Stoßdämpfung)
 * - GELB: 160-170° oder < 140° (grenzwertig)
 * - GRAU: 140-160° (optimal)
 */
export const ELBOW_ANGLE_MIN_WARNING = 140  // Unterhalb gelb (zu stark gebeugt)
export const ELBOW_ANGLE_MAX_WARNING = 160  // Warnbereich Obergrenze (gelb ab diesem Wert)
export const ELBOW_ANGLE_CRITICAL = 170     // Kritischer Bereich (rot ab diesem Wert)
