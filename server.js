const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// rooms[code] = { target, players: {A: ws, B: ws}, times: {A, B}, started }
const rooms = {};

function randTarget() {
  return Math.round((3 + Math.random() * 12) * 10) / 10;
}

function broadcast(room, data) {
  const msg = JSON.stringify(data);
  Object.values(room.players).forEach(ws => {
    if (ws && ws.readyState === 1) ws.send(msg);
  });
}

wss.on('connection', (ws) => {
  ws.room = null;
  ws.role = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create') {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      rooms[code] = {
        target: randTarget(),
        players: { A: ws, B: null },
        times: { A: null, B: null },
        started: false
      };
      ws.room = code;
      ws.role = 'A';
      ws.send(JSON.stringify({ type: 'created', code, target: rooms[code].target }));
    }

    else if (msg.type === 'join') {
      const code = msg.code;
      const room = rooms[code];
      if (!room) { ws.send(JSON.stringify({ type: 'error', msg: 'Room not found. Check the code.' })); return; }
      if (room.players.B) { ws.send(JSON.stringify({ type: 'error', msg: 'Room is full!' })); return; }
      room.players.B = ws;
      ws.room = code;
      ws.role = 'B';
      ws.send(JSON.stringify({ type: 'joined', code, target: room.target }));
      // Tell A that B joined, start in 3s
      if (room.players.A && room.players.A.readyState === 1) {
        room.players.A.send(JSON.stringify({ type: 'player_joined' }));
      }
      setTimeout(() => {
        if (rooms[code]) {
          rooms[code].started = true;
          broadcast(rooms[code], { type: 'start', target: rooms[code].target });
        }
      }, 3000);
    }

    else if (msg.type === 'time') {
      const room = rooms[ws.room];
      if (!room) return;
      room.times[ws.role] = msg.time;
      if (room.times.A !== null && room.times.B !== null) {
        broadcast(room, {
          type: 'results',
          target: room.target,
          timeA: room.times.A,
          timeB: room.times.B
        });
      }
    }

    else if (msg.type === 'rematch') {
      const room = rooms[ws.room];
      if (!room || ws.role !== 'A') return;
      room.target = randTarget();
      room.times = { A: null, B: null };
      room.started = false;
      broadcast(room, { type: 'rematch_ready' });
      // Wait for B to signal ready
    }

    else if (msg.type === 'rematch_accept') {
      const room = rooms[ws.room];
      if (!room) return;
      room.times[ws.role] = null;
      // When both are ready, start
      if (room.players.A && room.players.B) {
        setTimeout(() => {
          if (rooms[ws.room]) {
            rooms[ws.room].started = true;
            broadcast(rooms[ws.room], { type: 'start', target: rooms[ws.room].target });
          }
        }, 2000);
      }
    }
  });

  ws.on('close', () => {
    const room = rooms[ws.room];
    if (!room) return;
    const other = ws.role === 'A' ? room.players.B : room.players.A;
    if (other && other.readyState === 1) {
      other.send(JSON.stringify({ type: 'opponent_left' }));
    }
    delete rooms[ws.room];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Time Duel running on port ${PORT}`));
