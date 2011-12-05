var net          = require('net')
  , tls          = require('tls')
  , EventEmitter = require('events').EventEmitter
  , r            = require('./response')

module.exports = Client
function Client(props) {
  for (var i in props) {
    this[i] = props[i]
  }

  this._events = new EventEmitter
}

Client.prototype.on = function(event, listener) {
  this._events.on(event, listener)
}

Client.prototype.once = function(event, listener) {
  this._events.once(event, listener)
}

Client.prototype.write = function(text) {
  console.log(text)

  if (this._socket) {
    this._socket.write(text +'\n')
  }
}

Client.prototype.connect = function(host, port, cb) {
  if (!port) port = 6667

  var self = this
    , s

  function connect() {
    if (self.ssl) {
      if (!s.authorized) {
        console.log('SSL authorization failed:', s.authorizationError)
      }
    }

    if (cb) cb.call(self, s)
  }

  if (self.ssl) {
    s = self._socket = tls.connect(port, host, connect)
  }
  else {
    s = self._socket = new net.Socket()

    s.connect(port, host, connect)
  }

  s.on('data', function(data) {
    data = data.toString().trim().split('\r\n')

    for (var i = 0, l = data.length; i < l; ++i) {
      self.message(data[i])
    }
  })

  self._events.on('ping', function(prefix, params) {
    self.write('PONG '+ params.slice(1))
  })

  s.on('error', function(data) {
    console.log(data)
  })
}

Client.prototype.message = function(message) {
  var matches

  console.log(message)

  if (matches = /^(?:\:(.*?) )?(.*?) (.*?)$/.exec(message)) {
    var prefix  = matches[1]
      , command = matches[2].toLowerCase()
      , params  = matches[3]

    this._events.emit(command, prefix, params)
  }
}

Client.prototype.names = function(channels, cb) {
  var self  = this
    , names = {}

  self._events.on(r.RPL_NAMREPLY, namereply)

  self._events.once(r.RPL_ENDOFNAMES, function(prefix, params) {
    self._events.removeListener(r.RPL_NAMREPLY, namereply)

    if (cb) cb(names)
  })

  self.write('NAMES '+ channels)

  function namereply(prefix, params) {
    var matches

    if (matches = /= (.*?) :(.*?)$/.exec(params)) {
      names[matches[1]] = matches[2].match(/([^ @+]+)/g)
    }
  }
}

Client.prototype.quit = function() {
  var s = this._socket

  console.log('QUIT')

  if (s && s.writable) {
    s.write('QUIT\n')
    s.destroy()
  }
}