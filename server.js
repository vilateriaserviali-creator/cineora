const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

function roomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      playing: false,
      position: 0,
      updatedAt: Date.now(),
      mediaUrl: ""
    });
  }
  return rooms.get(roomId);
}

function publicUsers(room) {
  return [...room.users.values()].map(u => ({
    id: u.id,
    name: u.name,
    position: u.position,
    playing: u.playing
  }));
}

function broadcastRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  io.to(roomId).emit("room-users", publicUsers(room));
}

io.on("connection", socket => {
  socket.on("join-room", ({ roomId, name }) => {
    roomId = String(roomId || "").trim().toUpperCase().slice(0, 16);
    name = String(name || "Гость").trim().slice(0, 24);
    if (!roomId) return;

    const room = roomState(roomId);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.name = name;

    room.users.set(socket.id, {
      id: socket.id,
      name,
      position: room.playing
        ? room.position + (Date.now() - room.updatedAt) / 1000
        : room.position,
      playing: room.playing
    });

    socket.emit("room-state", {
      playing: room.playing,
      position: room.playing
        ? room.position + (Date.now() - room.updatedAt) / 1000
        : room.position,
      mediaUrl: room.mediaUrl
    });
    broadcastRoom(roomId);
  });

  socket.on("set-media", ({ url }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomState(roomId);
    room.mediaUrl = String(url || "").trim();
    io.to(roomId).emit("media-changed", room.mediaUrl);
  });

  socket.on("sync", ({ playing, position }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomState(roomId);
    room.playing = !!playing;
    room.position = Math.max(0, Number(position) || 0);
    room.updatedAt = Date.now();

    const user = room.users.get(socket.id);
    if (user) {
      user.position = room.position;
      user.playing = room.playing;
    }

    socket.to(roomId).emit("sync", {
      playing: room.playing,
      position: room.position
    });
    broadcastRoom(roomId);
  });

  socket.on("user-progress", ({ position, playing }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = roomState(roomId);
    const user = room.users.get(socket.id);
    if (!user) return;
    user.position = Math.max(0, Number(position) || 0);
    user.playing = !!playing;
    socket.to(roomId).emit("user-progress", {
      id: socket.id,
      position: user.position,
      playing: user.playing
    });
    broadcastRoom(roomId);
  });

  socket.on("chat-message", ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const clean = String(text || "").trim().slice(0, 500);
    if (!clean) return;
    io.to(roomId).emit("chat-message", {
      id: socket.id,
      name: socket.data.name || "Гость",
      text: clean,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    room.users.delete(socket.id);
    broadcastRoom(roomId);
    if (room.users.size === 0) rooms.delete(roomId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`CINEORA running on port ${PORT}`);
});
