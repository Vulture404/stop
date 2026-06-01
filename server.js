const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

function randTarget() {
  return Math.round((3 + Math.random() * 12) * 10) / 10;
}

function broadcast(room, data) {
  const msg = JSON.stringify(data);
  ['A','B'].forEach(role => {
    const ws = room.players[role];
    if (ws && ws.readyState === 1) ws.send(msg);
  });
}

function sendTo(ws, data) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
}

wss.on('connection', (ws) => {
  ws.room = null;
  ws.role = null;
  ws.username = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create') {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      ws.username = (msg.username || 'Player A').trim().slice(0, 16);
      rooms[code] = {
        target: randTarget(),
        players: { A: ws, B: null },
        usernames: { A: ws.username, B: null },
        times: { A: null, B: null },
        started: false
      };
      ws.room = code;
      ws.role = 'A';
      sendTo(ws, { type: 'created', code, role: 'A', target: rooms[code].target, username: ws.username });
    }

    else if (msg.type === 'join') {
      const code = msg.code;
      const room = rooms[code];
      if (!room) { sendTo(ws, { type: 'error', msg: 'Room not found. Check the code.' }); return; }
      if (room.players.B) { sendTo(ws, { type: 'error', msg: 'Room is full!' }); return; }
      ws.username = (msg.username || 'Player B').trim().slice(0, 16);
      room.players.B = ws;
      room.usernames.B = ws.username;
      ws.room = code;
      ws.role = 'B';
      sendTo(ws, { type: 'joined', code, role: 'B', target: room.target, username: ws.username, opponentName: room.usernames.A });
      sendTo(room.players.A, { type: 'player_joined', opponentName: ws.username });
      setTimeout(() => {
        if (rooms[code]) {
          rooms[code].started = true;
          broadcast(rooms[code], {
            type: 'start',
            target: rooms[code].target,
            usernames: rooms[code].usernames
          });
        }
      }, 3000);
    }

    else if (msg.type === 'time') {
      const room = rooms[ws.room];
      if (!room) return;
      room.times[ws.role] = msg.time;
      if (room.times.A !== null && room.times.B !== null) {
        // Send results with each player's role clearly stated
        ['A','B'].forEach(role => {
          const pw = room.players[role];
          if (pw && pw.readyState === 1) {
            pw.send(JSON.stringify({
              type: 'results',
              target: room.target,
              myRole: role,
              timeA: room.times.A,
              timeB: room.times.B,
              usernames: room.usernames
            }));
          }
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
    }

    else if (msg.type === 'rematch_accept') {
      const room = rooms[ws.room];
      if (!room) return;
      if (room.players.A && room.players.B) {
        setTimeout(() => {
          if (rooms[ws.room]) {
            rooms[ws.room].started = true;
            broadcast(rooms[ws.room], {
              type: 'start',
              target: rooms[ws.room].target,
              usernames: rooms[ws.room].usernames
            });
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
