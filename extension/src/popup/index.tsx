import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { AnnotationNote, normalizeFileUrl, UserRole } from '@pinpoint/shared';

const BACKEND_URL = 'http://localhost:4000';

function Popup() {
  const [role, setRole] = useState<UserRole>('reviewer');
  const [email, setEmail] = useState<string>('reviewer@pinpoint.io');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [notes, setNotes] = useState<AnnotationNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load local storage role and email
    chrome.storage.local.get(['pinpointRole', 'pinpointEmail'], (res) => {
      if (res.pinpointRole) setRole(res.pinpointRole);
      if (res.pinpointEmail) setEmail(res.pinpointEmail);
    });

    // Query active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url || '';
      setCurrentUrl(url);
      if (url) {
        loadNotes(url);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadNotes = async (rawUrl: string) => {
    setLoading(true);
    try {
      const normalized = normalizeFileUrl(rawUrl);
      const res = await fetch(`${BACKEND_URL}/api/notes?url=${encodeURIComponent(normalized)}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    const newEmail = newRole === 'reviewer' ? 'reviewer@pinpoint.io' : 'maker@pinpoint.io';
    setEmail(newEmail);
    chrome.storage.local.set({ pinpointRole: newRole, pinpointEmail: newEmail });

    // Broadcast to active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'SET_ROLE',
          role: newRole,
          email: newEmail,
        });
      }
    });
  };

  const openNotes = notes.filter((n) => !n.isClosed);
  const fixedNotes = notes.filter((n) => n.isFixed);

  return (
    <div style={{ padding: '16px', fontSize: '13px', color: '#1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>📍 PinPoint</h2>
        <span style={{ fontSize: '11px', color: '#64748b' }}>v1.0.0</span>
      </div>

      {/* Role Switcher */}
      <div style={{ background: '#e2e8f0', borderRadius: '8px', padding: '3px', display: 'flex', marginBottom: '12px' }}>
        <button
          onClick={() => handleRoleChange('reviewer')}
          style={{
            flex: 1,
            border: 'none',
            background: role === 'reviewer' ? '#ffffff' : 'transparent',
            padding: '6px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: role === 'reviewer' ? '600' : 'normal',
            cursor: 'pointer',
            boxShadow: role === 'reviewer' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Reviewer
        </button>
        <button
          onClick={() => handleRoleChange('maker')}
          style={{
            flex: 1,
            border: 'none',
            background: role === 'maker' ? '#ffffff' : 'transparent',
            padding: '6px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: role === 'maker' ? '600' : 'normal',
            cursor: 'pointer',
            boxShadow: role === 'maker' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          Maker
        </button>
      </div>

      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px' }}>
        Logged in as: <strong>{email}</strong>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: 600 }}>
          <span>Document Notes ({openNotes.length})</span>
          <span style={{ color: '#16a34a', fontSize: '12px' }}>{fixedNotes.length} Fixed</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>Loading notes...</div>
        ) : notes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '12px' }}>
            No notes on this document yet.<br />
            Select text, click a sheet cell, or Alt+drag to annotate!
          </div>
        ) : (
          <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px',
                  borderLeft: `4px solid ${note.isFixed ? '#22c55e' : '#ef4444'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>
                    {note.type === 'error' ? '🔴 Error' : note.type === 'needs_supplement' ? '⚠️ Needs' : '💡 Idea'}{' '}
                    {note.position.cellRef ? `(${note.position.cellRef})` : ''}
                  </span>
                  <span>{note.isFixed ? '✅ Fixed' : 'Open'}</span>
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>{note.content}</div>
                {note.position.selectedText && (
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' }}>
                    "{note.position.selectedText.slice(0, 30)}..."
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const root = document.getElementById('app');
if (root) {
  render(<Popup />, root);
}
