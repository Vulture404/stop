# Time Duel — Multiplayer Game

## Deploy in 5 minutes (free, no coding needed)

### Option A: Railway (easiest)

1. Go to https://railway.app and sign up (free)
2. Click "New Project" → "Deploy from GitHub repo"
   - OR click "New Project" → "Deploy from local" and drag this folder
3. Railway auto-detects Node.js and runs `npm start`
4. Click the generated URL (e.g. `yourapp.railway.app`) — that's your game!
5. Share that URL with your friend — they open it and join your room

### Option B: Render (also free)

1. Push this folder to a GitHub repo (github.com → New repo → upload files)
2. Go to https://render.com and sign up
3. Click "New" → "Web Service" → connect your GitHub repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
5. Click "Deploy" — get your URL in ~2 minutes

### Option C: Run locally (to test with someone on same WiFi)

```bash
npm install
node server.js
```
Then open http://localhost:3000
Your friend on the same WiFi: http://YOUR_LOCAL_IP:3000
(find your IP: run `ipconfig` on Windows or `ifconfig` on Mac/Linux)

---

## How the game works

- Uses **WebSockets** for real-time sync between both players
- Player A creates a room → gets a 4-digit code
- Player B joins with that code on the same URL
- Both see the same target time
- Both have an invisible stopwatch — stop closest to the target to win
- Results show both times, winner highlighted

## Files

- `server.js` — Node.js WebSocket server
- `public/index.html` — Full game UI
- `package.json` — Dependencies
