const test = require('brittle')
const uncaughts = require('uncaughts')
const AbortController = require('bare-abort-controller')
const EventEmitter = require('.')
const { Event, CustomEvent, EventTarget } = require('./web')

test('new listener event fires before adding', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .once('newListener', (event) => {
      t.is(event, 'hello')
      emitter.on('hello', () => fired.push(1))
    })
    .on('hello', () => fired.push(2))

  emitter.emit('hello')

  t.alike(fired, [1, 2])
})

test('add new listener during emit', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .on('hello', () => {
      fired.push(1)
    })
    .on('hello', () => {
      fired.push(2)
      emitter.addListener('hello', () => fired.push(4))
    })
    .on('hello', () => {
      fired.push(3)
    })
    .emit('hello')

  t.alike(fired, [1, 2, 3])

  fired.length = 0

  emitter.emit('hello')

  t.alike(fired, [1, 2, 3, 4])
})

test('prepend new listener during emit', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .on('hello', () => {
      fired.push(1)
    })
    .on('hello', () => {
      fired.push(2)
      emitter.prependListener('hello', () => fired.push(4))
    })
    .on('hello', () => {
      fired.push(3)
    })
    .emit('hello')

  t.alike(fired, [1, 2, 3])

  fired.length = 0

  emitter.emit('hello')

  t.alike(fired, [4, 1, 2, 3])
})

test('remove listener during new listener event', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .on('hello', a)
    .on('newListener', () => emitter.off('hello', a))
    .on('hello', b)
    .emit('hello')

  t.alike(fired, ['b'])

  function a() {
    fired.push('a')
  }

  function b() {
    fired.push('b')
  }
})

test('on', async (t) => {
  const emitter = new EventEmitter()

  queueMicrotask(() => {
    emitter.emit('foo', 1)
    emitter.emit('foo', 2)
    emitter.emit('foo', 3)
  })

  let i = 0

  for await (const args of EventEmitter.on(emitter, 'foo')) {
    t.alike(args, [++i])

    if (i === 3) break
  }
})

test('on signal + abort', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const iterator = EventEmitter.on(emitter, 'foo', {
    signal: controller.signal
  })

  controller.abort()

  await t.exception(iterator.next())
})

test('on signal + abort reason', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const iterator = EventEmitter.on(emitter, 'foo', {
    signal: controller.signal
  })

  controller.abort(new Error('cancel'))

  try {
    await iterator.next()
    t.fail('should abort')
  } catch (err) {
    t.is(err.cause.message, 'cancel')
  }
})

test('on signal + already aborted', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  controller.abort(new Error('cancel'))

  try {
    EventEmitter.on(emitter, 'foo', { signal: controller.signal })
    t.fail('should abort')
  } catch (err) {
    t.is(err.cause.message, 'cancel')
  }
})

test('once', async (t) => {
  const emitter = new EventEmitter()

  const promise = EventEmitter.once(emitter, 'hello')

  emitter.emit('hello', 'world', '!')

  t.alike(await promise, ['world', '!'])
})

test('once + emit error', async (t) => {
  const emitter = new EventEmitter()

  const promise = EventEmitter.once(emitter, 'hello')

  emitter.emit('error', new Error('cancel'))

  try {
    await promise
    t.fail('should abort')
  } catch (err) {
    t.is(err.message, 'cancel')
  }
})

test('once signal + abort', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const promise = EventEmitter.once(emitter, 'hello', {
    signal: controller.signal
  })

  controller.abort()

  await t.exception(promise)
})

test('once signal + abort reason', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const promise = EventEmitter.once(emitter, 'hello', {
    signal: controller.signal
  })

  controller.abort(new Error('cancel'))

  try {
    await promise
    t.fail('should abort')
  } catch (err) {
    t.is(err.cause.message, 'cancel')
  }
})

test('once signal + already aborted', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  controller.abort(new Error('cancel'))

  try {
    await EventEmitter.once(emitter, 'hello', { signal: controller.signal })
    t.fail('should abort')
  } catch (err) {
    t.is(err.cause.message, 'cancel')
  }
})

test('once triggers listener events', (t) => {
  t.plan(3)

  const emitter = new EventEmitter()

  const fn = () => t.pass('event emitted')

  emitter
    .on('removeListener', (...args) => t.alike(args, ['hello', fn]))
    .on('newListener', (...args) => t.alike(args, ['hello', fn]))

  emitter.once('hello', fn).emit('hello')
})

