interface AbortSignal extends EventTarget {}

export interface EventOptions {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
}

export interface Event {
  readonly type: string
  readonly target: EventTarget | null
  readonly currentTarget: EventTarget | null
  readonly bubbles: boolean
  readonly cancelable: boolean
  readonly composed: boolean
  readonly defaultPrevented: boolean
  readonly isTrusted: boolean

  preventDefault(): void
  stopPropagation(): void
  stopImmediatePropagation(): void
}

export class Event {
  /**
   * @param type - The event's type, exposed as `event.type`.
   * @param options - Options controlling `bubbles`, `cancelable`, and `composed`.
   */
  constructor(type: string, options?: EventOptions)
}

export interface CustomEventOptions<T = any> extends EventOptions {
  detail?: T
}

export interface CustomEvent<T = any> extends Event {
  readonly detail: T
}

export class CustomEvent<T = any> {
  /**
   * @param type - The event's type, exposed as `event.type`.
   * @param options - Options controlling `bubbles`/`cancelable`/`composed` plus the `detail` value.
   */
  constructor(type: string, options?: CustomEventOptions<T>)
}

export interface AddEventListenerOptions {
  capture?: boolean
  passive?: boolean
  /**
   * @param emitter - The emitter to wait on.
   * @param name - The event name.
   * @param opts - Options; `signal` aborts the wait, rejecting the promise with an `EventEmitterError`.
   * @param fn - The listener function, called once with the event's arguments then removed.
   * @returns The emitter itself, for chaining — implemented identically to `addOnceListener`.
   */
  once?: boolean
  signal?: AbortSignal | null
}

export interface RemoveEventListenerOptions {
  capture?: boolean
}

export interface EventTarget {
  /**
   * @param type - The event type to listen for.
   * @param callback - The listener function, or an object with a `handleEvent` method.
   * @param options - Options, or a boolean shorthand for `capture`; `once` removes the listener after it fires, `signal` removes it when the given `AbortSignal` aborts.
   */
  addEventListener(
    type: string,
    callback: EventListener,
    options?: AddEventListenerOptions | boolean
  ): void

  /**
   * @param type - The event type to stop listening for.
   * @param callback - The listener to remove.
   * @param options - Options, or a boolean shorthand for `capture`; must match the `capture` value passed to `addEventListener`.
   */
  removeEventListener(
    type: string,
    callback: EventListener,
    options?: RemoveEventListenerOptions | boolean
  ): void

  /**
   * @param event - The event to dispatch to this target's listeners.
   * @returns `false` if the event is cancelable and `preventDefault()` was called on it during dispatch, `true` otherwise.
   */
  dispatchEvent(event: Event): boolean
}

export class EventTarget {
  constructor()
}

export type EventListener = EventCallback | EventHandler

export interface EventCallback {
  (event: Event): void
}

export interface EventHandler {
  /**
   * @param event - The event passed to the handler.
   */
  handleEvent(event: Event): void
}
