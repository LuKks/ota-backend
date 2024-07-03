const yup = require('yup')
const ErrorHTTP = require('tiny-error-http')

const schemaHeaders = yup.object().shape({
  'x-ota-secret': yup.string().required()
})

module.exports = async function (req, res, next) {
  if (!process.env.OTA_SECRET) {
    next()
    return
  }

  const headers = await schemaHeaders.validate(req.headers)

  if (process.env.OTA_SECRET !== headers['x-ota-secret']) {
    throw new ErrorHTTP(401, 'INVALID_AUTH')
  }

  next()
}
