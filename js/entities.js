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
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
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
        // Direction the player is facing (unit vector)
        this.facing = { x: 1, y: 0 };
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
        
        if (GameMap.isWalkable(newX, this.y)) {
            this.x = newX;
        }
        
        if (GameMap.isWalkable(this.x, newY)) {
            this.y = newY;
        }

        // Update facing direction when moving
        if (dx !== 0 || dy !== 0) {
            const mag = Math.hypot(dx, dy) || 1;
            this.facing.x = dx / mag;
            this.facing.y = dy / mag;
        }
        
        // Check for notebook collection
        if (GameMap.hasNotebook(this.x, this.y)) {
            GameMap.removeNotebook(this.x, this.y);
            this.notebooks++;
            Game.showMathProblem();
        }
        
        // Check if at exit
        if (this.notebooks === 7 && GameMap.isAtExit(this.x, this.y)) {
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
        // Default Baldi to happy (waving) when calm
        super(x, y, 32, 32, Assets.images.baldiHappy || Assets.images.baldi);
        this.speed = 1;
        this.angry = false;
        this.targetX = x;
        this.targetY = y;
        this.lastPlayerPos = { x: 0, y: 0 };
        this.hearingCooldown = 0;
        this.slapTimer = 0; // ms until next slap sound when angry
    }
    
    update(player) {
        // Increase speed based on notebooks collected
        // Base speed grows with notebooks and wrong answers
        const wrong = Game.wrongAnswers || 0;
        this.speed = 1 + (player.notebooks * 0.2) + (wrong * 0.3);
        
        // If Baldi is angry, he moves towards the player
        if (this.angry) {
            // Compute movement towards last known player position
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
            const isMoving = distance > this.speed;

            // Swap to appropriate angry sprite based on movement
            if (isMoving) {
                this.sprite = Assets.images.baldiAngryMove || Assets.images.baldi;
            } else {
                this.sprite = Assets.images.baldiAngryIdle || Assets.images.baldi;
            }

            if (isMoving) {
                const moveX = (dx / distance) * this.speed;
                const moveY = (dy / distance) * this.speed;
                
                // Check if new position is valid
                const newX = this.x + moveX;
                const newY = this.y + moveY;
                
                if (GameMap.isWalkable(newX, this.y)) {
                    this.x = newX;
                }
                
                if (GameMap.isWalkable(this.x, newY)) {
                    this.y = newY;
                }
            }

            // Slap cadence: play one-shot sound when timer elapses
            // Faster cadence with more wrong answers
            const baseInterval = 900; // ms
            const interval = Math.max(250, baseInterval - (wrong * 120));
            const now = performance.now();
            if (!this._lastSlapTime) this._lastSlapTime = 0;
            if (now - this._lastSlapTime >= interval) {
                this._lastSlapTime = now;
                const s = Assets.sounds.balSlap;
                if (s) {
                    try { s.currentTime = 0; } catch (e) {}
                    s.play();
                }
            }

            // Check collision with player
            if (this.collidesWith(player)) {
                Game.gameOver("Baldi caught you!");
            }
        } else {
            // Calm state: ensure happy sprite
            if (this.sprite !== (Assets.images.baldiHappy || Assets.images.baldi)) {
                this.sprite = Assets.images.baldiHappy || Assets.images.baldi;
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
        this.speed = 2.2;
        // Expanded roaming patrol points across top, middle, bottom, and vertical hallways
        this.patrolPoints = [
            // Middle hallway (y = 12)
            { x: 6 * 32,  y: 12 * 32 },
            { x: 12 * 32, y: 12 * 32 },
            { x: 18 * 32, y: 12 * 32 },
            { x: 22 * 32, y: 12 * 32 },
            { x: 26 * 32, y: 12 * 32 },
            { x: 30 * 32, y: 12 * 32 },
            { x: 34 * 32, y: 12 * 32 },
            { x: 38 * 32, y: 12 * 32 },
            { x: 42 * 32, y: 12 * 32 },
            { x: 46 * 32, y: 12 * 32 },

            // Top hallway (y = 4)
            { x: 6 * 32,  y: 4 * 32 },
            { x: 12 * 32, y: 4 * 32 },
            { x: 18 * 32, y: 4 * 32 },
            { x: 22 * 32, y: 4 * 32 },
            { x: 26 * 32, y: 4 * 32 },
            { x: 30 * 32, y: 4 * 32 },
            { x: 34 * 32, y: 4 * 32 },
            { x: 38 * 32, y: 4 * 32 },
            { x: 42 * 32, y: 4 * 32 },
            { x: 46 * 32, y: 4 * 32 },

            // Bottom hallway (y = 20)
            { x: 6 * 32,  y: 20 * 32 },
            { x: 12 * 32, y: 20 * 32 },
            { x: 18 * 32, y: 20 * 32 },
            { x: 22 * 32, y: 20 * 32 },
            { x: 26 * 32, y: 20 * 32 },
            { x: 30 * 32, y: 20 * 32 },
            { x: 34 * 32, y: 20 * 32 },
            { x: 38 * 32, y: 20 * 32 },
            { x: 42 * 32, y: 20 * 32 },
            { x: 46 * 32, y: 20 * 32 },

            // Left vertical hallway (x = 8)
            { x: 8 * 32, y: 4 * 32 },
            { x: 8 * 32, y: 8 * 32 },
            { x: 8 * 32, y: 12 * 32 },
            { x: 8 * 32, y: 16 * 32 },
            { x: 8 * 32, y: 20 * 32 },
            { x: 8 * 32, y: 24 * 32 },
            { x: 8 * 32, y: 28 * 32 },
            { x: 8 * 32, y: 32 * 32 },

            // Cafeteria entrance and interior edge
            { x: 18 * 32, y: 12 * 32 },
            { x: 25 * 32, y: 12 * 32 }
        ];
        this.currentPatrolIndex = 0;
        this.detectionRadius = 160;
        this._stuckCounter = 0;
    }
    
    update(player) {
        const prevX = this.x;
        const prevY = this.y;
        let chasing = false;

        const target = this.patrolPoints[this.currentPatrolIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.speed) {
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            const newX = this.x + moveX;
            const newY = this.y + moveY;

            const walkX = GameMap.isWalkable(newX, this.y);
            const walkY = GameMap.isWalkable(this.x, newY);
            if (walkX) this.x = newX;
            if (walkY) this.y = newY;
            if (!walkX && !walkY) {
                const sideX = this.x + Math.sign(moveY || dy) * this.speed;
                const sideY = this.y + Math.sign(moveX || dx) * this.speed;
                if (GameMap.isWalkable(sideX, this.y)) {
                    this.x = sideX;
                } else if (GameMap.isWalkable(this.x, sideY)) {
                    this.y = sideY;
                }
            }
        } else {
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        }

        if (player.running) {
            const playerDx = player.x - this.x;
            const playerDy = player.y - this.y;
            const playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);

            if (playerDistance < this.detectionRadius) {
                chasing = true;
                const moveX = (playerDx / playerDistance) * this.speed * 1.6;
                const moveY = (playerDy / playerDistance) * this.speed * 1.6;
                const newX = this.x + moveX;
                const newY = this.y + moveY;

                const walkX = GameMap.isWalkable(newX, this.y);
                const walkY = GameMap.isWalkable(this.x, newY);
                if (walkX) this.x = newX;
                if (walkY) this.y = newY;
                if (!walkX && !walkY) {
                    const sideX = this.x + Math.sign(moveY || playerDy) * this.speed;
                    const sideY = this.y + Math.sign(moveX || playerDx) * this.speed;
                    if (GameMap.isWalkable(sideX, this.y)) {
                        this.x = sideX;
                    } else if (GameMap.isWalkable(this.x, sideY)) {
                        this.y = sideY;
                    }
                }

                if (this.collidesWith(player)) {
                    Game.detention(player);
                }
            }
        }

        const moved = Math.hypot(this.x - prevX, this.y - prevY);
        if (moved < 0.25) {
            this._stuckCounter++;
        } else {
            this._stuckCounter = 0;
        }

        if (this._stuckCounter > 45) {
            const dirs = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ];
            for (let i = 0; i < 4; i++) {
                const d = dirs[Math.floor(Math.random() * dirs.length)];
                const tryX = this.x + d.x * this.speed * 2;
                const tryY = this.y + d.y * this.speed * 2;
                if (GameMap.isWalkable(tryX, this.y)) { this.x = tryX; break; }
                if (GameMap.isWalkable(this.x, tryY)) { this.y = tryY; break; }
            }
            if (!chasing) {
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            }
            this._stuckCounter = 0;
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
            case 'bsoda':
                sprite = Assets.images.bsoda;
                break;
            default:
                sprite = Assets.images.quarter;
        }
        
        super(x, y, 32, 32, sprite);
        this.type = type;
    }
}

