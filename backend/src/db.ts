import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AnnotationNote, CreateNotePayload, NoteReply, UpdateNoteStatusPayload } from './types';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const hasSupabase = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder'));

let supabase: SupabaseClient | null = null;
if (hasSupabase) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// In-memory fallback repository when Supabase credentials are not yet configured in local development
const memoryNotes = new Map<string, AnnotationNote>();
const memoryReplies = new Map<string, NoteReply[]>();

export class NoteRepository {
  static async getNotesByFileUrl(normalizedUrl: string): Promise<AnnotationNote[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id,
          file_url,
          mode,
          type,
          reviewer_email,
          content,
          position,
          is_fixed,
          is_closed,
          created_at,
          updated_at,
          note_replies (
            id,
            note_id,
            author_email,
            author_role,
            content,
            created_at
          )
        `)
        .eq('file_url', normalizedUrl)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[DB] Error fetching notes:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        fileUrl: row.file_url,
        mode: row.mode,
        type: row.type,
        reviewerEmail: row.reviewer_email,
        content: row.content,
        position: row.position,
        isFixed: row.is_fixed,
        isClosed: row.is_closed,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        replies: (row.note_replies || []).map((r: any) => ({
          id: r.id,
          noteId: r.note_id,
          authorEmail: r.author_email,
          authorRole: r.author_role,
          content: r.content,
          createdAt: r.created_at,
        })),
      }));
    }

    // Memory store fallback
    const notes: AnnotationNote[] = [];
    for (const note of memoryNotes.values()) {
      if (note.fileUrl === normalizedUrl) {
        notes.push({
          ...note,
          replies: memoryReplies.get(note.id) || [],
        });
      }
    }
    return notes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  static async createNote(payload: CreateNotePayload): Promise<AnnotationNote> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          id,
          file_url: payload.fileUrl,
          mode: payload.mode,
          type: payload.type,
          reviewer_email: payload.reviewerEmail,
          content: payload.content,
          position: payload.position,
          is_fixed: false,
          is_closed: false,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        console.error('[DB] Error inserting note:', error);
        throw error;
      }

      return {
        id: data.id,
        fileUrl: data.file_url,
        mode: data.mode,
        type: data.type,
        reviewerEmail: data.reviewer_email,
        content: data.content,
        position: data.position,
        isFixed: data.is_fixed,
        isClosed: data.is_closed,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        replies: [],
      };
    }

    const newNote: AnnotationNote = {
      id,
      fileUrl: payload.fileUrl,
      mode: payload.mode,
      type: payload.type,
      reviewerEmail: payload.reviewerEmail,
      content: payload.content,
      position: payload.position,
      isFixed: false,
      isClosed: false,
      createdAt: now,
      updatedAt: now,
      replies: [],
    };
    memoryNotes.set(id, newNote);
    memoryReplies.set(id, []);
    return newNote;
  }

  static async updateNoteStatus(payload: UpdateNoteStatusPayload): Promise<AnnotationNote | null> {
    const now = new Date().toISOString();

    if (supabase) {
      const updates: Record<string, any> = { updated_at: now };
      if (typeof payload.isFixed === 'boolean') updates.is_fixed = payload.isFixed;
      if (typeof payload.isClosed === 'boolean') updates.is_closed = payload.isClosed;

      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', payload.noteId)
        .select()
        .single();

      if (error || !data) {
        console.error('[DB] Error updating note status:', error);
        return null;
      }

      return {
        id: data.id,
        fileUrl: data.file_url,
        mode: data.mode,
        type: data.type,
        reviewerEmail: data.reviewer_email,
        content: data.content,
        position: data.position,
        isFixed: data.is_fixed,
        isClosed: data.is_closed,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        replies: [],
      };
    }

    const note = memoryNotes.get(payload.noteId);
    if (!note) return null;

    if (typeof payload.isFixed === 'boolean') note.isFixed = payload.isFixed;
    if (typeof payload.isClosed === 'boolean') note.isClosed = payload.isClosed;
    note.updatedAt = now;
    memoryNotes.set(payload.noteId, note);
    return { ...note, replies: memoryReplies.get(note.id) || [] };
  }

  static async addReply(noteId: string, authorEmail: string, authorRole: 'reviewer' | 'maker', content: string): Promise<NoteReply | null> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('note_replies')
        .insert({
          id,
          note_id: noteId,
          author_email: authorEmail,
          author_role: authorRole,
          content,
          created_at: now,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('[DB] Error adding reply:', error);
        return null;
      }

      return {
        id: data.id,
        noteId: data.note_id,
        authorEmail: data.author_email,
        authorRole: data.author_role,
        content: data.content,
        createdAt: data.created_at,
      };
    }

    const note = memoryNotes.get(noteId);
    if (!note) return null;

    const reply: NoteReply = {
      id,
      noteId,
      authorEmail,
      authorRole,
      content,
      createdAt: now,
    };
    const list = memoryReplies.get(noteId) || [];
    list.push(reply);
    memoryReplies.set(noteId, list);
    return reply;
  }
}
