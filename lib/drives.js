const Hyperdrive = require('hyperdrive')
const mutexify = require('mutexify/promise')

module.exports = class Drives {
  constructor (store) {
    this._store = store

    this._lock = mutexify() // TODO: Lock per drive
    this._handles = new Map()

    this._destroying = false
  }

  async touch (name) {
    if (!name) name = process.hrtime.bigint().toString()

    const store = this._store.namespace(name)
    const drive = new Hyperdrive(store)

    await drive.ready()
    await drive.close()

    return drive.id
  }

  async open (id) {
    const release = await this._lock()

    try {
      // TODO: Option to disable `createIfMissing`
      const drive = await this._open(id)

      return drive
    } finally {
      release()
    }
  }

  async close (id) {
    const release = await this._lock()

    try {
      await this._close(id)
    } finally {
      release()
    }
  }

  async callback (id, cb) {
    const release = await this._lock()

    try {
      const drive = await this._open(id)

      try {
        return await cb(drive)
      } finally {
        await this._close(id)
      }
    } finally {
      release()
    }
  }

  async entry (id, key) {
    return this.callback(id, drive => drive.entry(key))
  }

  async purge (id) {
    return this.callback(id, drive => drive.purge())
  }

  async createReadStream (id, key, opts) {
    const drive = await this.open(id)
    const rs = drive.createReadStream(key, opts)

    rs.on('close', () => {
      this.close(id).catch(noop)
    })

    return rs
  }

  async destroy () {
    const release = await this._lock()

    try {
      this._destroying = true

      for (const [, handle] of this._handles) {
        await handle.drive.close()
      }

      await this._store.close()
    } finally {
      release()
    }
  }

  async _open (id) {
    let handle = this._handles.get(id)

    if (!handle) {
      const drive = new Hyperdrive(this._store.session(), id)

      await drive.ready()

      handle = {
        drive,
        count: 0
      }

      this._handles.set(id, handle)

      drive.once('close', () => {
        this._handles.delete(id)
      })
    }

    handle.count++

    return handle.drive
  }

  async _close (id) {
    const handle = this._handles.get(id)

    if (!handle) return

    handle.count--

    if (handle.count === 0) {
      await handle.drive.close()
    }
  }
}

function noop () {}
