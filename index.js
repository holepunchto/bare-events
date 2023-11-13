const errors = require('./lib/errors')

class EventListener {
  constructor () {
    this.list = []
  }

  append (ctx, name, fn, once) {
    ctx.emit('newListener', name, fn) // Emit BEFORE adding
    this.list.push([fn, once])
  }

  prepend (ctx, name, fn, once) {
    ctx.emit('newListener', name, fn) // Emit BEFORE adding
    this.list.unshift([fn, once])
  }

  remove (ctx, name, fn) {
    for (let i = 0, n = this.list.length; i < n; i++) {
      const l = this.list[i]

      if (l[0] === fn) {
        this.list.splice(i, 1)

        if (this.list.length === 0) delete ctx._events[name]

        ctx.emit('removeListener', name, fn) // Emit AFTER removing
        return
      }
    }
  }

  emit (ctx, name, ...args) {
    const list = [...this.list]

    for (let i = 0, n = list.length; i < n; i++) {
      const l = list[i]

      if (l[1] === true) this.remove(ctx, name, l[0])

      l[0].call(ctx, ...args)
    }

    return list.length > 0
  }
}

function appendListener (ctx, name, fn, once) {
  const e = ctx._events[name] || (ctx._events[name] = new EventListener())
  e.append(ctx, name, fn, once)
  return ctx
}

function prependListener (ctx, name, fn, once) {
  const e = ctx._events[name] || (ctx._events[name] = new EventListener())
  e.prepend(ctx, name, fn, once)
  return ctx
}

function removeListener (ctx, name, fn) {
  const e = ctx._events[name]
  if (e !== undefined) e.remove(ctx, name, fn)
  return ctx
}

module.exports = exports = class EventEmitter {
  constructor () {
    this._events = Object.create(null)
  }

  addListener (name, fn) {
    return appendListener(this, name, fn, false)
  }

  addOnceListener (name, fn) {
    return appendListener(this, name, fn, true)
  }

  prependListener (name, fn) {
    return prependListener(this, name, fn, false)
  }

  prependOnceListener (name, fn) {
    return prependListener(this, name, fn, true)
  }

  removeListener (name, fn) {
    return removeListener(this, name, fn)
  }

  on (name, fn) {
    return appendListener(this, name, fn, false)
  }

  once (name, fn) {
    return appendListener(this, name, fn, true)
  }

  off (name, fn) {
    return removeListener(this, name, fn)
  }

  emit (name, ...args) {
    const e = this._events[name]
    return e === undefined ? false : e.emit(this, name, ...args)
  }

  listeners (name) {
    const e = this._events[name]
    return e === undefined ? [] : [...e.list]
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
      if (signal.aborted) return abort()

      signal.addEventListener('abort', abort)
    }

    emitter.once(name, (...args) => {
      if (signal) signal.removeEventListener('abort', abort)

      resolve(args)
    })

    function abort () {
      reject(errors.OPERATION_ABORTED(signal.reason))
    }
  })
}
