import { io, Socket } from 'socket.io-client';
import {
  AnnotationNote,
  CreateNotePayload,
  normalizeFileUrl,
  NoteReply,
  SOCKET_EVENTS,
  ToastNotification,
  UserRole,
} from '@pinpoint/shared';
import { PINPOINT_STYLES } from './styles';
import { FreehandDrawer } from './canvas';
import { findGoogleSheetCell, fromPercentageCoords, toPercentageCoords } from './dom';

const BACKEND_URL = 'http://localhost:4000';

class PinPointApp {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private notesContainer: HTMLElement | null = null;
  private toastsContainer: HTMLElement | null = null;
  private activePopup: HTMLElement | null = null;
  private floatingPen: HTMLElement | null = null;

  private socket: Socket | null = null;
  private fileUrl: string = '';
  private notes: AnnotationNote[] = [];
  private currentRole: UserRole = 'reviewer';
  private userEmail: string = 'reviewer@pinpoint.io';

  private freehandDrawer = new FreehandDrawer();

  init() {
    this.fileUrl = normalizeFileUrl(window.location.href);
    this.loadUserRole();
    this.setupShadowDOM();
    this.setupSocket();
    this.fetchNotes();
    this.setupEventListeners();

    console.log('[PinPoint] Content script initialized on', this.fileUrl);
  }

  private async loadUserRole() {
    const res = await chrome.storage.local.get(['pinpointRole', 'pinpointEmail']);
    if (res.pinpointRole) this.currentRole = res.pinpointRole;
    if (res.pinpointEmail) this.userEmail = res.pinpointEmail;
  }

  private setupShadowDOM() {
    this.shadowHost = document.createElement('pinpoint-root');
    this.shadowHost.style.position = 'absolute';
    this.shadowHost.style.top = '0';
    this.shadowHost.style.left = '0';
    this.shadowHost.style.width = '100%';
    this.shadowHost.style.height = '100%';
    this.shadowHost.style.pointerEvents = 'none';
    this.shadowHost.style.zIndex = '2147483645';

    document.documentElement.appendChild(this.shadowHost);
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = PINPOINT_STYLES;
    this.shadowRoot.appendChild(styleEl);

    this.notesContainer = document.createElement('div');
    this.notesContainer.className = 'pinpoint-notes-container';
    this.shadowRoot.appendChild(this.notesContainer);

    this.toastsContainer = document.createElement('div');
    this.toastsContainer.className = 'pinpoint-toast-container';
    this.shadowRoot.appendChild(this.toastsContainer);
  }

  private setupSocket() {
    this.socket = io(BACKEND_URL, {
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('[PinPoint] Socket connected, joining file room:', this.fileUrl);
      this.socket?.emit(SOCKET_EVENTS.JOIN_ROOM, this.fileUrl);
    });

    this.socket.on(SOCKET_EVENTS.NOTE_CREATED, (note: AnnotationNote) => {
      console.log('[PinPoint] Remote note created:', note);
      if (!this.notes.some((n) => n.id === note.id)) {
        this.notes.push(note);
        this.renderNote(note);
      }
    });

    this.socket.on(SOCKET_EVENTS.NOTE_UPDATED, (updatedNote: AnnotationNote) => {
      console.log('[PinPoint] Remote note updated:', updatedNote);
      this.notes = this.notes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
      this.refreshNoteDisplay(updatedNote);
    });

    this.socket.on(SOCKET_EVENTS.REPLY_ADDED, (reply: NoteReply) => {
      const note = this.notes.find((n) => n.id === reply.noteId);
      if (note) {
        if (!note.replies) note.replies = [];
        note.replies.push(reply);
        if (this.activePopup && this.activePopup.dataset.noteId === note.id) {
          this.renderReplies(this.activePopup, note);
        }
      }
    });

    this.socket.on(SOCKET_EVENTS.TOAST_BROADCAST, (toast: ToastNotification) => {
      this.showToast(toast.message, toast.type);
    });
  }

  private async fetchNotes() {
    try {
      const res = await fetch(`${BACKEND_URL}/api/notes?url=${encodeURIComponent(this.fileUrl)}`);
      if (res.ok) {
        const data = await res.json();
        this.notes = data.notes || [];
        this.renderAllNotes();
      }
    } catch (err) {
      console.error('[PinPoint] Error fetching notes:', err);
    }
  }

