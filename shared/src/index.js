"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = void 0;
exports.normalizeFileUrl = normalizeFileUrl;
// Socket Event Names
exports.SOCKET_EVENTS = {
    JOIN_ROOM: 'join_file_room',
    LEAVE_ROOM: 'leave_file_room',
    NOTE_CREATED: 'note_created',
    NOTE_UPDATED: 'note_updated',
    REPLY_ADDED: 'reply_added',
    TOAST_BROADCAST: 'toast_broadcast',
};
function normalizeFileUrl(rawUrl) {
    try {
        const url = new URL(rawUrl);
        // Strip query parameters and hash, remove trailing slash
        let normalized = `${url.origin}${url.pathname}`.replace(/\/+$/, '');
        return normalized;
    }
    catch {
        return rawUrl.trim().replace(/\/+$/, '');
    }
}
