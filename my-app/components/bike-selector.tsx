'use client'

import type { BikeData, BikeGeometry, CockpitSetup, RiderSetup } from '@/types/bike'
import type { AvailableBikesMap } from '@/types/bike'
import { COCKPIT_LIMITS, clampCockpitValue, clampCockpitSetup, DEFAULT_COCKPIT, DEFAULT_RIDER } from '@/lib/defaults'
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

// Kleines Helper-Component für konsistente Input-Felder
// Spart Wiederholungen und macht den Code lesbarer
const SetupInput = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix
}: {
  id: string
  label: string
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs text-muted-foreground font-medium">
      {label} {suffix && <span className="text-[10px] opacity-70">({suffix})</span>}
    </Label>
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 text-sm" // Kompakteres Design
    />
  </div>
)

type BikeSelectorProps = {
  bike: BikeData | null
  setBike: (bike: BikeData | null) => void
  bikeName: string
  color: 'red' | 'blue'
  availableBikes: AvailableBikesMap
  allowClear?: boolean
}

export function BikeSelector({
  bike,
  setBike,
  bikeName,
  color,
  availableBikes,
  allowClear = true,
}: BikeSelectorProps) {
  
  // --- Handlers (Unverändert, nur Typen genutzt) ---
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

  const handleCockpitChange = (
    field: Exclude<keyof CockpitSetup, 'handPosition'> | 'saddleLength' | 'saddleSetback',
    value: number
  ) => {
    if (!bike) return
    const raw = Number.isFinite(value)
      ? value
      : (bike.cockpit as any)[field] ?? (field === 'saddleLength' ? 255 : field === 'saddleSetback' ? 80 : 0)
    const safeValue = clampCockpitValue(field as any, raw)
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
      <div className="space-y-6">
        
        {/* --- SEKTION 1: BIKE AUSWAHL --- */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${bikeName}-brand`} className="text-sm font-semibold">Marke</Label>
            <Select value={bike?.brand || 'none'} onValueChange={handleBrandChange}>
              <SelectTrigger id={`${bikeName}-brand`} className="h-9">
                <SelectValue placeholder="Marke wählen" />
              </SelectTrigger>
              <SelectContent>
                {allowClear && <SelectItem value="none">Kein Bike</SelectItem>}
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`${bikeName}-model`} className={`text-sm font-semibold ${!bike ? 'opacity-50' : ''}`}>Modell</Label>
              <Select value={bike?.model || ''} onValueChange={handleModelChange} disabled={!bike}>
                <SelectTrigger id={`${bikeName}-model`} className="h-9">
                  <SelectValue placeholder="Modell" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${bikeName}-size`} className={`text-sm font-semibold ${!bike ? 'opacity-50' : ''}`}>Größe</Label>
              <Select value={bike?.size || ''} onValueChange={handleSizeChange} disabled={!bike}>
                <SelectTrigger id={`${bikeName}-size`} className="h-9">
                  <SelectValue placeholder="Größe" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {bike && (
          <>
            <Separator />

            {/* --- SEKTION 2: GEOMETRIE (READ-ONLY) --- */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Geometrie Basis</h3>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm bg-muted/30 p-3 rounded-md border border-border/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stack</span>
                  <span className="font-medium">{bike.geometry.stack} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reach</span>
                  <span className="font-medium">{bike.geometry.reach} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lenkwinkel</span>
                  <span className="font-medium">{bike.geometry.headTubeAngle}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sitzwinkel</span>
                  <span className="font-medium">{bike.geometry.seatTubeAngle}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gabel</span>
                  <span className="font-medium">{bike.geometry.forkLength} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BB Drop</span>
                  <span className="font-medium">{bike.geometry.bbDrop} mm</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* --- SEKTION 3: INDIVIDUELLES SETUP --- */}
            <div className="space-y-6">
              
              {/* 3a. COCKPIT & FRONT */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Cockpit & Front</h3>
                  
                  {/* Hand Position Toggle mit Label */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wide">Griff:</span>
                    <div 
                      className="flex items-center gap-1.5 cursor-pointer group bg-muted/30 p-1 rounded-full border border-border/30 hover:bg-muted/50 transition-colors"
                      onClick={() => handleHandPositionChange(bike.cockpit.handPosition === 'hoods' ? 'drops' : 'hoods')}
                    >
                      <span 
                          className={`text-[10px] font-medium px-1.5 transition-colors ${
                              bike.cockpit.handPosition === 'hoods' ? 'text-primary font-semibold' : 'text-muted-foreground'
                          }`}
                      >
                          Hoods
                      </span>
                      
                      <div className="relative h-3.5 w-7 bg-muted/80 rounded-full border border-border/20 shadow-inner">
                        <div
  className="absolute top-0.5 h-2.5 w-2.5 bg-primary rounded-full shadow-sm transition-transform duration-200 ease-out"
  style={{
    transform: bike.cockpit.handPosition === 'drops' ? 'translateX(0.875rem)' : 'translateX(0)',
    left: '0.125rem',
  }}
/>
                      </div>

                      <span 
                          className={`text-[10px] font-medium px-1.5 transition-colors ${
                              bike.cockpit.handPosition === 'drops' ? 'text-primary font-semibold' : 'text-muted-foreground'
                          }`}
                      >
                          Drops
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SetupInput id={`${bikeName}-stem-len`} label="Vorbaulänge" suffix="mm"
                    value={bike.cockpit.stemLength} onChange={(v) => handleCockpitChange('stemLength', v)} />
                  <SetupInput id={`${bikeName}-stem-ang`} label="Winkel" suffix="°"
                    value={bike.cockpit.stemAngle} onChange={(v) => handleCockpitChange('stemAngle', v)} />
                  
                  <SetupInput id={`${bikeName}-spacer`} label="Spacer" suffix="mm"
                    value={bike.cockpit.spacerHeight} onChange={(v) => handleCockpitChange('spacerHeight', v)} />
                  <SetupInput id={`${bikeName}-topcap`} label="Top Cap" suffix="mm"
                    value={bike.cockpit.headsetCap} onChange={(v) => handleCockpitChange('headsetCap', v)} />
                  
                  <SetupInput id={`${bikeName}-reach`} label="Lenker Reach" suffix="mm"
                    value={bike.cockpit.handlebarReach} onChange={(v) => handleCockpitChange('handlebarReach', v)} />
                  <SetupInput id={`${bikeName}-drop`} label="Lenker Drop" suffix="mm"
                    value={bike.cockpit.handlebarDrop} onChange={(v) => handleCockpitChange('handlebarDrop', v)} />
                </div>
              </div>


              <div className="border-t border-border/40" />

              {/* 3b. SITZBEREICH */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Sitzposition</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SetupInput id={`${bikeName}-seatpost`} label="Sattelstütze" suffix="Auszug"
                    value={bike.cockpit.seatPostLength} onChange={(v) => handleCockpitChange('seatPostLength', v)} />
                  <SetupInput id={`${bikeName}-setback`} label="Setback" suffix="mm"
                    value={bike.cockpit.saddleSetback ?? 80} onChange={(v) => handleCockpitChange('saddleSetback', v)} />
                  
                  <SetupInput id={`${bikeName}-saddle`} label="Sattellänge" suffix="mm"
                    value={bike.cockpit.saddleLength ?? 255} onChange={(v) => handleCockpitChange('saddleLength', v)} />
                  <SetupInput id={`${bikeName}-offset`} label="Sitzposition" suffix="Offset"
                    value={bike.cockpit.sitboneOffset ?? -20} onChange={(v) => handleCockpitChange('sitboneOffset', v)} />
                </div>
              </div>

              <div className="border-t border-border/40" />

              {/* 3c. ANTRIEB */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Antrieb</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SetupInput id={`${bikeName}-crank`} label="Kurbellänge" suffix="mm"
                    value={bike.cockpit.crankLength} onChange={(v) => handleCockpitChange('crankLength', v)} />
                  <SetupInput id={`${bikeName}-pedal`} label="Pedalwinkel" suffix="°"
                    value={bike.cockpit.pedalAngle} onChange={(v) => handleCockpitChange('pedalAngle', v)} />
                </div>
              </div>
              
              <div className="border-t border-border/40" />

              {/* 3d. FAHRERDATEN */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Fahrer Körpermaße</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <SetupInput id={`${bikeName}-height`} label="Körpergröße" suffix="mm"
                      value={bike.rider.riderHeight} min={1500} max={2200} step={10} 
                      onChange={(v) => handleRiderChange('riderHeight', v)} />
                    <SetupInput id={`${bikeName}-inseam`} label="Schrittlänge" suffix="mm"
                      value={bike.rider.riderInseam} min={700} max={1100} step={10}
                      onChange={(v) => handleRiderChange('riderInseam', v)} />
                    
                    <SetupInput id={`${bikeName}-torso`} label="Rückenwinkel" suffix="°"
                      value={bike.rider.torsoAngle} min={0} max={90}
                      onChange={(v) => handleRiderChange('torsoAngle', v)} />
                    <SetupInput id={`${bikeName}-shoe`} label="Schuhdicke" suffix="mm"
                      value={bike.rider.shoeThickness} min={0} max={50}
                      onChange={(v) => handleRiderChange('shoeThickness', v)} />
                 </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
