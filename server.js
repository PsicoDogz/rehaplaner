const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Statt einer gemeinsamen Datei jetzt 3 getrennte:
const ROOM_FILES = {
  verwaltung: path.join(__dirname, 'chat_verwaltung.json'),
  therapeut: path.join(__dirname, 'chat_therapeut.json'),
  fahrer: path.join(__dirname, 'chat_fahrer.json')
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Hilfsfunktion: unbekannter Raum -> "verwaltung"
function normalizeRoom(roomRaw) {
  const r = String(roomRaw || 'verwaltung').toLowerCase();
  if (ROOM_FILES[r]) return r;
  return 'verwaltung';
}

// Einzelnen Raum laden
function loadRoomMessages(room) {
  const filePath = ROOM_FILES[room];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // Wenn Datei nicht existiert oder kaputt ist:
    return [];
  }
}

// Einzelnen Raum speichern
function saveRoomMessages(room, messages) {
  const filePath = ROOM_FILES[room];
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
}

// GET /api/chat?room=verwaltung
app.get('/api/chat', (req, res) => {
  const room = normalizeRoom(req.query.room);
  const messages = loadRoomMessages(room);
  res.json(messages);
});

// POST /api/chat
app.post('/api/chat', (req, res) => {
  const { room: roomRaw, fromName, fromRole, text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'text ist erforderlich' });
  }

  const room = normalizeRoom(roomRaw);
  const messages = loadRoomMessages(room);

  const msg = {
    id: Date.now() + Math.random(),
    room,
    fromName: fromName || 'Unbekannt',
    fromRole: fromRole || '',
    text,
    timestamp: new Date().toISOString()
  };

  messages.push(msg);

  try {
    saveRoomMessages(room, messages);
  } catch (e) {
    console.error('Fehler beim Speichern:', e);
  }

  res.json({ ok: true, message: msg });
});

app.listen(PORT, () => {
  console.log(`Chat backend listening on http://localhost:${PORT}`);
});
