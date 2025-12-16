import { Graphics, Container } from 'pixi.js';

export class Ship {
  constructor(length, cellSize, name = '', onDragStartCallback = null, onRotateCallback = null) {
    this.length = length;
    this.cellSize = cellSize;
    this.rotation = 0; // 0, 90, 180, 270 degrees
    this.container = new Container();
    this.name = name;
    this.isPlaced = false;
    this.gridX = null;
    this.gridY = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.onDragStartCallback = onDragStartCallback;
    this.onRotateCallback = onRotateCallback;
    this.originalPosition = { x: 0, y: 0 }; // Store original position for reset

    this.draw();
    this.setupInteraction();
  }

  get isVertical() {
    return this.rotation === 90 || this.rotation === 270;
  }

  draw() {
    const ship = new Graphics();
    const width = this.isVertical ? this.cellSize - 4 : this.length * this.cellSize - 4;
    const height = this.isVertical ? this.length * this.cellSize - 4 : this.cellSize - 4;

    ship.roundRect(0, 0, width, height, 8)
      .fill(this.isPlaced ? 0x27ae60 : 0x000080)
      .stroke({ color: 0xffffff, width: 2 });

    this.container.removeChildren();
    this.container.addChild(ship);

    // Set explicit hit area for the container
    this.container.hitArea = new Graphics()
      .rect(0, 0, width, height)
      .geometry;

    console.log(`Drew ship ${this.name}: ${width}x${height}, placed: ${this.isPlaced}, eventMode: ${this.container.eventMode}`);
  }

  setupInteraction() {
    this.container.eventMode = 'dynamic';
    this.container.cursor = 'grab';
    this.container.interactiveChildren = true;

    console.log(`Setting up interaction for ${this.name}:`, {
      eventMode: this.container.eventMode,
      cursor: this.container.cursor,
      position: { x: this.container.x, y: this.container.y }
    });

    this.container.on('pointerdown', (e) => {
      console.log(`Ship ${this.name} clicked! Starting drag...`);
      this.isDragging = true;
      this.container.cursor = 'grabbing';
      const pos = e.global;
      this.dragOffset.x = pos.x - this.container.x;
      this.dragOffset.y = pos.y - this.container.y;
      this.container.alpha = 0.7;

      if (this.onDragStartCallback) {
        console.log(`Calling drag start callback for ${this.name}`);
        this.onDragStartCallback(this, 'dragstart');
      }
    });

    this.container.on('globalpointermove', (e) => {
      if (this.isDragging) {
        const pos = e.global;
        this.container.x = pos.x - this.dragOffset.x;
        this.container.y = pos.y - this.dragOffset.y;

	if (this.onDragStartCallback) {
	    this.onDragStartCallback(this, 'dragmove');
	}
        console.log(`Dragging ${this.name} to (${this.container.x}, ${this.container.y})`);
      }
    });

    this.container.on('pointerup', (e) => {
      if (this.isDragging) {
        console.log(`Ship ${this.name} dropped at (${this.container.x}, ${this.container.y})`);
        this.isDragging = false;
        this.container.cursor = 'grab';

        if (this.onDragStartCallback) {
          this.onDragStartCallback(this, 'dragend'); // Pass the ship for drop handling
        }

        this.container.alpha = 1.0;
      }
    });

    this.container.on('pointerupoutside', (e) => {
      if (this.isDragging) {
        console.log(`Ship ${this.name} dropped outside at (${this.container.x}, ${this.container.y})`);
        this.isDragging = false;
        this.container.cursor = 'grab';

        if (this.onDragStartCallback) {
          this.onDragStartCallback(this, 'dragend'); // Pass the ship for drop handling
        }

        this.container.alpha = 1.0;
      }
    });

    // Double-click to rotate
    let lastTapMs = 0;
    const doubleTapWindowMs = 300;

    this.container.on('pointertap', (e) => {
        // Only allow rotation if ship is placed
        if (!this.isPlaced) return;

        if (this.isDragging) return;

        if (typeof e.button === 'number' && e.button !== 0) return;

        const now = performance.now();
        const isDoubleTap = (now - lastTapMs) <= doubleTapWindowMs;
        lastTapMs = now;

        if (!isDoubleTap) return;

        console.log(`Ship ${this.name} double-clicked! Rotating...`);
        this.rotate(this.onRotateCallback);
    });


    this.container.on('pointerover', () => {
      console.log(`Mouse over ship ${this.name}`);
    });
  }

  rotate(validateCallback = null) {
    // Only allow rotation if ship is placed in the grid
    if (!this.isPlaced) {
      console.log(`Cannot rotate ${this.name} - ship must be placed in grid first`);
      return;
    }

    const oldRotation = this.rotation;
    const wasVertical = this.isVertical;

    this.rotation = (this.rotation + 90) % 360;
    this.draw();

    // If there's a validation callback and ship is placed, validate the new rotation
    if (validateCallback && this.isPlaced) {
      const isValid = validateCallback(this, wasVertical);
      if (!isValid) {
        // Rotation would cause invalid placement - revert
        console.log(`Cannot rotate ${this.name} - would cause invalid placement`);
        this.rotation = oldRotation;
        this.draw();
      }
    }
  }

  setPlaced(placed) {
    this.isPlaced = placed;
    this.container.cursor = placed ? 'pointer' : 'grab';
    this.draw();
  }

  setOriginalPosition(x, y) {
    this.originalPosition.x = x;
    this.originalPosition.y = y;
  }

  resetToOriginalPosition() {
    this.container.x = this.originalPosition.x;
    this.container.y = this.originalPosition.y;
    console.log(`Reset ${this.name} to original position (${this.originalPosition.x}, ${this.originalPosition.y})`);
  }
}
