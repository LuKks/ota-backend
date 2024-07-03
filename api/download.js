const yup = require('yup')
const ErrorHTTP = require('tiny-error-http')
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
  res.setHeader('Content-Length', file.value.blob.byteLength)

  try {
    const rs = await req.drives.createReadStream(req.firmware.drive.id, filename, { wait: false })

    res.status(200)

    await pipelinePromise(rs, res)
  } catch (err) {
    if (err.code === 'BLOCK_NOT_AVAILABLE') {
      throw new ErrorHTTP(404, 'FIRMWARE_NOT_AVAILABLE')
    }

    throw err
  }
}
