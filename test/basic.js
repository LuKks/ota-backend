const test = require('brittle')
const FormData = require('form-data')
const launch = require('../app.js')

test.solo('basic', async function (t) {
  const request = await launch(t)

  // Create a new firmware
  const firmware = await request('/v1/create', {
    method: 'POST'
  })

  // Allow a device
  const deviceId = 'abc'

  await request('/v1/firewall/allow', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    body: { device_id: deviceId }
  })

  // Devie checks for latest but there is no firwmare yet
  await request('/v1/check/?hash=', {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 404
  })

  // Upload an update
  const form = new FormData()

  form.append('file', Buffer.from('Hello World!'), {
    filename: 'firmware.bin',
    contentType: 'text/plain'
  })

  const uploaded = await request('/v1/upload', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    requestType: 'form',
    body: form
  })

  // Device checks again for latest
  const firstUpdate = await request('/v1/check/?hash=', {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 200,
    responseType: 'text'
  })

  t.is(firstUpdate, uploaded.hash)

  // Device downloads the update
  const firstDownload = await request('/v1/download/' + firstUpdate, {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    responseType: false
  })

  t.alike(await firstDownload.buffer(), Buffer.from('Hello World!'))

  // Device is already on latest
  await request('/v1/check/?hash=' + firstUpdate, {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 204,
    responseType: false
  })

  // Disallow device
  await request('/v1/firewall/deny', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    body: { device_id: deviceId }
  })

  // Device is not allowed to check anymore
  await request('/v1/check/?hash=', {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 401
  })

  // Device is not allowed to download anymore
  await request('/v1/download/' + firstUpdate, {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 401
  })
})

test('re-upload', async function (t) {
  const request = await launch(t)

  const firmware = await request('/v1/create', {
    method: 'POST'
  })

  const deviceId = 'abc'

  await request('/v1/firewall/allow', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    body: { device_id: deviceId }
  })

  // Upload
  const form = new FormData()

  form.append('file', Buffer.from('Hello World!'), {
    filename: 'firmware.bin',
    contentType: 'text/plain'
  })

  const uploaded = await request('/v1/upload', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    requestType: 'form',
    body: form
  })

  // Upload again
  const form2 = new FormData()

  form2.append('file', Buffer.from('¡Hola Mundo!'), {
    filename: 'firmware.bin',
    contentType: 'text/plain'
  })

  const uploaded2 = await request('/v1/upload', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    requestType: 'form',
    body: form2
  })

  // Check without hash
  const firstCheck = await request('/v1/check/?hash=', {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 200,
    responseType: 'text'
  })

  t.is(firstCheck, uploaded2.hash)

  // Check older hash
  const secondCheck = await request('/v1/check/?hash=' + uploaded.hash, {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 200,
    responseType: 'text'
  })

  t.is(secondCheck, uploaded2.hash)

  // Older firmware is deleted
  await request('/v1/download/' + uploaded.hash, {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    validateStatus: 404,
    responseType: false
  })

  const download = await request('/v1/download/' + uploaded2.hash, {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    responseType: false
  })

  t.alike(await download.buffer(), Buffer.from('¡Hola Mundo!'))
})

test('big download is interrupted by new upload', async function (t) {
  const request = await launch(t)

  const firmware = await request('/v1/create', {
    method: 'POST'
  })

  const deviceId = 'abc'

  await request('/v1/firewall/allow', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    body: { device_id: deviceId }
  })

  // Upload
  const form = new FormData()

  form.append('file', Buffer.alloc(8 * 1024 * 1024).fill('abcdef'), {
    filename: 'firmware.bin',
    contentType: 'text/plain'
  })

  const uploaded = await request('/v1/upload', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    requestType: 'form',
    body: form
  })

  // Start downloading
  const download = await request('/v1/download/' + uploaded.hash, {
    method: 'GET',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-device-id': deviceId },
    responseType: false
  })

  const chunk1 = await readChunk(download.body)
  t.ok(chunk1.toString().startsWith('abcdef'))

  // New upload
  const form2 = new FormData()

  form2.append('file', Buffer.from('Hello World!'), {
    filename: 'firmware.bin',
    contentType: 'text/plain'
  })

  await request('/v1/upload', {
    method: 'POST',
    headers: { 'x-ota-firmware-id': firmware.id, 'x-ota-firmware-key': firmware.key },
    requestType: 'form',
    body: form2
  })

  // Continue downloading old firmware but is already deleted
  try {
    await readChunk(download.body)
  } catch (err) {
    t.is(err.message, 'Stream closed')
  }
})

function readChunk (body) {
  return new Promise((resolve, reject) => {
    if (body.closed) {
      onclose()
      return
    }

    body.on('data', ondata)
    body.on('close', onclose)

    function ondata (data) {
      cleanup()
      resolve(data)
    }

    function onclose () {
      cleanup()
      reject(new Error('Stream closed'))
    }

    function cleanup () {
      body.off('data', ondata)
      body.off('close', onclose)
    }
  })
}
