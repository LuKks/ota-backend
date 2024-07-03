const fs = require('fs')
const busboy = require('busboy')

module.exports = async function downloadFile (req, out, opts = {}) {
  const bb = busboy({
    headers: req.headers,
    limits: opts.limits || {
      fieldNameSize: 64,
      fieldSize: 1024,
      fields: 10,
      fileSize: 24 * 1024 * 1024,
      files: 1,
      parts: 11,
      headerPairs: 32
    }
  })

  const closing = waitForBusboy(bb)

  closing.catch(noop)

  const bus = await busboyFile(bb, req)

  await createWriteStream(bus.file, out)

  await closing
}

function busboyFile (busboy, req) {
  return new Promise((resolve, reject) => {
    busboy.on('file', onfile)
    busboy.on('error', onerror)
    busboy.on('close', onclose)

    req.pipe(busboy)

    function onfile (name, file, info) {
      cleanup()
      resolve({ name, file, info })
    }

    function onerror (err) {
      cleanup()
      reject(err)
    }

    function onclose () {
      cleanup()
      reject(new Error('File aborted'))
    }

    function cleanup () {
      busboy.removeListener('file', onfile)
      busboy.removeListener('error', onerror)
      busboy.removeListener('close', onclose)
    }
  })
}

function waitForBusboy (busboy) {
  return new Promise((resolve, reject) => {
    busboy.on('close', done)
    busboy.on('error', done)

    function done (err) {
      busboy.removeListener('close', done)
      busboy.removeListener('error', done)

      if (err) reject(err)
      else resolve()
    }
  })
}

function createWriteStream (rs, filename) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(filename)

    ws.on('close', done)
    ws.on('error', done)

    rs.pipe(ws)

    function done (err) {
      ws.removeListener('close', done)
      ws.removeListener('error', done)

      if (err) reject(err)
      else resolve()
    }
  })
}

function noop () {}
