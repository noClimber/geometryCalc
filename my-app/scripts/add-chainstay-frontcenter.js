const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'data', 'bikes.json')
const raw = fs.readFileSync(file, 'utf8')
const data = JSON.parse(raw)

// Dummy defaults (mm)
const DEFAULT_CHAINSTAY = 410
const DEFAULT_FRONT_CENTER = 600

function addFields(obj) {
  for (const brand of Object.keys(obj)) {
    const models = obj[brand]
    for (const model of Object.keys(models)) {
      const sizes = models[model]
      for (const size of Object.keys(sizes)) {
        const geom = sizes[size]
        if (typeof geom.chainstayLength !== 'number') {
          geom.chainstayLength = DEFAULT_CHAINSTAY
        }
        if (typeof geom.frontCenter !== 'number') {
          geom.frontCenter = DEFAULT_FRONT_CENTER
        }
      }
    }
  }
}

addFields(data)
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
console.log('Updated bikes.json — added chainstayLength and frontCenter where missing.')
