// Main game logic
const Game = {
    canvas: null,
    ctx: null,
    width: 800,
    height: 600,
    running: false,
    keys: {},
    player: null,
    baldi: null,
    principal: null,
    items: [],
    mathProblemActive: false,
    
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
            
            // Use item with E key
            if (e.key === 'e' && this.running) {
                this.player.useItem();
                this.updateUI();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
        
        // Start button
        document.getElementById('start-button').addEventListener('click', () => {
            this.startGame();
        });
        
        // Restart button
        document.getElementById('restart-button').addEventListener('click', () => {
            this.hideAllScreens();
            this.showStartScreen();
        });
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
        Map.init();
        
        // Create player
        this.player = new Player(400, 300);
        
        // Create Baldi
        this.baldi = new Baldi(200, 200);
        
        // Create Principal
        this.principal = new Principal(600, 400);
        
        // Create items
        this.items = [
            new Item(300, 400, 'quarter'),
            new Item(500, 200, 'energyBar')
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
    },
    
    // Render game
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Render map
        Map.render(this.ctx);
        
        // Render items
        for (const item of this.items) {
            item.render(this.ctx);
        }
        
        // Render entities
        this.player.render(this.ctx);
        this.baldi.render(this.ctx);
        this.principal.render(this.ctx);
        
        // Render stamina bar
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
        
        // Focus on input
        setTimeout(() => {
            document.getElementById('math-answer').focus();
        }, 100);
        
        // Add event listener for submit button
        document.getElementById('submit-answer').addEventListener('click', () => {
            const userAnswer = parseInt(document.getElementById('math-answer').value);
            
            if (userAnswer === answer) {
                // Correct answer
                overlay.remove();
                this.mathProblemActive = false;
            } else {
                // Wrong answer - make Baldi angry
                this.baldi.makeAngry();
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