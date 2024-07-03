const yup = require('yup')
const ErrorHTTP = require('tiny-error-http')

const schemaHeaders = yup.object().shape({
  'x-ota-firmware-id': yup.string().required(),
  'x-ota-device-id': yup.string().required()
})

module.exports = async function (req, res, next) {
  const headers = await schemaHeaders.validate(req.headers)

  const firmware = await req.db.get('/firmwares/' + headers['x-ota-firmware-id'])

  if (!firmware) {
    throw new ErrorHTTP(401, 'INVALID_AUTH')
  }

  const allowance = await req.db.get('/firewall/' + firmware.value.id + '/' + headers['x-ota-device-id'])

  if (!allowance) {
    const allowanceAll = await req.db.get('/firewall/' + firmware.value.id + '/all')

    if (!allowanceAll) {
      throw new ErrorHTTP(401, 'INVALID_AUTH')
    }
  }

  req.firmware = firmware.value

  next()
}
