'use client'

import type { BikeData, AlignmentMode } from '@/types/bike'
import {
  calculateBikeGeometry,
  type BikeGeometryResult,
  WHEEL_POINT_IDS,
  KEY_POINT_IDS,
  SCALE,
} from '@/lib/bike-geometry'
import { Card } from '@/components/ui/card'
import { useState, useRef, type MouseEvent, type WheelEvent } from 'react'

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
  const [viewState, setViewState] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
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

  const renderBike = (
    result: BikeGeometryResult,
    color: string,
    opacity: number
  ) => {
    const { points, segments } = result

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
          return (
            <circle
              key={id}
              cx={p.x}
              cy={p.y}
              r="4"
              fill={color}
              opacity={opacity}
            />
          )
        })}
      </g>
    )
  }

  return (
    <Card className="h-full bg-card p-6">
      <div 
        className="h-full w-full relative overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
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
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`${minX} ${minY} ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${pan.x / zoom}, ${pan.y / zoom}) scale(${zoom})`}>
            {geometryA && renderBike(geometryA, '#e74c3c', 0.7)}
            {geometryB && renderBike(geometryB, '#3498db', 0.7)}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 space-y-2">
          {bikeA && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-[#e74c3c]" />
              <span className="font-medium">
                {bikeA.brand} {bikeA.model} ({bikeA.size})
              </span>
            </div>
          )}
          {bikeB && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 rounded-full bg-[#3498db]" />
              <span className="font-medium">
                {bikeB.brand} {bikeB.model} ({bikeB.size})
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
