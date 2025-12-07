# Multiplayer Battleship Setup

## How to Run

You need to run **two terminals** simultaneously:

### Terminal 1: Start the Server
```bash
npm run server
```
This starts the Socket.IO server on port 3000.

### Terminal 2: Start the Client
```bash
npm run dev
```
This starts the Vite development server on port 5173.

## How to Play

1. Open your browser to `htt1p://localhost:5173`
2. Open a second browser window (or incognito window) to the same URL
3. Click "Find Game" in both windows
4. The server will match you together automatically
5. Ships are auto-placed for testing (3 ships total)
6. Take turns clicking on the enemy grid to shoot
7. Red = Hit, Blue = Miss
8. Sink all enemy ships to win!

## Testing Locally

- **Player 1**: Regular browser window at `http://localhost:5173`
- **Player 2**: Incognito/private window at `http://localhost:5173`

## Game Features

- ✅ Real-time matchmaking
- ✅ Turn-based gameplay
- ✅ Hit/miss detection
- ✅ Win/loss conditions
- ✅ Disconnect handling
- ✅ Visual feedback (colored text for turns)

## What's Included

### Server (`server.js`)
- Express + Socket.IO server
- Game room management
- Player matchmaking
- Turn validation
- Win condition checking

### Client (`src/battleship.js`)
- Socket.IO client integration
- Grid-based shooting
- Real-time game state updates
- UI for game status and turns

## Next Steps

- Add manual ship placement (currently auto-places)
- Add sound effects for hits/misses
- Add ship sinking animations
- Add lobby/room selection
- Add player names
