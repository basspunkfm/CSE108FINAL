import {
    Application,
    Graphics,
    Text,
    TextStyle,
    Sprite,
    Assets,
    Container,
    AnimatedSprite,
    TilingSprite,
    BlurFilter,
    NoiseFilter,
} from 'pixi.js';
import { Howl } from 'howler';
import { Grid } from './grid.js';
import { Ship } from './ship.js';
import { io } from 'socket.io-client';

(async () => {
    const app = new Application();
    await app.init({
        resizeTo: window,
    });
    app.canvas.style.position = 'absolute';
    document.body.appendChild(app.canvas);

    // Socket.IO connection
    const socket = io('http://localhost:3000');

    // Debug: Log ALL socket events
    socket.onAny((eventName, ...args) => {
        console.log(`🔵 SOCKET EVENT RECEIVED: ${eventName}`, args);
    });

    // Game state
    const gameState = {
        myPlayerId: null,
        opponentId: null,
        playerIndex: null,
        gameId: null,
        isMyTurn: false,
        gameStatus: 'waiting', // waiting, setup, playing, finished
        myShips: [],
        placementShips: [] // Ships being placed
    };

    // Grid click handlers will be set after socket connection
    let playerGrid;
    let enemyGrid;



    


    const bgLayer = new Container();
    const gridLayer = new Container();
    const shipLayer = new Container();
    const bulletLayer = new Container();
    const uiLayer = new Container();
    app.stage.addChild(bgLayer, gridLayer, shipLayer, bulletLayer, uiLayer);

    // Create grids with click handler for enemy grid (50px cells)
    const cellSize = 50;
    playerGrid = new Grid(10, 10, cellSize);
    playerGrid.container.x = 50;
    playerGrid.container.y = 200;
    gridLayer.addChild(playerGrid.container);

    const playerLabel = new Text({
        text: 'YOUR FLEET',
        style: {
            fontSize: 22,
            fill: 0x27ae60,
            fontWeight: 'bold'
        }
    });
    playerLabel.x = 50;
    playerLabel.y = 130;
    uiLayer.addChild(playerLabel);

    enemyGrid = new Grid(10, 10, cellSize, (x, y) => {
        // Shoot at enemy grid
        if (gameState.gameStatus === 'playing' && gameState.isMyTurn) {
            const cell = enemyGrid.cells[y][x];
            if (cell.state === 'empty') {
                socket.emit('shoot', { x, y });
            }
        }
    });
    enemyGrid.container.x = 700;
    enemyGrid.container.y = 200;
    gridLayer.addChild(enemyGrid.container);

    const enemyLabel = new Text({
        text: 'ENEMY FLEET',
        style: {
            fontSize: 22,
            fill: 0xe74c3c,
            fontWeight: 'bold'
        }
    });
    enemyLabel.x = 700;
    enemyLabel.y = 130;
    uiLayer.addChild(enemyLabel);

    const shipsLabel = new Text({
        text: 'SHIPS TO PLACE (Drag to YOUR FLEET grid)',
        style: {
            fontSize: 20,
            fill: 0x000080,
            fontWeight: 'bold'
        }
    });
    shipsLabel.x = 50;
    shipsLabel.y = 770;
    shipsLabel.visible = false;
    uiLayer.addChild(shipsLabel);

    // --- SPRITESHEET SETUP ---
    Assets.add({
        alias: 'battlesheet',
        src: '/battleship_spritesheet.json', // <- make sure path is correct
    });

    const sheet = await Assets.load('battlesheet'); // <- should now succeed

    // Optional: log what you actually got
    console.log('sheet:', sheet);


    const shipIdleTex     = sheet.textures['ship_idle'];
    const shipShootTex    = sheet.textures['ship_shoot'];
    const shipDamagedTex  = sheet.textures['ship_damaged'];

    const bulletBigTex    = sheet.textures['bullet_big'];
    const bulletMidTex    = sheet.textures['bullet_mid'];
    const bulletSmallTex  = sheet.textures['bullet_small'];

    // --- SHIP SPRITE ---
    // const ship = new Sprite(shipIdleTex);
    // ship.anchor.set(0.5);
    // ship.position.set(app.screen.width / 2, app.screen.height - 80);
    // shipLayer.addChild(ship);

    // function setShipState(state) {
    //     if (state === 'idle') ship.texture = shipIdleTex;
    //     else if (state === 'shoot') ship.texture = shipShootTex;
    //     else if (state === 'damaged') ship.texture = shipDamagedTex;
    // }

    // --- ANIMATED SHIP USING animation GROUP ---
    // const shipAnimation = new AnimatedSprite(sheet.animations['ship_states']);
    // shipAnimation.anchor.set(0.5);
    // shipAnimation.position.set(200, 200);
    // shipLayer.addChild(shipAnimation);

    // shipAnimation.play();
    // shipAnimation.animationSpeed = 0.01;
    

    // --- BACKGROUND ---
    const texture = await Assets.load('/images/ocean.png');
    const bgSprite = new TilingSprite({
        texture,
        width: app.screen.width,
        height: app.screen.height,
    });

    bgSprite.tileScale.set(1.25, 1.2);
    bgLayer.addChild(bgSprite);

    app.ticker.add(() => {
        bgSprite.tilePosition.x -= 1;
    });

    // --- UI TEXT ---
    const statusText = new Text({
        text: 'Connecting to server...',
        style: {
            fontSize: 26,
            fill: 0xffffff,
            fontWeight: 'bold'
        }
    });
    statusText.x = 50;
    statusText.y = 30;
    uiLayer.addChild(statusText);

    const turnText = new Text({
        text: '',
        style: {
            fontSize: 22,
            fill: 0xffea00,
            fontWeight: 'bold'
        }
    });
    turnText.x = 50;
    turnText.y = 70;
    uiLayer.addChild(turnText);

    // --- FIND GAME BUTTON ---
    const buttonBg = new Graphics()
        .roundRect(0, 0, 180, 50, 10)
        .fill(0x27ae60);
    buttonBg.x = 550;
    buttonBg.y = 25;
    buttonBg.eventMode = 'static';
    buttonBg.cursor = 'pointer';

    const buttonText = new Text({
        text: 'Find Game',
        style: {
            fontSize: 22,
            fill: 0xffffff,
            fontWeight: 'bold'
        }
    });
    buttonText.anchor.set(0.5);
    buttonText.x = buttonBg.x + 90;
    buttonText.y = buttonBg.y + 25;

    buttonBg.on('pointerdown', () => {
        if (gameState.gameStatus === 'waiting' || gameState.gameStatus === 'finished') {
            socket.emit('findGame');
            statusText.text = 'Finding game...';
            buttonBg.alpha = 0.5;
        }
    });

    uiLayer.addChild(buttonBg);
    uiLayer.addChild(buttonText);

    // --- READY BUTTON (for ship placement) ---
    const readyButtonBg = new Graphics()
        .roundRect(0, 0, 180, 50, 10)
        .fill(0xe67e22);
    readyButtonBg.x = 760;
    readyButtonBg.y = 25;
    readyButtonBg.eventMode = 'static';
    readyButtonBg.cursor = 'pointer';
    readyButtonBg.visible = false;

    const readyButtonText = new Text({
        text: 'Ready!',
        style: {
            fontSize: 22,
            fill: 0xffffff,
            fontWeight: 'bold'
        }
    });
    readyButtonText.anchor.set(0.5);
    readyButtonText.x = readyButtonBg.x + 90;
    readyButtonText.y = readyButtonBg.y + 25;

    readyButtonBg.on('pointerdown', () => {
        if (gameState.gameStatus === 'setup' && allShipsPlaced()) {
            confirmShipPlacement();
        }
    });

    uiLayer.addChild(readyButtonBg);
    uiLayer.addChild(readyButtonText);

    // --- FORFEIT BUTTON ---
    const forfeitButtonBg = new Graphics()
        .roundRect(0, 0, 180, 50, 10)
        .fill(0xc0392b);
    forfeitButtonBg.x = 970;
    forfeitButtonBg.y = 25;
    forfeitButtonBg.eventMode = 'static';
    forfeitButtonBg.cursor = 'pointer';
    forfeitButtonBg.visible = false;

    const forfeitButtonText = new Text({
        text: 'Forfeit',
        style: {
            fontSize: 22,
            fill: 0xffffff,
            fontWeight: 'bold'
        }
    });
    forfeitButtonText.anchor.set(0.5);
    forfeitButtonText.x = forfeitButtonBg.x + 90;
    forfeitButtonText.y = forfeitButtonBg.y + 25;

    forfeitButtonBg.on('pointerdown', () => {
        console.log('Forfeit button clicked, gameStatus:', gameState.gameStatus);
        if (gameState.gameStatus === 'playing') {
            const confirm = window.confirm('Are you sure you want to forfeit? You will lose the game.');
            if (confirm) {
                console.log('SENDING: forfeit event to server');
                console.log('Socket connected:', socket.connected);
                console.log('Game ID:', gameState.gameId);
                socket.emit('forfeit', { gameId: gameState.gameId });
                gameState.gameStatus = 'finished';
                statusText.text = 'You forfeited the game';
                statusText.style.fill = 0xe74c3c;
                turnText.text = '';
                forfeitButtonBg.visible = false;
                forfeitButtonText.visible = false;
                console.log('Forfeit sent, status updated');
            }
        }
    });

    uiLayer.addChild(forfeitButtonBg);
    uiLayer.addChild(forfeitButtonText);

    // --- PLACEMENT INSTRUCTIONS ---
    const instructionText = new Text({
        text: 'Drag ships to YOUR FLEET grid. Right-click to rotate (90° increments).',
        style: {
            fontSize: 18,
            fill: 0xffffff,
            fontWeight: 'normal'
        }
    });
    instructionText.x = 250;
    instructionText.y = 100;
    instructionText.visible = false;
    uiLayer.addChild(instructionText);

    // --- SOCKET.IO EVENT LISTENERS ---
    socket.on('connect', () => {
        console.log('Connected to server');
        gameState.myPlayerId = socket.id;
        statusText.text = 'Click "Find Game" to start!';
    });

    socket.on('waiting', () => {
        statusText.text = 'Waiting for opponent...';
        gameState.gameStatus = 'waiting';
    });

    socket.on('gameFound', (data) => {
        console.log('Game found!', data);

        // Reset grids for new game
        playerGrid.reset();
        enemyGrid.reset();

        // Clear previous ships
        gameState.placementShips.forEach(ship => {
            shipLayer.removeChild(ship.container);
        });
        gameState.placementShips = [];

        gameState.gameId = data.gameId;
        gameState.playerIndex = data.playerIndex;
        gameState.opponentId = data.opponentId;
        gameState.gameStatus = 'setup';
        statusText.text = 'Place your ships on YOUR FLEET grid';
        buttonBg.alpha = 1.0;

        // Show placement UI
        readyButtonBg.visible = true;
        readyButtonText.visible = true;
        instructionText.visible = true;
        shipsLabel.visible = true;

        // Create ships for placement
        createPlacementShips();
    });

    socket.on('gameStart', (data) => {
        console.log('Game started!', data);
        gameState.gameStatus = 'playing';
        gameState.isMyTurn = data.currentTurn === socket.id;
        updateTurnText();

        // Show forfeit button during gameplay
        forfeitButtonBg.visible = true;
        forfeitButtonText.visible = true;
    });

    socket.on('shotResult', (data) => {
        console.log('Shot result:', data);

        if (data.shooterId === socket.id) {
            // My shot
            if (data.hit) {
                enemyGrid.markHit(data.x, data.y);
            } else {
                enemyGrid.markMiss(data.x, data.y);
            }
        } else {
            // Opponent's shot on my grid
            if (data.hit) {
                playerGrid.markHit(data.x, data.y);
            } else {
                playerGrid.markMiss(data.x, data.y);
            }
        }
    });

    socket.on('turnChange', (data) => {
        gameState.isMyTurn = data.currentTurn === socket.id;
        updateTurnText();
    });

    socket.on('gameOver', (data) => {
        gameState.gameStatus = 'finished';
        if (data.winner === socket.id) {
            statusText.text = 'YOU WIN! 🎉';
            statusText.style.fill = 0x27ae60;
        } else {
            statusText.text = 'YOU LOSE';
            statusText.style.fill = 0xe74c3c;
        }
        turnText.text = '';
        forfeitButtonBg.visible = false;
        forfeitButtonText.visible = false;
    });

    socket.on('opponentForfeited', () => {
        console.log('RECEIVED: Opponent forfeited event!');
        gameState.gameStatus = 'finished';
        statusText.text = 'Opponent forfeited - YOU WIN! 🎉';
        statusText.style = {
            fontSize: 26,
            fill: 0x27ae60,
            fontWeight: 'bold'
        };
        turnText.text = '';
        forfeitButtonBg.visible = false;
        forfeitButtonText.visible = false;
        console.log('Status updated to:', statusText.text);
    });

    socket.on('opponentDisconnected', () => {
        statusText.text = 'Opponent disconnected';
        gameState.gameStatus = 'waiting';
        turnText.text = '';
        forfeitButtonBg.visible = false;
        forfeitButtonText.visible = false;
    });

    function updateTurnText() {
        if (gameState.gameStatus === 'playing') {
            turnText.text = gameState.isMyTurn ? 'YOUR TURN - Click enemy grid to shoot!' : "OPPONENT'S TURN";
            turnText.style.fill = gameState.isMyTurn ? 0x27ae60 : 0xe74c3c;
        }
    }

    // --- AUDIO ---
    const sound = new Howl({
        src: ['/audio/oceanBg.mp3'],
    });

    sound.play();

    // --- SHIP PLACEMENT FUNCTIONS ---
    function createPlacementShips() {
        const shipSizes = [
            { length: 5, name: 'Carrier' },
            { length: 4, name: 'Battleship' },
            { length: 3, name: 'Cruiser' },
            { length: 3, name: 'Submarine' },
            { length: 2, name: 'Destroyer' }
        ];

        let startX = 80;
        let startY = 800;
        const horizontalSpacing = 320; // Space between ships horizontally
        const verticalSpacing = 80; // Space between rows

        shipSizes.forEach((shipData, index) => {
            const ship = new Ship(shipData.length, cellSize, shipData.name, onShipDragStart, onShipRotate);

            // First row: 3 ships (Carrier, Battleship, Cruiser)
            // Second row: 2 ships (Submarine, Destroyer)
            let posX, posY;
            if (index < 3) {
                // First row
                posX = startX + (index * horizontalSpacing);
                posY = startY;
            } else {
                // Second row
                posX = startX + ((index - 3) * horizontalSpacing);
                posY = startY + verticalSpacing;
            }

            ship.container.x = posX;
            ship.container.y = posY;
            ship.setOriginalPosition(posX, posY); // Store original position
            shipLayer.addChild(ship.container);
            gameState.placementShips.push(ship);

            console.log(`Created ship: ${shipData.name} at (${ship.container.x}, ${ship.container.y}), visible: ${ship.container.visible}`);
        });

        console.log(`Total ships created: ${gameState.placementShips.length}`);
        console.log(`Ship layer children: ${shipLayer.children.length}`);
        console.log(`Ship layer properties:`, {
            eventMode: shipLayer.eventMode,
            visible: shipLayer.visible,
            alpha: shipLayer.alpha,
            position: { x: shipLayer.x, y: shipLayer.y },
            zIndex: app.stage.children.indexOf(shipLayer)
        });

        // Verify each ship is interactive
        gameState.placementShips.forEach(ship => {
            console.log(`Ship ${ship.name} interactive check:`, {
                eventMode: ship.container.eventMode,
                visible: ship.container.visible,
                alpha: ship.container.alpha,
                hasHitArea: !!ship.container.hitArea,
                position: { x: ship.container.x, y: ship.container.y }
            });
        });
    }

    function allShipsPlaced() {
        return gameState.placementShips.every(ship => ship.isPlaced);
    }

    function confirmShipPlacement() {
        const ships = gameState.placementShips.map(ship => {
            const positions = [];
            for (let i = 0; i < ship.length; i++) {
                if (ship.isVertical) {
                    positions.push({ x: ship.gridX, y: ship.gridY + i });
                } else {
                    positions.push({ x: ship.gridX + i, y: ship.gridY });
                }
            }
            return { length: ship.length, positions };
        });

        gameState.myShips = ships;
        socket.emit('placeShips', ships);
        statusText.text = 'Waiting for opponent to place ships...';
        readyButtonBg.visible = false;
        readyButtonText.visible = false;
        instructionText.visible = false;
        shipsLabel.visible = false;

        // Hide placement ships
        gameState.placementShips.forEach(ship => {
            ship.container.visible = false;
        });
    }

    function isValidPlacement(ship, gridX, gridY) {
        // Check bounds
        if (ship.isVertical) {
            if (gridX < 0 || gridX >= 10 || gridY < 0 || gridY + ship.length > 10) {
                return false;
            }
        } else {
            if (gridX < 0 || gridX + ship.length > 10 || gridY < 0 || gridY >= 10) {
                return false;
            }
        }

        // Check for overlaps with other placed ships
        for (let otherShip of gameState.placementShips) {
            if (otherShip === ship || !otherShip.isPlaced) continue;

            const otherPositions = [];
            for (let i = 0; i < otherShip.length; i++) {
                if (otherShip.isVertical) {
                    otherPositions.push({ x: otherShip.gridX, y: otherShip.gridY + i });
                } else {
                    otherPositions.push({ x: otherShip.gridX + i, y: otherShip.gridY });
                }
            }

            for (let i = 0; i < ship.length; i++) {
                const newX = ship.isVertical ? gridX : gridX + i;
                const newY = ship.isVertical ? gridY + i : gridY;

                if (otherPositions.some(pos => pos.x === newX && pos.y === newY)) {
                    return false;
                }
            }
        }

        return true;
    }

    function placeShipOnGrid(ship, gridX, gridY) {
        ship.gridX = gridX;
        ship.gridY = gridY;
        ship.setPlaced(true);

        // Snap to grid position
        const gridOffsetX = playerGrid.container.x + 30; // 30 is label offset
        const gridOffsetY = playerGrid.container.y + 30;
        ship.container.x = gridOffsetX + (gridX * cellSize);
        ship.container.y = gridOffsetY + (gridY * cellSize);
        ship.container.alpha = 1.0;

        // Draw ship on grid
        for (let i = 0; i < ship.length; i++) {
            const x = ship.isVertical ? gridX : gridX + i;
            const y = ship.isVertical ? gridY + i : gridY;
            playerGrid.cells[y][x].clear()
                .rect(0, 0, playerGrid.cellSize - 2, playerGrid.cellSize - 2)
                .fill({ color: 0x27ae60, alpha: 0.7 })
                .stroke({ color: 0x0f3460, width: 1 });
        }
    }

    // --- DRAG HANDLERS ---
    function onShipDragStart(ship, eventType) {
        if (eventType === 'dragend') {
            // Drag ended - handle drop
            handleShipDrop(ship);
        } else if (eventType === 'dragstart') {
            // Drag started
            console.log(`Started dragging ${ship.name}`);
        }
    }

    // --- ROTATION HANDLER ---
    function onShipRotate(ship, wasVertical) {
        if (!ship.isPlaced) return true; // Not placed, rotation is always ok

        console.log(`Rotating ${ship.name} on grid. Was vertical: ${wasVertical}, Now vertical: ${ship.isVertical}`);

        // Clear old cells
        for (let i = 0; i < ship.length; i++) {
            const oldX = wasVertical ? ship.gridX : ship.gridX + i;
            const oldY = wasVertical ? ship.gridY + i : ship.gridY;
            playerGrid.cells[oldY][oldX].clear()
                .rect(0, 0, playerGrid.cellSize - 2, playerGrid.cellSize - 2)
                .fill({ color: 0x16213e, alpha: 0.3 })
                .stroke({ color: 0x0f3460, width: 1 });
        }

        // Check if new rotation is valid
        if (!isValidPlacement(ship, ship.gridX, ship.gridY)) {
            // Invalid rotation - restore old cells
            console.log(`Rotation invalid - restoring old position`);
            for (let i = 0; i < ship.length; i++) {
                const oldX = wasVertical ? ship.gridX : ship.gridX + i;
                const oldY = wasVertical ? ship.gridY + i : ship.gridY;
                playerGrid.cells[oldY][oldX].clear()
                    .rect(0, 0, playerGrid.cellSize - 2, playerGrid.cellSize - 2)
                    .fill({ color: 0x27ae60, alpha: 0.7 })
                    .stroke({ color: 0x0f3460, width: 1 });
            }
            return false;
        }

        // Valid rotation - draw new cells
        for (let i = 0; i < ship.length; i++) {
            const newX = ship.isVertical ? ship.gridX : ship.gridX + i;
            const newY = ship.isVertical ? ship.gridY + i : ship.gridY;
            playerGrid.cells[newY][newX].clear()
                .rect(0, 0, playerGrid.cellSize - 2, playerGrid.cellSize - 2)
                .fill({ color: 0x27ae60, alpha: 0.7 })
                .stroke({ color: 0x0f3460, width: 1 });
        }

        console.log(`Rotation successful`);
        return true;
    }

    function handleShipDrop(droppedShip) {
        console.log(`Handling ship drop for ${droppedShip.name}...`);

        // Check if dropped on player grid
        const gridOffsetX = playerGrid.container.x + 30;
        const gridOffsetY = playerGrid.container.y + 30;

        const gridX = Math.floor((droppedShip.container.x - gridOffsetX) / cellSize);
        const gridY = Math.floor((droppedShip.container.y - gridOffsetY) / cellSize);

        console.log(`Dropped at screen position (${droppedShip.container.x}, ${droppedShip.container.y})`);
        console.log(`Calculated grid position: (${gridX}, ${gridY})`);

        if (isValidPlacement(droppedShip, gridX, gridY)) {
            // Clear previous position if ship was already placed
            if (droppedShip.isPlaced) {
                console.log(`Clearing previous position for ${droppedShip.name}`);
                for (let i = 0; i < droppedShip.length; i++) {
                    const oldX = droppedShip.isVertical ? droppedShip.gridX : droppedShip.gridX + i;
                    const oldY = droppedShip.isVertical ? droppedShip.gridY + i : droppedShip.gridY;
                    playerGrid.cells[oldY][oldX].clear()
                        .rect(0, 0, playerGrid.cellSize - 2, playerGrid.cellSize - 2)
                        .fill({ color: 0x16213e, alpha: 0.3 })
                        .stroke({ color: 0x0f3460, width: 1 });
                }
            }
            placeShipOnGrid(droppedShip, gridX, gridY);
            console.log(`✓ Ship ${droppedShip.name} placed at grid (${gridX}, ${gridY})`);
        } else {
            console.log(`✗ Invalid placement for ${droppedShip.name} at (${gridX}, ${gridY})`);
            // Invalid placement - reset to previous grid position or original position
            if (droppedShip.isPlaced) {
                // Was previously placed on grid - return to that grid position
                const gridOffsetX = playerGrid.container.x + 30;
                const gridOffsetY = playerGrid.container.y + 30;
                droppedShip.container.x = gridOffsetX + (droppedShip.gridX * cellSize);
                droppedShip.container.y = gridOffsetY + (droppedShip.gridY * cellSize);
                console.log(`Reset ${droppedShip.name} to previous grid position`);
            } else {
                // Was never placed - return to original starting position
                droppedShip.resetToOriginalPosition();
            }
        }
    }

})();