// Static vending machine entity
class Machine extends Entity {
    constructor(x, y, machineType) {
        const sprite = machineType === 'bsoda'
            ? Assets.images.bsodaMachine
            : Assets.images.zestyMachine;
        super(x, y, 32, 32, sprite);
        this.machineType = machineType; // 'bsoda' | 'zesty'
    }
}

// 1st Prize character: uses directional images, chases on sight, pushes player
class FirstPrize extends Entity {
    constructor(x, y) {
        super(x, y, 32, 32, Assets.images.firstPrizeDown);
        this.speed = 1.2; // slower overall movement
        this.pushStrength = 3.0; // pixels per frame push
        this.detectionRadius = 220; // sight distance
        this.facing = { x: 0, y: 1 }; // default down
        this._pushActive = false;
        this._pushDir = { x: 0, y: 0 };
        // Slow wandering when not seeing player
        this.wanderSpeed = 0.6;
        this._wanderDir = { x: 0, y: 0 };
        this._wanderChangeAt = performance.now() + 1200;
    }

    // Choose sprite based on facing
    updateSprite() {
        const fx = this.facing.x;
        const fy = this.facing.y;
        if (Math.abs(fx) > Math.abs(fy)) {
            // Horizontal
            this.sprite = fx >= 0 ? Assets.images.firstPrizeRight : Assets.images.firstPrizeLeft;
        } else {
            // Vertical
            this.sprite = fy >= 0 ? Assets.images.firstPrizeDown : Assets.images.firstPrizeUp;
        }
    }

