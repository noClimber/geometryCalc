export type BikeGeometry = {
  stack: number
  reach: number
  headTubeAngle: number
  seatTubeAngle: number
  forkLength: number
  bbDrop: number
  headTubeLength: number
  seatTubeLength: number
  chainstayLength: number
  frontCenter: number
}

export type CockpitSetup = {
  spacerHeight: number
  headsetCap: number
  stemLength: number
  stemAngle: number
  handlebarReach: number
  handlebarDrop: number
  crankLength: number
  pedalAngle: number
  handPosition: 'hoods' | 'drops'
  seatPostLength: number
}

export type RiderSetup = {
  riderHeight: number
  riderInseam: number
  torsoAngle: number
  shoeThickness: number
}

export type BikeData = {
  brand: string
  model: string
  size: string
  geometry: BikeGeometry
  cockpit: CockpitSetup
  rider: RiderSetup
}

export type AlignmentMode = 'bb' | 'rear'

export type AvailableBikesMap = Record<
  string,
  Record<string, Record<string, BikeGeometry>>
>
