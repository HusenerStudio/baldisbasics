// Simple WebSocket multiplayer server for Baldi's Basics 2D
// Rooms support 1–5 players with invite codes

const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

// roomCode -> { clients: Map<ws, {id:string}>, host: ws }
const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

function genId() {
  return Math.random().toString(36).slice(2, 8);
}

function broadcast(roomCode, data, exceptWs = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  for (const ws of room.clients.keys()) {
    if (ws !== exceptWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

wss.on('connection', (ws) => {
  ws.meta = { roomCode: null, id: null };

  ws.on('message', (message) => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      return;
    }

    switch (msg.type) {
      case 'createRoom': {
        const roomCode = generateRoomCode();
        const id = genId();
        rooms.set(roomCode, { clients: new Map([[ws, { id }]]), host: ws });
        ws.meta.roomCode = roomCode;
        ws.meta.id = id;
        ws.send(JSON.stringify({ type: 'roomCreated', roomCode, playerId: id }));
        // Send initial room info (player count)
        ws.send(JSON.stringify({ type: 'roomInfo', roomCode, count: 1 }));
        console.log(`[ROOM] Created room ${roomCode}; host=${id}`);
        break;
      }

      case 'joinRoom': {
        const roomCode = String(msg.roomCode || '').trim();
        const room = rooms.get(roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
          console.log(`[ROOM] Join failed; code=${roomCode} not found`);
          break;
        }
        if (room.clients.size >= 5) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
          console.log(`[ROOM] Join failed; code=${roomCode} is full (${room.clients.size})`);
          break;
        }
        const id = genId();
        room.clients.set(ws, { id });
        ws.meta.roomCode = roomCode;
        ws.meta.id = id;
        ws.send(JSON.stringify({ type: 'joined', roomCode, playerId: id }));
        // Send room info to the joiner (current player count)
        ws.send(JSON.stringify({ type: 'roomInfo', roomCode, count: room.clients.size }));
        // Inform others
        broadcast(roomCode, { type: 'playerJoined', playerId: id }, ws);
        console.log(`[ROOM] Player joined room ${roomCode}; player=${id}; size=${room.clients.size}`);
        break;
      }

      case 'playerUpdate': {
        const { roomCode } = ws.meta;
        if (!roomCode) break;
        // Relay player position/state to other clients
        broadcast(roomCode, {
          type: 'playerUpdate',
          playerId: ws.meta.id,
          x: msg.x,
          y: msg.y,
          running: !!msg.running,
        }, ws);
        break;
      }

      default:
        // Ignore unknown message types
        break;
    }
  });

  ws.on('close', () => {
    const { roomCode, id } = ws.meta;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    room.clients.delete(ws);
    broadcast(roomCode, { type: 'playerLeft', playerId: id }, ws);
    console.log(`[ROOM] Player left room ${roomCode}; player=${id}; size=${room.clients.size}`);
    // If room empty, delete it
    if (room.clients.size === 0) {
      rooms.delete(roomCode);
      console.log(`[ROOM] Room ${roomCode} closed (empty)`);
    } else if (room.host === ws) {
      // If host disconnected, pick a new host arbitrarily
      const firstClient = room.clients.keys().next().value;
      room.host = firstClient || null;
      const newHostId = firstClient ? room.clients.get(firstClient)?.id : 'none';
      console.log(`[ROOM] Room ${roomCode} new host=${newHostId}`);
    }
  });
});

console.log(`Multiplayer server listening on ws://localhost:${PORT}`);