export const PINPOINT_STYLES = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #1e293b;
  line-height: 1.4;
  z-index: 2147483647;
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* Floating Action Button (Pen) */
.pinpoint-pen-btn {
  position: absolute;
  background: #ffffff;
  color: #2563eb;
  border: 1px solid #cbd5e1;
  border-radius: 9999px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: transform 0.15s ease, background 0.15s ease;
  user-select: none;
  z-index: 2147483647;
}

.pinpoint-pen-btn:hover {
  background: #f1f5f9;
  transform: scale(1.1);
}

/* Pin marker on page */
.pinpoint-pin-marker {
  position: absolute;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 3px 8px rgba(0,0,0,0.2);
  border: 2px solid #ef4444; /* Default error / alert */
  transition: transform 0.15s ease;
  z-index: 2147483640;
}

.pinpoint-pin-marker:hover {
  transform: scale(1.25);
}

.pinpoint-pin-marker.fixed {
  border-color: #22c55e !important;
  background: #f0fdf4;
}

.pinpoint-pin-marker.closed {
  opacity: 0.6;
  border-color: #94a3b8 !important;
}

/* Freehand overlay region box */
.pinpoint-freehand-box {
  position: absolute;
  border: 2px dashed #ef4444;
  background: rgba(239, 68, 68, 0.08);
  pointer-events: none;
  z-index: 2147483639;
  border-radius: 4px;
}

.pinpoint-freehand-box.fixed {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}

/* Note Creation and Detail Popups */
.pinpoint-card {
  position: absolute;
  width: 320px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 2147483647;
}

.pinpoint-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 6px;
}

.pinpoint-card-title {
  font-weight: 600;
  font-size: 13px;
  color: #0f172a;
}

.pinpoint-type-select {
  display: flex;
  gap: 6px;
}

.pinpoint-type-btn {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 3px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
}

.pinpoint-type-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #1d4ed8;
  font-weight: 600;
}

.pinpoint-textarea {
  width: 100%;
  min-height: 60px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}

.pinpoint-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.pinpoint-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.pinpoint-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease;
}

.pinpoint-btn-secondary {
  background: #f1f5f9;
  color: #475569;
}
.pinpoint-btn-secondary:hover {
  background: #e2e8f0;
}

.pinpoint-btn-primary {
  background: #2563eb;
  color: #ffffff;
}
.pinpoint-btn-primary:hover {
  background: #1d4ed8;
}

.pinpoint-btn-success {
  background: #16a34a;
  color: #ffffff;
}
.pinpoint-btn-success:hover {
  background: #15803d;
}

/* Replies section inside card */
.pinpoint-replies {
  max-height: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px solid #f1f5f9;
  padding-top: 8px;
}

.pinpoint-reply-item {
  background: #f8fafc;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11px;
}

.pinpoint-reply-meta {
  color: #64748b;
  font-size: 10px;
  margin-bottom: 2px;
}

/* In-App Toast Container */
.pinpoint-toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 2147483647;
  pointer-events: none;
}

.pinpoint-toast {
  pointer-events: auto;
  min-width: 240px;
  max-width: 340px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #ffffff;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  font-size: 12px;
  color: #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: pinpointSlideIn 0.25s ease-out;
}

.pinpoint-toast.warning {
  border-left-color: #f59e0b;
}

.pinpoint-toast.success {
  border-left-color: #10b981;
}

@keyframes pinpointSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
