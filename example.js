const EventEmitter = require('.')

const e = new EventEmitter()

e.on('hello', function (data) {
  console.log(data)
})

e.emit('hello', 'world')
