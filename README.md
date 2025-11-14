# NervDash

A Neon Genesis Evangelion-inspired personal dashboard built for local use. The application provides modular widgets, drag-and-drop layout management, and a CRT-style theme reminiscent of the NERV command center.

## Features

- **Modular Widgets** – Bitcoin price, calendar events (via iCal), and Google Sheets-powered finance summaries.
- **Drag-and-Drop Layout** – Reorder widgets with GridStack; layout persists locally and on disk.
- **Persistent Configuration** – Widget settings live in `config/config.json`; runtime OAuth tokens and layout state are stored separately.
- **Retro Visual Theme** – Scanlines, neon glow, and monospace typography to emulate Evangelion terminals.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure widgets**

   Edit `config/config.json` to provide real values:

   - Update the `calendar` widget `icalUrl` with your feed.
   - Provide the `spreadsheetId` and `range` for the finance widget.
   - Adjust refresh intervals or add additional widgets as required.

3. **Configure Google OAuth (Finance widget)**

   - Create an OAuth client (Desktop application) in the [Google Cloud Console](https://console.cloud.google.com/).
   - Populate the `google.oauth` section with the `clientId`, `clientSecret`, and ensure the redirect URI is set to `http://localhost:3000/api/google/oauth2callback`.
   - Start the server and visit `http://localhost:3000`. If tokens are missing, the finance widget will provide an authorization link.
   - Complete the OAuth consent flow; tokens will be persisted to `config/tokens.json` automatically (this file is git-ignored).

4. **Run the dashboard**

   ```bash
   npm start
   ```

   Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Adding Widgets

Widgets are defined inside `config/config.json`. Each widget entry requires:

- `id`: unique identifier used by the front-end and API routes.
- `type`: widget renderer (`bitcoin`, `calendar`, `finance`).
- `title`: label shown in the UI.
- `layout`: default grid coordinates.
- `config`: widget-specific options.

New widget types can be introduced by extending:

- Backend services/routes (`src/services`, `src/routes/api.js`).
- Front-end renderer map in `public/app.js` for visualization.

## Layout Persistence

Layout changes are stored in two locations:

- Browser `localStorage` (immediate reload persistence).
- `data/layout.json` (a git-ignored server-side copy; useful if the dashboard is opened from multiple browsers or profiles).

## Development

Use nodemon for automatic reloads during development:

```bash
npm run dev
```

## License

MIT
