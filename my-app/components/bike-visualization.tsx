'use client'

import type { BikeData, AlignmentMode } from '@/types/bike'
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
import { useState, useRef, type MouseEvent, type WheelEvent, type TouchEvent } from 'react'

type BikeVisualizationProps = {
  bikeA: BikeData | null
  bikeB: BikeData | null
  alignmentMode: AlignmentMode
}

export function BikeVisualization({
  bikeA,
  bikeB,
  alignmentMode,
}: BikeVisualizationProps) {
  const [tooltipVisible, setTooltipVisible] = useState<'drop' | 'knee90' | 'knee270' | 'kneePedal' | 'ankle270' | null>(null);
  const [viewState, setViewState] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [measurePoints, setMeasurePoints] = useState<Array<{id: string, bike: 'A' | 'B'}>>([])
  const [measureMode, setMeasureMode] = useState(false)
  const [riderVisible, setRiderVisible] = useState(true)
  const [measurementsExpanded, setMeasurementsExpanded] = useState(true)
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
    ? calculateBikeGeometry(bikeA, alignmentMode)
    : null
  const geometryB: BikeGeometryResult | null = bikeB
    ? calculateBikeGeometry(bikeB, alignmentMode)
    : null

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
  const minX = Math.min(...xs) - 50
  const maxX = Math.max(...xs) + 50
  const minY = Math.min(...ys) - 50
  const maxY = Math.max(...ys) + 50
  const width = maxX - minX
  const height = maxY - minY

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
        measureLine = { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
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
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
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
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
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
          const neckAngleDeg = 60
          return (
            <ellipse
              cx={points.headCenter.x}
              cy={points.headCenter.y}
              rx={headWidth / 2}
              ry={headHeight / 2}
              fill="none"
              stroke="#22c55e"
              strokeWidth="3"
              opacity={opacity}
              transform={`rotate(${neckAngleDeg + 90}, ${points.headCenter.x}, ${points.headCenter.y})`}
            />
          )
        })()}

        {/* Räder: Außendurchmesser 690mm, Felgendurchmesser 622mm (skaliert) */}
        {WHEEL_POINT_IDS.map((id) => {
          const p = points[id]
          if (!p) return null
          const outerRadius = (690 / 2) * SCALE // mm -> SVG units
          const rimRadius = (622 / 2) * SCALE // mm -> SVG units
          return (
            <g key={id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={outerRadius}
                stroke={color}
                strokeWidth="2"
                fill="none"
                opacity={opacity}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={rimRadius}
                stroke={color}
                strokeWidth="1"
                fill="none"
                opacity={Math.max(0.2, opacity - 0.1)}
              />
            </g>
          )
        })}

        {/* Key-Points (kleine Kreise) */}
        {KEY_POINT_IDS.map((id) => {
          const p = points[id]
          if (!p) return null
          
          // Fahrer-Punkte: knee, footContact, cleatTop, cleatBottom, hip, shoulder, neckTop, headCenter, elbow
          const isRiderPoint = ['knee', 'footContact', 'cleatTop', 'cleatBottom', 'hip', 'shoulder', 'neckTop', 'headCenter', 'elbow'].includes(id)
          if (isRiderPoint && !riderVisible) return null
          
          const isSelected = measurePoints.some((mp) => mp.id === id && mp.bike === bikeId)
          const pointColor = isRiderPoint ? '#22c55e' : color
          
          return (
            <circle
              key={id}
              cx={p.x}
              cy={p.y}
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
    <div className="h-full flex flex-col overflow-hidden">
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
                    textAnchor="start"
                    fill="#9ca3af"
                  >
                    {/* Linksbündig, Abstand 24 nach links, 40 nach unten für beide Zeilen sichtbar */}
                    {(() => {
                      const paddingLeft = 24;
                      const paddingBottom = 40;
                      const line1Size = Math.max(28, width * 0.045);
                      const line2Size = Math.max(20, width * 0.032);
                      const lineSpacing = 8;
                      const y1 = minY + height - paddingBottom - line2Size - lineSpacing;
                      const y2 = minY + height - paddingBottom;
                      return <>
                        <text
                          x={minX + paddingLeft}
                          y={y1}
                          fontWeight="bold"
                          fontSize={line1Size}
                          style={{ letterSpacing: 0.5 }}
                        >
                          Bike Geometry Calculator
                        </text>
                        <text
                          x={minX + paddingLeft}
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

        {/* Control Buttons */}
        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-2 space-y-1.5 text-xs">
          {/* Measure Mode Toggle */}
          <button
            onClick={() => {
              setMeasureMode(!measureMode)
              setMeasurePoints([])
            }}
            className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
              measureMode
                ? 'bg-[#f39c12] text-white'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {measureMode ? '📏 Aktiv' : '📏 Messen'}
          </button>
          
          {/* Rider Visibility Toggle */}
          <button
            onClick={() => setRiderVisible(!riderVisible)}
            className={`w-full px-2 py-1 rounded text-xs font-medium transition-colors ${
              riderVisible
                ? 'bg-[#22c55e] text-white'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {riderVisible ? '🚴 An' : '🚴 Aus'}
          </button>
          
          {/* Toggle Measurements */}
          <button
            onClick={() => setMeasurementsExpanded(!measurementsExpanded)}
            className="w-full px-2 py-1 rounded text-xs font-medium transition-colors bg-muted hover:bg-muted/80"
          >
            {measurementsExpanded ? '▼ Einklappen' : '▲ Messungen'}
          </button>
          
          {/* Bike Info */}
          {bikeA && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
              <div className="w-3 h-3 rounded-full bg-[#e74c3c]" />
              <span className="font-medium text-[10px]">
                {bikeA.brand} {bikeA.model} ({bikeA.size})
              </span>
            </div>
          )}
          {bikeB && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#3498db]" />
              <span className="font-medium text-[10px]">
                {bikeB.brand} {bikeB.model} ({bikeB.size})
              </span>
            </div>
          )}
        </div>
        </div>
      </Card>

      {/* Measurements Section - Collapsible */}
      <div 
        className="grid grid-cols-2 gap-4 mt-4 transition-all duration-300 ease-in-out overflow-hidden"
        style={{
          maxHeight: measurementsExpanded ? '30vh' : '0',
          opacity: measurementsExpanded ? 1 : 0,
          marginTop: measurementsExpanded ? '1rem' : '0',
        }}
      >
        <Card className="p-4 overflow-y-auto max-h-96">
          <h3 className="text-sm font-semibold mb-2">Biomechanik Check</h3>
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
                <div className="flex items-center relative w-full pr-2">
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: ampelColor }}
                  />
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  {(isRed || isYellow) && (
                    <span className="relative flex items-center justify-end">
                      <span
                        className="w-4 h-4 flex items-center justify-center rounded-full bg-muted text-xs font-bold border border-border cursor-pointer"
                        onMouseEnter={() => setTooltipVisible('drop')}
                        onMouseLeave={() => setTooltipVisible(null)}
                        onFocus={() => setTooltipVisible('drop')}
                        onBlur={() => setTooltipVisible(null)}
                        tabIndex={0}
                        aria-label="Mehr Informationen zur Überhöhung"
                      >
                        ?
                      </span>
                      {tooltipVisible === 'drop' && (
                        <span
                          className="absolute right-6 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground shadow-lg min-w-[180px] whitespace-normal"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {tooltipText}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Kniewinkel 90° Ampel + Info */}
            {riderVisible && geometryA?.kneeAngleAt90 !== undefined && (() => {
              const angle = geometryA.kneeAngleAt90;
              const isRed = angle <= KNEE_90_MIN || angle >= KNEE_90_MAX;
              const isYellow = !isRed && (angle < KNEE_90_MIN_WARNING || angle > KNEE_90_MAX_WARNING);
              let ampelColor = isRed ? '#e74c3c' : isYellow ? '#f39c12' : '#22c55e';
              let ampelText = isRed
                ? (<span><b>Kniewinkel Unten (6 Uhr): {angle.toFixed(1)}°</b> – Außerhalb Norm</span>)
                : isYellow
                  ? (<span><b>Kniewinkel Unten (6 Uhr): {angle.toFixed(1)}°</b> – Grenzwertig</span>)
                  : (<span><b>Kniewinkel Unten (6 Uhr): {angle.toFixed(1)}°</b></span>);
              let tooltipText = isRed
                ? 'Kniewinkel bei 90° ist außerhalb des empfohlenen Bereichs. Risiko für Über- oder Unterstreckung.'
                : isYellow
                  ? 'Kniewinkel bei 90° ist grenzwertig. Leichte Anpassungen könnten sinnvoll sein.'
                  : 'Kniewinkel bei 90° im optimalen Bereich.';
              return (
                <div className="flex items-center relative w-full pr-2 mt-2">
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: ampelColor }}
                  />
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  {(isRed || isYellow) && (
                    <span className="relative flex items-center justify-end">
                      <span
                        className="w-4 h-4 flex items-center justify-center rounded-full bg-muted text-xs font-bold border border-border cursor-pointer"
                        onMouseEnter={() => setTooltipVisible('knee90')}
                        onMouseLeave={() => setTooltipVisible(null)}
                        onFocus={() => setTooltipVisible('knee90')}
                        onBlur={() => setTooltipVisible(null)}
                        tabIndex={0}
                        aria-label="Mehr Informationen zum Kniewinkel 90°"
                      >
                        ?
                      </span>
                      {tooltipVisible === 'knee90' && (
                        <span
                          className="absolute right-6 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground shadow-lg min-w-[180px] whitespace-normal"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {tooltipText}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Kniewinkel 270° Ampel + Info */}
            {/* Kniewinkel 270° Ampel + Info */}
                        {/* Knie→Pedal Ampel + Info */}

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
                <div className="flex items-center relative w-full pr-2 mt-2">
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: ampelColor }}
                  />
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  {(isRed || isYellow) && (
                    <span className="relative flex items-center justify-end">
                      <span
                        className="w-4 h-4 flex items-center justify-center rounded-full bg-muted text-xs font-bold border border-border cursor-pointer"
                        onMouseEnter={() => setTooltipVisible('knee270')}
                        onMouseLeave={() => setTooltipVisible(null)}
                        onFocus={() => setTooltipVisible('knee270')}
                        onBlur={() => setTooltipVisible(null)}
                        tabIndex={0}
                        aria-label="Mehr Informationen zum Kniewinkel 270°"
                      >
                        ?
                      </span>
                      {tooltipVisible === 'knee270' && (
                        <span
                          className="absolute right-6 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground shadow-lg min-w-[180px] whitespace-normal"
                          style={{ pointerEvents: 'auto' }}
                        >
                          {tooltipText}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Knie→Pedal Ampel + Info (nur gelb, am Ende) */}
                        {/* Knie→Pedal Ampel + Info (rot, wenn >= 180°) */}
                                    {/* Sprunggelenkwinkel Warnung (rot, wenn < ANKLE_MIN) */}
                                    {riderVisible && geometryA?.ankleAngleAt270 !== undefined && geometryA.ankleAngleAt270 < ANKLE_MIN && (
                                      <div className="flex items-center relative w-full mt-2">
                                        {/* Durchfahrt verboten Icon */}
                                        <span className="w-4 h-4 flex items-center justify-center rounded-full border border-border flex-shrink-0 bg-white" style={{ position: 'relative' }}>
                                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="8" cy="8" r="7" stroke="#e74c3c" strokeWidth="2" fill="#fff" />
                                            <rect x="3.5" y="7" width="9" height="2" rx="1" fill="#e74c3c" />
                                          </svg>
                                        </span>
                                        <span className="font-medium text-xs ml-2"><b>unrealistische Radgeometrie</b></span>
                                        <span className="flex-1" />
                                        <span className="relative flex items-center justify-end">
                                          <span
                                            className="w-4 h-4 flex items-center justify-center rounded-full bg-muted text-xs font-bold border border-border cursor-pointer"
                                            onMouseEnter={() => setTooltipVisible('ankle270')}
                                            onMouseLeave={() => setTooltipVisible(null)}
                                            onFocus={() => setTooltipVisible('ankle270')}
                                            onBlur={() => setTooltipVisible(null)}
                                            tabIndex={0}
                                            aria-label="Mehr Informationen zum Sprunggelenkwinkel 270°"
                                          >
                                            ?
                                          </span>
                                          {tooltipVisible === 'ankle270' && (
                                            <span
                                              className="absolute right-6 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground shadow-lg min-w-[180px] whitespace-normal"
                                              style={{ pointerEvents: 'auto' }}
                                            >
                                              Sprunggelenkwinkel bei 270° ist zu klein. Die Geometrie ist biomechanisch nicht realistisch umsetzbar.
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                        {riderVisible && geometryA?.kneeAngleAt90 !== undefined && (() => {
                          const angle = geometryA.kneeAngleAt90;
                          const isRed = angle >= 180;
                          if (!isRed) return null;
                          let ampelText = (<span><b>Sattel zu hoch / Bein zu kurz</b></span>);
                          let tooltipText = 'Das Bein ist zu kurz (kürzer als für Körpergrösse angegeben). Dadurch ist diese Position nicht realistisch umsetzbar. Der Sattel sollte abgesenkt oder die Beinlänge überprüft werden.';
                          return (
                            <div className="flex items-center relative w-full pr-2 mt-2">
                              {/* Durchfahrt verboten Icon */}
                              <span className="w-4 h-4 flex items-center justify-center rounded-full border border-border flex-shrink-0 bg-white" style={{ position: 'relative' }}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="8" cy="8" r="7" stroke="#e74c3c" strokeWidth="2" fill="#fff" />
                                  <rect x="3.5" y="7" width="9" height="2" rx="1" fill="#e74c3c" />
                                </svg>
                              </span>
                              <span className="font-medium text-xs ml-2">{ampelText}</span>
                              <span className="flex-1" />
                              <span className="relative flex items-center justify-end">
                                <span
                                  className="w-4 h-4 flex items-center justify-center rounded-full bg-muted text-xs font-bold border border-border cursor-pointer"
                                  onMouseEnter={() => setTooltipVisible('kneePedal')}
                                  onMouseLeave={() => setTooltipVisible(null)}
                                  onFocus={() => setTooltipVisible('kneePedal')}
                                  onBlur={() => setTooltipVisible(null)}
                                  tabIndex={0}
                                  aria-label="Mehr Informationen zu Kniewinkel 90° (rot)"
                                >
                                  ?
                                </span>
                                {tooltipVisible === 'kneePedal' && (
                                  <span
                                    className="absolute right-6 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground shadow-lg min-w-[180px] whitespace-normal"
                                    style={{ pointerEvents: 'auto' }}
                                  >
                                    {tooltipText}
                                  </span>
                                )}
                              </span>
                            </div>
                          );
                        })()}
            {riderVisible && geometryA?.kneeTopedalXAt0 !== undefined && (() => {
              const distance = geometryA.kneeTopedalXAt0;
              const isYellow = distance < KNEE_PEDAL_X_MIN_WARNING;
              if (!isYellow) return null;
              let ampelColor = '#f39c12';
              let ampelText = (<span><b>Knie lotet vor Pedalachse: {distance.toFixed(0)}mm</b> – Grenzwertig</span>);
              let tooltipText = 'Knie zu Pedal Abstand ist grenzwertig gering. Risiko für ungünstige Kraftübertragung.';
              return (
                <div className="flex items-center relative w-full pr-2 mt-2">
                  <span
                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: ampelColor }}
                  />
                  <span className="font-medium text-xs ml-2">{ampelText}</span>
                  <span className="flex-1" />
                  <span className="relative flex items-center justify-end">
                    <span
                      className="w-4 h-4 flex items-center justify-center rounded-full bg-muted text-xs font-bold border border-border cursor-pointer"
                      onMouseEnter={() => setTooltipVisible('kneePedal')}
                      onMouseLeave={() => setTooltipVisible(null)}
                      onFocus={() => setTooltipVisible('kneePedal')}
                      onBlur={() => setTooltipVisible(null)}
                      tabIndex={0}
                      aria-label="Mehr Informationen zu Knie→Pedal"
                    >
                      ?
                    </span>
                    {tooltipVisible === 'kneePedal' && (
                      <span
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-10 px-2 py-1 rounded bg-background border border-border text-xs text-muted-foreground shadow-lg min-w-[180px] whitespace-normal"
                        style={{ pointerEvents: 'auto' }}
                      >
                        {tooltipText}
                      </span>
                    )}
                  </span>
                </div>
              );
            })()}
          </div>
        </Card>

        {/* Right: Measurements */}
        <Card className="p-4 overflow-y-auto max-h-96">
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
          {riderVisible && geometryA?.kneeTopedalXAt0 !== undefined && (() => {
            const distance = geometryA.kneeTopedalXAt0
            const isYellow = distance < KNEE_PEDAL_X_MIN_WARNING
            return (
              <div 
                className="px-2 py-1 rounded text-[10px]"
                style={{
                  backgroundColor: isYellow 
                    ? 'hsl(45 93% 47%)'
                    : 'hsl(var(--muted) / 0.5)',
                  color: isYellow ? 'white' : 'inherit'
                }}
              >
                <span className="font-medium">Knie→Pedal @ 0°: </span>
                <span className="font-bold">{distance.toFixed(0)} mm</span>
              </div>
            )
          })()}
          
          {/* Shoulder Angle */}
          {riderVisible && geometryA?.shoulderAngle !== undefined && (() => {
            const angle = geometryA.shoulderAngle
            const isRed = angle < SHOULDER_ANGLE_MIN || angle > SHOULDER_ANGLE_MAX
            const isYellow = !isRed && ((angle >= SHOULDER_ANGLE_MIN && angle < SHOULDER_ANGLE_MIN_WARNING) || (angle > SHOULDER_ANGLE_MAX_WARNING && angle <= SHOULDER_ANGLE_MAX))
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
                <span className="font-medium">Schulterwinkel: </span>
                <span className="font-bold">{angle.toFixed(1)}°</span>
              </div>
            )
          })()}
          
          {/* Elbow Angle */}
          {riderVisible && geometryA?.elbowAngle !== undefined && (() => {
            const angle = geometryA.elbowAngle
            const isRed = angle > ELBOW_ANGLE_CRITICAL
            const isYellow = !isRed && ((angle >= ELBOW_ANGLE_MAX_WARNING && angle <= ELBOW_ANGLE_CRITICAL) || angle < ELBOW_ANGLE_MIN_WARNING)
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
                <span className="font-medium">Ellbogenwinkel: </span>
                <span className="font-bold">{angle.toFixed(1)}°</span>
              </div>
            )
          })()}
          </div>
        </Card>
      </div>
    </div>
  )
}
