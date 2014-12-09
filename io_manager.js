module.exports = exports = IoManager;

function IoManager (socketIo) {
  if (!(this instanceof IoManager)) return new IoManager(socketIo);
  this.io = socketIo;
}

IoManager.prototype.log = function(data) {
  console.log(data);
};

IoManager.prototype.msgBatch = function (socket, data) {
  message = data;
  if (!data) return false;
  re = /^\/([a-z]+) +(.+?)$/i;
  matches =  (re.exec(message));
  if (!matches || matches.length < 2) {
    // 일반 메세지
    socket.broadcast.to(socket.room).emit('new message', {
      username: socket.username,
      message: message
    });
  }
  else {
    // 명령어
    // @todo 처리기 분리
    command = matches[1];
    console.log(command);
    switch (command) {
      case 'nick':
        oldname = socket.username;
        newname = matches[2];
        socket.username = newname;
        // add the client's username to the global list
        //usernames[newname] = newname;
        message = oldname + ' nickname changed ' + newname;
        this.io.to(socket.room).emit('notice', {
          username: 'admin',
          message: message
        });

        socket.emit('nick_updated', {'nick': newname});
        break;
      default:
        break;

    }
  }
};
