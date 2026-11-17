export type NoteType = 'error' | 'needs_supplement' | 'suggestion' | 'resolved';

export type UserRole = 'reviewer' | 'maker';

export type AnnotationMode = 'text_selection' | 'freehand' | 'cell_click';

export interface PositionData {
  // Stored as percentages of container/page dimensions (0-100)
  xPercent: number;
  yPercent: number;
  widthPercent?: number;
  heightPercent?: number;
  // Specific targets
  cellRef?: string; // e.g. "B4" or row-col identifier
  selectedText?: string;
  svgPath?: string; // For freehand region preview
}

export interface NoteReply {
  id: string;
  noteId: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
}

export interface AnnotationNote {
  id: string;
  fileUrl: string; // normalized file URL
  mode: AnnotationMode;
  type: NoteType;
  reviewerEmail: string;
  content: string;
  position: PositionData;
  isFixed: boolean; // Maker marked as fixed
  isClosed: boolean; // Reviewer closed note
  createdAt: string;
  updatedAt: string;
  replies?: NoteReply[];
}

export interface CreateNotePayload {
  fileUrl: string;
  mode: AnnotationMode;
  type: NoteType;
  reviewerEmail: string;
  content: string;
  position: PositionData;
}

export interface UpdateNoteStatusPayload {
  noteId: string;
  isFixed?: boolean;
  isClosed?: boolean;
  actorEmail: string;
  actorRole: UserRole;
}

export interface AddReplyPayload {
  noteId: string;
  authorEmail: string;
  authorRole: UserRole;
  content: string;
}

export interface ToastNotification {
  id: string;
  type: 'info' | 'warning' | 'success';
  message: string;
  location?: string;
  noteId?: string;
  timestamp: number;
}

// Socket Event Names
export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join_file_room',
  LEAVE_ROOM: 'leave_file_room',
  NOTE_CREATED: 'note_created',
  NOTE_UPDATED: 'note_updated',
  REPLY_ADDED: 'reply_added',
  TOAST_BROADCAST: 'toast_broadcast',
} as const;

export function normalizeFileUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Strip query parameters and hash, remove trailing slash
    let normalized = `${url.origin}${url.pathname}`.replace(/\/+$/, '');
    return normalized;
  } catch {
    return rawUrl.trim().replace(/\/+$/, '');
  }
}
