// Setup basic express server 
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var ioMan = require('./io_manager')(io);
var port = process.env.PORT || 3000;

/**
 * 방 정보 업데이트
 *
 * @todo 업데이트된 방만 수정하기
 * @param socket
 */
function broadcastRoomInfo(socket){
  var cnt = 0, roomInfo = [], users;
  for (var roomname in rooms) {
    if (!rooms.hasOwnProperty(roomname)) {
      continue;
    }
    users = [];
    for (var username in rooms[roomname].socket_ids) {
      if (!rooms.hasOwnProperty(roomname)) {
        continue;
      }
      users.push(username);
    }
    roomInfo.push({
      "name" : roomname,
      "users": users,
      "user_count" : users.length
    });
    cnt++;
  }
  if (cnt) {
    socket.broadcast.emit('room info updated', roomInfo);
    socket.emit('room info updated', roomInfo);
  }
}

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

// usernames which are currently connected to the chat
var rooms = {},
    usersCount = 0;

io.on('connection', function (socket) {

  socket.on('enter room',function(data){
    socket.join(data.room);

    socket.username = data.username;
    socket.room = data.room;

    // Create Room
    if (rooms[data.room] === undefined) {
      console.log('room create :' + data.room);
      rooms[data.room] = {
        socket_ids : {},
        usersCount : 0
      };
    }

    rooms[data.room].usersCount++;

    // Store current user's nickname and socket.id to MAP
    rooms[data.room].socket_ids[data.username] = socket.id;

    socket.emit('login', {
      usersCount: rooms[data.room].usersCount
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.to(data.room).emit('user joined', {
      username: socket.username,
      usersCount: rooms[data.room].usersCount
    });

    //room info changed
    broadcastRoomInfo(socket);
  });

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {

    var room = socket.room;
      
    if (room !== undefined && rooms[room] !== undefined ) {
      ioMan.msgBatch(socket, data);
    }
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    var room = socket.room;

    if (room !== undefined && rooms[room] !== undefined ) {
      socket.broadcast.to(room).emit('typing', {
        username: socket.username
      });
    }
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    var room = socket.room;

    if (room !== undefined && rooms[room] !== undefined ) {
      socket.broadcast.to(room).emit('stop typing', {
        username: socket.username
      });
    }
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    var room = socket.room;

    if (room !== undefined && rooms[room] !== undefined) {
      if (rooms[room].usersCount <= 1) {
        delete rooms[room];
        broadcastRoomInfo(socket);
      } else {
        delete rooms[room].socket_ids[socket.username];
        --rooms[room].usersCount;

        // echo globally that this client has left
        socket.broadcast.to(room).emit('user left', {
          username: socket.username,
          usersCount: rooms[room].usersCount
        });
      }
    }
  });
});
