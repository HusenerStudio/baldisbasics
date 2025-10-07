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
        principal: 'textures/principal.svg',
        notebook: 'textures/notebook.svg',
        quarter: 'textures/quarter.svg',
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
        musHang: 'audios/mus_hang.ogg'
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