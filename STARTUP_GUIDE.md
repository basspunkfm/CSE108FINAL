# Battleship Game - Startup Guide

## 🚀 How to Run the Application

You need to run **THREE** servers simultaneously for the game to work properly:

### Step 1: Start the Socket.IO Game Server (Port 3000)
**Open Terminal 1:**
```bash
npm run server
```
**You should see:**
```
Server running on port 3000
```

### Step 2: Start the Vite Development Server (Port 5173)
**Open Terminal 2:**
```bash
npm run dev
```
**You should see:**
```
VITE v7.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

### Step 3: Start the Flask Backend (Port 5000)
**Open Terminal 3:**
```bash
python app.py
```
**You should see:**
```
* Running on http://127.0.0.1:5000
```

## 🎮 How to Access the Game

1. Open your browser
2. Go to: **http://localhost:5000**
3. Login or Register an account
4. Click "Find Match" to start playing

## ✅ Verification Checklist

Before clicking "Find Match", verify all three servers are running:

- [ ] Terminal 1 shows "Server running on port 3000"
- [ ] Terminal 2 shows Vite running on port 5173
- [ ] Terminal 3 shows Flask running on port 5000

## 🐛 Troubleshooting

### Problem: "Connection failed" message
**Solution:** Make sure the Socket.IO server is running (Terminal 1)
```bash
npm run server
```

### Problem: "Cannot connect to server"
**Solution:** Check that all three servers are running on the correct ports

### Problem: Page not loading
**Solution:** Make sure Flask is running:
```bash
python app.py
```

### Problem: Game stuck on "Connecting to server"
**Solutions:**
1. Check browser console (F12) for errors
2. Verify all servers are running
3. Try refreshing the page
4. Check that no other applications are using ports 3000, 5000, or 5173

## 📝 Server Ports Summary

| Server | Port | Purpose |
|--------|------|---------|
| Flask | 5000 | Login, Menu, Leaderboard |
| Socket.IO | 3000 | Game Matchmaking & Multiplayer |
| Vite | 5173 | Game Frontend |

## 🔧 Quick Restart

If you need to restart everything:

1. Press `Ctrl+C` in all three terminals
2. Start again from Step 1

## 💡 Tips

- Keep all three terminal windows visible to monitor logs
- Check the Socket.IO server logs to see when players connect
- Use browser DevTools (F12) > Console to see connection status
- The game will show helpful messages if connection fails