  private setupEventListeners() {
    // 1. Text Selection detection (Google Docs / general web)
    document.addEventListener('mouseup', (e) => {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';

      if (selectedText.length > 0 && !this.activePopup) {
        this.showFloatingPen(e.pageX, e.pageY, () => {
          const coords = toPercentageCoords(e.clientX, e.clientY);
          this.showCreateNotePopup(
            e.pageX,
            e.pageY,
            'text_selection',
            coords.xPercent,
            coords.yPercent,
            undefined,
            selectedText
          );
        });
      } else if (!selectedText) {
        this.hideFloatingPen();
      }
    });

    // 2. Alt + Drag Freehand draw gesture
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt' && !e.repeat && !this.activePopup) {
        this.freehandDrawer.start((rect) => {
          const docScrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
          const docScrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth);
          const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);

          const xPercent = ((rect.startX + docScrollLeft) / docWidth) * 100;
          const yPercent = ((rect.startY + docScrollTop) / docHeight) * 100;
          const widthPercent = (rect.width / docWidth) * 100;
          const heightPercent = (rect.height / docHeight) * 100;

          this.showCreateNotePopup(
            rect.startX + docScrollLeft,
            rect.startY + docScrollTop,
            'freehand',
            xPercent,
            yPercent,
            undefined,
            undefined,
            widthPercent,
            heightPercent
          );
        });
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') {
        this.freehandDrawer.cleanup();
      }
    });

    // 3. Google Sheets Cell-click detection
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const sheetCell = findGoogleSheetCell(target);
      if (sheetCell && sheetCell.cellRef && this.currentRole === 'reviewer' && !this.activePopup) {
        // Show cell pen icon at cell position
        const targetRect = target.getBoundingClientRect();
        const posX = targetRect.right + window.scrollX - 20;
        const posY = targetRect.top + window.scrollY;

        this.showFloatingPen(posX, posY, () => {
          const coords = toPercentageCoords(targetRect.left, targetRect.top);
          this.showCreateNotePopup(posX, posY, 'cell_click', coords.xPercent, coords.yPercent, sheetCell.cellRef);
        });
      }
    });

    // Listen for role updates from Extension popup
    chrome.runtime?.onMessage?.addListener((msg) => {
      if (msg.action === 'SET_ROLE') {
        this.currentRole = msg.role;
        this.userEmail = msg.email;
        this.showToast(`Switched role to ${msg.role.toUpperCase()}`, 'info');
      }
    });
  }

  private showFloatingPen(pageX: number, pageY: number, onClick: () => void) {
    if (!this.shadowRoot) return;
    this.hideFloatingPen();

    this.floatingPen = document.createElement('div');
    this.floatingPen.className = 'pinpoint-pen-btn';
    this.floatingPen.innerHTML = '🖊️';
    this.floatingPen.style.left = `${pageX + 8}px`;
    this.floatingPen.style.top = `${pageY - 16}px`;
    this.floatingPen.style.pointerEvents = 'auto';

    this.floatingPen.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hideFloatingPen();
      onClick();
    });

    this.shadowRoot.appendChild(this.floatingPen);
  }

  private hideFloatingPen() {
    if (this.floatingPen) {
      this.floatingPen.remove();
      this.floatingPen = null;
    }
  }

  private showCreateNotePopup(
    x: number,
    y: number,
    mode: 'text_selection' | 'freehand' | 'cell_click',
    xPercent: number,
    yPercent: number,
    cellRef?: string,
    selectedText?: string,
    widthPercent?: number,
    heightPercent?: number
  ) {
    this.hideActivePopup();
    if (!this.shadowRoot) return;

    let selectedType: any = 'error';

    const card = document.createElement('div');
    card.className = 'pinpoint-card';
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.pointerEvents = 'auto';

    card.innerHTML = `
      <div class="pinpoint-card-header">
        <span class="pinpoint-card-title">New Note ${cellRef ? `(${cellRef})` : ''}</span>
        <div class="pinpoint-type-select">
          <button class="pinpoint-type-btn active" data-type="error">🔴 Error</button>
          <button class="pinpoint-type-btn" data-type="needs_supplement">⚠️ Need</button>
          <button class="pinpoint-type-btn" data-type="suggestion">💡 Idea</button>
        </div>
      </div>
      <textarea class="pinpoint-textarea" placeholder="Write feedback note..."></textarea>
      <div class="pinpoint-actions">
        <button class="pinpoint-btn pinpoint-btn-secondary" id="cancel-btn">Cancel</button>
        <button class="pinpoint-btn pinpoint-btn-primary" id="save-btn">Pin Note</button>
      </div>
    `;

    // Type toggles
    card.querySelectorAll('.pinpoint-type-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        card.querySelectorAll('.pinpoint-type-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.getAttribute('data-type');
      });
    });

    card.querySelector('#cancel-btn')?.addEventListener('click', () => {
      this.hideActivePopup();
    });

    card.querySelector('#save-btn')?.addEventListener('click', async () => {
      const textarea = card.querySelector('textarea') as HTMLTextAreaElement;
      const content = textarea?.value?.trim();
      if (!content) return;

      const payload: CreateNotePayload = {
        fileUrl: this.fileUrl,
        mode,
        type: selectedType,
        reviewerEmail: this.userEmail,
        content,
        position: {
          xPercent,
          yPercent,
          widthPercent,
          heightPercent,
          cellRef,
          selectedText,
        },
      };

      try {
        const res = await fetch(`${BACKEND_URL}/api/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const newNote: AnnotationNote = await res.json();
          this.notes.push(newNote);
          this.renderNote(newNote);
          this.hideActivePopup();
        }
      } catch (err) {
        console.error('[PinPoint] Error creating note:', err);
      }
    });

    this.shadowRoot.appendChild(card);
    this.activePopup = card;
  }

  private renderAllNotes() {
    if (!this.notesContainer) return;
    this.notesContainer.innerHTML = '';
    for (const note of this.notes) {
      this.renderNote(note);
    }
  }

  private renderNote(note: AnnotationNote) {
    if (!this.notesContainer) return;

    const coords = fromPercentageCoords(note.position.xPercent, note.position.yPercent);

    // If freehand, render region box
    if (note.mode === 'freehand' && note.position.widthPercent && note.position.heightPercent) {
      const box = document.createElement('div');
      box.className = `pinpoint-freehand-box ${note.isFixed ? 'fixed' : ''}`;
      box.id = `box-${note.id}`;

      const docWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth, window.innerWidth);
      const docHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);

      box.style.left = `${coords.x}px`;
      box.style.top = `${coords.y}px`;
      box.style.width = `${(note.position.widthPercent / 100) * docWidth}px`;
      box.style.height = `${(note.position.heightPercent / 100) * docHeight}px`;

      this.notesContainer.appendChild(box);
    }

    // Pin marker element
    const pin = document.createElement('div');
    pin.className = `pinpoint-pin-marker ${note.isFixed ? 'fixed' : ''} ${note.isClosed ? 'closed' : ''}`;
    pin.id = `pin-${note.id}`;
    pin.style.left = `${coords.x}px`;
    pin.style.top = `${coords.y}px`;
    pin.style.pointerEvents = 'auto';

    pin.innerHTML = note.isFixed ? '✅' : '📌';

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showNoteDetailPopup(note, coords.x, coords.y);
    });

    this.notesContainer.appendChild(pin);
  }

  private refreshNoteDisplay(updatedNote: AnnotationNote) {
    const pin = this.notesContainer?.querySelector(`#pin-${updatedNote.id}`) as HTMLElement;
    if (pin) {
      pin.className = `pinpoint-pin-marker ${updatedNote.isFixed ? 'fixed' : ''} ${updatedNote.isClosed ? 'closed' : ''}`;
      pin.innerHTML = updatedNote.isFixed ? '✅' : '📌';
    }

    const box = this.notesContainer?.querySelector(`#box-${updatedNote.id}`) as HTMLElement;
    if (box) {
      box.className = `pinpoint-freehand-box ${updatedNote.isFixed ? 'fixed' : ''}`;
    }

    if (this.activePopup && this.activePopup.dataset.noteId === updatedNote.id) {
      const coords = fromPercentageCoords(updatedNote.position.xPercent, updatedNote.position.yPercent);
      this.showNoteDetailPopup(updatedNote, coords.x, coords.y);
    }
  }

  private showNoteDetailPopup(note: AnnotationNote, x: number, y: number) {
    this.hideActivePopup();
    if (!this.shadowRoot) return;

    const card = document.createElement('div');
    card.className = 'pinpoint-card';
    card.dataset.noteId = note.id;
    card.style.left = `${x + 20}px`;
    card.style.top = `${y}px`;
    card.style.pointerEvents = 'auto';

    const typeIcons: Record<string, string> = {
      error: '🔴 Error',
      needs_supplement: '⚠️ Needs supplement',
      suggestion: '💡 Suggestion',
      resolved: '✅ Resolved',
    };

    const statusBadge = note.isFixed
      ? '<span style="color:#16a34a; font-weight:600;">Fixed ✓</span>'
      : '<span style="color:#ef4444; font-weight:600;">Open</span>';

    card.innerHTML = `
      <div class="pinpoint-card-header">
        <div>
          <span style="font-size:11px; color:#64748b;">${typeIcons[note.type] || note.type} · ${statusBadge}</span>
          <div style="font-size:10px; color:#94a3b8;">by ${note.reviewerEmail} · ${new Date(note.createdAt).toLocaleTimeString()}</div>
        </div>
        <button id="close-card-btn" style="border:none;background:none;cursor:pointer;font-size:14px;">✕</button>
      </div>

      <div style="font-size:13px; color:#1e293b; padding: 4px 0;">${note.content}</div>

      <div class="pinpoint-replies" id="replies-list"></div>

      <!-- Reply input -->
      <div style="display:flex; gap:6px;">
        <input type="text" id="reply-input" placeholder="Type reply..." style="flex:1; border:1px solid #cbd5e1; border-radius:4px; padding:4px 8px; font-size:11px;" />
        <button class="pinpoint-btn pinpoint-btn-secondary" id="reply-send-btn" style="padding:4px 8px; font-size:11px;">Reply</button>
      </div>

      <div class="pinpoint-actions" style="margin-top:4px;">
        ${
          this.currentRole === 'maker' && !note.isFixed
            ? `<button class="pinpoint-btn pinpoint-btn-success" id="maker-fixed-btn">Fixed ✓</button>`
            : ''
        }
        ${
          this.currentRole === 'reviewer'
            ? `<button class="pinpoint-btn pinpoint-btn-secondary" id="reviewer-close-btn">${note.isClosed ? 'Reopen' : 'Close Note'}</button>`
            : ''
        }
      </div>
    `;

    this.renderReplies(card, note);

    // Event listeners
    card.querySelector('#close-card-btn')?.addEventListener('click', () => this.hideActivePopup());

    card.querySelector('#maker-fixed-btn')?.addEventListener('click', async () => {
      await this.updateStatus(note.id, { isFixed: true });
    });

    card.querySelector('#reviewer-close-btn')?.addEventListener('click', async () => {
      await this.updateStatus(note.id, { isClosed: !note.isClosed });
    });

    const replyInput = card.querySelector('#reply-input') as HTMLInputElement;
    card.querySelector('#reply-send-btn')?.addEventListener('click', async () => {
      const text = replyInput?.value?.trim();
      if (!text) return;
      await this.addReply(note.id, text);
      replyInput.value = '';
    });

    this.shadowRoot.appendChild(card);
    this.activePopup = card;
  }

  private renderReplies(card: HTMLElement, note: AnnotationNote) {
    const container = card.querySelector('#replies-list');
    if (!container) return;

    container.innerHTML = '';
    if (!note.replies || note.replies.length === 0) {
      container.innerHTML = '<div style="font-size:10px; color:#94a3b8; text-align:center;">No replies yet</div>';
      return;
    }

    for (const r of note.replies) {
      const div = document.createElement('div');
      div.className = 'pinpoint-reply-item';
      div.innerHTML = `
        <div class="pinpoint-reply-meta"><strong>${r.authorEmail}</strong> (${r.authorRole}) · ${new Date(r.createdAt).toLocaleTimeString()}</div>
        <div>${r.content}</div>
      `;
      container.appendChild(div);
    }
  }

  private async updateStatus(noteId: string, updates: { isFixed?: boolean; isClosed?: boolean }) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/notes/${noteId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updates,
          actorEmail: this.userEmail,
          actorRole: this.currentRole,
          fileUrl: this.fileUrl,
        }),
      });

      if (res.ok) {
        const updated: AnnotationNote = await res.json();
        this.refreshNoteDisplay(updated);
      }
    } catch (err) {
      console.error('[PinPoint] Error updating note status:', err);
    }
  }

  private async addReply(noteId: string, content: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/notes/${noteId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorEmail: this.userEmail,
          authorRole: this.currentRole,
          content,
          fileUrl: this.fileUrl,
        }),
      });

      if (res.ok) {
        const reply: NoteReply = await res.json();
        const note = this.notes.find((n) => n.id === noteId);
        if (note) {
          if (!note.replies) note.replies = [];
          note.replies.push(reply);
          if (this.activePopup) this.renderReplies(this.activePopup, note);
        }
      }
    } catch (err) {
      console.error('[PinPoint] Error adding reply:', err);
    }
  }

  private showToast(message: string, type: 'info' | 'warning' | 'success' = 'info') {
    if (!this.toastsContainer) return;

    const toast = document.createElement('div');
    toast.className = `pinpoint-toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    this.toastsContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  private hideActivePopup() {
    if (this.activePopup) {
      this.activePopup.remove();
      this.activePopup = null;
    }
  }
}

// Auto-boot content script
const app = new PinPointApp();
app.init();
