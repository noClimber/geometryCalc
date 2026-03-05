'use client'

import { useState, useEffect, Suspense } from 'react'
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
import { Info, Heart, Share2, Check } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

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

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const stateParam = searchParams.get('state')

  const getSharedState = (): { a?: BikeData; b?: BikeData | null } | null => {
    if (!stateParam) return null
    try {
      return JSON.parse(decodeURIComponent(atob(stateParam)))
    } catch {
      return null
    }
  }
  const sharedState = getSharedState()

  const [bikeA, setBikeA] = useState<BikeData>(() => {
    if (sharedState?.a) return sharedState.a
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
        forkOffset: 0,
        wheelbase: 0,
        standoverHeight: 0,
      },
      cockpit: clampCockpitSetup({ ...DEFAULT_COCKPIT }),
      rider: { ...DEFAULT_RIDER },
    }
  })

  const [bikeB, setBikeB] = useState<BikeData | null>(sharedState?.b ?? null)
  // Alignment mode removed
  const [activeTab, setActiveTab] = useState('bikeA')
  const [isPedaling, setIsPedaling] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // URL nach dem Laden bereinigen
  useEffect(() => {
    if (stateParam) {
      router.replace('/', { scroll: false })
    }
  }, [stateParam, router])

  const handleShare = () => {
    const stateObj = { a: bikeA, b: bikeB }
    const encoded = btoa(encodeURIComponent(JSON.stringify(stateObj)))
    const shareUrl = `${window.location.origin}${window.location.pathname}?state=${encoded}`

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
    } else {
      // Fallback für HTTP / lokale IPs ohne Secure Context
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

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
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-background relative">
      {/* SVG/Visualization - sticky auf Mobile, rechts auf Desktop */}
      <div className="w-full h-[45vh] md:h-screen md:flex-1 bg-background p-2 md:p-6 sticky top-0 md:relative z-10 border-b md:border-b-0 border-border shadow-sm md:shadow-none md:order-last">
        <BikeVisualization
            bikeA={bikeA}
            bikeB={bikeB}
            isPedaling={isPedaling}
            setIsPedaling={setIsPedaling}
          />
      </div>
      {/* Sidebar - auf Mobile unten scrollbar, auf Desktop links */}
      <div className="w-full md:w-[380px] bg-card flex flex-col md:h-screen md:overflow-y-auto z-0 pb-10 md:pb-0">
        <div className="p-4 md:p-6 border-b border-border">
<div className="mb-0 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  VeloMetric
                </h1>
                <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider self-start mt-1">
                  Beta
                </span>
              </div>

              <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 h-8 text-xs"
              >
                {isCopied ? (
                  <><Check className="h-3.5 w-3.5 text-green-500" />Kopiert!</>
                ) : (
                  <><Share2 className="h-3.5 w-3.5" />Teilen</>
                )}
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                    <span className="sr-only">Info & Über</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Über das Projekt</DialogTitle>
                    <DialogDescription>
                      Ein privates Tool zur Visualisierung von Fahrrad-Setups.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4 text-sm">
                    <div className="bg-muted/50 p-3 rounded-md text-muted-foreground text-xs leading-relaxed">
                      <strong>Hinweis:</strong> Alle Werte sind mathematische Näherungen. Dieser Rechner ersetzt kein professionelles Bike-Fitting. Bei körperlichen Beschwerden bitte einen Experten konsultieren.
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-foreground text-xs uppercase tracking-wide">Dein Feedback hilft!</h4>
                      <p className="text-muted-foreground text-xs">
                        Fehlt dein Lieblings-Bike oder hast du einen Bug gefunden?
                      </p>
                      <Button asChild className="w-full gap-2 mt-2" variant="outline">
                        <a href="https://tally.so/r/w7X0Xy" target="_blank" rel="noopener noreferrer">
                          <Heart className="h-4 w-4 text-red-500 fill-red-500/10" />
                          Feedback geben
                        </a>
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 text-[10px] text-muted-foreground flex justify-between">
                    <span>Version 0.1</span>
                    <span>Private & Non-Commercial</span>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            </div>
            {/* Hier nur noch EIN erklärender Satz */}
            <p className="text-xs text-muted-foreground mt-1">
              Visualisiere Geometrien und vergleiche deine Sitzposition.
            </p>
          </div>
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

    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}