test('reentrant emit from once', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .on('hello', () => fired.push(1))
    .once('hello', () => {
      fired.push(2)
      emitter.emit('hello')
    })
    .emit('hello')

  t.alike(fired, [1, 2, 1])
})

test('remove all', (t) => {
  const emitter = new EventEmitter()

  emitter
    .on('foo', () => t.fail())
    .on('bar', () => t.fail())
    .removeAllListeners()

  emitter.emit('foo')
  emitter.emit('bar')
})

test('remove all with name', (t) => {
  t.plan(1)

  const emitter = new EventEmitter()

  emitter
    .on('foo', () => t.fail())
    .on('bar', () => t.pass())
    .removeAllListeners('foo')

  emitter.emit('foo')
  emitter.emit('bar')
})

test('remove all triggers listener events', (t) => {
  t.plan(2)

  const emitter = new EventEmitter()

  emitter
    .on('foo', () => t.fail())
    .on('bar', () => t.fail())
    .on('removeListener', (name) => t.pass(name))
    .removeAllListeners()

  emitter.emit('foo')
  emitter.emit('bar')
})

test('remove all with name triggers listener events', (t) => {
  t.plan(2)

  const emitter = new EventEmitter()

  emitter
    .on('foo', () => t.fail())
    .on('bar', () => t.pass())
    .on('removeListener', (name) => t.pass(name))
    .removeAllListeners('foo')

  emitter.emit('foo')
  emitter.emit('bar')
})

test('emit error with error listener', (t) => {
  t.plan(2)

  const emitter = new EventEmitter()

  emitter.on('error', (err) => {
    t.comment(err)
    t.ok(err)
  })

  t.is(emitter.emit('error', new Error('Foo')), true)
})

test('emit error without error listener', (t) => {
  t.plan(2)

  const emitter = new EventEmitter()

  uncaughts.once((err) => {
    t.comment(err)
    t.ok(err)
  })

  t.is(emitter.emit('error', new Error('Foo')), false)
})

test('forward', (t) => {
  t.plan(2)

  const a = new EventEmitter()
  const b = new EventEmitter()

  EventEmitter.forward(a, b, ['foo', 'bar'])

  b.once('foo', (n) => t.is(n, 1))
  b.once('bar', (n) => t.is(n, 2))

  a.emit('foo', 1)
  a.emit('bar', 2)
})

test('forward with custom emit', (t) => {
  t.plan(4)

  const a = new EventEmitter()
  const b = new EventEmitter()

  EventEmitter.forward(a, b, ['foo', 'bar'], {
    emit(name, n) {
      t.pass()
      b.emit(name, n * 2)
    }
  })

  b.once('foo', (n) => t.is(n, 2))
  b.once('bar', (n) => t.is(n, 4))

  a.emit('foo', 1)
  a.emit('bar', 2)
})

test('static listenerCount', (t) => {
  t.plan(3)

  const emitter = new EventEmitter()
  const noop = () => {}

  t.is(EventEmitter.listenerCount(emitter, 'foo'), 0)

  emitter.once('foo', noop).once('foo', noop)

  t.is(EventEmitter.listenerCount(emitter, 'foo'), 2)

  emitter.emit('foo')

  t.is(EventEmitter.listenerCount(emitter, 'foo'), 0)
})

test('eventNames returns registered event names', (t) => {
  const emitter = new EventEmitter()
  const sym = Symbol('baz')

  t.alike(emitter.eventNames(), [])

  emitter.on('foo', () => {})
  emitter.on('bar', () => {})
  emitter.on(sym, () => {})

  t.alike(emitter.eventNames(), ['foo', 'bar', sym])
})

test('eventNames updates as listeners are removed', (t) => {
  const emitter = new EventEmitter()
  const fn = () => {}

  emitter.on('foo', fn).on('bar', () => {})

  t.alike(emitter.eventNames(), ['foo', 'bar'])

  emitter.off('foo', fn)

  t.alike(emitter.eventNames(), ['bar'])

  emitter.removeAllListeners()

  t.alike(emitter.eventNames(), [])
})

