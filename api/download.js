const yup = require('yup')
const ErrorHTTP = require('tiny-error-http')
const rangeParser = require('range-parser')
const { pipelinePromise } = require('streamx')

const schemaParams = yup.object().shape({
  hash: yup.string().required()
}).required()

module.exports = async function (req, res) {
  const params = await schemaParams.validate(req.params)

  const filename = '/firmware/' + params.hash
  const file = await req.drives.entry(req.firmware.drive.id, filename)

  if (!file) {
    throw new ErrorHTTP(404, 'FIRMWARE_NOT_AVAILABLE')
  }

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Accept-Ranges', 'bytes')

  let start = 0
  let length = file.value.blob.byteLength

  if (req.headers.range) {
    const ranges = rangeParser(file.value.blob.byteLength, req.headers.range)

    if (ranges === -1 || ranges === -2) {
      res.status(206)
      res.setHeader('Content-Length', 0)
      res.end()
      return
    }

    const range = ranges[0]
    const byteLength = range.end - range.start + 1

    start = range.start
    length = byteLength

    res.status(206)
    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.value.blob.byteLength)
  } else {
    res.status(200)
  }

  res.setHeader('Content-Length', length)

  if (req.method === 'HEAD') {
    res.end()
    return
  }

  try {
    const options = { start, length, wait: false }
    const rs = await req.drives.createReadStream(req.firmware.drive.id, filename, options)

    await pipelinePromise(rs, res)
  } catch (err) {
    if (err.code === 'BLOCK_NOT_AVAILABLE') {
      throw new ErrorHTTP(404, 'FIRMWARE_NOT_AVAILABLE')
    }

    throw err
  }
}
