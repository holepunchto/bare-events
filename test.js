const test = require('brittle')
const EventEmitter = require('.')

test('once', async (t) => {
  const emitter = new EventEmitter()

  const promise = EventEmitter.once(emitter, 'hello')

  emitter.emit('hello', 'world', '!')

  t.alike(await promise, ['world', '!'])
})

test('once signal + abort', { skip: process.versions.bare }, async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const promise = EventEmitter.once(emitter, 'hello', { signal: controller.signal })

  controller.abort()

  await t.exception(promise)
})

test('once signal + abort reason', { skip: process.versions.bare }, async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  const promise = EventEmitter.once(emitter, 'hello', { signal: controller.signal })

  controller.abort(new Error('cancel'))

  await t.exception(promise, /cancel/)
})

test('once signal + already aborted', { skip: process.versions.bare }, async (t) => {
  const emitter = new EventEmitter()
  const controller = new AbortController()

  controller.abort(new Error('cancel'))

  const promise = EventEmitter.once(emitter, 'hello', { signal: controller.signal })

  await t.exception(promise, /cancel/)
})
