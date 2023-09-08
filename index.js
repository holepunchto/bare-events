class EventListener {
  constructor () {
    this.list = []
    this.emitting = false
    this.removing = null
  }

  append (fn, once) {
    this.list.push([fn, once])
  }

  prepend (fn, once) {
    this.list.unshift([fn, once])
  }

  remove (fn) {
    if (this.emitting === true) {
      if (this.removing === null) this.removing = []
      this.removing.push(fn)
      return
    }

    for (let i = 0; i < this.list.length; i++) {
      const l = this.list[i]

      if (l[0] === fn) {
        this.list.splice(i, 1)
        return
      }
    }
  }

  emit (ctx, ...args) {
    this.emitting = true
    const listeners = this.list.length > 0

    try {
      for (let i = 0; i < this.list.length; i++) {
        const l = this.list[i]

        l[0].call(ctx, ...args)
        if (l[1] === true) this.list.splice(i--, 1)
      }
    } finally {
      this.emitting = false

      if (this.removing !== null) {
        const fns = this.removing
        this.removing = null
        for (const fn of fns) this.remove(fn)
      }
    }

    return listeners
  }
}

module.exports = exports = class EventEmitter {
  constructor () {
    this._events = Object.create(null)
  }

  addListener (name, fn) {
    this.emit('newListener', name, fn)
    const e = this._events[name] || (this._events[name] = new EventListener())
    e.append(fn, false)
  }

  addOnceListener (name, fn) {
    this.emit('newListener', name, fn)
    const e = this._events[name] || (this._events[name] = new EventListener())
    e.append(fn, true)
  }

  prependListener (name, fn) {
    this.emit('newListener', name, fn)
    const e = this._events[name] || (this._events[name] = new EventListener())
    e.prepend(fn, false)
  }

  prependOnceListener (name, fn) {
    this.emit('newListener', name, fn)
    const e = this._events[name] || (this._events[name] = new EventListener())
    e.prepend(fn, true)
  }

  removeListener (name, fn) {
    const e = this._events[name]
    if (e !== undefined) e.remove(fn)
    this.emit('removeListener', name, fn)
  }

  on (name, fn) {
    this.addListener(name, fn)
    return this
  }

  once (name, fn) {
    this.addOnceListener(name, fn)
    return this
  }

  off (name, fn) {
    this.removeListener(name, fn)
    return this
  }

  emit (name, ...args) {
    const e = this._events[name]
    return e === undefined ? false : e.emit(this, ...args)
  }

  listenerCount (name) {
    const e = this._events[name]
    return e === undefined ? 0 : e.list.length
  }

  getMaxListeners () {
    return EventEmitter.defaultMaxListeners
  }

  setMaxListeners (n) {}
}

exports.EventEmitter = exports

exports.defaultMaxListeners = 10

exports.once = function once (emitter, name, opts = {}) {
  const {
    signal
  } = opts

  return new Promise((resolve, reject) => {
    if (signal) {
      if (signal.aborted) return reject(signal.reason)

      signal.addEventListener('abort', abort)
    }

    emitter.once(name, (...args) => {
      if (signal) signal.removeEventListener('abort', abort)

      resolve(args)
    })

    function abort () {
      reject(signal.reason)
    }
  })
}
