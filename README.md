# events

Tiny events replacement for the 99%

```
npm install @pearjs/events
```

## Usage

``` js
const events = require('@pearjs/events')

const e = new events.EventEmitter()

e.on('hello', function (data) {
  console.log(data)
})

e.emit('hello', 'world')
```

## License

MIT
