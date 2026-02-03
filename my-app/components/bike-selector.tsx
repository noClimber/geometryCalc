'use client'

import type { BikeData, BikeGeometry, CockpitSetup, RiderSetup } from '@/types/bike'
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
  crankLength: 172.5,
  pedalAngle: 23,
  handPosition: 'hoods',
  seatPostLength: 240,
}

const DEFAULT_RIDER: RiderSetup = {
  riderHeight: 1800,
  riderInseam: 840,
  torsoAngle: 40,
  shoeThickness: 15,
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
      rider: { ...DEFAULT_RIDER },
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

  const handleCockpitChange = (field: Exclude<keyof CockpitSetup, 'handPosition'>, value: number) => {
    if (!bike) return
    const raw = Number.isFinite(value) ? value : bike.cockpit[field] as number
    const safeValue = clampCockpitValue(field, raw)
    setBike({
      ...bike,
      cockpit: {
        ...bike.cockpit,
        [field]: safeValue,
      },
    })
  }

  const handleRiderChange = (field: keyof RiderSetup, value: number) => {
    if (!bike) return
    const safeValue = Number.isFinite(value) ? value : bike.rider[field]
    setBike({
      ...bike,
      rider: {
        ...bike.rider,
        [field]: safeValue,
      },
    })
  }

  const handleHandPositionChange = (position: 'hoods' | 'drops') => {
    if (!bike) return
    setBike({
      ...bike,
      cockpit: {
        ...bike.cockpit,
        handPosition: position,
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
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-crank-length`} className="text-xs">
                    Kurbellänge (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-crank-length`}
                    type="number"
                    min={COCKPIT_LIMITS.crankLength.min}
                    max={COCKPIT_LIMITS.crankLength.max}
                    step={COCKPIT_LIMITS.crankLength.step}
                    value={bike.cockpit.crankLength}
                    onChange={(e) =>
                      handleCockpitChange('crankLength', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-pedal-angle`} className="text-xs">
                    Pedalwinkel (Grad)
                  </Label>
                  <Input
                    id={`${bikeName}-pedal-angle`}
                    type="number"
                    min={COCKPIT_LIMITS.pedalAngle.min}
                    max={COCKPIT_LIMITS.pedalAngle.max}
                    step={COCKPIT_LIMITS.pedalAngle.step}
                    value={bike.cockpit.pedalAngle}
                    onChange={(e) =>
                      handleCockpitChange('pedalAngle', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-seat-post-length`} className="text-xs">
                    Sattelstütze (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-seat-post-length`}
                    type="number"
                    min={COCKPIT_LIMITS.seatPostLength.min}
                    max={COCKPIT_LIMITS.seatPostLength.max}
                    step={COCKPIT_LIMITS.seatPostLength.step}
                    value={bike.cockpit.seatPostLength}
                    onChange={(e) =>
                      handleCockpitChange('seatPostLength', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
              </div>
              
              {/* Hand Position Toggle */}
              <div className="col-span-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground">Hoods</span>
                  <div className="relative h-5 w-16 bg-muted rounded-full p-0.5 flex items-center">
                    <div
                      className="absolute top-0.5 h-4 w-[calc(50%-0.125rem)] bg-primary rounded-full transition-all duration-200 ease-in-out"
                      style={{
                        transform: bike.cockpit.handPosition === 'drops' ? 'translateX(100%)' : 'translateX(0)',
                        left: '0.125rem',
                      }}
                    />
                    <button
                      onClick={() => handleHandPositionChange('hoods')}
                      className="relative z-10 flex-1 h-full"
                    />
                    <button
                      onClick={() => handleHandPositionChange('drops')}
                      className="relative z-10 flex-1 h-full"
                    />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">Drops</span>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Fahrerdaten */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Fahrerdaten
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-rider-height`} className="text-xs">
                    Körpergröße (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-rider-height`}
                    type="number"
                    min={1500}
                    max={2200}
                    step={10}
                    value={bike.rider.riderHeight}
                    onChange={(e) =>
                      handleRiderChange('riderHeight', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-rider-inseam`} className="text-xs">
                    Schrittlänge (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-rider-inseam`}
                    type="number"
                    min={700}
                    max={1100}
                    step={10}
                    value={bike.rider.riderInseam}
                    onChange={(e) =>
                      handleRiderChange('riderInseam', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-torso-angle`} className="text-xs">
                    Oberkörper Winkel (Grad)
                  </Label>
                  <Input
                    id={`${bikeName}-torso-angle`}
                    type="number"
                    min={0}
                    max={90}
                    step={1}
                    value={bike.rider.torsoAngle}
                    onChange={(e) =>
                      handleRiderChange('torsoAngle', Number(e.target.value))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${bikeName}-shoe-thickness`} className="text-xs">
                    Schuhdicke (mm)
                  </Label>
                  <Input
                    id={`${bikeName}-shoe-thickness`}
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={bike.rider.shoeThickness}
                    onChange={(e) =>
                      handleRiderChange('shoeThickness', Number(e.target.value))
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
