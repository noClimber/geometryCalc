'use client'

import { useState } from 'react'
import { BikeSelector } from '@/components/bike-selector'
import { BikeVisualization } from '@/components/bike-visualization'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import bikesData from '@/data/bikes.json'
import { parseBikesData } from '@/lib/bikes-schema'
import { clampCockpitSetup } from '@/lib/cockpit-limits'
import type {
  BikeData,
  BikeGeometry,
  CockpitSetup,
  AlignmentMode,
  AvailableBikesMap,
} from '@/types/bike'

export type { BikeData, BikeGeometry, CockpitSetup, AlignmentMode } from '@/types/bike'

/** Laufzeit-validierte Bike-Daten (Zod). Bei ungültiger JSON wird {} verwendet. */
const AVAILABLE_BIKES = parseBikesData(bikesData)

const DEFAULT_COCKPIT: CockpitSetup = {
  spacerHeight: 20,
  headsetCap: 5,
  stemLength: 110,
  stemAngle: -6,
  handlebarReach: 80,
  handlebarDrop: 125,
}

function getFirstAvailableBike(): BikeData | null {
  const brand = Object.keys(AVAILABLE_BIKES)[0]
  if (!brand) return null
  const model = Object.keys(AVAILABLE_BIKES[brand] ?? {})[0]
  if (!model) return null
  const size = Object.keys(AVAILABLE_BIKES[brand][model] ?? {})[0]
  if (!size) return null
  const geometry = AVAILABLE_BIKES[brand][model][size]
  if (!geometry) return null
  return {
    brand,
    model,
    size,
    geometry,
    cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }),
  }
}

export default function Home() {
  const [bikeA, setBikeA] = useState<BikeData>(() => {
    const first = getFirstAvailableBike()
    if (first) return first
    return {
      brand: '',
      model: '',
      size: '',
      geometry: {
        stack: 0,
        reach: 0,
        headTubeAngle: 0,
        seatTubeAngle: 0,
        forkLength: 0,
        bbDrop: 0,
      },
      cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }),
    }
  })

  const [bikeB, setBikeB] = useState<BikeData | null>(null)
  const [alignmentMode, setAlignmentMode] = useState<AlignmentMode>('bb')
  const [activeTab, setActiveTab] = useState('bikeA')

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-[380px] border-r border-border bg-card overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Rennrad-Geometrie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vergleichs-Tool</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-6 grid w-auto grid-cols-2">
            <TabsTrigger value="bikeA" className="data-[state=active]:bg-[oklch(0.55_0.22_27)]">
              Bike A
            </TabsTrigger>
            <TabsTrigger value="bikeB" className="data-[state=active]:bg-[oklch(0.6_0.2_240)]">
              Bike B
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bikeA" className="flex-1 mt-0">
            <BikeSelector
              bike={bikeA}
              setBike={(bike) => bike !== null && setBikeA(bike)}
              bikeName="Bike A"
              color="red"
              availableBikes={AVAILABLE_BIKES}
              allowClear={false}
            />
          </TabsContent>

          <TabsContent value="bikeB" className="flex-1 mt-0">
            <BikeSelector
              bike={bikeB}
              setBike={setBikeB}
              bikeName="Bike B"
              color="blue"
              availableBikes={AVAILABLE_BIKES}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-foreground">Ausrichtung:</div>
            <div className="flex gap-2">
              <Button
                variant={alignmentMode === 'bb' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAlignmentMode('bb')}
              >
                Tretlager
              </Button>
              <Button
                variant={alignmentMode === 'rear' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAlignmentMode('rear')}
              >
                Hinterrad
              </Button>
            </div>
          </div>
        </div>

        {/* Visualization */}
        <div className="flex-1 bg-background p-6">
          <BikeVisualization
            bikeA={bikeA}
            bikeB={bikeB}
            alignmentMode={alignmentMode}
          />
        </div>
      </div>
    </div>
  )
}
