const { createServer } = require("http");
const { Server } = require("socket.io");
const path = require('path');
const express = require('express');
const app = express();
const port = 80;
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "https://example.com" } });
httpServer.listen(port, () => { console.log('conected'); });



let roomAdmin = {};
let pushRoomAdmin = []
io.sockets.on('connection', function (socket) {
  let disconnectRoom;
  let allId = []


  socket.on('online', () => {
    socket.emit('online1', socket.id);
    io.sockets.emit('online', pushRoomAdmin);
    console.log('online');
  })



  socket.on('reject', (socketId) => {
    io.sockets.to(socketId).emit('reject');
  })



  socket.on('permission', (room, adminId) => {
    const clientsInRoom = io.sockets.adapter.rooms.get(room);
    if (!clientsInRoom) {
      console.log(clientsInRoom);
      console.log('create')
      roomAdmin[room] = socket.id
      socket.emit('permission', room, socket.id, { type: 'create' });
      pushRoomAdmin.push({ id: roomAdmin[room], room })
      io.sockets.emit('online', pushRoomAdmin);
      socket.join(room);
    }
    else if (roomAdmin[room] === socket.id) {
      io.sockets.emit('online', pushRoomAdmin);
      socket.emit('permission', room, socket.id, { type: 'joinAdmin' });
      socket.join(room);
    }
    else {
      console.log('join')
      io.sockets.to(adminId ? adminId : roomAdmin[room]).emit('permission', room, socket.id, { type: 'join' });
    }
    disconnectRoom = room
  })



  socket.on('offer1', (socketId, room) => {
    disconnectRoom = room
    io.sockets.sockets.get(socketId).join(room)
    room && io.sockets.adapter.rooms.get(room).forEach((all) => (allId.push(all)))
    io.sockets.to(room).emit('offer1', socketId, room, allId);
  })


  socket.on('offer2', (offer, socketId) => {
    io.to(socketId).emit('offer2', offer, socket.id);
  });

  socket.on('answer', (answer, socketId) => {
    io.to(socketId).emit('answer', answer, socket.id);
  });

  socket.on('candidate', (call, room) => {
    socket.broadcast.to(room).emit('candidate', call, socket.id);
  });




  socket.on('leave', (room, socketId) => {
    if (!socketId) {
      socket.emit('leave', socket.id, { type: 'leftMe' });
      socket.broadcast.to(room).emit('leave', socket.id, null);
      const clientsInRoom = io.sockets.adapter.rooms.get(room);
      // if (clientsInRoom === undefined) io.sockets.emit('online', socket.id, null);
      delete roomAdmin[disconnectRoom]
      pushRoomAdmin = pushRoomAdmin.filter((room) => room.id !== socket.id)
      io.sockets.emit('online', pushRoomAdmin);
      socket.leave(room);
    }
    else if (roomAdmin[room] === socket.id && socketId) {
      io.in(room).emit('leave', socketId, null);
      io.to(socketId).emit('leave', socket.id, { type: 'leftMe' });
      io.sockets.sockets.get(socketId).leave(room);
    }
  });


  socket.on('disconnect', function () {
    delete roomAdmin[disconnectRoom]
    pushRoomAdmin = pushRoomAdmin.filter((room) => room.id !== socket.id)
    console.log('disconnect')
    if (disconnectRoom) {
      socket.broadcast.to(disconnectRoom).emit('leave', socket.id, null);
    }
  })
});
