'use client'

import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react" // Bitte sicherstellen, dass lucide-react installiert ist

// Helper für Inputs (unverändert)
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
      className="h-8 text-sm"
    />
  </div>
)

// NEU: Helper für Rows mit Label + Wert + Optional Tooltip
const GeoRow = ({ label, value, unit = "mm", tooltip }: { label: string, value: number | undefined, unit?: string, tooltip?: string }) => (
  <div className="flex justify-between items-center group">
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}</span>
      {tooltip && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px] text-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
    <span className="font-medium">{value ?? '-'} {unit}</span>
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
  
const [geoOpen, setGeoOpen] = useState(false)

  // ... (Handler bleiben exakt gleich wie in deinem Code) ...
  const handleBrandChange = (brand: string) => {
    if (brand === 'none') { setBike(null); return }
    const models = Object.keys(availableBikes[brand] ?? {}); const firstModel = models[0]
    const sizes = firstModel ? Object.keys(availableBikes[brand][firstModel] ?? {}) : []; const firstSize = sizes[0]
    if (!firstModel || !firstSize) return
    const geometry = availableBikes[brand][firstModel][firstSize]; if (!geometry) return
    setBike({ brand, model: firstModel, size: firstSize, geometry, cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }), rider: { ...DEFAULT_RIDER } })
  }
  const handleModelChange = (model: string) => { /* ... wie vorher ... */ 
      if (!bike) return; const sizes = Object.keys(availableBikes[bike.brand]?.[model] ?? {}); const firstSize = sizes[0]
      if (!firstSize) return; const geometry = availableBikes[bike.brand][model][firstSize]; if (!geometry) return
      setBike({ ...bike, model, size: firstSize, geometry })
  }
  const handleSizeChange = (size: string) => { /* ... wie vorher ... */ 
      if (!bike) return; const geometry = availableBikes[bike.brand]?.[bike.model]?.[size]; if (!geometry) return
      setBike({ ...bike, size, geometry })
  }
  const handleCockpitChange = (field: any, value: number) => { /* ... wie vorher ... */ 
      if (!bike) return; const raw = Number.isFinite(value) ? value : (bike.cockpit as any)[field] ?? 0
      const safeValue = clampCockpitValue(field as any, raw); setBike({ ...bike, cockpit: { ...bike.cockpit, [field]: safeValue } })
  }
  const handleRiderChange = (field: keyof RiderSetup, value: number) => {
    if (!bike) return
    const safeValue = Number.isFinite(value) ? value : bike.rider[field]
    setBike({ ...bike, rider: { ...bike.rider, [field]: safeValue } })
  }
  const handleHandPositionChange = (position: 'hoods' | 'drops') => { /* ... wie vorher ... */ 
      if (!bike) return; setBike({ ...bike, cockpit: { ...bike.cockpit, handPosition: position } })
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
                  {models.map((model) => (<SelectItem key={model} value={model}>{model}</SelectItem>))}
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
                  {sizes.map((size) => (<SelectItem key={size} value={size}>{size}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {bike && (
          <>
            <Separator />

                        {/* --- SEKTION 2: GEOMETRIE (EINKLAPPBAR) --- */}
            <div className="space-y-1">
              {/* Header als Button (Trigger) */}
              <button 
                type="button"
                onClick={() => setGeoOpen(!geoOpen)} // Du brauchst einen State: const [geoOpen, setGeoOpen] = useState(true)
                className="flex w-full items-center justify-between py-2 hover:opacity-80 transition-opacity"
              >
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  Geometrie Basis
                  {/* Kleines Badge wie viele Werte da sind */}
                  <span className="bg-muted text-[10px] px-1.5 py-0.5 rounded-full font-normal text-muted-foreground">
                    12 Werte
                  </span>
                </h3>
                {/* Chevron Icon dreht sich */}
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${geoOpen ? 'rotate-90' : ''}`} />
              </button>

              {/* Inhalt (Animation via CSS Klasse oder einfach konditional) */}
              {geoOpen && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-md border border-border/50 animate-in slide-in-from-top-2 duration-200">
                  {/* Jetzt EINSPALTIG: space-y-1 statt grid */}
                                    <div className="space-y-1">
                    <GeoRow 
                      label="Stack" 
                      value={bike.geometry.stack} 
                      tooltip="Vertikaler Abstand vom Tretlager zur Oberkante Steuerrohr. Ein hoher Wert bedeutet eine aufrechte, komfortable Position." 
                    />
                    <GeoRow 
                      label="Reach" 
                      value={bike.geometry.reach} 
                      tooltip="Horizontaler Abstand vom Tretlager zur Oberkante Steuerrohr. Ein langer Reach bedeutet eine gestreckte, sportliche Haltung." 
                    />
                    
                    <div className="h-px bg-border/40 my-2" /> 
                    
                    <GeoRow 
                      label="Lenkwinkel" 
                      value={bike.geometry.headTubeAngle} 
                      unit="°" 
                      tooltip="Der Winkel der Gabel zum Boden. Flacher (<72°) sorgt für Laufruhe, steiler (>73°) für agiles, direktes Lenkverhalten." 
                    />
                    <GeoRow 
                      label="Sitzwinkel" 
                      value={bike.geometry.seatTubeAngle} 
                      unit="°" 
                      tooltip="Winkel des Sitzrohrs. Steiler (>74°) bringt dich weiter nach vorne über das Tretlager (gut für Aerodynamik/Kraft)." 
                    />
                    
                    <div className="h-px bg-border/40 my-2" />
                    
                    <GeoRow 
                      label="Radstand" 
                      value={bike.geometry.wheelbase} 
                      tooltip="Abstand zwischen den Radachsen. Ein langer Radstand erhöht die Stabilität bei hohem Tempo, ein kurzer macht das Rad wendiger." 
                    />
                    <GeoRow 
                      label="Überstand" 
                      value={bike.geometry.standoverHeight} 
                      tooltip="Abstand vom Boden zur Oberrohrmitte. Wichtig, um beim Anhalten sicher über dem Rahmen stehen zu können." 
                    />
                    
                    <div className="h-px bg-border/40 my-2" />

                    <GeoRow 
                      label="Gabel-Offset" 
                      value={bike.geometry.forkOffset} 
                      tooltip="Auch 'Rake' genannt. Die Vorbiegung der Gabel. Beeinflusst zusammen mit dem Lenkwinkel den Nachlauf und damit die Lenkstabilität." 
                    />
                    <GeoRow 
                      label="Gabel-Länge" 
                      value={bike.geometry.forkLength} 
                      tooltip="Einbaulänge der Gabel von Achse bis Gabelkonus. Beeinflusst die Front-Höhe." 
                    />
                    <GeoRow 
                      label="BB Drop" 
                      value={bike.geometry.bbDrop} 
                      tooltip="Tretlagerabsenkung gegenüber den Radachsen. Mehr Drop = tieferer Schwerpunkt und stabileres Kurvenverhalten." 
                    />
                    <GeoRow 
                      label="Steuerrohr" 
                      value={bike.geometry.headTubeLength} 
                      tooltip="Länge des Steuerrohrs. Ein langes Steuerrohr hebt den Lenker an (höherer Stack) und reduziert meist die Notwendigkeit von Spacern." 
                    />
                    <GeoRow 
                      label="Sitzrohr" 
                      value={bike.geometry.seatTubeLength} 
                      tooltip="Länge des Sitzrohrs vom Tretlager bis zur Oberkante. Bestimmt oft die Rahmengröße und wie weit die Sattelstütze herausragt." 
                    />
                    <GeoRow 
                      label="Kettenstrebe" 
                      value={bike.geometry.chainstayLength} 
                      tooltip="Länge der hinteren Streben. Kurze Streben (<410mm) machen das Rad agil und reaktiv beim Antritt, lange sorgen für Laufruhe." 
                    />
                    <GeoRow 
                      label="Front Center" 
                      value={bike.geometry.frontCenter} 
                      tooltip="Abstand Tretlager zur Vorderradachse. Wichtig um zu prüfen, ob die Fußspitze das Vorderrad berühren kann (Toe Overlap)." 
                    />
                  </div>

                </div>
              )}
            </div>


            <Separator />

            {/* --- SEKTION 3: INDIVIDUELLES SETUP --- */}
            <div className="space-y-6">
              
              {/* 3a. COCKPIT & FRONT */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Cockpit & Front</h3>
                  {/* ... Dein Toggle (unverändert) ... */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wide">Griff:</span>
                    <div className="flex items-center gap-1.5 cursor-pointer group bg-muted/30 p-1 rounded-full border border-border/30 hover:bg-muted/50 transition-colors"
                         onClick={() => handleHandPositionChange(bike.cockpit.handPosition === 'hoods' ? 'drops' : 'hoods')}>
                       {/* ... Toggle Content ... */}
                       <span className={`text-[10px] font-medium px-1.5 transition-colors ${bike.cockpit.handPosition === 'hoods' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>Hoods</span>
                       <div className="relative h-3.5 w-7 bg-muted/80 rounded-full border border-border/20 shadow-inner">
                         <div className="absolute top-0.5 h-2.5 w-2.5 bg-primary rounded-full shadow-sm transition-transform duration-200 ease-out"
                              style={{ transform: bike.cockpit.handPosition === 'drops' ? 'translateX(0.875rem)' : 'translateX(0)', left: '0.125rem' }} />
                       </div>
                       <span className={`text-[10px] font-medium px-1.5 transition-colors ${bike.cockpit.handPosition === 'drops' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>Drops</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SetupInput id={`${bikeName}-stem-len`} label="Vorbaulänge" suffix="mm" value={bike.cockpit.stemLength} onChange={(v) => handleCockpitChange('stemLength', v)} />
                  <SetupInput id={`${bikeName}-stem-ang`} label="Winkel" suffix="°" value={bike.cockpit.stemAngle} onChange={(v) => handleCockpitChange('stemAngle', v)} />
                  <SetupInput id={`${bikeName}-spacer`} label="Spacer" suffix="mm" value={bike.cockpit.spacerHeight} onChange={(v) => handleCockpitChange('spacerHeight', v)} />
                  <SetupInput id={`${bikeName}-topcap`} label="Top Cap" suffix="mm" value={bike.cockpit.headsetCap} onChange={(v) => handleCockpitChange('headsetCap', v)} />
                  <SetupInput id={`${bikeName}-reach`} label="Lenker Reach" suffix="mm" value={bike.cockpit.handlebarReach} onChange={(v) => handleCockpitChange('handlebarReach', v)} />
                  <SetupInput id={`${bikeName}-drop`} label="Lenker Drop" suffix="mm" value={bike.cockpit.handlebarDrop} onChange={(v) => handleCockpitChange('handlebarDrop', v)} />
                </div>
              </div>

              <div className="border-t border-border/40" />
              {/* 3b. SITZBEREICH (wie gehabt) */}
               <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Sitzposition</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SetupInput id={`${bikeName}-seatpost`} label="Sattelstütze" suffix="Auszug" value={bike.cockpit.seatPostLength} onChange={(v) => handleCockpitChange('seatPostLength', v)} />
                  <SetupInput id={`${bikeName}-setback`} label="Setback" suffix="mm" value={bike.cockpit.saddleSetback ?? 80} onChange={(v) => handleCockpitChange('saddleSetback', v)} />
                  <SetupInput id={`${bikeName}-saddle`} label="Sattellänge" suffix="mm" value={bike.cockpit.saddleLength ?? 255} onChange={(v) => handleCockpitChange('saddleLength', v)} />
                  <SetupInput id={`${bikeName}-offset`} label="Sitzposition" suffix="Offset" value={bike.cockpit.sitboneOffset ?? -20} onChange={(v) => handleCockpitChange('sitboneOffset', v)} />
                </div>
              </div>

              <div className="border-t border-border/40" />
              {/* 3c. ANTRIEB & FAHRER (wie gehabt) */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Antrieb</h3>
                <div className="grid grid-cols-2 gap-3">
                   <SetupInput id={`${bikeName}-crank`} label="Kurbellänge" suffix="mm" value={bike.cockpit.crankLength} onChange={(v) => handleCockpitChange('crankLength', v)} />
                   <SetupInput id={`${bikeName}-pedal`} label="Pedalwinkel" suffix="°" value={bike.cockpit.pedalAngle} onChange={(v) => handleCockpitChange('pedalAngle', v)} />
                </div>
              </div>

               <div className="border-t border-border/40" />
               
               <div className="space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Fahrer Körpermaße</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <SetupInput id={`${bikeName}-height`} label="Körpergröße" suffix="mm" value={bike.rider.riderHeight} onChange={(v) => handleRiderChange('riderHeight', v)} min={1500} max={2200} step={10} />
                    <SetupInput id={`${bikeName}-inseam`} label="Schrittlänge" suffix="mm" value={bike.rider.riderInseam} onChange={(v) => handleRiderChange('riderInseam', v)} min={700} max={1100} step={10} />
                    <SetupInput id={`${bikeName}-torso`} label="Rückenwinkel" suffix="°" value={bike.rider.torsoAngle} onChange={(v) => handleRiderChange('torsoAngle', v)} min={0} max={90} />
                    <SetupInput id={`${bikeName}-shoe`} label="Schuhdicke" suffix="mm" value={bike.rider.shoeThickness} onChange={(v) => handleRiderChange('shoeThickness', v)} min={0} max={50} />
                 </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
