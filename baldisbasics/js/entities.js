// Game entities (player, Baldi, items)
class Entity {
    constructor(x, y, width, height, sprite) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.sprite = sprite;
    }
    
    render(ctx) {
        ctx.drawImage(this.sprite, this.x, this.y);
    }
    
    // Check collision with another entity
    collidesWith(entity) {
        return this.x < entity.x + entity.width &&
               this.x + this.width > entity.x &&
               this.y < entity.y + entity.height &&
               this.y + this.height > entity.y;
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 32, 32, Assets.images.player);
        this.speed = 3;
        this.notebooks = 0;
        this.currentItem = null;
        this.stamina = 100;
        this.maxStamina = 100;
        this.running = false;
    }
    
    update(keys) {
        let dx = 0;
        let dy = 0;
        
        // Handle movement
        if (keys.ArrowUp || keys.w) dy -= this.speed;
        if (keys.ArrowDown || keys.s) dy += this.speed;
        if (keys.ArrowLeft || keys.a) dx -= this.speed;
        if (keys.ArrowRight || keys.d) dx += this.speed;
        
        // Handle running (shift key)
        this.running = keys.Shift && this.stamina > 0;
        if (this.running && (dx !== 0 || dy !== 0)) {
            dx *= 1.5;
            dy *= 1.5;
            this.stamina -= 0.5;
        } else if (this.stamina < this.maxStamina) {
            this.stamina += 0.2;
        }
        
        // Check if new position is valid
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        if (Map.isWalkable(newX, this.y)) {
            this.x = newX;
        }
        
        if (Map.isWalkable(this.x, newY)) {
            this.y = newY;
        }
        
        // Check for notebook collection
        if (Map.hasNotebook(this.x, this.y)) {
            Map.removeNotebook(this.x, this.y);
            this.notebooks++;
            Game.showMathProblem();
        }
        
        // Check if at exit
        if (this.notebooks === 7 && Map.isAtExit(this.x, this.y)) {
            Game.win();
        }
    }
    
    useItem() {
        if (this.currentItem) {
            // Use the current item
            if (this.currentItem === 'energyBar') {
                this.stamina = this.maxStamina;
                this.currentItem = null;
                return true;
            }
            return false;
        }
        return false;
    }
}

class Baldi extends Entity {
    constructor(x, y) {
        super(x, y, 32, 32, Assets.images.baldi);
        this.speed = 1;
        this.angry = false;
        this.targetX = x;
        this.targetY = y;
        this.lastPlayerPos = { x: 0, y: 0 };
        this.hearingCooldown = 0;
    }
    
    update(player) {
        // Increase speed based on notebooks collected
        this.speed = 1 + (player.notebooks * 0.2);
        
        // If Baldi is angry, he moves towards the player
        if (this.angry) {
            // Record last known player position when hearing cooldown is 0
            if (this.hearingCooldown <= 0) {
                this.lastPlayerPos.x = player.x;
                this.lastPlayerPos.y = player.y;
                this.hearingCooldown = 100;
            } else {
                this.hearingCooldown--;
            }
            
            // Move towards last known player position
            const dx = this.lastPlayerPos.x - this.x;
            const dy = this.lastPlayerPos.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > this.speed) {
                const moveX = (dx / distance) * this.speed;
                const moveY = (dy / distance) * this.speed;
                
                // Check if new position is valid
                const newX = this.x + moveX;
                const newY = this.y + moveY;
                
                if (Map.isWalkable(newX, this.y)) {
                    this.x = newX;
                }
                
                if (Map.isWalkable(this.x, newY)) {
                    this.y = newY;
                }
            }
            
            // Check collision with player
            if (this.collidesWith(player)) {
                Game.gameOver("Baldi caught you!");
            }
        }
    }
    
    makeAngry() {
        this.angry = true;
    }
}

class Principal extends Entity {
    constructor(x, y) {
        super(x, y, 32, 32, Assets.images.principal);
        this.speed = 2;
        this.patrolPoints = [
            { x: 200, y: 200 },
            { x: 600, y: 200 },
            { x: 600, y: 400 },
            { x: 200, y: 400 }
        ];
        this.currentPatrolIndex = 0;
        this.detectionRadius = 150;
    }
    
    update(player) {
        // Get current patrol target
        const target = this.patrolPoints[this.currentPatrolIndex];
        
        // Move towards patrol point
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.speed) {
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            
            // Check if new position is valid
            const newX = this.x + moveX;
            const newY = this.y + moveY;
            
            if (Map.isWalkable(newX, this.y)) {
                this.x = newX;
            }
            
            if (Map.isWalkable(this.x, newY)) {
                this.y = newY;
            }
        } else {
            // Move to next patrol point
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }
        
        // Check if player is running nearby
        if (player.running) {
            const playerDx = player.x - this.x;
            const playerDy = player.y - this.y;
            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
            
            if (playerDistance < this.detectionRadius) {
                // Chase player
                const moveX = (playerDx / playerDistance) * this.speed * 1.5;
                const moveY = (playerDy / playerDistance) * this.speed * 1.5;
                
                // Check if new position is valid
                const newX = this.x + moveX;
                const newY = this.y + moveY;
                
                if (Map.isWalkable(newX, this.y)) {
                    this.x = newX;
                }
                
                if (Map.isWalkable(this.x, newY)) {
                    this.y = newY;
                }
                
                // Check collision with player
                if (this.collidesWith(player)) {
                    Game.detention(player);
                }
            }
        }
    }
}

class Item extends Entity {
    constructor(x, y, type) {
        let sprite;
        switch (type) {
            case 'quarter':
                sprite = Assets.images.quarter;
                break;
            case 'energyBar':
                sprite = Assets.images.energyBar;
                break;
            default:
                sprite = Assets.images.quarter;
        }
        
        super(x, y, 32, 32, sprite);
        this.type = type;
    }
}