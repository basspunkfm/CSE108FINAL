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
  // Validate inputs
  if (!username || username === 'undefined' || username === 'null') {
    console.error(`❌ Cannot update score: Invalid username "${username}"`);
    return null;
  }

  if (typeof scoreChange !== 'number' || isNaN(scoreChange)) {
    console.error(`❌ Cannot update score: Invalid scoreChange "${scoreChange}"`);
    return null;
  }

  try {
    // Build the Flask API URL
    let FLASK_API_URL = process.env.FLASK_API_URL || 'http://127.0.0.1:5000';
    
    // Fix: If FLASK_API_URL doesn't start with http, add it
    if (!FLASK_API_URL.startsWith('http://') && !FLASK_API_URL.startsWith('https://')) {
      // On Render, internal services communicate over http
      FLASK_API_URL = `http://${FLASK_API_URL}`;
    }
    
    console.log(`📤 Sending score update to: ${FLASK_API_URL}/api/update_score`);
    console.log(`   Username: "${username}", Score change: ${scoreChange}`);

    const response = await fetch(`${FLASK_API_URL}/api/update_score`, {
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
      console.error(`❌ Failed to update score for ${username}:`, result.error || result);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error updating score for ${username}:`, error.message);
    console.error(`   Full error:`, error);
    return null;
  }
}

io.on('connection', (socket) => {
  console.log('✅ Player connected:', socket.id);

  socket.on('findGame', (username) => {
    // Ensure username is valid
    const validUsername = (username && username.trim()) ? username.trim() : `Player_${socket.id.slice(0, 6)}`;
    
    console.log('🎮 Player', socket.id, `(${validUsername}) is looking for a game...`);

    // Store username on socket
    socket.username = validUsername;

    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.shift();
      const gameId = `game_${socket.id}_${opponent.id}`;

      const gameState = {
        id: gameId,
        players: [
          { 
            id: socket.id, 
            username: socket.username,  // Use socket.username which is validated
            ready: false, 
            ships: [], 
            grid: Array(10).fill(null).map(() => Array(10).fill('empty')), 
            hits: 0 
          },
          { 
            id: opponent.id, 
            username: opponent.username,  // Use opponent.username which was validated when they joined
            ready: false, 
            ships: [], 
            grid: Array(10).fill(null).map(() => Array(10).fill('empty')), 
            hits: 0 
          }
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

      console.log(`✅ Game created: ${gameId}`);
      console.log(`   Player 1: ${socket.username} (${socket.id})`);
      console.log(`   Player 2: ${opponent.username} (${opponent.id})`);
    } else {
      waitingPlayers.push(socket);
      socket.emit('waiting');
      console.log(`⏳ Player ${socket.username} (${socket.id}) waiting for opponent...`);
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

    console.log(`🚢 Player ${socket.username} (${socket.id}) placed ships`);

    // Notify opponent that this player is ready
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const opponentId = game.players[opponentIndex].id;
    io.to(opponentId).emit('opponentReady');

    if (game.players.every(p => p.ready)) {
      game.status = 'playing';
      io.to(gameId).emit('gameStart', {
        currentTurn: game.currentTurn
      });
      console.log(`🎯 Game ${gameId} started!`);
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
    const shooter = game.players[playerIndex];

    const hit = opponent.ships.some(ship =>
      ship.positions.some(pos => pos.x === x && pos.y === y)
    );

    opponent.grid[y][x] = hit ? 'hit' : 'miss';

    // Track hits for scoring
    if (hit) {
      shooter.hits += 1;
      console.log(`💥 ${shooter.username} hit at (${x}, ${y}) - Total hits: ${shooter.hits}`);
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
        
        // Calculate and update scores
        const winner = game.players[playerIndex];
        const loser = game.players[opponentIndex];

        const winnerScore = (winner.hits * 15) + 150; // Hits + Win bonus
        const loserScore = loser.hits * 15; // Only hits, no penalty for losing

        console.log(`🏆 Game ${gameId} finished!`);
        console.log(`   Winner: ${winner.username} - ${winner.hits} hits, +${winnerScore} points`);
        console.log(`   Loser: ${loser.username} - ${loser.hits} hits, +${loserScore} points`);

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
    console.log(`💬 Chat: ${socket.username || socket.id} -> ${gameId}: "${message}"`);

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
    console.log(`🏳️ FORFEIT: Received forfeit from ${socket.username} (${socket.id})`, data);

    const gameId = socket.gameId || data?.gameId;

    if (!gameId) {
      console.log('FORFEIT: No gameId found, exiting');
      return;
    }

    const game = games.get(gameId);

    if (!game) {
      console.log('FORFEIT: Game not found, exiting');
      return;
    }

    if (game.status !== 'playing') {
      console.log(`FORFEIT: Game status is ${game.status}, not playing. Exiting.`);
      return;
    }

    // Determine opponent
    const playerIndex = game.players.findIndex(p => p.id === socket.id);
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const forfeiter = game.players[playerIndex];
    const winner = game.players[opponentIndex];

    console.log(`🏳️ ${forfeiter.username} forfeited. ${winner.username} wins!`);

    // Notify opponent they won by forfeit
    io.to(winner.id).emit('opponentForfeited');

    // Calculate and update scores for forfeit
    const forfeiterScore = -50; // Forfeit penalty
    const winnerScore = (winner.hits * 15) + 150; // Hits + Win bonus

    console.log(`📊 Forfeit scores:`);
    console.log(`   ${forfeiter.username}: ${forfeiterScore} (penalty)`);
    console.log(`   ${winner.username}: ${winner.hits} hits, +${winnerScore}`);

    // Update scores in database
    updatePlayerScore(forfeiter.username, forfeiterScore);
    updatePlayerScore(winner.username, winnerScore);

    // Mark game as finished
    game.status = 'finished';
  });

  socket.on('disconnect', () => {
    console.log('👋 Player disconnected:', socket.username || socket.id);

    const waitingIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitingIndex !== -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }

    if (socket.gameId) {
      const game = games.get(socket.gameId);
      if (game && game.status === 'playing') {
        // Player disconnected during active game - treat as forfeit
        const playerIndex = game.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          const opponentIndex = playerIndex === 0 ? 1 : 0;
          const disconnectedPlayer = game.players[playerIndex];
          const winner = game.players[opponentIndex];

          console.log(`🔌 ${disconnectedPlayer.username} disconnected during game. ${winner.username} wins!`);

          // Update scores - disconnecting player gets penalty, winner gets points
          const disconnectPenalty = -50;
          const winnerScore = (winner.hits * 15) + 150;

          updatePlayerScore(disconnectedPlayer.username, disconnectPenalty);
          updatePlayerScore(winner.username, winnerScore);

          io.to(socket.gameId).emit('opponentDisconnected');
        }
      } else if (game) {
        io.to(socket.gameId).emit('opponentDisconnected');
      }
      games.delete(socket.gameId);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 FLASK_API_URL: ${process.env.FLASK_API_URL || 'http://127.0.0.1:5000 (default)'}`);
});