test('rawListeners returns listener functions', (t) => {
  const emitter = new EventEmitter()
  const a = () => {}
  const b = () => {}

  t.alike(emitter.rawListeners('foo'), [])

  emitter.on('foo', a).on('foo', b)

  t.alike(emitter.rawListeners('foo'), [a, b])
})

test('rawListeners includes once listeners', (t) => {
  const emitter = new EventEmitter()
  const a = () => {}
  const b = () => {}

  emitter.on('foo', a).once('foo', b)

  t.alike(emitter.rawListeners('foo'), [a, b])

  emitter.emit('foo')

  t.alike(emitter.rawListeners('foo'), [a])
})

test('rawListeners returns a copy', (t) => {
  const emitter = new EventEmitter()
  const a = () => {}

  emitter.on('foo', a)

  const list = emitter.rawListeners('foo')
  list.length = 0

  t.alike(emitter.rawListeners('foo'), [a])
})

test('listeners returns listener functions', (t) => {
  const emitter = new EventEmitter()
  const a = () => {}
  const b = () => {}

  t.alike(emitter.listeners('foo'), [])

  emitter.on('foo', a).once('foo', b)

  t.alike(emitter.listeners('foo'), [a, b])

  emitter.emit('foo')

  t.alike(emitter.listeners('foo'), [a])
})

test('listeners returns a copy', (t) => {
  const emitter = new EventEmitter()
  const a = () => {}

  emitter.on('foo', a)

  const list = emitter.listeners('foo')
  list.length = 0

  t.alike(emitter.listeners('foo'), [a])
})

test('emit error without error listener preserves the error', (t) => {
  t.plan(3)

  const emitter = new EventEmitter()
  const err = createError()
  const stack = err.stack

  uncaughts.once((e) => {
    t.is(e, err)
    t.is(e.stack, stack, 'stack is left alone')
  })

  t.is(emitter.emit('error', err), false)

  function createError() {
    return new Error('Foo')
  }
})

test('emit error without error listener wraps a non-error', (t) => {
  t.plan(3)

  const emitter = new EventEmitter()

  uncaughts.once((err) => {
    t.is(err.code, 'UNHANDLED_ERROR')
    t.is(err.cause, 'Foo')
  })

  t.is(emitter.emit('error', 'Foo'), false)
})

test('emit error without event map', (t) => {
  t.plan(2)

  const emitter = Object.create(EventEmitter.prototype)

  uncaughts.once((err) => t.ok(err))

  t.is(emitter.emit('error', new Error('Foo')), false)
})

test('remove all without event map', (t) => {
  const emitter = Object.create(EventEmitter.prototype)

  t.is(emitter.removeAllListeners(), emitter)
  t.is(emitter.removeAllListeners('foo'), emitter)
})

test('on + emit error', async (t) => {
  const emitter = new EventEmitter()

  const iterator = EventEmitter.on(emitter, 'foo')

  emitter.emit('error', new Error('Foo'))

  await t.exception(iterator.next(), /Foo/)

  t.alike(await iterator.next(), { done: true }, 'iterator is closed')
  t.is(emitter.listenerCount('foo'), 0)
  t.is(emitter.listenerCount('error'), 0)
})

test('on + emit error with pending next', async (t) => {
  const emitter = new EventEmitter()

  const iterator = EventEmitter.on(emitter, 'foo')

  const a = iterator.next()
  const b = iterator.next()

  emitter.emit('error', new Error('Foo'))

  await t.exception(a, /Foo/)

  t.alike(await b, { done: true })
})

test('on + return with pending next', async (t) => {
  const emitter = new EventEmitter()

  const iterator = EventEmitter.on(emitter, 'foo')

  const a = iterator.next()
  const b = iterator.next()

  await iterator.return()

  t.alike(await a, { done: true })
  t.alike(await b, { done: true })
})

test('on signal + emit error', async (t) => {
  const emitter = new EventEmitter()
  const signal = createSignal()

  const iterator = EventEmitter.on(emitter, 'foo', { signal })

  emitter.emit('error', new Error('Foo'))

  await t.exception(iterator.next(), /Foo/)

  t.alike(await iterator.next(), { done: true }, 'iterator is closed')
  t.is(signal.listeners.length, 0, 'abort listener is removed')
})

