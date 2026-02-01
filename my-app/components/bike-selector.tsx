'use client'

import type { BikeData, BikeGeometry, CockpitSetup } from '@/types/bike'
import type { AvailableBikesMap } from '@/types/bike'
import { COCKPIT_LIMITS, clampCockpitValue, clampCockpitSetup } from '@/lib/cockpit-limits'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'

type BikeSelectorProps = {
  bike: BikeData | null
  setBike: (bike: BikeData | null) => void
  bikeName: string
  color: 'red' | 'blue'
  availableBikes: AvailableBikesMap
  /** Wenn false, wird "Kein Bike" nicht angeboten (z. B. für Bike A). */
  allowClear?: boolean
}

const DEFAULT_COCKPIT: CockpitSetup = {
  spacerHeight: 20,
  headsetCap: 5,
  stemLength: 110,
  stemAngle: -6,
  handlebarReach: 80,
  handlebarDrop: 125,
}

export function BikeSelector({
  bike,
  setBike,
  bikeName,
  color,
  availableBikes,
  allowClear = true,
}: BikeSelectorProps) {
  const handleBrandChange = (brand: string) => {
    if (brand === 'none') {
      setBike(null)
      return
    }

    const models = Object.keys(availableBikes[brand] ?? {})
    const firstModel = models[0]
    const sizes = firstModel
      ? Object.keys(availableBikes[brand][firstModel] ?? {})
      : []
    const firstSize = sizes[0]

    if (!firstModel || !firstSize) return

    const geometry = availableBikes[brand][firstModel][firstSize]
    if (!geometry) return

    setBike({
      brand,
      model: firstModel,
      size: firstSize,
      geometry,
      cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }),
    })
  }

  const handleModelChange = (model: string) => {
    if (!bike) return
    const sizes = Object.keys(availableBikes[bike.brand]?.[model] ?? {})
    const firstSize = sizes[0]
    if (!firstSize) return
    const geometry = availableBikes[bike.brand][model][firstSize]
    if (!geometry) return
    setBike({
      ...bike,
      model,
      size: firstSize,
      geometry,
    })
  }

  const handleSizeChange = (size: string) => {
    if (!bike) return
    const geometry = availableBikes[bike.brand]?.[bike.model]?.[size]
    if (!geometry) return
    setBike({
      ...bike,
      size,
      geometry,
    })
  }

  const handleCockpitChange = (field: keyof CockpitSetup, value: number) => {
    if (!bike) return
    const raw = Number.isFinite(value) ? value : bike.cockpit[field]
    const safeValue = clampCockpitValue(field, raw)
    setBike({
      ...bike,
      cockpit: {
        ...bike.cockpit,
        [field]: safeValue,
      },
    })
  }

  const brands = Object.keys(availableBikes)
  const models = bike ? Object.keys(availableBikes[bike.brand]) : []
  const sizes = bike ? Object.keys(availableBikes[bike.brand][bike.model]) : []

  return (
    <div className="p-6">
      <div className="space-y-4">
        {/* Brand Selection */}
        <div className="space-y-2">
          <Label htmlFor={`${bikeName}-brand`} className="text-sm font-medium">
            Marke
          </Label>
          <Select
            value={bike?.brand || 'none'}
            onValueChange={handleBrandChange}
          >
            <SelectTrigger id={`${bikeName}-brand`}>
              <SelectValue placeholder="Marke wählen" />
            </SelectTrigger>
            <SelectContent>
              {allowClear && (
                <SelectItem value="none">Kein Bike</SelectItem>
              )}
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label
            htmlFor={`${bikeName}-model`}
            className={`text-sm font-medium ${!bike ? 'opacity-50' : ''}`}
          >
            Modell
          </Label>
          <Select
            value={bike?.model || ''}
            onValueChange={handleModelChange}
            disabled={!bike}
          >
            <SelectTrigger id={`${bikeName}-model`}>
              <SelectValue placeholder="Modell wählen" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size Selection */}
        <div className="space-y-2">
          <Label
            htmlFor={`${bikeName}-size`}
            className={`text-sm font-medium ${!bike ? 'opacity-50' : ''}`}
          >
            Größe
          </Label>
          <Select
            value={bike?.size || ''}
            onValueChange={handleSizeChange}
            disabled={!bike}
          >
            <SelectTrigger id={`${bikeName}-size`}>
              <SelectValue placeholder="Größe wählen" />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {bike && (
          <>
            <Separator className="my-4" />

            {/* Geometry Data */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Geometrie-Daten
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Stack</div>
                  <div className="font-medium">{bike.geometry.stack} mm</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reach</div>
                  <div className="font-medium">{bike.geometry.reach} mm</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Lenkkopfwinkel</div>
                  <div className="font-medium">{bike.geometry.headTubeAngle}°</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Sitzrohrwinkel</div>
                  <div className="font-medium">{bike.geometry.seatTubeAngle}°</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gabel-Länge</div>
                  <div className="font-medium">{bike.geometry.forkLength} mm</div>
                </div>
                <div>
                  <div className="text-muted-foreground">BB-Drop</div>
                  <div className="font-medium">{bike.geometry.bbDrop} mm</div>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Cockpit Setup */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Cockpit-Setup
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-spacer`} className="text-xs">
                    Spacerhöhe (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-spacer`}
                    type="number"
                    min={COCKPIT_LIMITS.spacerHeight.min}
                    max={COCKPIT_LIMITS.spacerHeight.max}
                    step={COCKPIT_LIMITS.spacerHeight.step}
                    value={bike.cockpit.spacerHeight}
                    onChange={(e) =>
                      handleCockpitChange('spacerHeight', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-headset`} className="text-xs">
                    Steuersatzabdeckung (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-headset`}
                    type="number"
                    min={COCKPIT_LIMITS.headsetCap.min}
                    max={COCKPIT_LIMITS.headsetCap.max}
                    step={COCKPIT_LIMITS.headsetCap.step}
                    value={bike.cockpit.headsetCap}
                    onChange={(e) =>
                      handleCockpitChange('headsetCap', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-stem-length`} className="text-xs">
                    Vorbaulänge (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-stem-length`}
                    type="number"
                    min={COCKPIT_LIMITS.stemLength.min}
                    max={COCKPIT_LIMITS.stemLength.max}
                    step={COCKPIT_LIMITS.stemLength.step}
                    value={bike.cockpit.stemLength}
                    onChange={(e) =>
                      handleCockpitChange('stemLength', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-stem-angle`} className="text-xs">
                    Vorbauwinkel (Grad)
                  </Label>
                  <Input
                    id={`${bikeName}-stem-angle`}
                    type="number"
                    min={COCKPIT_LIMITS.stemAngle.min}
                    max={COCKPIT_LIMITS.stemAngle.max}
                    step={COCKPIT_LIMITS.stemAngle.step}
                    value={bike.cockpit.stemAngle}
                    onChange={(e) =>
                      handleCockpitChange('stemAngle', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-handlebar`} className="text-xs">
                    Lenker Reach (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-handlebar`}
                    type="number"
                    min={COCKPIT_LIMITS.handlebarReach.min}
                    max={COCKPIT_LIMITS.handlebarReach.max}
                    step={COCKPIT_LIMITS.handlebarReach.step}
                    value={bike.cockpit.handlebarReach}
                    onChange={(e) =>
                      handleCockpitChange('handlebarReach', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-handlebar-drop`} className="text-xs">
                    Lenker Drop (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-handlebar-drop`}
                    type="number"
                    min={COCKPIT_LIMITS.handlebarDrop.min}
                    max={COCKPIT_LIMITS.handlebarDrop.max}
                    step={COCKPIT_LIMITS.handlebarDrop.step}
                    value={bike.cockpit.handlebarDrop}
                    onChange={(e) =>
                      handleCockpitChange('handlebarDrop', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
