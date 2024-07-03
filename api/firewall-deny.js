const yup = require('yup')

const schema = yup.object().shape({
  device_id: yup.string().required()
}).required()

module.exports = async function (req, res) {
  const body = await schema.validate(req.body)

  await req.db.del('/firewall/' + req.firmware.id + '/' + body.device_id)

  res.status(200).json(null)
}
