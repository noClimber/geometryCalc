export type BikeGeometry = {
  stack: number
  reach: number
  headTubeAngle: number
  seatTubeAngle: number
  forkLength: number
  bbDrop: number
  topTubeLength: number
  chainstayLength?: number
  frontCenter?: number
}

export type CockpitSetup = {
  spacerHeight: number
  headsetCap: number
  stemLength: number
  stemAngle: number
  handlebarReach: number
  handlebarDrop: number
}

export type BikeData = {
  brand: string
  model: string
  size: string
  geometry: BikeGeometry
  cockpit: CockpitSetup
}

export type AlignmentMode = 'bb' | 'rear'

export type AvailableBikesMap = Record<
  string,
  Record<string, Record<string, BikeGeometry>>
>
