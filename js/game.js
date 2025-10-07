// Main game logic
const Game = {
    canvas: null,
    ctx: null,
    width: 1120,
    height: 800,
    running: false,
    keys: {},
    player: null,
    baldi: null,
    principal: null,
    items: [],
    machines: [],
    effects: [],
    mathProblemActive: false,
    // Multiplayer state
    mode: 'single', // 'single' | 'multi'
    socket: null,
    playerId: null,
    roomCode: null,
    players: {}, // remote players by id
    lastNetSend: 0,
    playerCount: 0,
    
    // Camera system
    camera: {
        x: 0,
        y: 0,
        zoom: 2.0, // Closer zoom level
        smoothing: 0.1 // Camera smoothing factor
    },
    
    // Initialize the game
    init() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        // Load assets
        Assets.loadAssets().then(() => {
            this.setupEventListeners();
            this.showStartScreen();
        });
    },
    
    // Set up event listeners
    setupEventListeners() {
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Use item or purchase with E key
            if (e.key === 'e' && this.running) {
                this.handleUseOrPurchase();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Start button (single or multiplayer depending on mode)
        document.getElementById('start-button').addEventListener('click', () => {
            if (this.mode === 'multi' && this.roomCode) {
                this.startGame();
            } else {
                this.mode = 'single';
                this.startGame();
            }
        });

        // Multiplayer controls
        const createBtn = document.getElementById('create-mp');
        const joinBtn = document.getElementById('join-button');
        const joinInput = document.getElementById('join-code');
        const inviteCodeEl = document.getElementById('invite-code');

        createBtn.addEventListener('click', () => {
            this.connectSocket(() => {
                this.socket.send(JSON.stringify({ type: 'createRoom' }));
            });
        });

        joinBtn.addEventListener('click', () => {
            const code = (joinInput.value || '').trim();
            if (!code) return;
            this.connectSocket(() => {
                this.socket.send(JSON.stringify({ type: 'joinRoom', roomCode: code }));
            });
        });
        
        // Mobile joystick controls
        this.setupJoystick();
    },
    
    // Setup mobile joystick
    setupJoystick() {
        const joystickBase = document.getElementById('joystick-base');
        const joystickStick = document.getElementById('joystick-stick');
        let isDragging = false;
        let centerX, centerY;
        
        // Reset joystick position
        const resetJoystick = () => {
            joystickStick.style.left = '25px';
            joystickStick.style.top = '25px';
            this.keys.ArrowUp = false;
            this.keys.ArrowDown = false;
            this.keys.ArrowLeft = false;
            this.keys.ArrowRight = false;
        };
        
        resetJoystick();
        
        // Handle touch start
        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isDragging = true;
            centerX = joystickBase.offsetLeft + 50;
            centerY = joystickBase.offsetTop + 50;
        });
        
        // Handle touch move
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            let deltaX = touch.clientX - centerX;
            let deltaY = touch.clientY - centerY;
            
            // Limit joystick movement to the base radius
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 25;
            
            if (distance > maxDistance) {
                deltaX = deltaX * maxDistance / distance;
                deltaY = deltaY * maxDistance / distance;
            }
            
            // Update joystick position
            joystickStick.style.left = (50 + deltaX - 25) + 'px';
            joystickStick.style.top = (50 + deltaY - 25) + 'px';
            
            // Set movement keys based on joystick position
            this.keys.ArrowUp = deltaY < -10;
            this.keys.ArrowDown = deltaY > 10;
            this.keys.ArrowLeft = deltaX < -10;
            this.keys.ArrowRight = deltaX > 10;
        });
        
        // Handle touch end
        document.addEventListener('touchend', () => {
            isDragging = false;
            resetJoystick();
        });
        
        // Use item button for mobile
        document.getElementById('use-item-button').addEventListener('click', () => {
            if (this.running) {
                this.handleUseOrPurchase();
            }
        });
        
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this.hideAllScreens();
            this.showStartScreen();
        });
    },

    // Connect to multiplayer server
    connectSocket(onOpenSend) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            onOpenSend && onOpenSend();
            return;
        }
        this.socket = new WebSocket('ws://localhost:8080');
        this.socket.onopen = () => {
            onOpenSend && onOpenSend();
        };
        this.socket.onmessage = (ev) => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch (e) { return; }
            const t = msg.type;
            if (t === 'roomCreated') {
                this.mode = 'multi';
                this.roomCode = msg.roomCode;
                this.playerId = msg.playerId;
                document.getElementById('invite-code').textContent = this.roomCode;
                // Keep start screen visible so host can share the code
                // Change start button label to indicate multiplayer start
                const startBtn = document.getElementById('start-button');
                if (startBtn) startBtn.textContent = 'Start Multiplayer';
                // Host starts with 1 connected (self)
                this.playerCount = 1;
                this.updatePlayerCountUI();
                this.addRoomEvent(`Room ${this.roomCode} created. Waiting for players…`);
            } else if (t === 'joined') {
                this.mode = 'multi';
                this.roomCode = msg.roomCode;
                this.playerId = msg.playerId;
                this.startGame();
            } else if (t === 'roomInfo') {
                // Server informs current player count
                if (typeof msg.count === 'number') {
                    this.playerCount = msg.count;
                    this.updatePlayerCountUI();
                    this.addRoomEvent(`Players in room: ${msg.count}`);
                }
            } else if (t === 'playerJoined') {
                // Create remote player placeholder; position will update soon
                const id = msg.playerId;
                if (!this.players[id]) {
                    this.players[id] = new Entity(17 * 32, 12 * 32, 32, 32, Assets.images.player);
                }
                // Update UI counter and log
                this.playerCount = Math.max(1, this.playerCount + 1);
                this.updatePlayerCountUI();
                this.addRoomEvent(`Player ${id} joined`);
            } else if (t === 'playerUpdate') {
                const id = msg.playerId;
                if (id === this.playerId) return; // ignore echo
                if (!this.players[id]) {
                    this.players[id] = new Entity(msg.x || 17 * 32, msg.y || 12 * 32, 32, 32, Assets.images.player);
                } else {
                    this.players[id].x = msg.x;
                    this.players[id].y = msg.y;
                }
            } else if (t === 'playerLeft') {
                delete this.players[msg.playerId];
                this.playerCount = Math.max(0, this.playerCount - 1);
                this.updatePlayerCountUI();
                this.addRoomEvent(`Player ${msg.playerId} left`);
            } else if (t === 'error') {
                alert(msg.message || 'Multiplayer error');
            }
        };
        this.socket.onclose = () => {
            // Reset multiplayer state on disconnect
            this.socket = null;
        };
    },

    // Update the player count display on the start screen, if present
    updatePlayerCountUI() {
        const el = document.getElementById('player-count');
        if (el) el.textContent = String(this.playerCount);
    },

    // Append a room event message to the start screen events list (keeps last 5)
    addRoomEvent(message) {
        const list = document.getElementById('mp-events-list');
        if (!list) return;
        const li = document.createElement('li');
        li.textContent = message;
        list.appendChild(li);
        while (list.children.length > 5) {
            list.removeChild(list.firstChild);
        }
    },
    
    // Show start screen
    showStartScreen() {
        this.hideAllScreens();
        document.getElementById('start-screen').classList.remove('hidden');
    },
    
    // Hide all screens
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    },
    
    // Start the game
    startGame() {
        this.hideAllScreens();
        this.running = true;
        
        // Initialize map
        GameMap.init();
        
        // Create player (spawn in main hallway)
        this.player = new Player(17 * 32, 12 * 32);
        
        // Create Baldi (spawn in a classroom)
        this.baldi = new Baldi(4 * 32, 3 * 32);
        
        // Create Principal (spawn in principal's office)
        this.principal = new Principal(4 * 32, 12 * 32);
        
        // Create items scattered around the school
        this.items = [
            new Item(13 * 32, 8 * 32, 'quarter'), // Hallway
            new Item(25 * 32, 12 * 32, 'energyBar'), // Cafeteria
            new Item(21 * 32, 8 * 32, 'quarter'), // Hallway
            new Item(29 * 32, 20 * 32, 'energyBar') // Classroom
        ];

        // Place vending machines in cafeteria
        this.machines = [
            new Machine(22 * 32, 11 * 32, 'zesty'), // Zesty Bar machine
            new Machine(30 * 32, 11 * 32, 'bsoda')  // BSODA machine
        ];
        
        // Update UI
        this.updateUI();
        
        // Start game loop
        this.gameLoop();
    },
    
    // Game loop
    gameLoop() {
        if (!this.running) return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    },
    
    // Update game state
    update() {
        if (this.mathProblemActive) return;
        
        this.player.update(this.keys);
        // Activate doors when player steps onto them (handles open/close + sounds)
        GameMap.maybeActivateDoor(this.player.x, this.player.y);
        this.baldi.update(this.player);
        this.principal.update(this.player);
        
        // Check for item collection
        for (let i = this.items.length - 1; i >= 0; i--) {
            if (this.player.collidesWith(this.items[i])) {
                this.player.currentItem = this.items[i].type;
                this.items.splice(i, 1);
                this.updateUI();
            }
        }
        
        // Update and cull effects (e.g., BSODA spray)
        const now = performance.now();
        for (const e of this.effects) {
            if (e.type === 'bsoda') {
                // Move spray forward
                e.x += e.vx;
                e.y += e.vy;
                e.remaining -= Math.hypot(e.vx, e.vy);

                // Stop spray if it hits a wall
                if (!GameMap.isWalkable(e.x, e.y)) {
                    e.expire = 0;
                }

                // Push characters on hit
                const hitBaldi = this.rectsOverlap(e.x, e.y, e.w, e.h, this.baldi.x, this.baldi.y, this.baldi.width, this.baldi.height);
                const hitPrincipal = this.rectsOverlap(e.x, e.y, e.w, e.h, this.principal.x, this.principal.y, this.principal.width, this.principal.height);
                const strength = 24; // knockback pixels per hit frame
                if (hitBaldi) this.applyKnockback(this.baldi, e.vx, e.vy, strength);
                if (hitPrincipal) this.applyKnockback(this.principal, e.vx, e.vy, strength);

                // End if max travel reached
                if (e.remaining <= 0) {
                    e.expire = 0;
                }
            }
        }
        // Cull expired
        this.effects = this.effects.filter(e => e.expire > now);

        // Update camera to follow player
        this.updateCamera();

        // Multiplayer: send local player updates (throttled)
        if (this.mode === 'multi' && this.socket && this.socket.readyState === WebSocket.OPEN) {
            const now = performance.now();
            if (now - this.lastNetSend > 50) { // 20 Hz
                this.socket.send(JSON.stringify({
                    type: 'playerUpdate',
                    x: this.player.x,
                    y: this.player.y,
                    running: this.player.running
                }));
                this.lastNetSend = now;
            }
        }
    },
    
    // Update camera to follow player
    updateCamera() {
        if (!this.player) return;
        
        // Calculate target camera position (center player on screen)
        const targetX = this.player.x - (this.width / this.camera.zoom) / 2;
        const targetY = this.player.y - (this.height / this.camera.zoom) / 2;
        
        // Smooth camera movement
        this.camera.x += (targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (targetY - this.camera.y) * this.camera.smoothing;
        
        // Keep camera within map bounds
        const mapWidth = GameMap.width * GameMap.tileSize;
        const mapHeight = GameMap.height * GameMap.tileSize;
        const viewWidth = this.width / this.camera.zoom;
        const viewHeight = this.height / this.camera.zoom;
        
        this.camera.x = Math.max(0, Math.min(this.camera.x, mapWidth - viewWidth));
        this.camera.y = Math.max(0, Math.min(this.camera.y, mapHeight - viewHeight));
    },
    
    // Render game
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Save context state
        this.ctx.save();
        
        // Apply camera transformation
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Render map
        GameMap.render(this.ctx);

        // Render machines
        for (const m of this.machines) {
            m.render(this.ctx);
        }

        // Render items
        for (const item of this.items) {
            item.render(this.ctx);
        }
        
        // Render entities
        this.player.render(this.ctx);
        // Render remote players (multiplayer)
        if (this.mode === 'multi') {
            for (const [id, rp] of Object.entries(this.players)) {
                rp && rp.render(this.ctx);
            }
        }
        this.baldi.render(this.ctx);
        this.principal.render(this.ctx);

        // Render active effects (e.g., BSODA spray)
        for (const eff of this.effects) {
            if (eff.type === 'bsoda') {
                this.ctx.drawImage(Assets.images.bsodaSpray, eff.x, eff.y, eff.w, eff.h);
            }
        }
        
        // Restore context state
        this.ctx.restore();
        
        // Render UI elements (not affected by camera)
        this.renderStaminaBar();
    },
    
    // Render stamina bar
    renderStaminaBar() {
        const barWidth = 100;
        const barHeight = 10;
        const x = this.width - barWidth - 10;
        const y = 10;
        
        // Draw background
        this.ctx.fillStyle = '#7f8c8d';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw stamina
        const staminaWidth = (this.player.stamina / this.player.maxStamina) * barWidth;
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(x, y, staminaWidth, barHeight);
        
        // Draw border
        this.ctx.strokeStyle = '#2c3e50';
        this.ctx.strokeRect(x, y, barWidth, barHeight);
        
        // Draw label
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Stamina', x, y - 5);
    },
    
    // Update UI elements
    updateUI() {
        document.getElementById('notebooks').textContent = this.player.notebooks;
        document.getElementById('current-item').textContent = this.player.currentItem ? this.player.currentItem : 'No item';
    },

    // Handle using item or purchasing from vending machines
    handleUseOrPurchase() {
        if (!this.player) return;
        // If holding a quarter and colliding with a machine, purchase from that machine
        if (this.player.currentItem === 'quarter') {
            for (const m of this.machines) {
                if (this.player.collidesWith(m)) {
                    // Purchase item based on machine type
                    this.player.currentItem = (m.machineType === 'bsoda') ? 'bsoda' : 'energyBar';
                    this.updateUI();
                    return;
                }
            }
        }

        // If holding BSODA, use it to spawn spray
        if (this.player.currentItem === 'bsoda') {
            const now = performance.now();
            const dir = this.player.facing || { x: 1, y: 0 };
            const speed = 8; // pixels per frame
            const w = 20, h = 20;
            const startX = this.player.x + dir.x * 24;
            const startY = this.player.y + dir.y * 24;
            this.effects.push({
                type: 'bsoda',
                x: startX,
                y: startY,
                vx: dir.x * speed,
                vy: dir.y * speed,
                w, h,
                expire: now + 600,
                remaining: 300 // total travel distance in pixels
            });
            this.player.currentItem = null;
            this.updateUI();
            return;
        }

        // Otherwise, use regular items (e.g., energyBar)
        if (this.player.useItem()) {
            this.updateUI();
        }
    },

    // Axis-aligned bounding box overlap
    rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    },

    // Apply knockback to an entity respecting walkable tiles
    applyKnockback(entity, vx, vy, strength) {
        const dx = Math.sign(vx) * strength;
        const dy = Math.sign(vy) * strength;
        const newX = entity.x + dx;
        const newY = entity.y + dy;
        if (GameMap.isWalkable(newX, entity.y)) entity.x = newX;
        if (GameMap.isWalkable(entity.x, newY)) entity.y = newY;
    },
    
    // Show math problem
    showMathProblem() {
        this.mathProblemActive = true;
        
        // Create math problem overlay
        const overlay = document.createElement('div');
        overlay.className = 'screen';
        overlay.id = 'math-problem';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        
        // Generate random math problem
        const num1 = Math.floor(Math.random() * 9) + 1;
        const num2 = Math.floor(Math.random() * 9) + 1;
        const answer = num1 + num2;
        
        // Create problem content
        overlay.innerHTML = `
            <h2>Solve the problem:</h2>
            <div class="math-problem">${num1} + ${num2} = ?</div>
            <input type="number" id="math-answer" autofocus>
            <button id="submit-answer">Submit</button>
        `;
        
        document.querySelector('.game-container').appendChild(overlay);

        // Start looping learn music when math is active
        if (Assets && Assets.sounds && Assets.sounds.musLearn) {
            try {
                const learn = Assets.sounds.musLearn;
                learn.loop = true;
                learn.currentTime = 0;
                // Attempt play; browsers may require prior user interaction
                learn.play().catch(() => {/* ignore autoplay restrictions */});
            } catch (e) {
                console.warn('Failed to start mus_Learn', e);
            }
        }
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('math-answer').focus();
        }, 100);
        
        // Add event listener for submit button
        document.getElementById('submit-answer').addEventListener('click', () => {
            const userAnswer = parseInt(document.getElementById('math-answer').value);
            
            // Stop learn music and play hang once when closing math
            const stopLearnAndPlayHang = () => {
                try {
                    if (Assets && Assets.sounds && Assets.sounds.musLearn) {
                        const learn = Assets.sounds.musLearn;
                        learn.pause();
                        learn.currentTime = 0;
                    }
                    if (Assets && Assets.sounds && Assets.sounds.musHang) {
                        const hang = Assets.sounds.musHang;
                        hang.loop = false;
                        hang.currentTime = 0;
                        hang.play().catch(() => {/* ignore autoplay restrictions */});
                    }
                } catch (e) {
                    console.warn('Audio transition error', e);
                }
            };

            if (userAnswer === answer) {
                // Correct answer
                stopLearnAndPlayHang();
                overlay.remove();
                this.mathProblemActive = false;
            } else {
                // Wrong answer - make Baldi angry
                this.baldi.makeAngry();
                stopLearnAndPlayHang();
                overlay.remove();
                this.mathProblemActive = false;
            }
        });
    },
    
    // Put player in detention
    detention(player) {
        // Freeze player for a few seconds
        const currentSpeed = player.speed;
        player.speed = 0;
        
        // Create detention message
        const message = document.createElement('div');
        message.className = 'detention-message';
        message.textContent = 'NO RUNNING IN THE HALLS! 15 seconds detention for you!';
        message.style.position = 'absolute';
        message.style.top = '50%';
        message.style.left = '50%';
        message.style.transform = 'translate(-50%, -50%)';
        message.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        message.style.color = '#fff';
        message.style.padding = '20px';
        message.style.borderRadius = '5px';
        message.style.zIndex = '100';
        
        document.querySelector('.game-container').appendChild(message);
        
        // Release after 5 seconds
        setTimeout(() => {
            player.speed = currentSpeed;
            message.remove();
        }, 5000);
    },
    
    // Game over
    gameOver(message) {
        this.running = false;
        document.getElementById('game-over-message').textContent = message;
        document.getElementById('game-over-screen').classList.remove('hidden');
    },
    
    // Win the game
    win() {
        this.running = false;
        document.getElementById('game-over-message').textContent = 'Congratulations! You escaped the school!';
        document.getElementById('game-over-screen').classList.remove('hidden');
    }
};

// Initialize the game when the page loads
window.addEventListener('load', () => {
    Game.init();
});