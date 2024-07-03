const yup = require('yup')
const ErrorHTTP = require('tiny-error-http')

const schemaQuery = yup.object().shape({
  hash: yup.string()
}).required()

module.exports = async function (req, res) {
  const file = await req.drives.entry(req.firmware.drive.id, '/firmware/latest')

  if (!file) {
    throw new ErrorHTTP(404, 'FIRMWARE_NOT_UPLOADED')
  }

  const query = await schemaQuery.validate(req.query)

  if (query.hash === file.value.metadata.hash) {
    res.sendStatus(204)
    return
  }

  res.status(200).send(file.value.metadata.hash)
}