test('on signal + abort with pending next', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const iterator = EventEmitter.on(emitter, 'foo', {
    signal: controller.signal
  })

  const a = iterator.next()
  const b = iterator.next()

  controller.abort()

  await t.exception(a, /OPERATION_ABORTED/)

  t.alike(await b, { done: true })
  t.is(emitter.listenerCount('foo'), 0)
})

test('addListener and addOnceListener', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .addListener('hello', () => fired.push('always'))
    .addOnceListener('hello', () => fired.push('once'))

  emitter.emit('hello')
  emitter.emit('hello')

  t.alike(fired, ['always', 'once', 'always'])
})

test('prependListener', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .on('hello', () => fired.push(2))
    .prependListener('hello', () => fired.push(1))
    .emit('hello')

  t.alike(fired, [1, 2])
})

test('prependOnceListener', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter.on('hello', () => fired.push(2)).prependOnceListener('hello', () => fired.push(1))

  emitter.emit('hello')
  emitter.emit('hello')

  t.alike(fired, [1, 2, 2])
})

test('emit passes all arguments and the emitter as receiver', (t) => {
  t.plan(2)

  const emitter = new EventEmitter()

  emitter.on('hello', function (...args) {
    t.is(this, emitter)
    t.alike(args, [1, 'two', null])
  })

  emitter.emit('hello', 1, 'two', null)
})

test('emit returns whether the event had listeners', (t) => {
  const emitter = new EventEmitter()

  t.is(emitter.emit('hello'), false)

  emitter.once('hello', () => {})

  t.is(emitter.emit('hello'), true)
  t.is(emitter.emit('hello'), false)
})

test('remove listener removes the last of two identical listeners', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  const a = () => fired.push('a')
  const b = () => fired.push('b')

  emitter.on('hello', a).on('hello', b).on('hello', a)

  emitter.off('hello', a)

  emitter.emit('hello')

  t.alike(fired, ['a', 'b'], 'the first of the two remains')
})

test('remove unknown listener', (t) => {
  const emitter = new EventEmitter()
  const a = () => {}

  emitter.on('hello', a)

  t.is(
    emitter.off('hello', () => {}),
    emitter
  )
  t.is(emitter.off('goodbye', a), emitter)
  t.alike(emitter.listeners('hello'), [a])
})

test('once listener does not remove an identical listener', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  const a = () => fired.push('a')

  emitter.on('hello', a).once('hello', a)

  emitter.emit('hello')
  emitter.emit('hello')

  t.alike(fired, ['a', 'a', 'a'])
  t.alike(emitter.listeners('hello'), [a], 'the listener added with on() remains')
})

test('once listener fired by a reentrant emit does not fire again', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .once('hello', () => {
      fired.push(1)
      emitter.emit('hello')
    })
    .once('hello', () => fired.push(2))

  emitter.emit('hello')

  t.alike(fired, [1, 2])
  t.is(emitter.listenerCount('hello'), 0)
})

test('listener removed during emit is still called', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  const b = () => fired.push('b')

  emitter
    .on('hello', () => {
      fired.push('a')
      emitter.off('hello', b)
    })
    .on('hello', b)

  emitter.emit('hello')
  emitter.emit('hello')

  t.alike(fired, ['a', 'b', 'a'])
})

test('remove all during emit', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .on('hello', () => {
      fired.push('a')
      emitter.removeAllListeners('hello')
    })
    .on('hello', () => fired.push('b'))

  emitter.emit('hello')
  emitter.emit('hello')

  t.alike(fired, ['a', 'b'])
  t.is(emitter.listenerCount('hello'), 0)
})

test('symbol event names', (t) => {
  const emitter = new EventEmitter()
  const hello = Symbol('hello')
  const fired = []

  emitter.on(hello, (n) => fired.push(n))

  t.is(emitter.emit(hello, 1), true)
  t.is(emitter.listenerCount(hello), 1)
  t.alike(emitter.eventNames(), [hello])

  emitter.removeAllListeners(hello)

  t.is(emitter.emit(hello, 2), false)
  t.alike(emitter.eventNames(), [])
  t.alike(fired, [1])
})

test('no listeners', (t) => {
  const emitter = new EventEmitter()

  t.is(emitter.emit('hello'), false)
  t.is(emitter.listenerCount('hello'), 0)
  t.alike(emitter.listeners('hello'), [])
  t.alike(emitter.rawListeners('hello'), [])
  t.alike(emitter.eventNames(), [])
})

