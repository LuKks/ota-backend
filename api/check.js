const yup = require('yup')
const ErrorHTTP = require('tiny-error-http')

const schemaParams = yup.object().shape({
  hash: yup.string()
}).required()

module.exports = async function (req, res) {
  const file = await req.drives.entry(req.firmware.drive.id, '/firmware/latest')

  if (!file) {
    throw new ErrorHTTP(404, 'FIRMWARE_NOT_UPLOADED')
  }

  const params = await schemaParams.validate(req.params)

  if (params.hash === file.value.metadata.hash) {
    res.sendStatus(204)
    return
  }

  res.status(200).send(file.value.metadata.hash)
}
