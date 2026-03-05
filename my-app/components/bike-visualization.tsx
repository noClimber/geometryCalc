'use client'

import type { BikeData } from '@/types/bike'
import {
  calculateBikeGeometry,
  type BikeGeometryResult,
  WHEEL_POINT_IDS,
  KEY_POINT_IDS,
  SCALE,
} from '@/lib/bike-geometry'
import {
  KNEE_90_MIN,
  KNEE_90_MAX,
  KNEE_90_MIN_WARNING,
  KNEE_90_MAX_WARNING,
  KNEE_270_MIN,
  KNEE_270_MIN_WARNING,
  SADDLE_HANDLEBAR_DROP_WARNING,
  SADDLE_HANDLEBAR_DROP_CRITICAL,
  KNEE_PEDAL_X_MIN_WARNING,
  SHOULDER_ANGLE_MIN,
  SHOULDER_ANGLE_MIN_WARNING,
  SHOULDER_ANGLE_MAX_WARNING,
  SHOULDER_ANGLE_MAX,
  ELBOW_ANGLE_MIN_WARNING,
  ELBOW_ANGLE_MAX_WARNING,
  ELBOW_ANGLE_CRITICAL,
  ANKLE_MIN,
} from '@/lib/warning-thresholds'
import { Card } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useState, useRef, type MouseEvent, type WheelEvent, type TouchEvent } from 'react'
import { HelpCircle, ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'

const round = (v: number) => Math.round(v * 100) / 100

type BikeVisualizationProps = {
  bikeA: BikeData | null
  bikeB: BikeData | null
  isPedaling: boolean
  setIsPedaling: (v: boolean) => void
}

const BikeVisualization = ({
  bikeA,
  bikeB,
  isPedaling,
  setIsPedaling,
}: BikeVisualizationProps) => {
  const [viewState, setViewState] = useState({ zoom: 0.7, pan: { x: 120, y: -170 } })
  const handleZoomIn = () => setViewState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))
  const handleZoomOut = () => setViewState(prev => ({ ...prev, zoom: Math.max(0.5, prev.zoom / 1.2) }))
  const handleResetView = () => setViewState({ zoom: 0.7, pan: { x: 120, y: -170 } })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [measurePoints, setMeasurePoints] = useState<Array<{id: string, bike: 'A' | 'B'}>>([])
  const [measureMode, setMeasureMode] = useState(false)
  const [riderVisible, setRiderVisible] = useState(true)
  const [measurementsExpanded, setMeasurementsExpanded] = useState(false)
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const { zoom, pan } = viewState

  /** Zoom zum Mauszeiger: Der Punkt unter dem Cursor bleibt beim Zoomen fixiert. */
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    if (!svg || !ctm) {
      setViewState((prev) => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(5, prev.zoom * delta)),
      }))
      return
    }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const viewBoxPoint = pt.matrixTransform(ctm.inverse())
    setViewState((prev) => {
      const newZoom = Math.max(0.5, Math.min(5, prev.zoom * delta))
      const cx = viewBoxPoint.x / prev.zoom - prev.pan.x / prev.zoom ** 2
      const cy = viewBoxPoint.y / prev.zoom - prev.pan.y / prev.zoom ** 2
      return {
        zoom: newZoom,
        pan: {
          x: viewBoxPoint.x * newZoom - cx * newZoom ** 2,
          y: viewBoxPoint.y * newZoom - cy * newZoom ** 2,
        },
      }
    })
  }

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setViewState((prev) => ({
        ...prev,
        pan: {
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        },
      }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Single finger - pan
      setIsDragging(true)
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y })
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      setLastTouchDistance(getTouchDistance(e.touches))
    }
  }

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    
    if (e.touches.length === 1 && isDragging && lastTouchDistance === null) {
      // Single finger pan
      setViewState((prev) => ({
        ...prev,
        pan: {
          x: e.touches[0].clientX - dragStart.x,
          y: e.touches[0].clientY - dragStart.y,
        },
      }))
    } else if (e.touches.length === 2) {
      // Two finger pinch zoom
      const currentDistance = getTouchDistance(e.touches)
      if (currentDistance && lastTouchDistance) {
        const delta = currentDistance / lastTouchDistance
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        
        const svg = svgRef.current
        const ctm = svg?.getScreenCTM()
        
        if (svg && ctm) {
          const pt = svg.createSVGPoint()
          pt.x = centerX
          pt.y = centerY
          const viewBoxPoint = pt.matrixTransform(ctm.inverse())
          
          setViewState((prev) => {
            const newZoom = Math.max(0.5, Math.min(5, prev.zoom * delta))
            const cx = viewBoxPoint.x / prev.zoom - prev.pan.x / prev.zoom ** 2
            const cy = viewBoxPoint.y / prev.zoom - prev.pan.y / prev.zoom ** 2
            return {
              zoom: newZoom,
              pan: {
                x: viewBoxPoint.x * newZoom - cx * newZoom ** 2,
                y: viewBoxPoint.y * newZoom - cy * newZoom ** 2,
              },
            }
          })
        } else {
          setViewState((prev) => ({
            ...prev,
            zoom: Math.max(0.5, Math.min(5, prev.zoom * delta)),
          }))
        }
        
        setLastTouchDistance(currentDistance)
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setLastTouchDistance(null)
  }

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if (measureMode && measurePoints.length === 2) {
      // Nur zurücksetzen wenn auf Hintergrund geklickt (nicht auf Punkt)
      const target = e.target as SVGElement
      if (target.tagName === 'svg' || target.tagName === 'g') {
        setMeasurePoints([])
      }
    }
  }

  const geometryA: BikeGeometryResult | null = bikeA
    ? calculateBikeGeometry(bikeA)
    : null
  const geometryB: BikeGeometryResult | null = bikeB
    ? calculateBikeGeometry(bikeB)
    : null

  // Immer alle Punkte für die ViewBox-Berechnung verwenden, unabhängig von riderVisible
  const allPoints = [
    ...(geometryA ? Object.values(geometryA.points) : []),
    ...(geometryB ? Object.values(geometryB.points) : []),
  ]

  if (allPoints.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">Wählen Sie ein Bike aus, um zu beginnen</p>
      </Card>
    )
  }

  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)
  const minX = round(Math.min(...xs) - 50)
  const maxX = round(Math.max(...xs) + 50)
  const minY = round(Math.min(...ys) - 50)
  const maxY = round(Math.max(...ys) + 50)
  const width = round(maxX - minX)
  const height = round(maxY - minY)

  // Berechne Messlinie und Distanz
  let measureDistance = 0
  let measureDx = 0
  let measureDy = 0
  let measureLine: { x1: number; y1: number; x2: number; y2: number } | null = null
  if (measurePoints.length === 2) {
    const pt1 = measurePoints[0]
    const pt2 = measurePoints[1]
    const geom1 = pt1.bike === 'A' ? geometryA : geometryB
    const geom2 = pt2.bike === 'A' ? geometryA : geometryB
    
    if (geom1 && geom2) {
      const p1 = geom1.points[pt1.id]
      const p2 = geom2.points[pt2.id]
      if (p1 && p2) {
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const distPx = Math.sqrt(dx * dx + dy * dy)
        measureDistance = distPx / SCALE // zurück in mm
        measureDx = dx / SCALE // X-Komponente in mm
        measureDy = dy / SCALE // Y-Komponente in mm
        measureLine = { x1: round(p1.x), y1: round(p1.y), x2: round(p2.x), y2: round(p2.y) }
      }
    }
  }

  const renderBike = (
    result: BikeGeometryResult,
    color: string,
    opacity: number,
    bikeId: 'A' | 'B'
  ) => {
    const { points, segments, riderSegments } = result

    const handlePointClick = (id: string) => {
      if (!measureMode) return
      setMeasurePoints((prev) => {
        const existing = prev.find((p) => p.id === id && p.bike === bikeId)
        if (existing) {
          return prev.filter((p) => !(p.id === id && p.bike === bikeId))
        }
        if (prev.length >= 2) {
          return [{id, bike: bikeId}]
        }
        return [...prev, {id, bike: bikeId}]
      })
    }

    return (
      <g>
        {/* Linien aus Segmenten (Rahmen, Cockpit, später Fahrer/Hinterbau) */}
        {segments.map(({ from, to }) => {
          const a = points[from]
          const b = points[to]
          if (!a || !b) return null
          return (
            <line
              key={`${from}-${to}`}
              x1={round(a.x)}
              y1={round(a.y)}
              x2={round(b.x)}
              y2={round(b.y)}
              stroke={color}
              strokeWidth="2"
              opacity={opacity}
            />
          )
        })}

        {/* Fahrer-Beine (grün) */}
        {riderVisible && riderSegments?.map(({ from, to }) => {
          const a = points[from]
          const b = points[to]
          if (!a || !b) return null
          return (
            <line
              key={`rider-${from}-${to}`}
              x1={round(a.x)}
              y1={round(a.y)}
              x2={round(b.x)}
              y2={round(b.y)}
              stroke="#22c55e"
              strokeWidth="3"
              opacity={opacity}
            />
          )
        })}

        {/* Fahrer-Kopf (Ellipse) */}
        {riderVisible && points.headCenter && points.neckTop && (() => {
          const headHeight = 1800 * 0.12 * SCALE
          const headWidth = headHeight * 0.7
          // Berechne Rotationswinkel aus Hals-Richtung (60° Standard)
          const neckAngleDeg = 120
          return (
            <ellipse
              cx={round(points.headCenter.x)}
              cy={round(points.headCenter.y)}
              rx={round(headWidth / 2)}
              ry={round(headHeight / 2)}
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              opacity={opacity}
              transform={`rotate(${neckAngleDeg + 90}, ${round(points.headCenter.x)}, ${round(points.headCenter.y)})`}
            />
          )
        })()}

        {/* Räder: Außendurchmesser 690mm, Felgendurchmesser 622mm (skaliert) */}
        {WHEEL_POINT_IDS.map((id) => {
          const p = points[id]
          if (!p) return null
          const tireRadius = (690 / 2) * SCALE
          const aeroRimRadius = (690 / 2 - 15) * SCALE
          const rimRadius = (622 / 2) * SCALE
          const hubR = 6
          const spokeHubR = 10
          const isFront = id === 'frontWheel'
          const spokeCount = isFront ? 16 : 24

          // Speichen berechnen
          const spokes: { x1: number; y1: number; x2: number; y2: number }[] = []
          if (isFront) {
            // Radiale Speichen
            for (let i = 0; i < spokeCount; i++) {
              const rad = (i * 2 * Math.PI) / spokeCount
              spokes.push({
                x1: round(p.x + spokeHubR * Math.cos(rad)),
                y1: round(p.y + spokeHubR * Math.sin(rad)),
                x2: round(p.x + rimRadius * Math.cos(rad)),
                y2: round(p.y + rimRadius * Math.sin(rad)),
              })
            }
          } else {
            // Gekreuzte Speichen (2×12)
            const half = spokeCount / 2
            const crossRad = (35 * Math.PI) / 180
            for (let i = 0; i < half; i++) {
              const startRad = (i * 2 * Math.PI) / half
              spokes.push({
                x1: round(p.x + spokeHubR * Math.cos(startRad)),
                y1: round(p.y + spokeHubR * Math.sin(startRad)),
                x2: round(p.x + rimRadius * Math.cos(startRad + crossRad)),
                y2: round(p.y + rimRadius * Math.sin(startRad + crossRad)),
              })
            }
            for (let i = 0; i < half; i++) {
              const startRad = (i * 2 * Math.PI) / half + Math.PI / half
              spokes.push({
                x1: round(p.x + spokeHubR * Math.cos(startRad)),
                y1: round(p.y + spokeHubR * Math.sin(startRad)),
                x2: round(p.x + rimRadius * Math.cos(startRad - crossRad)),
                y2: round(p.y + rimRadius * Math.sin(startRad - crossRad)),
              })
            }
          }

          const discRadius = (160 / 3) * SCALE
          const isRear = id === 'rearWheel'
          const cassetteRadii = [10, 15, 20, 26]

          return (
            <g key={id}>
              {/* Speichen */}
              {spokes.map((s, i) => (
                <line
                  key={`spoke-${i}`}
                  x1={s.x1} y1={s.y1}
                  x2={s.x2} y2={s.y2}
                  stroke="#888"
                  strokeWidth="1"
                  opacity="0.25"
                />
              ))}
              {/* Bremsscheibe */}
              <circle
                cx={round(p.x)} cy={round(p.y)}
                r={round(discRadius)}
                stroke="#94a3b8"
                strokeWidth="3"
                strokeDasharray="8,4"
                fill="none"
                opacity={0.4}
              />
              {/* Kassette (nur Hinterrad) */}
              {isRear && (
                <g>
                  {cassetteRadii.map((r) => (
                    <circle
                      key={`cassette-${r}`}
                      cx={round(p.x)} cy={round(p.y)}
                      r={r}
                      stroke="#64748b"
                      strokeWidth="2"
                      fill="none"
                      opacity={0.5}
                    />
                  ))}
                </g>
              )}
              {/* Aero-Carbon-Felge (dicker Ring) */}
              <circle
                cx={round(p.x)} cy={round(p.y)}
                r={round(aeroRimRadius)}
                stroke={color}
                strokeWidth="14"
                fill="none"
                opacity={0.22}
              />
              {/* Felgenbett (innen) */}
              <circle
                cx={round(p.x)} cy={round(p.y)}
                r={round(rimRadius)}
                stroke={color}
                strokeWidth="1.5"
                fill="none"
                opacity={opacity}
              />
              {/* Reifen (außen, dunkelgrau) */}
              <circle
                cx={round(p.x)} cy={round(p.y)}
                r={round(tireRadius)}
                stroke="#444"
                strokeWidth="4"
                fill="none"
                opacity={opacity}
              />
              {/* Nabe */}
              <circle
                cx={round(p.x)} cy={round(p.y)}
                r={hubR}
                fill={color}
                stroke="none"
                opacity={opacity}
              />
            </g>
          )
        })}

        {/* Kettenblatt am Tretlager */}
        {points.bb && (
          <circle
            cx={round(points.bb.x)}
            cy={round(points.bb.y)}
            r={round(75 * SCALE)}
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="4,4"
            fill="none"
            opacity={opacity * 0.8}
          />
        )}

        {/* Schaltwerk an der Hinterachse */}
        {points.rearWheel && (() => {
          const rx = round(points.rearWheel.x)
          const ry = round(points.rearWheel.y)
          const topPulleyY = ry + 28
          const botPulleyY = ry + 44
          return (
            <g opacity={opacity * 0.75}>
              {/* Käfig */}
              <polygon
                points={`${rx},${ry + 10} ${rx - 8},${botPulleyY + 8} ${rx + 8},${botPulleyY + 8}`}
                fill="none"
                stroke="#888"
                strokeWidth="1.5"
              />
              {/* Obere Schaltrolle */}
              <circle cx={rx} cy={topPulleyY} r={5} fill="none" stroke="#888" strokeWidth="1.5" />
              {/* Untere Schaltrolle */}
              <circle cx={rx} cy={botPulleyY} r={5} fill="none" stroke="#888" strokeWidth="1.5" />
            </g>
          )
        })()}

        {/* Key-Points (kleine Kreise) */}
        {KEY_POINT_IDS.map((id) => {
          const p = points[id]
          if (!p) return null
          
          // Fahrer-Punkte: knee, footContact, cleatTop, cleatBottom, hip, shoulder, neckTop, headCenter, elbow
          const isRiderPoint = ['kneeNew', 'footContact', 'cleatTop', 'cleatBottom', 'hip', 'hipJoint', 'shoulder', 'neckTop', 'headCenter', 'elbow'].includes(id)
          if (isRiderPoint && !riderVisible) return null
          
          const isSelected = measurePoints.some((mp) => mp.id === id && mp.bike === bikeId)
          const pointColor = isRiderPoint ? '#22c55e' : color
          
          return (
            <circle
              key={id}
              cx={round(p.x)}
              cy={round(p.y)}
              r={isSelected ? "6" : "4"}
              fill={isSelected ? "#f39c12" : pointColor}
              opacity={opacity}
              style={{ cursor: measureMode ? 'pointer' : 'default', pointerEvents: measureMode ? 'all' : 'none' }}
              onClick={(e) => {
                e.stopPropagation()
                handlePointClick(id)
              }}
            />
          )
        })}
      </g>
    )
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      {/* SVG Area */}
      <Card 
        className="bg-card p-6 overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        <div 
          className="h-full w-full relative overflow-hidden cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
        {/* Grid background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.1 }}
        >
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Bike visualization */}
        <svg
          ref={svgRef}
          onClick={handleSvgClick}
          style={{ pointerEvents: measureMode ? 'all' : 'auto' }}
          className="absolute inset-0 w-full h-full"
          viewBox={`${minX} ${minY} ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
                  {/* Disclaimer & Branding */}
                  <g
                    pointerEvents="none"
                    style={{ userSelect: 'none' }}
                    fontFamily="'Segoe UI', 'Arial', 'sans-serif'"
                    fontSize={Math.max(24, width * 0.035)}
                    textAnchor="middle"
                    fill="#9ca3af"
                  >
                    {/* Linksbündig, Abstand 24 nach links, 40 nach unten für beide Zeilen sichtbar */}
                    {(() => {
                      const paddingBottom = 40;
                      const line1Size = Math.max(28, width * 0.045);
                      const line2Size = Math.max(20, width * 0.032);
                      const lineSpacing = 8;
                      const centerX = 250;
                      const y1 = minY + height - paddingBottom - line2Size - lineSpacing;
                      const y2 = minY + height - paddingBottom;
                      return <>
                        <text
                          x={centerX}
                          y={y1}
                          fontWeight="bold"
                          fontSize={line1Size}
                          style={{ letterSpacing: 0.5 }}
                        >
                          Bike Geometry Calculator
                        </text>
                        <text
                          x={centerX}
                          y={y2}
                          fontWeight="normal"
                          fontSize={line2Size}
                          style={{ letterSpacing: 0.2 }}
                        >
                          {'\u26A0\uFE0F'} Dient nur zur Visualisierung, kein medizinscher Rat!
                        </text>
                      </>;
                    })()}
                  </g>
          <g transform={`translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`}>
            {geometryA && renderBike(geometryA, '#e74c3c', 0.7, 'A')}
            {geometryB && renderBike(geometryB, '#3498db', 0.7, 'B')}
            
            {/* Messlinie */}
            {measureLine && (
              <g>
                {/* Hauptlinie (Hypotenuse) */}
                <line
                  x1={measureLine.x1}
                  y1={measureLine.y1}
                  x2={measureLine.x2}
                  y2={measureLine.y2}
                  stroke="#f39c12"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
                <text
                  x={(measureLine.x1 + measureLine.x2) / 2}
                  y={(measureLine.y1 + measureLine.y2) / 2 - 10}
                  fill="#f39c12"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {measureDistance.toFixed(1)} mm
                </text>

                {/* Horizontale Linie (ΔX) */}
                <line
                  x1={measureLine.x1}
                  y1={measureLine.y2}
                  x2={measureLine.x2}
                  y2={measureLine.y2}
                  stroke="#3498db"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
                <text
                  x={(measureLine.x1 + measureLine.x2) / 2}
                  y={measureLine.y2 + 20}
                  fill="#3498db"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ΔX: {measureDx.toFixed(1)} mm
                </text>

                {/* Vertikale Linie (ΔY) */}
                <line
                  x1={measureLine.x1}
                  y1={measureLine.y1}
                  x2={measureLine.x1}
                  y2={measureLine.y2}
                  stroke="#e74c3c"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
                <text
                  x={measureLine.x1 - 20}
                  y={(measureLine.y1 + measureLine.y2) / 2}
                  fill="#e74c3c"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  ΔY: {measureDy.toFixed(1)} mm
                </text>
              </g>
            )}
          </g>
        </svg>


        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-50">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" onClick={handleZoomIn} className="h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur-sm border border-border"><ZoomIn className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent side="left"><p className="text-xs">Vergrößern</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" onClick={handleZoomOut} className="h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur-sm border border-border"><ZoomOut className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent side="left"><p className="text-xs">Verkleinern</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" onClick={handleResetView} className="h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur-sm border border-border mt-1"><Maximize className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent side="left"><p className="text-xs">Zentrieren</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Measurements Overlay - Collapsible */}
        {measurementsExpanded && (
          <div onWheel={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} className="relative mt-2 md:absolute md:top-[7.5rem] md:left-4 z-50 w-full md:w-80 max-h-[40vh] md:max-h-[70vh] md:resize-y md:min-h-[200px] overflow-y-auto shadow-sm md:shadow-xl border border-border bg-card rounded-lg flex-shrink-0">
            {/* Sticky close button */}
            <button
              onClick={() => setMeasurementsExpanded(false)}
              className="absolute top-2 right-2 z-50 bg-background/80 rounded-full p-1 leading-none text-sm hover:bg-muted transition-colors"
              aria-label="Schließen"
            >
              ✕
            </button>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-0">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold mb-2 pr-6">Biomechanik Check</h3>
          <div className="text-xs text-muted-foreground">

            {/* Überhöhung Ampel + Info */}
            {geometryA?.saddleHandlebarDrop !== undefined && (() => {
              const drop = geometryA.saddleHandlebarDrop;
              const isRed = drop > SADDLE_HANDLEBAR_DROP_CRITICAL;
              const isYellow = !isRed && drop > SADDLE_HANDLEBAR_DROP_WARNING;
              let ampelColor = isRed ? '#e74c3c' : isYellow ? '#f39c12' : '#22c55e';
              let ampelText = isRed
                ? (<span><b>Überhöhung: {drop.toFixed(0)}mm</b> – Aggressive Position</span>)
                : isYellow
                  ? (<span><b>Überhöhung: {drop.toFixed(0)}mm</b> – Sportliche Position</span>)
                  : (<span><b>Überhöhung: {drop.toFixed(0)}mm</b></span>);
              let tooltipText = isRed
                ? 'Sehr große Überhöhung: Aggressive Sitzposition, Nackenprobleme und Komforteinbußen möglich.'
                : isYellow
                  ? 'Erhöhte Überhöhung: Sportliche Sitzposition, Komfort leicht reduziert.'
                  : 'Überhöhung im optimalen Bereich: Komfort und Effizienz sind gut ausbalanciert.';
              return (
                <div className="flex items-center w-full pr-2">
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: ampelColor }}
                  />
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  {(isRed || isYellow) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px]">{tooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })()}

            {/* Kniewinkel 90° Ampel + Info (nur wenn Fahrer sichtbar) */}
            {riderVisible && geometryA?.kneeAngleAt90 !== undefined && (
              <div className="flex items-center w-full pr-2 mt-2">
                <span
                  className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                  style={{ backgroundColor:
                    geometryA.kneeAngleAt90 <= KNEE_90_MIN || geometryA.kneeAngleAt90 >= KNEE_90_MAX
                      ? '#e74c3c'
                      : (geometryA.kneeAngleAt90 < KNEE_90_MIN_WARNING || geometryA.kneeAngleAt90 > KNEE_90_MAX_WARNING
                          ? '#f39c12'
                          : '#22c55e')
                  }}
                />
                <span className="font-medium text-xs ml-2">
                  <b>Kniewinkel Unten (6 Uhr): </b>
                  {`${geometryA.kneeAngleAt90.toFixed(1)}°`}
                </span>
                <span className="flex-1" />
                {(geometryA.kneeAngleAt90 <= KNEE_90_MIN || geometryA.kneeAngleAt90 >= KNEE_90_MAX || geometryA.kneeAngleAt90 < KNEE_90_MIN_WARNING || geometryA.kneeAngleAt90 > KNEE_90_MAX_WARNING) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px]">
                          {geometryA.kneeAngleAt90 <= KNEE_90_MIN || geometryA.kneeAngleAt90 >= KNEE_90_MAX
                            ? 'Kniewinkel bei 90° ist außerhalb des empfohlenen Bereichs. Risiko für Über- oder Unterstreckung.'
                            : 'Kniewinkel bei 90° ist grenzwertig. Leichte Anpassungen könnten sinnvoll sein.'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}

            {/* Kniewinkel 270° Ampel + Info */}
            {riderVisible && geometryA?.kneeAngleAt270 !== undefined && (() => {
              const angle = geometryA.kneeAngleAt270;
              const isRed = angle <= KNEE_270_MIN;
              const isYellow = !isRed && angle < KNEE_270_MIN_WARNING;
              let ampelColor = isRed ? '#e74c3c' : isYellow ? '#f39c12' : '#22c55e';
              let ampelText = isRed
                ? (<span><b>Kniewinkel Oben (12 Uhr): {angle.toFixed(1)}°</b> – Zu klein</span>)
                : isYellow
                  ? (<span><b>Kniewinkel Oben (12 Uhr): {angle.toFixed(1)}°</b> – Grenzwertig</span>)
                  : (<span><b>Kniewinkel Oben (12 Uhr): {angle.toFixed(1)}°</b></span>);
              let tooltipText = isRed
                ? 'Kniewinkel bei Oben° ist zu klein. Risiko für Überstreckung des Knies.'
                : isYellow
                  ? 'Kniewinkel bei Oben° ist grenzwertig. Leichte Anpassungen könnten sinnvoll sein.'
                  : 'Kniewinkel bei Oben° im optimalen Bereich.';
              return (
                <div className="flex items-center w-full pr-2 mt-2">
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: ampelColor }}
                  />
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  {(isRed || isYellow) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-[200px]">{tooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })()}

            {/* unrealistische Radgeometrie */}
            {riderVisible && geometryA?.ankleAngleAt270 !== undefined && geometryA.ankleAngleAt270 < ANKLE_MIN && (
              <div className="flex items-center w-full mt-2">
                <span className="w-4 h-4 flex items-center justify-center rounded-full border border-border flex-shrink-0 bg-white" style={{ position: 'relative' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="8" cy="8" r="7" stroke="#e74c3c" strokeWidth="2" fill="#fff" />
                    <rect x="3.5" y="7" width="9" height="2" rx="1" fill="#e74c3c" />
                  </svg>
                </span>
                <span className="font-medium text-xs ml-2"><b>unrealistische Radgeometrie</b></span>
                <span className="flex-1" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[200px]">Sprunggelenkwinkel bei 270° ist zu klein. Die Geometrie ist biomechanisch nicht realistisch umsetzbar.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Sattel zu hoch / Bein zu kurz */}
            {riderVisible && geometryA?.kneeAngleAt90 !== undefined && (() => {
              const angle = geometryA.kneeAngleAt90;
              const isRed = angle >= 180;
              if (!isRed) return null;
              let ampelText = (<span><b>Sattel zu hoch / Bein zu kurz</b></span>);
              let tooltipText = 'Das Bein ist zu kurz (kürzer als für Körpergrösse angegeben). Dadurch ist diese Position nicht realistisch umsetzbar. Der Sattel sollte abgesenkt oder die Beinlänge überprüft werden.';
              return (
                <div className="flex items-center w-full pr-2 mt-2">
                  <span className="w-4 h-4 flex items-center justify-center rounded-full border border-border flex-shrink-0 bg-white" style={{ position: 'relative' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="7" stroke="#e74c3c" strokeWidth="2" fill="#fff" />
                      <rect x="3.5" y="7" width="9" height="2" rx="1" fill="#e74c3c" />
                    </svg>
                  </span>
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px]">{tooltipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            })()}

            {/* Knie lotet vor Pedalachse */}
            {riderVisible && geometryA?.kneeTopedalXAt0 !== undefined && (() => {
              const distance = geometryA.kneeTopedalXAt0;
              const isYellow = distance < KNEE_PEDAL_X_MIN_WARNING;
              if (!isYellow) return null;
              let ampelColor = '#f39c12';
              let ampelText = (<span><b>Knie lotet vor Pedalachse: {distance.toFixed(0)}mm</b> – Grenzwertig</span>);
              let tooltipText = 'Knie zu Pedal Abstand ist grenzwertig gering. Risiko für ungünstige Kraftübertragung.';
              return (
                <div className="flex items-center w-full pr-2 mt-2">
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: ampelColor }}
                  />
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground/50 hover:text-foreground cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px]">{tooltipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
            })()}
            </div>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-2">Bike Setup</h3>
          <div className="space-y-1.5">
            {/* Knee Angle Display */}
            {riderVisible && geometryA?.kneeAngle !== undefined && (
              <div className="px-2 py-1 bg-muted/50 rounded text-[10px]">
                <span className="font-medium">Kniewinkel: </span>
                <span className="text-primary font-bold">{geometryA.kneeAngle.toFixed(1)}°</span>
              </div>
            )}
          
          {/* Ankle Angle Display */}
          {riderVisible && geometryA?.ankleAngle !== undefined && (
            <div className="px-2 py-1 bg-muted/50 rounded text-[10px]">
              <span className="font-medium">Sprunggelenkwinkel: </span>
              <span className="text-primary font-bold">{geometryA.ankleAngle.toFixed(1)}°</span>
            </div>
          )}
          
          {/* BB to Saddle Distance */}
          {geometryA?.bbToSaddleDistance !== undefined && (
            <div className="px-2 py-1 bg-muted/50 rounded text-[10px]">
              <span className="font-medium">Tretlager→Sattel: </span>
              <span className="text-primary font-bold">{geometryA.bbToSaddleDistance.toFixed(1)} mm</span>
            </div>
          )}
          
          {/* BB to SeatPost Top Distance */}
          {geometryA?.bbToSeatPostDistance !== undefined && (
            <div className="px-2 py-1 bg-muted/50 rounded text-[10px]">
              <span className="font-medium">Tretlager→SeatPost: </span>
              <span className="text-primary font-bold">{geometryA.bbToSeatPostDistance.toFixed(1)} mm</span>
            </div>
          )}
          
          {/* Knee Angle at 90° */}
          {riderVisible && geometryA?.kneeAngleAt90 !== undefined && (() => {
            const angle = geometryA.kneeAngleAt90
            const isRed = angle <= KNEE_90_MIN || angle >= KNEE_90_MAX
            const isYellow = !isRed && (angle < KNEE_90_MIN_WARNING || angle > KNEE_90_MAX_WARNING)
            return (
              <div 
                className="px-2 py-1 rounded text-[10px]"
                style={{
                  backgroundColor: isRed 
                    ? 'hsl(0 84% 60%)' 
                    : isYellow 
                      ? 'hsl(45 93% 47%)'
                      : 'hsl(var(--muted) / 0.5)',
                  color: isRed || isYellow ? 'white' : 'inherit'
                }}
              >
                <span className="font-medium">@ 90°: </span>
                <span className="font-bold">{angle.toFixed(1)}°</span>
              </div>
            )
          })()}
          
          {/* Knee Angle at 270° */}
          {riderVisible && geometryA?.kneeAngleAt270 !== undefined && (() => {
            const angle = geometryA.kneeAngleAt270
            const isRed = angle <= KNEE_270_MIN
            const isYellow = !isRed && angle < KNEE_270_MIN_WARNING
            return (
              <div 
                className="px-2 py-1 rounded text-[10px]"
                style={{
                  backgroundColor: isRed 
                    ? 'hsl(0 84% 60%)' 
                    : isYellow 
                      ? 'hsl(45 93% 47%)'
                      : 'hsl(var(--muted) / 0.5)',
                  color: isRed || isYellow ? 'white' : 'inherit'
                }}
              >
                <span className="font-medium">@ 270°: </span>
                <span className="font-bold">{angle.toFixed(1)}°</span>
              </div>
            )
          })()}
          
          {/* Saddle-Handlebar Drop (Überhöhung) */}
          {geometryA?.saddleHandlebarDrop !== undefined && (() => {
            const drop = geometryA.saddleHandlebarDrop
            const isRed = drop > SADDLE_HANDLEBAR_DROP_CRITICAL
            const isYellow = !isRed && drop > SADDLE_HANDLEBAR_DROP_WARNING
            return (
              <div 
                className="px-2 py-1 rounded text-[10px]"
                style={{
                  backgroundColor: isRed 
                    ? 'hsl(0 84% 60%)' 
                    : isYellow 
                      ? 'hsl(45 93% 47%)'
                      : 'hsl(var(--muted) / 0.5)',
                  color: isRed || isYellow ? 'white' : 'inherit'
                }}
              >
                <span className="font-medium">Überhöhung: </span>
                <span className="font-bold">{drop.toFixed(0)} mm</span>
              </div>
            )
          })()}
          
          {/* Knee to Pedal X Distance at 0° */}
            <div 
              className="px-2 py-1 rounded text-[10px]"
              style={{
                backgroundColor: riderVisible && geometryA?.kneeTopedalXAt0 !== undefined && geometryA.kneeTopedalXAt0 < KNEE_PEDAL_X_MIN_WARNING
                  ? 'hsl(45 93% 47%)'
                  : 'hsl(var(--muted) / 0.5)',
                color: riderVisible && geometryA?.kneeTopedalXAt0 !== undefined && geometryA.kneeTopedalXAt0 < KNEE_PEDAL_X_MIN_WARNING ? 'white' : 'inherit'
              }}
            >
              <span className="font-medium">Knie→Pedal @ 0°: </span>
              <span className="font-bold">
                {riderVisible && geometryA?.kneeTopedalXAt0 !== undefined
                  ? `${geometryA.kneeTopedalXAt0.toFixed(0)} mm`
                  : '–'}
              </span>
            </div>
          
          {/* Shoulder Angle */}
            <div 
              className="px-2 py-1 rounded text-[10px]"
              style={{
                backgroundColor: riderVisible && geometryA?.shoulderAngle !== undefined && (geometryA.shoulderAngle < SHOULDER_ANGLE_MIN || geometryA.shoulderAngle > SHOULDER_ANGLE_MAX)
                  ? 'hsl(0 84% 60%)'
                  : riderVisible && geometryA?.shoulderAngle !== undefined && ((geometryA.shoulderAngle >= SHOULDER_ANGLE_MIN && geometryA.shoulderAngle < SHOULDER_ANGLE_MIN_WARNING) || (geometryA.shoulderAngle > SHOULDER_ANGLE_MAX_WARNING && geometryA.shoulderAngle <= SHOULDER_ANGLE_MAX))
                    ? 'hsl(45 93% 47%)'
                    : 'hsl(var(--muted) / 0.5)',
                color: riderVisible && geometryA?.shoulderAngle !== undefined && (geometryA.shoulderAngle < SHOULDER_ANGLE_MIN || geometryA.shoulderAngle > SHOULDER_ANGLE_MAX || (geometryA.shoulderAngle >= SHOULDER_ANGLE_MIN && geometryA.shoulderAngle < SHOULDER_ANGLE_MIN_WARNING) || (geometryA.shoulderAngle > SHOULDER_ANGLE_MAX_WARNING && geometryA.shoulderAngle <= SHOULDER_ANGLE_MAX)) ? 'white' : 'inherit'
              }}
            >
              <span className="font-medium">Schulterwinkel: </span>
              <span className="font-bold">
                {riderVisible && geometryA?.shoulderAngle !== undefined
                  ? `${geometryA.shoulderAngle.toFixed(1)}°`
                  : '–'}
              </span>
            </div>
          
          {/* Elbow Angle */}
            <div 
              className="px-2 py-1 rounded text-[10px]"
              style={{
                backgroundColor: riderVisible && geometryA?.elbowAngle !== undefined && geometryA.elbowAngle > ELBOW_ANGLE_CRITICAL
                  ? 'hsl(0 84% 60%)'
                  : riderVisible && geometryA?.elbowAngle !== undefined && ((geometryA.elbowAngle >= ELBOW_ANGLE_MAX_WARNING && geometryA.elbowAngle <= ELBOW_ANGLE_CRITICAL) || geometryA.elbowAngle < ELBOW_ANGLE_MIN_WARNING)
                    ? 'hsl(45 93% 47%)'
                    : 'hsl(var(--muted) / 0.5)',
                color: riderVisible && geometryA?.elbowAngle !== undefined && (geometryA.elbowAngle > ELBOW_ANGLE_CRITICAL || (geometryA.elbowAngle >= ELBOW_ANGLE_MAX_WARNING && geometryA.elbowAngle <= ELBOW_ANGLE_CRITICAL) || geometryA.elbowAngle < ELBOW_ANGLE_MIN_WARNING) ? 'white' : 'inherit'
              }}
            >
              <span className="font-medium">Ellbogenwinkel: </span>
              <span className="font-bold">
                {riderVisible && geometryA?.elbowAngle !== undefined
                  ? `${geometryA.elbowAngle.toFixed(1)}°`
                  : '–'}
              </span>
            </div>
            </div>
            </div>
          </div>
          </div>
        )}
        </div>
      </Card>

      {/* Control Panel - below SVG on mobile, overlay on desktop */}
      <div className="flex flex-col gap-2 relative md:absolute md:top-4 md:left-4 z-40 p-3 md:p-0 w-full md:w-auto bg-card md:bg-transparent md:backdrop-blur-none border-t md:border-none border-border">
        <div className="flex flex-row md:flex-col items-center md:items-stretch justify-center md:justify-start gap-2 flex-wrap md:bg-background/90 md:backdrop-blur-md md:border md:border-border md:rounded-xl md:p-2 md:shadow-lg">
          
          <div className="font-bold text-xs uppercase tracking-wider hidden md:block text-center text-muted-foreground mb-1">
            Steuerung
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-row md:flex-col gap-2">
            <button onClick={() => { setMeasureMode(!measureMode); setMeasurePoints([]); }} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${measureMode ? 'bg-[#f39c12] text-white' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}>
              {measureMode ? '📏 Aktiv' : '📏 Messen'}
            </button>
            <button onClick={() => setRiderVisible(!riderVisible)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${riderVisible ? 'bg-[#22c55e] text-white' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}>
              {riderVisible ? '🚴 Fahrer An' : '🚴 Fahrer Aus'}
            </button>
            <button onClick={() => setIsPedaling(!isPedaling)} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm ${isPedaling ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'}`}>
              {isPedaling ? '↻ Animiert' : '↻ Statisch'}
            </button>
            <button onClick={() => setMeasurementsExpanded(!measurementsExpanded)} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all shadow-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground">
              {measurementsExpanded ? '▼ Werte zu' : '▲ Werte auf'}
            </button>
          </div>

          {/* Bike Info Legend */}
          {(bikeA || bikeB) && (
            <div className="flex flex-row md:flex-col gap-3 md:gap-1.5 mt-1 md:mt-2 md:pt-3 md:border-t border-border">
              {bikeA && (
                <div className="flex items-center gap-2 bg-background md:bg-transparent px-2 py-1 md:p-0 rounded-md border md:border-none border-border">
                  <div className="w-3 h-3 rounded-full bg-[#e74c3c] shadow-sm flex-shrink-0" />
                  <span className="font-semibold text-[11px] truncate max-w-[120px]">{bikeA.brand === '__custom__' ? bikeA.model : `${bikeA.brand} ${bikeA.model}`}</span>
                </div>
              )}
              {bikeB && (
                <div className="flex items-center gap-2 bg-background md:bg-transparent px-2 py-1 md:p-0 rounded-md border md:border-none border-border">
                  <div className="w-3 h-3 rounded-full bg-[#3498db] shadow-sm flex-shrink-0" />
                  <span className="font-semibold text-[11px] truncate max-w-[120px]">{bikeB.brand === '__custom__' ? bikeB.model : `${bikeB.brand} ${bikeB.model}`}</span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default BikeVisualization;
