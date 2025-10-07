// Map generation and rendering
const Map = {
    // Map tile types
    FLOOR: 0,
    WALL: 1,
    DOOR: 2,
    EXIT: 3,
    
    tileSize: 32,
    width: 25,
    height: 19,
    grid: [],
    notebookPositions: [],
    
    // Initialize the map
    init() {
        this.generateMap();
        this.placeNotebooks();
    },
    
    // Generate the school map
    generateMap() {
        // Create empty grid
        this.grid = Array(this.height).fill().map(() => Array(this.width).fill(this.FLOOR));
        
        // Add outer walls
        for (let x = 0; x < this.width; x++) {
            this.grid[0][x] = this.WALL;
            this.grid[this.height - 1][x] = this.WALL;
        }
        
        for (let y = 0; y < this.height; y++) {
            this.grid[y][0] = this.WALL;
            this.grid[y][this.width - 1] = this.WALL;
        }
        
        // Add internal walls to create rooms and corridors
        // Main hallway
        for (let x = 5; x < this.width - 5; x++) {
            this.grid[5][x] = this.WALL;
            this.grid[this.height - 6][x] = this.WALL;
        }
        
        // Vertical walls to create classrooms
        for (let y = 1; y < 5; y++) {
            this.grid[y][5] = this.WALL;
            this.grid[y][10] = this.WALL;
            this.grid[y][15] = this.WALL;
            this.grid[y][20] = this.WALL;
        }
        
        for (let y = this.height - 5; y < this.height - 1; y++) {
            this.grid[y][5] = this.WALL;
            this.grid[y][10] = this.WALL;
            this.grid[y][15] = this.WALL;
            this.grid[y][20] = this.WALL;
        }
        
        // Add doors to classrooms
        this.grid[5][3] = this.DOOR;
        this.grid[5][8] = this.DOOR;
        this.grid[5][13] = this.DOOR;
        this.grid[5][18] = this.DOOR;
        this.grid[this.height - 6][3] = this.DOOR;
        this.grid[this.height - 6][8] = this.DOOR;
        this.grid[this.height - 6][13] = this.DOOR;
        this.grid[this.height - 6][18] = this.DOOR;
        
        // Add exit door
        this.grid[this.height - 1][this.width - 2] = this.EXIT;
    },
    
    // Place notebooks around the map
    placeNotebooks() {
        this.notebookPositions = [
            {x: 3, y: 2},
            {x: 8, y: 2},
            {x: 13, y: 2},
            {x: 18, y: 2},
            {x: 3, y: this.height - 3},
            {x: 8, y: this.height - 3},
            {x: 13, y: this.height - 3}
        ];
    },
    
    // Check if a position is walkable
    isWalkable(x, y) {
        // Convert pixel position to grid position
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        // Check if position is within bounds
        if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
            return false;
        }
        
        // Check if position is a wall
        return this.grid[gridY][gridX] !== this.WALL;
    },
    
    // Check if position has a notebook
    hasNotebook(x, y) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        return this.notebookPositions.some(pos => pos.x === gridX && pos.y === gridY);
    },
    
    // Remove a notebook from a position
    removeNotebook(x, y) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        this.notebookPositions = this.notebookPositions.filter(
            pos => !(pos.x === gridX && pos.y === gridY)
        );
    },
    
    // Check if position is at exit
    isAtExit(x, y) {
        const gridX = Math.floor(x / this.tileSize);
        const gridY = Math.floor(y / this.tileSize);
        
        return this.grid[gridY][gridX] === this.EXIT;
    },
    
    // Render the map
    render(ctx) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileType = this.grid[y][x];
                
                switch (tileType) {
                    case this.FLOOR:
                        ctx.drawImage(Assets.images.floor, x * this.tileSize, y * this.tileSize);
                        break;
                    case this.WALL:
                        ctx.drawImage(Assets.images.wall, x * this.tileSize, y * this.tileSize);
                        break;
                    case this.DOOR:
                        ctx.drawImage(Assets.images.door, x * this.tileSize, y * this.tileSize);
                        break;
                    case this.EXIT:
                        ctx.drawImage(Assets.images.exitDoor, x * this.tileSize, y * this.tileSize);
                        break;
                }
            }
        }
        
        // Draw notebooks
        for (const pos of this.notebookPositions) {
            ctx.drawImage(
                Assets.images.notebook,
                pos.x * this.tileSize,
                pos.y * this.tileSize
            );
        }
    }
};