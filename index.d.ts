import { AbortSignal } from 'bare-abort-controller'

interface EventMap {
  [event: string | symbol]: unknown[]
}

interface EventHandler<in A extends unknown[] = unknown[], out R = unknown> {
  (...args: A): R
}

/** The error class used for emitter-internal errors, such as an unhandled `'error'` event or an aborted `events.on`/`events.once` wait. */
declare class EventEmitterError extends Error {
  /**
   * Create an `EventEmitterError` wrapping `cause`, used when an `AbortSignal` aborts a pending `events.on` or `events.once` wait.
   * @param cause - The abort reason wrapped by the error.
   * @param msg - An optional custom message for the wrapping error.
   */
  static OPERATION_ABORTED(cause: Error, msg?: string): EventEmitterError
  /**
   * Create an `EventEmitterError` wrapping `cause`, used when an `'error'` event is emitted with no listeners attached.
   * @param cause - The underlying error wrapped by the error.
   * @param msg - An optional custom message for the wrapping error.
   */
  static UNHANDLED_ERROR(cause: Error, msg?: string): EventEmitterError
}

/** An emitter of named events to which listener functions can be attached, closely mirroring Node.js's `EventEmitter`. */
interface EventEmitter<in out M extends EventMap = EventMap> {
  /**
   * Add `fn` as a listener for `name`, called on every subsequent emit. Returns `this` for chaining.
   * @param name - The event name to listen for.
   * @param fn - The listener function, called with the event's arguments on each emit.
   */
  addListener<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * Add `fn` as a listener for `name` that is removed after it fires once. Returns `this` for chaining.
   * @param name - The event name to listen for.
   * @param fn - The listener function, called once with the event's arguments then removed.
   */
  addOnceListener<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * Like `addListener`, but adds `fn` to the beginning of the listener list instead of the end.
   * @param name - The event name to listen for.
   * @param fn - The listener function to add to the front of the listener list instead of the end.
   * @returns The emitter itself, for chaining, like `addListener`.
   */
  prependListener<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * Like `addOnceListener`, but adds `fn` to the beginning of the listener list instead of the end.
   * @param name - The event name to listen for.
   * @param fn - The listener function to add to the front of the listener list, removed after it fires once.
   * @returns The emitter itself, for chaining, like `addOnceListener`.
   */
  prependOnceListener<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * Remove one instance of `fn` from the listeners for `name`. Returns `this` for chaining.
   * @param name - The event name to remove the listener from.
   * @param fn - The listener function to remove.
   */
  removeListener<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * Remove all listeners, or only those for `name` if given. Returns `this` for chaining.
   * @param name - If given, remove listeners only for this event name; otherwise remove all listeners for every event.
   */
  removeAllListeners<E extends keyof M>(name?: E): this

  /**
   * @param emitter - The emitter to iterate events from.
   * @param name - The event name.
   * @param opts - Options; `signal` aborts the iteration, rejecting it with an `EventEmitterError`.
   * @param fn - The listener function, called with the event's arguments on each emit.
   */
  on<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * @param emitter - The emitter to wait on.
   * @param name - The event name.
   * @param opts - Options; `signal` aborts the wait, rejecting the promise with an `EventEmitterError`.
   * @param fn - The listener function, called once with the event's arguments then removed.
   */
  once<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * Alias for `removeListener`.
   * @param name - The event name to remove the listener from.
   * @param fn - The listener function to remove.
   * @returns The emitter itself, for chaining — implemented identically to `removeListener`.
   */
  off<E extends keyof M, R>(name: E, fn: EventHandler<M[E], R>): this

  /**
   * Synchronously call each listener registered for `name`, in registration order, with `args`. Returns `true` if there were listeners, `false` otherwise. Emitting `'error'` with no `'error'` listeners throws the error asynchronously instead of calling any listener.
   * @param name - The event name to emit.
   * @param args - Arguments passed to each listener registered for `name`.
   */
  emit<E extends keyof M>(name: E, ...args: M[E]): boolean

  /**
   * Return a copy of the listener array for `name`.
   * @param name - The event name to return the listener array for.
   */
  listeners<E extends keyof M, R>(name: E): EventHandler<M[E], R>

  /**
   * Return a copy of the listener array for `name`, including one-time wrapper listeners as registered.
   * @param name - The event name to return the raw listener array for.
   */
  rawListeners<E extends keyof M, R>(name: E): EventHandler<M[E], R>[]

  /** Return an array of the event names that currently have listeners. */
  eventNames(): (keyof M)[]

  /**
   * Return the number of listeners registered for `name`.
   * @param emitter - The emitter to query.
   * @param name - The event name.
   */
  listenerCount<E extends keyof M>(name: E): number

  /**
   * @param emitter - The emitter to query.
   * @returns `EventEmitter.defaultMaxListeners`; bare-events does not track a per-instance limit separately.
   */
  getMaxListeners(): number
  /**
   * @param n - The maximum number of listeners to allow.
   * @param emitters - The emitters to apply the new limit to; if omitted, sets the global default instead.
   */
  setMaxListeners(n: number): void
}

declare class EventEmitter<in out M extends EventMap = EventMap> {}

declare namespace EventEmitter {
  export function on<M extends EventMap, E extends keyof M>(
    emitter: EventEmitter<M>,
    name: E,
    opts?: { signal?: AbortSignal }
  ): AsyncIterableIterator<M[E]>

  export function once<M extends EventMap, E extends keyof M>(
    emitter: EventEmitter<M>,
    name: E,
    opts?: { signal?: AbortSignal }
  ): Promise<M[E]>

  /**
   * Forward events named in `names` from `from` to `to`, re-emitting them on `to` only while `to` has at least one listener for that event.
   * @param from - The emitter to forward events from.
   * @param to - The emitter to forward events to.
   * @param names - The event name, or array of event names, to forward.
   * @param opts - Options; `emit` overrides how forwarded events are re-emitted on `to` (defaults to `to.emit`).
   */
  export function forward<F extends EventMap, E extends keyof F, T extends Pick<F, E>>(
    from: EventEmitter<F>,
    to: EventEmitter<T>,
    names: E | E[],
    opts?: { emit?: (name: E, ...args: T[E]) => void }
  ): void

  export function listenerCount<M extends EventMap, E extends keyof M>(
    emitter: EventEmitter<M>,
    name: E
  ): number

  export function getMaxListeners(emitter: EventEmitter): number

  export function setMaxListeners(n: number, ...emitters: EventEmitter[]): void

  /** The default max-listeners value used by `getMaxListeners()`. */
  export let defaultMaxListeners: number

  export { EventEmitter, EventEmitterError as errors, EventMap, EventHandler }
}

export = EventEmitter