test('without event map', (t) => {
  const emitter = Object.create(EventEmitter.prototype)

  t.is(emitter.emit('hello'), false)
  t.is(emitter.listenerCount('hello'), 0)
  t.alike(emitter.listeners('hello'), [])
  t.alike(emitter.rawListeners('hello'), [])
  t.alike(emitter.eventNames(), [])
  t.is(
    emitter.off('hello', () => {}),
    emitter
  )
})

test('forward with a symbol name', (t) => {
  t.plan(1)

  const a = new EventEmitter()
  const b = new EventEmitter()
  const hello = Symbol('hello')

  EventEmitter.forward(a, b, hello)

  b.on(hello, (n) => t.is(n, 42))

  a.emit(hello, 42)
})

test('forward with existing listeners', (t) => {
  t.plan(1)

  const a = new EventEmitter()
  const b = new EventEmitter()

  b.on('hello', (n) => t.is(n, 42))

  EventEmitter.forward(a, b, 'hello')

  a.emit('hello', 42)
})

test('forward several names', (t) => {
  const a = new EventEmitter()
  const b = new EventEmitter()
  const fired = []

  EventEmitter.forward(a, b, ['hello', 'goodbye'])

  b.on('hello', () => fired.push('hello')).on('goodbye', () => fired.push('goodbye'))

  a.emit('hello')
  a.emit('goodbye')
  a.emit('other')

  t.alike(fired, ['hello', 'goodbye'])
})

test('forward stops when the last listener is removed', (t) => {
  const a = new EventEmitter()
  const b = new EventEmitter()
  const fired = []

  EventEmitter.forward(a, b, 'hello')

  const onhello = () => fired.push('hello')

  b.on('hello', onhello)
  a.emit('hello')

  t.is(a.listenerCount('hello'), 1)

  b.off('hello', onhello)

  t.is(a.listenerCount('hello'), 0, 'no longer listening on the source')

  a.emit('hello')

  t.alike(fired, ['hello'])
})

test('on + error event', async (t) => {
  const emitter = new EventEmitter()

  const iterator = EventEmitter.on(emitter, 'error')

  emitter.emit('error', new Error('Foo'))

  const { value, done } = await iterator.next()

  t.absent(done)
  t.is(value[0].message, 'Foo', 'errors are yielded, not thrown')

  await iterator.return()
})

test('on buffers events until consumed', async (t) => {
  const emitter = new EventEmitter()

  const iterator = EventEmitter.on(emitter, 'foo')

  emitter.emit('foo', 1)
  emitter.emit('foo', 2)

  t.alike(await iterator.next(), { value: [1], done: false })
  t.alike(await iterator.next(), { value: [2], done: false })

  await iterator.return()
})

test('on + throw', async (t) => {
  const emitter = new EventEmitter()

  const iterator = EventEmitter.on(emitter, 'foo')

  t.is(iterator[Symbol.asyncIterator](), iterator)

  await iterator.throw(new Error('Foo'))

  await t.exception(iterator.next(), /Foo/)

  t.alike(await iterator.next(), { done: true })
  t.is(emitter.listenerCount('foo'), 0)
})

test('once + error event', async (t) => {
  const emitter = new EventEmitter()

  queueMicrotask(() => emitter.emit('error', new Error('Foo')))

  const [err] = await EventEmitter.once(emitter, 'error')

  t.is(err.message, 'Foo', 'errors are resolved, not rejected')
  t.is(emitter.listenerCount('error'), 0)
})

test('errors', (t) => {
  const { errors } = EventEmitter

  const aborted = errors.OPERATION_ABORTED(new Error('Foo'))

  t.is(aborted.name, 'EventEmitterError')
  t.is(aborted.code, 'OPERATION_ABORTED')
  t.is(aborted.cause.message, 'Foo')

  const unhandled = errors.UNHANDLED_ERROR('Foo', 'Bar')

  t.is(unhandled.code, 'UNHANDLED_ERROR')
  t.is(unhandled.message, 'UNHANDLED_ERROR: Bar')
})

test('exports', (t) => {
  t.is(EventEmitter.EventEmitter, EventEmitter)
  t.is(typeof EventEmitter.defaultMaxListeners, 'number')
})

