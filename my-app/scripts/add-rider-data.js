const fs = require('fs');
const path = require('path');

const bikesPath = path.join(__dirname, '..', 'data', 'bikes.json');
const bikes = JSON.parse(fs.readFileSync(bikesPath, 'utf-8'));

// Default rider setup
const defaultRider = {
  riderHeight: 1800,
  riderInseam: 890,
  torsoAngle: 30,
  shoeThickness: 15
};

// This script is not needed since bikes.json structure is:
// Brand -> Model -> Size -> Geometry (not full BikeData objects)
// The rider data will be added in the component when creating BikeData

console.log('bikes.json structure does not need modification.');
console.log('Rider data will be added in components when creating BikeData objects.');
console.log('Default rider values:', defaultRider);
