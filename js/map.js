// Map generation and rendering
const GameMap = {
    // Map tile types
    FLOOR: 0,
    WALL: 1,
    DOOR: 2,
    EXIT: 3,
    CARPET: 4,
    
    tileSize: 32,
    width: 35,
    height: 25,
    grid: [],
    notebookPositions: [],
    roomTypes: {
        CLASSROOM: 'classroom',
        PRINCIPAL: 'principal',
        CAFETERIA: 'cafeteria',
        HALLWAY: 'hallway'
    },
    
    // Initialize the map
    init() {
        this.generateMap();
        this.placeNotebooks();
    },
    
    // Generate the school map
    generateMap() {
        // Create empty grid filled with floors
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
        
        // Create main horizontal hallway (center of school)
        const mainHallY = Math.floor(this.height / 2);
        
        // Create vertical hallway (left side)
        const vertHallX = 8;
        
        // Build classroom walls - Top row
        this.buildRoom(1, 1, 6, 6, 'classroom'); // Classroom 1
        this.buildRoom(10, 1, 6, 6, 'classroom'); // Classroom 2
        this.buildRoom(18, 1, 6, 6, 'classroom'); // Classroom 3
        this.buildRoom(26, 1, 7, 6, 'classroom'); // Classroom 4
        
        // Build classroom walls - Bottom row
        this.buildRoom(1, 17, 6, 6, 'classroom'); // Classroom 5
        this.buildRoom(10, 17, 6, 6, 'classroom'); // Classroom 6
        this.buildRoom(18, 17, 6, 6, 'classroom'); // Classroom 7
        this.buildRoom(26, 17, 7, 6, 'classroom'); // Classroom 8
        
        // Build special rooms - Middle left
        this.buildRoom(1, 9, 6, 6, 'principal'); // Principal's Office
        
        // Build cafeteria - Middle right (larger room)
        this.buildRoom(18, 9, 14, 6, 'cafeteria'); // Cafeteria
        
        // Add doors to all rooms
        // Top row doors (place on bottom wall of each top classroom)
        this.grid[6][4] = this.DOOR; // Classroom 1
        this.grid[6][13] = this.DOOR; // Classroom 2
        this.grid[6][21] = this.DOOR; // Classroom 3
        this.grid[6][29] = this.DOOR; // Classroom 4
        
        // Bottom row doors (place on top wall of each bottom classroom)
        this.grid[17][4] = this.DOOR; // Classroom 5
        this.grid[17][13] = this.DOOR; // Classroom 6
        this.grid[17][21] = this.DOOR; // Classroom 7
        this.grid[17][29] = this.DOOR; // Classroom 8
        
        // Special room doors (replace wall tiles on room boundary)
        this.grid[12][6] = this.DOOR; // Principal's Office (right wall door)
        this.grid[12][18] = this.DOOR; // Cafeteria entrance (left wall door)
        
        // Add main entrance/exit
        this.grid[this.height - 1][17] = this.EXIT;
        
        // Add some internal hallway details
        this.addHallwayDetails();
    },
    
    // Helper function to build a rectangular room
    buildRoom(startX, startY, width, height, roomType = 'classroom') {
        // Fill interior with carpet for classrooms
        if (roomType === 'classroom') {
            for (let x = startX + 1; x < startX + width - 1; x++) {
                for (let y = startY + 1; y < startY + height - 1; y++) {
                    this.grid[y][x] = this.CARPET;
                }
            }
        }
        
        // Top and bottom walls
        for (let x = startX; x < startX + width; x++) {
            this.grid[startY][x] = this.WALL;
            this.grid[startY + height - 1][x] = this.WALL;
        }
        
        // Left and right walls
        for (let y = startY; y < startY + height; y++) {
            this.grid[y][startX] = this.WALL;
            this.grid[y][startX + width - 1] = this.WALL;
        }
    },
    
    // Add some hallway details and decorations
    addHallwayDetails() {
        // Add some lockers (represented as walls) along hallways
        // Left hallway lockers
        for (let y = 9; y < 15; y += 2) {
            if (this.grid[y][9] === this.FLOOR) {
                this.grid[y][9] = this.WALL;
            }
        }
        
        // Right hallway lockers
        for (let y = 9; y < 15; y += 2) {
            if (this.grid[y][16] === this.FLOOR) {
                this.grid[y][16] = this.WALL;
            }
        }
    },
    
    // Place notebooks around the map
    placeNotebooks() {
        this.notebookPositions = [
            // Top row classrooms
            {x: 4, y: 3}, // Classroom 1
            {x: 13, y: 3}, // Classroom 2
            {x: 21, y: 3}, // Classroom 3
            {x: 29, y: 3}, // Classroom 4
            
            // Bottom row classrooms
            {x: 4, y: 20}, // Classroom 5
            {x: 13, y: 20}, // Classroom 6
            {x: 21, y: 20}, // Classroom 7
            
            // Special locations
            {x: 25, y: 12}, // Cafeteria
            {x: 4, y: 12}   // Principal's Office (bonus notebook)
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
                    case this.CARPET:
                        ctx.drawImage(Assets.images.carpet, x * this.tileSize, y * this.tileSize);
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