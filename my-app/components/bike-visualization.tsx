'use client'

import type { BikeData, AlignmentMode } from '@/types/bike'
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

  // Simple coordinate calculation for visualization
  // In a real app, this would include proper trigonometry
  const calculateBikePoints = (bike: BikeData | null) => {
    if (!bike) return null

    const scale = 0.8
    const { reach, stack, headTubeAngle, bbDrop, forkLength } = bike.geometry

    // BB (bottom bracket) at origin for 'bb' mode
    const bbX = 0
    const bbY = 0

    // Head tube top
    const htX = reach * scale
    const htY = -stack * scale

    // Seat tube top (approximation)
    const stX = -50 * scale
    const stY = -(stack + 100) * scale

    // Fork bottom (wheel axle)
    const headAngleRad = (headTubeAngle * Math.PI) / 180
    const forkOffsetX = Math.sin(headAngleRad) * forkLength * scale
    const forkOffsetY = Math.cos(headAngleRad) * forkLength * scale
    const fwX = htX + forkOffsetX
    const fwY = htY + forkOffsetY

    // Rear wheel (approximation - behind BB)
    const rwX = -400 * scale
    const rwY = bbDrop * scale

    return {
      bb: { x: bbX, y: bbY },
      headTube: { x: htX, y: htY },
      seatTube: { x: stX, y: stY },
      frontWheel: { x: fwX, y: fwY },
      rearWheel: { x: rwX, y: rwY },
    }
  }

  const pointsA = calculateBikePoints(bikeA)
  const pointsB = calculateBikePoints(bikeB)

  // Calculate viewBox to fit both bikes
  const allPoints = [
    ...(pointsA ? Object.values(pointsA) : []),
    ...(pointsB ? Object.values(pointsB) : []),
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
    points: NonNullable<ReturnType<typeof calculateBikePoints>>,
    color: string,
    opacity: number
  ) => {
    const { bb, headTube, seatTube, frontWheel, rearWheel } = points

    return (
      <g>
        {/* Frame lines */}
        <line
          x1={bb.x}
          y1={bb.y}
          x2={headTube.x}
          y2={headTube.y}
          stroke={color}
          strokeWidth="2"
          opacity={opacity}
        />
        <line
          x1={bb.x}
          y1={bb.y}
          x2={seatTube.x}
          y2={seatTube.y}
          stroke={color}
          strokeWidth="2"
          opacity={opacity}
        />
        <line
          x1={seatTube.x}
          y1={seatTube.y}
          x2={rearWheel.x}
          y2={rearWheel.y}
          stroke={color}
          strokeWidth="2"
          opacity={opacity}
        />
        <line
          x1={headTube.x}
          y1={headTube.y}
          x2={frontWheel.x}
          y2={frontWheel.y}
          stroke={color}
          strokeWidth="2"
          opacity={opacity}
        />
        <line
          x1={bb.x}
          y1={bb.y}
          x2={rearWheel.x}
          y2={rearWheel.y}
          stroke={color}
          strokeWidth="2"
          opacity={opacity}
        />

        {/* Wheels */}
        <circle
          cx={frontWheel.x}
          cy={frontWheel.y}
          r="27"
          stroke={color}
          strokeWidth="2"
          fill="none"
          opacity={opacity}
        />
        <circle
          cx={rearWheel.x}
          cy={rearWheel.y}
          r="27"
          stroke={color}
          strokeWidth="2"
          fill="none"
          opacity={opacity}
        />

        {/* Key points */}
        <circle cx={bb.x} cy={bb.y} r="4" fill={color} opacity={opacity} />
        <circle cx={headTube.x} cy={headTube.y} r="4" fill={color} opacity={opacity} />
        <circle cx={seatTube.x} cy={seatTube.y} r="4" fill={color} opacity={opacity} />
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
            {pointsA && renderBike(pointsA, '#e74c3c', 0.7)}
            {pointsB && renderBike(pointsB, '#3498db', 0.7)}
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
