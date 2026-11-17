# 📍 PinPoint

PinPoint is a Chrome Extension (Manifest V3) + Node.js backend that allows a **Reviewer** to annotate Google Docs, Google Sheets, or in-browser PDFs using text selection, freehand regions, or cell-click gestures. Notes lock for the **Maker** until marked as fixed, with instant sub-second real-time in-app toast notifications.

---

## 🏗️ Architecture & Project Structure

- **`/shared`**: Shared TypeScript types, socket event names, and URL normalization logic (`@pinpoint/shared`).
- **`/backend`**: Express + Socket.io server with PostgreSQL (via Supabase) and in-memory persistence fallback.
- **`/extension`**: Manifest V3 Chrome Extension powered by Vite and Preact:
  - **Shadow DOM** for injected UI (prevents CSS conflicts with Google Docs & Google Sheets).
  - **Transparent drawing canvas overlay** for Alt+drag freehand gestures.
  - **Extension Popup** with Reviewer/Maker role switcher and document note tracker.

---

## 📋 Prerequisites

- **Node.js**: v18+ (tested on v26.x)
- **npm**: v9+
- Google Chrome browser (or Chromium-based browser)

---

## 🚀 Getting Started

### 1. Build the Shared Package
```bash
cd shared
npm install
npm run build
```

### 2. Run the Backend Server
```bash
cd backend
npm install
npm run dev
```
The server will start at `http://localhost:4000`.

#### (Optional) Supabase PostgreSQL Setup
If you want to persist notes to a real Supabase database:
1. Create a project in [Supabase](https://supabase.com).
2. Open the SQL Editor in Supabase and execute the script found in `backend/src/schema.sql`.
3. Set your credentials in `backend/.env`:
   ```env
   PORT=4000
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```
*(Note: If no Supabase URL is configured, PinPoint automatically runs with an in-memory repository for local development and testing).*

---

## 🧩 Loading the Extension in Chrome

1. Build the extension:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Toggle on **Developer mode** in the upper-right corner.
4. Click **Load unpacked**.
5. Select the `extension/dist` folder (or `extension` directory if testing with unpacked build).
6. The PinPoint extension is now active.

---

## 🎯 How to Use

1. Open any **Google Doc**, **Google Sheet**, or **PDF** in Chrome.
2. Click the PinPoint extension icon in your toolbar to switch between:
   - **Reviewer**: Can create annotations, close, or reopen notes.
   - **Maker**: Can view notes, reply, and click **Fixed ✓**.
3. **Annotation Gestures**:
   - **Text Selection (Docs / Sheets)**: Highlight any text &rarr; click the floating `🖊️` button &rarr; enter your note &rarr; click **Pin Note**.
   - **Cell Click (Sheets)**: Click any cell &rarr; click the `🖊️` corner icon &rarr; submit note.
   - **Freehand Draw (Alt + Drag)**: Hold `Alt` and drag across any area of the page &rarr; release to open note popup.
4. **Real-time Sync**:
   - Open the same document in two tabs.
   - When a Reviewer creates a note in Tab 1, Tab 2 instantly receives a toast:  
     `⚠️ [reviewer@pinpoint.io] just annotated cell B4`.
   - When the Maker clicks **Fixed ✓**, the pin turns green (`✅`) across all tabs within 1 second, and the Reviewer receives:  
     `✅ Maker marked cell B4 as fixed`.
