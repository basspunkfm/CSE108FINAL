import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"],
    credentials: true
  }
});

const games = new Map();
const waitingPlayers = [];

// Helper function to update player score in database
async function updatePlayerScore(username, scoreChange) {
  try {
    const response = await fetch('http://127.0.0.1:5000/api/update_score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username,
        score_change: scoreChange
      })
    });

    const result = await response.json();
    if (response.ok) {
      console.log(`✅ Score updated for ${username}: +${scoreChange} (New total: ${result.new_score})`);
      return result;
    } else {
      console.error(`❌ Failed to update score for ${username}:`, result.error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error updating score for ${username}:`, error);
    return null;
  }
}

io.on('connection', (socket) => {
  console.log('✅ Player connected:', socket.id);

  socket.on('findGame', (username) => {
    console.log('🎮 Player', socket.id, `(${username || 'Unknown'}) is looking for a game...`);

    // Store username on socket
    socket.username = username || 'Player';

    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.shift();
      const gameId = `game_${socket.id}_${opponent.id}`;

      const gameState = {
        id: gameId,
        players: [
          { id: socket.id, username: socket.username, ready: false, ships: [], grid: Array(10).fill(null).map(() => Array(10).fill('empty')), hits: 0 },
          { id: opponent.id, username: opponent.username, ready: false, ships: [], grid: Array(10).fill(null).map(() => Array(10).fill('empty')), hits: 0 }
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
        opponentId: opponent.id,
        opponentName: opponent.username
      });

      opponent.emit('gameFound', {
        gameId,
        playerIndex: 1,
        opponentId: socket.id,
        opponentName: socket.username
      });

      console.log(`✅ Game created: ${gameId} - ${socket.username} vs ${opponent.username}`);
    } else {
      waitingPlayers.push(socket);
      socket.emit('waiting');
      console.log(`Player ${socket.username} waiting for opponent...`);
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

    // Notify opponent that this player is ready
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentId = game.players[opponentIndex].id;
    io.to(opponentId).emit('opponentReady');

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

    // Track hits for scoring
    if (hit) {
      game.players[playerIndex].hits += 1;
    }

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

        // Calculate and update scores
        const winner = game.players[playerIndex];
        const loser = game.players[opponentIndex];

        const winnerScore = (winner.hits * 15) + 150; // Hits + Win bonus
        const loserScore = loser.hits * 15; // Only hits, no penalty for losing

        console.log(`📊 Final scores - ${winner.username}: ${winner.hits} hits, +${winnerScore} | ${loser.username}: ${loser.hits} hits, +${loserScore}`);

        // Update scores in database
        updatePlayerScore(winner.username, winnerScore);
        updatePlayerScore(loser.username, loserScore);

        return;
      }
    }

    game.currentTurn = game.players[opponentIndex].id;
    io.to(gameId).emit('turnChange', {
      currentTurn: game.currentTurn
    });
  });

  socket.on('chatMessage', ({ message, gameId }) => {
    console.log(`Chat: ${socket.username || socket.id} -> ${gameId}: "${message}"`);

    if (!gameId) return;

    const game = games.get(gameId);
    if (!game) return;

    // Send to all sockets in the game room (including sender)
    // Client will filter out own messages
    io.to(gameId).emit('chatMessage', {
      message,
      senderId: socket.id,
      senderName: socket.username || 'Player'
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
    const forfeiter = game.players[playerIndex];
    const winner = game.players[opponentIndex];

    console.log(`FORFEIT: Opponent is ${winner.id}, sending direct notification`);

    // Notify opponent they won by forfeit - send directly to opponent's socket
    io.to(winner.id).emit('opponentForfeited');
    console.log(`Sent opponentForfeited event directly to ${winner.id}`);

    // Calculate and update scores for forfeit
    const forfeiterScore = -50; // Forfeit penalty
    const winnerScore = (winner.hits * 15) + 150; // Hits + Win bonus

    console.log(`📊 Forfeit scores - ${forfeiter.username}: ${forfeiterScore} (penalty) | ${winner.username}: ${winner.hits} hits, +${winnerScore}`);

    // Update scores in database
    updatePlayerScore(forfeiter.username, forfeiterScore);
    updatePlayerScore(winner.username, winnerScore);

    // Mark game as finished
    game.status = 'finished';
    console.log(`Game ${gameId} ended - ${winner.id} wins by forfeit`);
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
