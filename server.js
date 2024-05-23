const http = require("http");
const express = require("express");
const path = require('path');
const { Server } = require('socket.io');
// const { Socket } = require("dgram");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    socket.on('screen-data', (data, room) => {
        socket.to(room).emit('screen-data', data);
    });

    socket.on('control-event', (event, room) => {
        socket.to(room).emit('control-event', event);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

app.use(express.static(path.resolve('./public')));

app.get('/', (req, res) => {
    return res.sendFile('/public/index.html');
})

server.listen(9000, () => console.log(`server started at port 9000`));