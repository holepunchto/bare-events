# bare-events

Event emitters for JavaScript.

```
npm install bare-events
```

## Usage

```js
const EventEmitter = require('bare-events')

const e = new EventEmitter()

e.on('hello', function (data) {
  console.log(data)
})

e.emit('hello', 'world')
```

## API

See the [`bare-events` reference](https://docs.pears.com/reference/bare/modules/bare-events).

## License

Apache-2.0
