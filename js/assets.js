// Asset loading and management
const Assets = {
    images: {},
    sounds: {},
    loaded: false,
    loadPromises: [],

    // Texture file paths
    texturePaths: {
        player: 'textures/Stick.png',
        baldi: 'textures/baldi.svg',
        baldiHappy: 'textures/Baldi_Wave0001.png',
        baldiAngryIdle: 'textures/Baldi_Slap0024.png',
        baldiAngryMove: 'textures/Baldi_Slap0000.png',
        principal: 'textures/Principal.png',
        // 1st Prize directional sprites
        firstPrizeUp: '1stprize/1PR_90.png',
        firstPrizeDown: '1stprize/1PR_270.png',
        firstPrizeLeft: '1stprize/1PR_180.png',
        firstPrizeRight: '1stprize/1PR_0.png',
        notebook: 'textures/notebook.svg',
        quarter: 'textures/Quarter.png',
        energyBar: 'textures/energy_bar.svg',
        // Vending-related textures
        bsoda: 'textures/BSODA.png',
        bsodaSpray: 'textures/BSODA_Spray.png',
        bsodaMachine: 'textures/BSODAMachine.png',
        zestyMachine: 'textures/ZestyMachine.png',
        wall: 'textures/WhiteBrickWall.png',
        floor: 'textures/TileFloor.png',
        carpet: 'textures/Carpet.png',
        // Classroom doors
        doorClosed: 'doors/Door_0.png',
        doorOpen: 'doors/Door_80.png',
        exitDoor: 'textures/exit_door.svg'
    },

    // Audio file paths
    soundPaths: {
        musLearn: 'audios/mus_Learn.ogg',
        musHang: 'audios/mus_hang.ogg',
        balSlap: 'audios/BAL_Slap.ogg'
        ,
        // Door sounds
        doorOpen: 'doors/door_open.ogg',
        doorClose: 'doors/door_close.ogg'
    },

    // Load image from file
    loadImage(path) {
        const img = new Image();
        const promise = new Promise(resolve => {
            img.onload = () => resolve();
        });
        img.src = path;
        return { img, promise };
    },

    // Load audio from file
    loadAudio(path) {
        const audio = new Audio();
        audio.preload = 'auto';
        const promise = new Promise((resolve) => {
            const onReady = () => {
                audio.removeEventListener('canplaythrough', onReady);
                resolve();
            };
            audio.addEventListener('canplaythrough', onReady, { once: true });
            // Fallback resolve if canplaythrough doesn't fire quickly
            setTimeout(() => resolve(), 2000);
        });
        audio.src = path;
        return { audio, promise };
    },

    // Load all assets
    loadAssets() {
        // Load all texture files
        for (const [key, path] of Object.entries(this.texturePaths)) {
            const { img, promise } = this.loadImage(path);
            this.loadPromises.push(promise);
            this.images[key] = img;
        }

        // Load all audio files
        for (const [key, path] of Object.entries(this.soundPaths)) {
            const { audio, promise } = this.loadAudio(path);
            this.loadPromises.push(promise);
            this.sounds[key] = audio;
        }

        // Wait for all assets to load
        return Promise.all(this.loadPromises).then(() => {
            this.loaded = true;
            console.log('All assets loaded from texture folder');
        });
    }
};