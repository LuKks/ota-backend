const yup = require('yup')

const schema = yup.object().shape({
  device_id: yup.string().required()
}).required()

module.exports = async function (req, res) {
  const body = await schema.validate(req.body)

  await req.db.put('/firewall/' + req.firmware.id + '/' + body.device_id, {
    state: 'allow',
    time: Date.now()
  })

  res.status(200).json(null)
}
