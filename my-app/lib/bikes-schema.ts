import { z } from 'zod'
import type { AvailableBikesMap } from '@/types/bike'

/** Zod-Schema für eine einzelne Geometrie (Stack, Reach, Winkel, etc.). */
export const bikeGeometrySchema = z.object({
  stack: z.number(),
  reach: z.number(),
  headTubeAngle: z.number(),
  seatTubeAngle: z.number(),
  forkLength: z.number(),
  bbDrop: z.number(),
  headTubeLength: z.number(),
  seatTubeLength: z.number(),
  chainstayLength: z.number().optional(),
  frontCenter: z.number().optional(),
})

/** Zod-Schema für Fahrerdaten. */
export const riderSetupSchema = z.object({
  riderHeight: z.number(),
  riderInseam: z.number(),
  torsoAngle: z.number(),
  shoeThickness: z.number(),
})

/**
 * Schema für die komplette Bike-Datenstruktur:
 * Marke -> Modell -> Größe -> Geometrie
 */
export const availableBikesSchema: z.ZodType<AvailableBikesMap> = z.record(
  z.string(),
  z.record(
    z.string(),
    z.record(z.string(), bikeGeometrySchema)
  )
)

/**
 * Validiert die geladene Bike-JSON zur Laufzeit.
 * Bei ungültigen Daten wird ein leeres Objekt zurückgegeben und
 * in der Konsole (nur in Entwicklung) ein Hinweis ausgegeben.
 */
export function parseBikesData(data: unknown): AvailableBikesMap {
  const result = availableBikesSchema.safeParse(data)
  if (result.success) {
    return result.data
  }
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[Bikes] Ungültige Bike-JSON – Struktur oder Typen stimmen nicht. Verwende leere Daten.',
      result.error.flatten()
    )
  }
  return {}
}
