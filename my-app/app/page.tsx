'use client'

import { useState, useEffect } from 'react'
import { BikeSelector } from '@/components/bike-selector'
import BikeVisualization from '@/components/bike-visualization'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import bikesData from '@/data/bikes.json'
import { parseBikesData } from '@/lib/bikes-schema'
import { clampCockpitSetup, DEFAULT_COCKPIT, DEFAULT_RIDER, DEFAULT_BIKE_SELECTION } from '@/lib/defaults'
import type {
BikeData,
  BikeGeometry,
  CockpitSetup,
  RiderSetup,
  AvailableBikesMap,
} from '@/types/bike'

export type { BikeData, BikeGeometry, CockpitSetup, RiderSetup } from '@/types/bike'

/** Laufzeit-validierte Bike-Daten (Zod). Bei ungültiger JSON wird {} verwendet. */
const AVAILABLE_BIKES = parseBikesData(bikesData)

// Animation interval for pedal auto-rotation (milliseconds)
const PEDAL_ANIM_INTERVAL_MS = 30

function getFirstAvailableBike(): BikeData | null {
  const { brand, model, size } = DEFAULT_BIKE_SELECTION
  const geometry = AVAILABLE_BIKES[brand]?.[model]?.[size]
  if (!geometry) {
    // Fallback: Nimm das erste verfügbare Bike
    const fallbackBrand = Object.keys(AVAILABLE_BIKES)[0]
    if (!fallbackBrand) return null
    const fallbackModel = Object.keys(AVAILABLE_BIKES[fallbackBrand] ?? {})[0]
    if (!fallbackModel) return null
    const fallbackSize = Object.keys(AVAILABLE_BIKES[fallbackBrand][fallbackModel] ?? {})[0]
    if (!fallbackSize) return null
    const fallbackGeometry = AVAILABLE_BIKES[fallbackBrand][fallbackModel][fallbackSize]
    if (!fallbackGeometry) return null
    return {
      brand: fallbackBrand,
      model: fallbackModel,
      size: fallbackSize,
      geometry: fallbackGeometry,
      cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }),
      rider: { ...DEFAULT_RIDER },
    }
  }
  return {
    brand,
    model,
    size,
    geometry,
    cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }),
    rider: { ...DEFAULT_RIDER },
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
        headTubeLength: 0,
        seatTubeLength: 0,
        chainstayLength: 0,
        frontCenter: 0,
      },
      cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }),
      rider: { ...DEFAULT_RIDER },
    }
  })

  const [bikeB, setBikeB] = useState<BikeData | null>(null)
  // Alignment mode removed
  const [activeTab, setActiveTab] = useState('bikeA')
  const [isPedaling, setIsPedaling] = useState(false)

  // Auto-increment pedal angle when isPedaling is true
  useEffect(() => {
    if (!isPedaling) return

    const interval = setInterval(() => {
      setBikeA((prev) => ({
        ...prev,
        cockpit: {
          ...prev.cockpit,
          pedalAngle: (prev.cockpit.pedalAngle + 1) % 360,
        },
      }))
      
      if (bikeB) {
        setBikeB((prev) => {
          if (!prev) return null
          return {
            ...prev,
            cockpit: {
              ...prev.cockpit,
              pedalAngle: (prev.cockpit.pedalAngle + 1) % 360,
            },
          }
        })
      }
    }, PEDAL_ANIM_INTERVAL_MS) // interval in ms

    return () => clearInterval(interval)
  }, [isPedaling, bikeB])

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      {/* Sidebar - auf Mobile oben, auf Desktop links */}
      <div className="w-full md:w-[380px] h-[50vh] md:h-screen border-b md:border-r md:border-b-0 border-border bg-card overflow-y-auto flex flex-col">
        <div className="p-4 md:p-6 border-b border-border">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            Rennrad-Geometrie
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vergleichs-Tool</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 md:mx-6 mt-4 md:mt-6 grid w-auto grid-cols-2">
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

      {/* Main Area - Header entfernt, SVG-Bereich vergrößert */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-background p-4 md:p-6 h-full">
          <BikeVisualization
            bikeA={bikeA}
            bikeB={bikeB}
            isPedaling={isPedaling}
            setIsPedaling={setIsPedaling}
          />
        </div>
      </div>
    </div>
  )
}
