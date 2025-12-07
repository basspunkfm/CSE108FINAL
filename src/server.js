import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

const games = new Map();
const waitingPlayers = [];

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('findGame', () => {
    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.shift();
      const gameId = `game_${socket.id}_${opponent.id}`;

      const gameState = {
        id: gameId,
        players: [
          { id: socket.id, ready: false, ships: [], grid: Array(10).fill(null).map(() => Array(10).fill('empty')) },
          { id: opponent.id, ready: false, ships: [], grid: Array(10).fill(null).map(() => Array(10).fill('empty')) }
        ],
        currentTurn: socket.id,
        status: 'setup' // setup, playing, finished
      };

      games.set(gameId, gameState);

      socket.join(gameId);
      opponent.join(gameId);

      socket.gameId = gameId;
      opponent.gameId = gameId;

      socket.emit('gameFound', {
        gameId,
        playerIndex: 0,
        opponentId: opponent.id
      });

      opponent.emit('gameFound', {
        gameId,
        playerIndex: 1,
        opponentId: socket.id
      });

      console.log(`Game created: ${gameId}`);
    } else {
      waitingPlayers.push(socket);
      socket.emit('waiting');
      console.log('Player waiting for opponent...');
    }
  });

  socket.on('placeShips', (ships) => {
    const gameId = socket.gameId;
    if (!gameId) return;

    const game = games.get(gameId);
    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;

    game.players[playerIndex].ships = ships;
    game.players[playerIndex].ready = true;

    console.log(`Player ${socket.id} placed ships`);

    if (game.players.every(p => p.ready)) {
      game.status = 'playing';
      io.to(gameId).emit('gameStart', {
        currentTurn: game.currentTurn
      });
      console.log(`Game ${gameId} started!`);
    }
  });

  socket.on('shoot', ({ x, y }) => {
    const gameId = socket.gameId;
    if (!gameId) return;

    const game = games.get(gameId);
    if (!game || game.status !== 'playing') return;

    if (game.currentTurn !== socket.id) {
      socket.emit('error', 'Not your turn!');
      return;
    }

    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = game.players[opponentIndex];

    const hit = opponent.ships.some(ship =>
      ship.positions.some(pos => pos.x === x && pos.y === y)
    );

    opponent.grid[y][x] = hit ? 'hit' : 'miss';

    io.to(gameId).emit('shotResult', {
      shooterId: socket.id,
      x,
      y,
      hit
    });

    if (hit) {
      const allShipsSunk = opponent.ships.every(ship =>
        ship.positions.every(pos => opponent.grid[pos.y][pos.x] === 'hit')
      );

      if (allShipsSunk) {
        game.status = 'finished';
        io.to(gameId).emit('gameOver', {
          winner: socket.id
        });
        console.log(`Game ${gameId} finished! Winner: ${socket.id}`);
        return;
      }
    }

    game.currentTurn = game.players[opponentIndex].id;
    io.to(gameId).emit('turnChange', {
      currentTurn: game.currentTurn
    });
  });

  socket.on('forfeit', (data) => {
    console.log(`FORFEIT: Received forfeit from ${socket.id}`, data);

    const gameId = socket.gameId || data?.gameId;
    console.log(`FORFEIT: gameId from socket = ${socket.gameId}, from data = ${data?.gameId}, using = ${gameId}`);

    if (!gameId) {
      console.log('FORFEIT: No gameId found, exiting');
      return;
    }

    const game = games.get(gameId);
    console.log(`FORFEIT: game exists = ${!!game}, status = ${game?.status}`);

    if (!game) {
      console.log('FORFEIT: Game not found, exiting');
      return;
    }

    if (game.status !== 'playing') {
      console.log(`FORFEIT: Game status is ${game.status}, not playing. Exiting.`);
      return;
    }

    console.log(`Player ${socket.id} forfeited game ${gameId}`);

    // Determine opponent
    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponent = game.players[opponentIndex];

    console.log(`FORFEIT: Opponent is ${opponent.id}, sending direct notification`);

    // Notify opponent they won by forfeit - send directly to opponent's socket
    io.to(opponent.id).emit('opponentForfeited');
    console.log(`Sent opponentForfeited event directly to ${opponent.id}`);

    // Mark game as finished
    game.status = 'finished';
    console.log(`Game ${gameId} ended - ${opponent.id} wins by forfeit`);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);

    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }

    if (socket.gameId) {
      const game = games.get(socket.gameId);
      if (game) {
        io.to(socket.gameId).emit('opponentDisconnected');
        games.delete(socket.gameId);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
