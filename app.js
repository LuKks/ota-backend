require('dotenv').config()

const path = require('path')
const Backend = require('like-backend')
const express = require('like-express')
const ErrorHTTP = require('tiny-error-http')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const c = require('compact-encoding')
const RAM = require('random-access-memory')
const Drives = require('./lib/drives.js')
const authFirmware = require('./middleware/auth-firmware.js')
const authDevice = require('./middleware/auth-device.js')

const STORAGE_CORESTORE = Backend.testing ? RAM.reusable() : path.join(__dirname, 'corestore')

module.exports = Backend.launch(main)

async function main () {
  const app = express()

  const store = new Corestore(STORAGE_CORESTORE)
  const db = new Hyperbee(store.get({ name: 'database' }), { keyEncoding: 'utf-8', valueEncoding: c.any })
  const drives = new Drives(store.namespace('firmwares'))

  app.use(function (req, res, next) {
    req.db = db
    req.drives = drives
    next()
  })

  const api = express.Router()

  api.post('/create', require('./api/create.js'))

  api.post('/firewall/allow', authFirmware, require('./api/firewall-allow.js'))
  api.post('/firewall/deny', authFirmware, require('./api/firewall-deny.js'))

  api.post('/upload', authFirmware, require('./api/upload.js'))

  api.get('/check', authDevice, require('./api/check.js'))
  api.get('/download/:hash', authDevice, require('./api/download.js'))

  app.use('/v1', api)
  app.use(ErrorHTTP.middleware)

  return new Backend({
    app,
    goodbye: async function () {
      await db.close()
      await drives.destroy()
      await store.close()
    }
  })
}
