const yup = require('yup')
const ErrorHTTP = require('tiny-error-http')

const schemaHeaders = yup.object().shape({
  'x-ota-firmware-id': yup.string().required(),
  'x-ota-firmware-key': yup.string().required()
})

module.exports = async function (req, res, next) {
  const headers = await schemaHeaders.validate(req.headers)

  const firmware = await req.db.get('/firmwares/' + headers['x-ota-firmware-id'])

  if (!firmware || firmware.value.key !== headers['x-ota-firmware-key']) {
    throw new ErrorHTTP(401, 'INVALID_AUTH')
  }

  req.firmware = firmware.value

  next()
}
