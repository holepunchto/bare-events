const EventEmitter = require('.')

const e = new EventEmitter()

e.on('hello', function (data) {
  console.log(data)
})

EventEmitter.once(e, 'hello').then(console.log)

e.emit('hello', 'world')
