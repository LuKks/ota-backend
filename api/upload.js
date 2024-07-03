const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const tmp = require('like-tmp')
const downloadFile = require('../lib/busboy.js')

module.exports = async function (req, res) {
  const dir = await tmp()
  const dst = path.join(dir, 'file')

  try {
    await downloadFile(req, dst)

    // Sub-optimal but fine for now because it will use the ELF sha256 later
    const fileBuffer = await fs.promises.readFile(dst)
    const hash = crypto.createHash('sha1').update(fileBuffer).digest('hex')

    await req.drives.callback(req.firmware.drive.id, async function (drive) {
      const filename = '/firmware/' + hash

      await drive.put(filename, fileBuffer, {
        metadata: {
          time: Date.now()
        }
      })

      const tag = '/firmware/latest'
      const previous = await drive.entry(tag, { follow: true })

      await drive.symlink(tag, filename, {
        metadata: {
          hash
        }
      })

      if (previous) {
        await drive.clear(previous.key)
        await drive.del(previous.key)
      }
    })

    res.status(200).json({ hash })
  } finally {
    await gc(dir)
  }
}

async function gc (dir) {
  try {
    await fs.promises.rm(dir, { recursive: true })
  } catch {}
}
