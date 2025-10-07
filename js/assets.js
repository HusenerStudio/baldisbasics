// Asset loading and management
const Assets = {
    images: {},
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
        wall: 'textures/wall.svg',
        floor: 'textures/floor.svg',
        carpet: 'textures/Carpet.png',
        door: 'textures/door.svg',
        exitDoor: 'textures/exit_door.svg'
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

    // Load all assets
    loadAssets() {
        // Load all texture files
        for (const [key, path] of Object.entries(this.texturePaths)) {
            const { img, promise } = this.loadImage(path);
            this.loadPromises.push(promise);
            this.images[key] = img;
        }

        // Wait for all assets to load
        return Promise.all(this.loadPromises).then(() => {
            this.loaded = true;
            console.log('All assets loaded from texture folder');
        });
    }
};