test('removeListener', (t) => {
  const emitter = new EventEmitter()
  const a = () => {}

  emitter.addListener('hello', a)

  t.is(emitter.removeListener('hello', a), emitter)
  t.alike(emitter.listeners('hello'), [])
})

test('without event map, add listener', (t) => {
  const emitter = Object.create(EventEmitter.prototype)
  const fired = []

  emitter.on('hello', () => fired.push('a'))

  t.is(emitter.emit('hello'), true)
  t.alike(fired, ['a'])
  t.alike(emitter.eventNames(), ['hello'])
})

test('without event map, prepend listener', (t) => {
  const emitter = Object.create(EventEmitter.prototype)
  const fired = []

  emitter.prependListener('hello', () => fired.push('a'))
  emitter.prependListener('hello', () => fired.push('b'))

  t.is(emitter.emit('hello'), true)
  t.alike(fired, ['b', 'a'])
})

test('once signal + event', async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  queueMicrotask(() => emitter.emit('foo', 1))

  t.alike(await EventEmitter.once(emitter, 'foo', { signal: controller.signal }), [1])
  t.is(emitter.listenerCount('error'), 0, 'the error listener is removed')
})

test('once signal + emit error', async (t) => {
  const emitter = new EventEmitter()
  const signal = createSignal()

  const promise = EventEmitter.once(emitter, 'foo', { signal })

  emitter.emit('error', new Error('Foo'))

  await t.exception(promise, /Foo/)

  t.is(emitter.listenerCount('foo'), 0)
  t.is(emitter.listenerCount('error'), 0)
  t.is(signal.listeners.length, 0, 'abort listener is removed')
})

test('EventTarget remove listener during dispatch', (t) => {
  const target = new EventTarget()
  const fired = []

  const a = () => {
    fired.push('a')
    target.removeEventListener('x', a)
  }

  target.addEventListener('x', a)
  target.addEventListener('x', () => fired.push('b'))

  target.dispatchEvent(new Event('x'))
  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a', 'b', 'b'])
})

test('EventTarget remove next listener during dispatch', (t) => {
  const target = new EventTarget()
  const fired = []

  const b = () => fired.push('b')

  target.addEventListener('x', () => {
    fired.push('a')
    target.removeEventListener('x', b)
  })
  target.addEventListener('x', b)

  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a'])
})

test('EventTarget once listener fires only once', (t) => {
  const target = new EventTarget()
  const fired = []

  target.addEventListener('x', () => fired.push('a'), { once: true })

  target.dispatchEvent(new Event('x'))
  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a'])
})

test('EventTarget once listener with sibling fires only once', (t) => {
  const target = new EventTarget()
  const fired = []

  target.addEventListener('x', () => fired.push('a'), { once: true })
  target.addEventListener('x', () => fired.push('b'))

  target.dispatchEvent(new Event('x'))
  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a', 'b', 'b'])
})

test('EventTarget signal-aborted listener is removed', (t) => {
  const target = new EventTarget()
  const controller = new AbortController()
  const fired = []

  target.addEventListener('x', () => fired.push('keep'))
  target.addEventListener('x', () => fired.push('drop'), {
    signal: controller.signal
  })

  controller.abort()
  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['keep'])
})

test('EventTarget event current target', (t) => {
  t.plan(3)

  const target = new EventTarget()
  const event = new Event('x')

  target.addEventListener('x', (e) => {
    t.is(e.target, target)
    t.is(e.currentTarget, target)
  })

  target.dispatchEvent(event)

  t.is(event.currentTarget, null, 'current target is unset after dispatch')
})

test('EventTarget dispatch during dispatch', (t) => {
  t.plan(2)

  const target = new EventTarget()
  const event = new Event('x')

  target.addEventListener('x', () => {
    t.exception(() => target.dispatchEvent(event), /already being dispatched/)
  })

  t.is(target.dispatchEvent(event), true)
})

test('EventTarget dispatch same event twice', (t) => {
  const target = new EventTarget()
  const event = new Event('x')
  const fired = []

  target.addEventListener('x', () => fired.push('a'))

  target.dispatchEvent(event)
  target.dispatchEvent(event)

  t.alike(fired, ['a', 'a'])
})

