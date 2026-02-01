const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'data', 'bikes.json')
const raw = fs.readFileSync(file, 'utf8')
const data = JSON.parse(raw)

// Simple heuristic: topTubeLength ≈ reach + 10 mm (placeholder)
function addTopTube(obj) {
  for (const brand of Object.keys(obj)) {
    const models = obj[brand]
    for (const model of Object.keys(models)) {
      const sizes = models[model]
      for (const size of Object.keys(sizes)) {
        const geom = sizes[size]
        if (typeof geom.reach === 'number') {
          if (typeof geom.topTubeLength !== 'number') {
            geom.topTubeLength = Math.round(geom.reach + 10)
          }
        }
      }
    }
  }
}

addTopTube(data)
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log('Updated bikes.json — added topTubeLength where missing.')
