import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { NoteRepository } from './db';
import {
  CreateNotePayload,
  normalizeFileUrl,
  SOCKET_EVENTS,
  ToastNotification,
  UpdateNoteStatusPayload,
  AddReplyPayload,
} from './types';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PinPoint Backend', timestamp: new Date().toISOString() });
});

// GET /api/notes?url=...
app.get('/api/notes', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }
    const normalizedUrl = normalizeFileUrl(rawUrl);
    const notes = await NoteRepository.getNotesByFileUrl(normalizedUrl);
    res.json({ notes, fileUrl: normalizedUrl });
  } catch (err: any) {
    console.error('Error in GET /api/notes:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/notes
app.post('/api/notes', async (req, res) => {
  try {
    const body: CreateNotePayload = req.body;
    if (!body.fileUrl || !body.reviewerEmail || !body.content || !body.position) {
      return res.status(400).json({ error: 'Missing required note fields' });
    }

    const normalizedUrl = normalizeFileUrl(body.fileUrl);
    const createdNote = await NoteRepository.createNote({
      ...body,
      fileUrl: normalizedUrl,
    });

    // Broadcast through socket room
    io.to(normalizedUrl).emit(SOCKET_EVENTS.NOTE_CREATED, createdNote);

    // Create toast notification for Maker
    const locText = createdNote.position.cellRef
      ? `cell ${createdNote.position.cellRef}`
      : createdNote.position.selectedText
      ? `"${createdNote.position.selectedText.slice(0, 20)}..."`
      : 'selected region';

    const toast: ToastNotification = {
      id: crypto.randomUUID(),
      type: 'warning',
      message: `⚠️ [${createdNote.reviewerEmail}] just annotated ${locText}`,
      location: locText,
      noteId: createdNote.id,
      timestamp: Date.now(),
    };

    io.to(normalizedUrl).emit(SOCKET_EVENTS.TOAST_BROADCAST, toast);

    res.status(201).json(createdNote);
  } catch (err: any) {
    console.error('Error in POST /api/notes:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PATCH /api/notes/:id/status
app.patch('/api/notes/:id/status', async (req, res) => {
  try {
    const noteId = req.params.id;
    const { isFixed, isClosed, actorEmail, actorRole, fileUrl }: UpdateNoteStatusPayload & { fileUrl: string } = req.body;

    const updatedNote = await NoteRepository.updateNoteStatus({
      noteId,
      isFixed,
      isClosed,
      actorEmail,
      actorRole,
    });

    if (!updatedNote) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const normalizedUrl = normalizeFileUrl(fileUrl || updatedNote.fileUrl);

    // Broadcast updated note
    io.to(normalizedUrl).emit(SOCKET_EVENTS.NOTE_UPDATED, updatedNote);

    // If Maker marked as Fixed, send toast to Reviewer
    if (isFixed) {
      const locText = updatedNote.position.cellRef
        ? `cell ${updatedNote.position.cellRef}`
        : 'annotation';

      const toast: ToastNotification = {
        id: crypto.randomUUID(),
        type: 'success',
        message: `✅ Maker marked ${locText} as fixed`,
        location: locText,
        noteId: updatedNote.id,
        timestamp: Date.now(),
      };
      io.to(normalizedUrl).emit(SOCKET_EVENTS.TOAST_BROADCAST, toast);
    }

    res.json(updatedNote);
  } catch (err: any) {
    console.error('Error in PATCH /api/notes/:id/status:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/notes/:id/replies
app.post('/api/notes/:id/replies', async (req, res) => {
  try {
    const noteId = req.params.id;
    const { authorEmail, authorRole, content, fileUrl }: AddReplyPayload & { fileUrl: string } = req.body;

    if (!authorEmail || !content) {
      return res.status(400).json({ error: 'Author email and content required' });
    }

    const reply = await NoteRepository.addReply(noteId, authorEmail, authorRole, content);
    if (!reply) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (fileUrl) {
      const normalizedUrl = normalizeFileUrl(fileUrl);
      io.to(normalizedUrl).emit(SOCKET_EVENTS.REPLY_ADDED, reply);
    }

    res.status(201).json(reply);
  } catch (err: any) {
    console.error('Error in POST /api/notes/:id/replies:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Socket.io Real-time Connection Handler
io.on('connection', (socket: Socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on(SOCKET_EVENTS.JOIN_ROOM, (rawUrl: string) => {
    if (!rawUrl) return;
    const normalizedUrl = normalizeFileUrl(rawUrl);
    socket.join(normalizedUrl);
    console.log(`[Socket] Socket ${socket.id} joined room: ${normalizedUrl}`);
  });

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (rawUrl: string) => {
    if (!rawUrl) return;
    const normalizedUrl = normalizeFileUrl(rawUrl);
    socket.leave(normalizedUrl);
    console.log(`[Socket] Socket ${socket.id} left room: ${normalizedUrl}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

const PORT = Number(process.env.PORT) || 4000;
server.listen(PORT, () => {
  console.log(`🚀 PinPoint backend running on http://localhost:${PORT}`);
});
