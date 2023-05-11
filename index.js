class Event {
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

module.exports = class EventEmitter {
  constructor () {
    this._events = Object.create(null)
  }

  static EventEmitter = this

  static once (e, name) {
    return new Promise((resolve) => e.once(name, resolve))
  }

  on (name, fn) {
    this.addListener(name, fn)
    return this
  }

  addListener (name, fn) {
    const e = this._events[name] || (this._events[name] = new Event())
    e.append(fn, false)
    this.emit('newListener', name, fn)
  }

  prependListener (name, fn) {
    const e = this._events[name] || (this._events[name] = new Event())
    e.prepend(fn, false)
    this.emit('newListener', name, fn)
  }

  once (name, fn) {
    const e = this._events[name] || (this._events[name] = new Event())
    e.append(fn, true)
    this.emit('newListener', name, fn)
    return this
  }

  off (name, fn) {
    const e = this._events[name]
    if (e !== undefined) e.remove(fn)
    this.emit('removeListener', name, fn)
    return this
  }

  removeListener (name, fn) {
    this.off(name, fn)
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

exports.defaultMaxListeners = 10
