// Grid.js
import { Container, Graphics, Text } from 'pixi.js';

export class Grid {
  constructor(cols, rows, cellSize, onCellClickCallback = null) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.container = new Container();
    this.cells = [];
    this.onCellClickCallback = onCellClickCallback;

    this.createGrid();
  }

  createGrid() {
    const labelOffset = 30; // Space for labels

    // Add column numbers (1-10) - scale font size with cell size
    const labelFontSize = Math.floor(this.cellSize * 0.4); // Scale with cell size
    for (let x = 0; x < this.cols; x++) {
      const colLabel = new Text({
        text: (x + 1).toString(),
        style: {
          fontSize: labelFontSize,
          fill: 0xffffff,
          fontWeight: 'bold'
        }
      });
      colLabel.x = x * this.cellSize + this.cellSize / 2 + labelOffset;
      colLabel.y = -25;
      colLabel.anchor.set(0.5);
      this.container.addChild(colLabel);
    }

    // Add row letters (A-J)
    for (let y = 0; y < this.rows; y++) {
      const rowLabel = new Text({
        text: String.fromCharCode(65 + y), // A, B, C, etc.
        style: {
          fontSize: labelFontSize,
          fill: 0xffffff,
          fontWeight: 'bold'
        }
      });
      rowLabel.x = -10;
      rowLabel.y = y * this.cellSize + this.cellSize / 2 + labelOffset;
      rowLabel.anchor.set(0.5);
      this.container.addChild(rowLabel);
    }

    // Create cells with transparency
    for (let y = 0; y < this.rows; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const cell = new Graphics()
          .rect(0, 0, this.cellSize - 2, this.cellSize - 2)
          .fill({ color: 0x16213e, alpha: 0.3 }) // Transparent fill
          .stroke({ color: 0x0f3460, width: 1 });

        cell.x = x * this.cellSize + labelOffset;
        cell.y = y * this.cellSize + labelOffset;
        cell.eventMode = 'static';
        cell.cursor = 'pointer';

        // Store grid position
        cell.gridX = x;
        cell.gridY = y;
        cell.state = 'empty'; // empty, ship, hit, miss

        cell.on('pointerdown', () => this.onCellClick(x, y));
        cell.on('pointerover', () => this.onCellHover(cell));
        cell.on('pointerout', () => this.onCellOut(cell));

        this.container.addChild(cell);
        this.cells[y][x] = cell;
      }
    }
  }

  onCellClick(x, y) {
    console.log(`Clicked cell: ${x}, ${y}`);
    if (this.onCellClickCallback) {
      this.onCellClickCallback(x, y);
    }
  }

  onCellHover(cell) {
    cell.tint = 0x4a69bd;
  }

  onCellOut(cell) {
    cell.tint = 0xffffff;
  }

  markHit(x, y) {
    const cell = this.cells[y][x];
    cell.clear()
      .rect(0, 0, this.cellSize - 2, this.cellSize - 2)
      .fill({ color: 0xe74c3c, alpha: 0.7 }) // Red with transparency
      .stroke({ color: 0x0f3460, width: 1 });
    cell.state = 'hit';
  }

  markMiss(x, y) {
    const cell = this.cells[y][x];
    cell.clear()
      .rect(0, 0, this.cellSize - 2, this.cellSize - 2)
      .fill({ color: 0x3498db, alpha: 0.5 }) // Blue with transparency
      .stroke({ color: 0x0f3460, width: 1 });
    cell.state = 'miss';
  }

  reset() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.cells[y][x];
        cell.clear()
          .rect(0, 0, this.cellSize - 2, this.cellSize - 2)
          .fill({ color: 0x16213e, alpha: 0.3 })
          .stroke({ color: 0x0f3460, width: 1 });
        cell.state = 'empty';
        cell.tint = 0xffffff;
      }
    }
  }
}