test('EventTarget passive listener cannot prevent default', (t) => {
  const target = new EventTarget()
  const event = new Event('x', { cancelable: true })

  target.addEventListener('x', (e) => e.preventDefault(), { passive: true })

  t.is(target.dispatchEvent(event), true)
  t.is(event.defaultPrevented, false)
})

test('EventTarget passive listener does not affect siblings', (t) => {
  const target = new EventTarget()
  const event = new Event('x', { cancelable: true })

  target.addEventListener('x', (e) => e.preventDefault(), { passive: true })
  target.addEventListener('x', (e) => e.preventDefault())

  t.is(target.dispatchEvent(event), false)
  t.is(event.defaultPrevented, true)
})

test('EventTarget removed listener drops its abort listener', (t) => {
  const target = new EventTarget()
  const fn = () => {}

  const signal = createSignal()

  target.addEventListener('x', fn, { signal })
  t.is(signal.listeners.length, 1)

  target.removeEventListener('x', fn)
  t.is(signal.listeners.length, 0, 'removed by removeEventListener()')

  const once = createSignal()

  target.addEventListener('x', fn, { signal: once, once: true })
  t.is(once.listeners.length, 1)

  target.dispatchEvent(new Event('x'))
  t.is(once.listeners.length, 0, 'removed by a once listener firing')
})

test('Event defaults', (t) => {
  const event = new Event('x')

  t.is(event.type, 'x')
  t.is(event.target, null)
  t.is(event.currentTarget, null)
  t.is(event.bubbles, false)
  t.is(event.cancelable, false)
  t.is(event.composed, false)
  t.is(event.defaultPrevented, false)
  t.is(event.isTrusted, false)
})

test('Event options', (t) => {
  const event = new Event('x', { bubbles: true, cancelable: true, composed: true })

  t.is(event.bubbles, true)
  t.is(event.cancelable, true)
  t.is(event.composed, true)
})

test('Event prevent default', (t) => {
  const target = new EventTarget()

  target.addEventListener('x', (e) => e.preventDefault())

  const cancelable = new Event('x', { cancelable: true })

  t.is(target.dispatchEvent(cancelable), false)
  t.is(cancelable.defaultPrevented, true)

  const event = new Event('x')

  t.is(target.dispatchEvent(event), true, 'a non-cancelable event cannot be canceled')
  t.is(event.defaultPrevented, false)
})

test('CustomEvent detail', (t) => {
  t.is(new CustomEvent('x').detail, null)
  t.alike(new CustomEvent('x', { detail: { n: 1 } }).detail, { n: 1 })
})

test('EventTarget dispatch without listeners', (t) => {
  const target = new EventTarget()
  const event = new Event('x')

  t.is(target.dispatchEvent(event), true)
  t.is(event.target, target, 'the target is set regardless')
})

test('EventTarget stop immediate propagation', (t) => {
  const target = new EventTarget()
  const fired = []

  target.addEventListener('x', (e) => {
    fired.push('a')
    e.stopImmediatePropagation()
  })
  target.addEventListener('x', () => fired.push('b'))

  t.is(target.dispatchEvent(new Event('x')), true)
  t.alike(fired, ['a'])
})

test('EventTarget stop propagation does not stop siblings', (t) => {
  const target = new EventTarget()
  const fired = []

  target.addEventListener('x', (e) => {
    fired.push('a')
    e.stopPropagation()
  })
  target.addEventListener('x', () => fired.push('b'))

  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a', 'b'])
})

test('EventTarget stop immediate propagation is reset between dispatches', (t) => {
  const target = new EventTarget()
  const event = new Event('x')
  const fired = []

  target.addEventListener('x', (e) => {
    fired.push('a')
    e.stopImmediatePropagation()
  })
  target.addEventListener('x', () => fired.push('b'))

  target.dispatchEvent(event)
  target.dispatchEvent(event)

  t.alike(fired, ['a', 'a'], 'the flag is unset when dispatch completes')
})

test('EventTarget listener added during dispatch is not called', (t) => {
  const target = new EventTarget()
  const fired = []

  target.addEventListener('x', () => {
    fired.push('a')
    target.addEventListener('x', () => fired.push('b'))
  })

  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a'], 'the listener list is snapshotted')
})

test('EventTarget duplicate listener is ignored', (t) => {
  const target = new EventTarget()
  const fired = []

  const a = () => fired.push('a')

  target.addEventListener('x', a)
  target.addEventListener('x', a)

  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a'])
})