    update(player) {
        const now = performance.now();
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Detect player within radius and line of walkable approach (simplified LOS)
        const seesPlayer = dist < this.detectionRadius;

        if (seesPlayer) {
            // Move towards player
            const moveX = (dx / (dist || 1)) * this.speed;
            const moveY = (dy / (dist || 1)) * this.speed;
            const newX = this.x + moveX;
            const newY = this.y + moveY;

            const walkX = GameMap.isWalkable(newX, this.y);
            const walkY = GameMap.isWalkable(this.x, newY);
            if (walkX) this.x = newX;
            if (walkY) this.y = newY;

            // Update facing
            this.facing.x = moveX;
            this.facing.y = moveY;
            this.updateSprite();

            // If touching player, start push
            if (this.collidesWith(player)) {
                this._pushActive = true;
                // Push direction from 1st Prize toward player's current heading to a wall/end
                const pdirx = player.facing.x;
                const pdiry = player.facing.y;
                // If player is nearly stationary, push along vector from Prize to player
                const mag = Math.hypot(pdirx, pdiry);
                if (mag < 0.2) {
                    this._pushDir.x = (dx / (dist || 1));
                    this._pushDir.y = (dy / (dist || 1));
                } else {
                    this._pushDir.x = pdirx;
                    this._pushDir.y = pdiry;
                }
            }
        } else {
            // Idle: slow wandering
            if (now >= this._wanderChangeAt || (this._wanderDir.x === 0 && this._wanderDir.y === 0)) {
                // Pick a new random 8-direction unit vector
                const dirs = [
                    {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
                    {x: 1, y: 1}, {x: -1, y: 1}, {x: 1, y: -1}, {x: -1, y: -1}
                ];
                const d = dirs[Math.floor(Math.random() * dirs.length)];
                // Normalize diagonals
                const mag = Math.hypot(d.x, d.y) || 1;
                this._wanderDir.x = d.x / mag;
                this._wanderDir.y = d.y / mag;
                this._wanderChangeAt = now + 1200 + Math.random() * 1500;
            }

            const wx = this._wanderDir.x * this.wanderSpeed;
            const wy = this._wanderDir.y * this.wanderSpeed;
            const nx = this.x + wx;
            const ny = this.y + wy;
            const canX = GameMap.isWalkable(nx, this.y);
            const canY = GameMap.isWalkable(this.x, ny);
            if (canX) this.x = nx; else this._wanderChangeAt = now; // change dir if blocked
            if (canY) this.y = ny; else this._wanderChangeAt = now; // change dir if blocked

            this.facing.x = wx;
            this.facing.y = wy;
            this.updateSprite();
            this._pushActive = false;
        }

        // Apply push if active: move player until blocked by wall or map edge
        if (this._pushActive) {
            const pushX = this._pushDir.x * this.pushStrength;
            const pushY = this._pushDir.y * this.pushStrength;
            const nextPX = player.x + pushX;
            const nextPY = player.y + pushY;
            const canX = GameMap.isWalkable(nextPX, player.y);
            const canY = GameMap.isWalkable(player.x, nextPY);
            if (canX) player.x = nextPX;
            if (canY) player.y = nextPY;

            // Stop push when both directions blocked
            if (!canX && !canY) {
                this._pushActive = false;
            }
        }
    }
}