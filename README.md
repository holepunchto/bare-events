# @pearjs/events

Event emitters for JavaScript.

```
npm install @pearjs/events
```

## Usage

``` js
const EventEmitter = require('@pearjs/events')

const e = new EventEmitter()

e.on('hello', function (data) {
  console.log(data)
})

e.emit('hello', 'world')
```

## License

Apache-2.0