test('EventTarget duplicate listener with capture is kept', (t) => {
  const target = new EventTarget()
  const fired = []

  const a = () => fired.push('a')

  target.addEventListener('x', a)
  target.addEventListener('x', a, { capture: true })

  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a', 'a'])
})

test('EventTarget capture as a boolean', (t) => {
  const target = new EventTarget()
  const fired = []

  const a = () => fired.push('a')

  target.addEventListener('x', a, true)

  target.removeEventListener('x', a, false)
  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a'], 'capture must match')

  target.removeEventListener('x', a, true)
  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a'])
})

test('EventTarget null listener', (t) => {
  const target = new EventTarget()

  target.addEventListener('x', null)

  t.is(target.dispatchEvent(new Event('x')), true)
})

test('EventTarget remove unknown listener', (t) => {
  const target = new EventTarget()
  const fired = []

  const a = () => fired.push('a')

  target.addEventListener('x', a)

  target.removeEventListener('x', () => {})
  target.removeEventListener('y', a)

  target.dispatchEvent(new Event('x'))

  t.alike(fired, ['a'])
})

test('EventTarget object listener', (t) => {
  t.plan(3)

  const target = new EventTarget()

  const listener = {
    handleEvent(e) {
      t.is(this, listener)
      t.is(e.type, 'x')
    }
  }

  target.addEventListener('x', listener)

  t.is(target.dispatchEvent(new Event('x')), true)
})

test('EventTarget listener exception does not stop dispatch', (t) => {
  t.plan(3)

  const target = new EventTarget()
  const fired = []

  uncaughts.once((err) => t.is(err.message, 'Foo'))

  target.addEventListener('x', () => {
    fired.push('a')
    throw new Error('Foo')
  })
  target.addEventListener('x', () => fired.push('b'))

  t.is(target.dispatchEvent(new Event('x')), true)
  t.alike(fired, ['a', 'b'])
})

test('Event toJSON', (t) => {
  const target = new EventTarget()
  const event = new Event('x', { bubbles: true })

  t.alike(event.toJSON(), {
    type: 'x',
    target: null,
    bubbles: true,
    cancelable: false,
    composed: false,
    defaultPrevented: false,
    isTrusted: false
  })

  target.dispatchEvent(event)

  t.alike(JSON.parse(JSON.stringify(event)), {
    type: 'x',
    target: {},
    bubbles: true,
    cancelable: false,
    composed: false,
    defaultPrevented: false,
    isTrusted: false
  })
})

test('CustomEvent toJSON', (t) => {
  const event = new CustomEvent('x', { detail: { n: 1 } })

  t.alike(event.toJSON(), {
    type: 'x',
    target: null,
    bubbles: false,
    cancelable: false,
    composed: false,
    defaultPrevented: false,
    isTrusted: false,
    detail: { n: 1 }
  })

  t.alike(JSON.parse(JSON.stringify(new CustomEvent('x'))).detail, null)
})

test('CustomEvent inspect', (t) => {
  const inspect = Symbol.for('bare.inspect')

  const event = new CustomEvent('x', { detail: { n: 1 } })
  const info = event[inspect]()

  t.is(info.constructor, CustomEvent)
  t.alike(info.detail, { n: 1 })
})

test('Event inspect', (t) => {
  const inspect = Symbol.for('bare.inspect')

  const event = new Event('x')
  const info = event[inspect]()

  t.is(info.constructor, Event)
  t.is(info.type, 'x')

  const target = new EventTarget()

  t.is(target[inspect]().constructor, EventTarget)
})

test('EventTarget already aborted signal', (t) => {
  const target = new EventTarget()
  const controller = new AbortController()
  const fired = []

  controller.abort()

  target.addEventListener('x', () => fired.push('a'), {
    signal: controller.signal
  })

  target.dispatchEvent(new Event('x'))

  t.alike(fired, [])
})

function createSignal() {
  const listeners = []

  return {
    aborted: false,
    reason: null,
    listeners,

    addEventListener(type, fn) {
      listeners.push(fn)
    },

    removeEventListener(type, fn) {
      const i = listeners.indexOf(fn)

      if (i !== -1) listeners.splice(i, 1)
    }
  }
}
