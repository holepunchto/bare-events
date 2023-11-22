const test = require('brittle')
const EventEmitter = require('.')

const isBare = typeof Bare !== 'undefined'

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
    .on('hello', () => { fired.push(1) })
    .on('hello', () => { fired.push(2); emitter.addListener('hello', () => fired.push(4)) })
    .on('hello', () => { fired.push(3) })
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
    .on('hello', () => { fired.push(1) })
    .on('hello', () => { fired.push(2); emitter.prependListener('hello', () => fired.push(4)) })
    .on('hello', () => { fired.push(3) })
    .emit('hello')

  t.alike(fired, [1, 2, 3])

  fired.length = 0

  emitter.emit('hello')

  t.alike(fired, [4, 1, 2, 3])
})

test('once', async (t) => {
  const emitter = new EventEmitter()

  const promise = EventEmitter.once(emitter, 'hello')

  emitter.emit('hello', 'world', '!')

  t.alike(await promise, ['world', '!'])
})

test('once signal + abort', { skip: isBare }, async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const promise = EventEmitter.once(emitter, 'hello', { signal: controller.signal })

  controller.abort()

  await t.exception(promise)
})

test('once signal + abort reason', { skip: isBare }, async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const promise = EventEmitter.once(emitter, 'hello', { signal: controller.signal })

  controller.abort(new Error('cancel'))

  try {
    await promise
    t.fail('should abort')
  } catch (err) {
    t.is(err.cause.message, 'cancel')
  }
})

test('once signal + already aborted', { skip: isBare }, async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  controller.abort(new Error('cancel'))

  const promise = EventEmitter.once(emitter, 'hello', { signal: controller.signal })

  try {
    await promise
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

  emitter
    .once('hello', fn)
    .emit('hello')
})

test('reentrant emit from once', (t) => {
  const emitter = new EventEmitter()
  const fired = []

  emitter
    .on('hello', () => fired.push(1))
    .once('hello', () => { fired.push(2); emitter.emit('hello') })
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
