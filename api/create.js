const crypto = require('hypercore-crypto')
const z32 = require('z32')

module.exports = async function (req, res) {
  const id = z32.encode(crypto.randomBytes(16))
  const key = z32.encode(crypto.randomBytes(32))
  const driveId = await req.drives.touch(id)

  await req.db.put('/firmwares/' + id, {
    id,
    key,
    drive: { id: driveId },
    time: Date.now()
  })

  res.status(200).json({ id, key })
}
