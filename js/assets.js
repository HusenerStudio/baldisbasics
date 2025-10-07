// Asset loading and management
const Assets = {
    images: {},
    loaded: false,
    loadPromises: [],

    // SVG-based assets for characters and items
    svgAssets: {
        // Player character (top-down view)
        player: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#3498db" stroke="#2980b9" stroke-width="2"/>
            <circle cx="16" cy="12" r="6" fill="#ecf0f1"/>
            <circle cx="14" cy="10" r="2" fill="#2c3e50"/>
            <circle cx="18" cy="10" r="2" fill="#2c3e50"/>
            <path d="M12 18 Q16 22 20 18" stroke="#2c3e50" stroke-width="2" fill="none"/>
        </svg>`,

        // Baldi character
        baldi: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#7cb342" stroke="#558b2f" stroke-width="2"/>
            <ellipse cx="16" cy="12" rx="8" ry="6" fill="#ecf0f1"/>
            <circle cx="13" cy="10" r="2" fill="#2c3e50"/>
            <circle cx="19" cy="10" r="2" fill="#2c3e50"/>
            <path d="M12 18 Q16 16 20 18" stroke="#2c3e50" stroke-width="2" fill="none"/>
            <path d="M16 2 Q14 6 16 8 Q18 6 16 2" fill="#558b2f"/>
        </svg>`,

        // Principal character
        principal: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#9b59b6" stroke="#8e44ad" stroke-width="2"/>
            <rect x="10" y="6" width="12" height="6" fill="#34495e"/>
            <circle cx="13" cy="12" r="2" fill="#ecf0f1"/>
            <circle cx="19" cy="12" r="2" fill="#ecf0f1"/>
            <path d="M12 20 Q16 22 20 20" stroke="#2c3e50" stroke-width="2" fill="none"/>
        </svg>`,

        // Notebook item
        notebook: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="24" height="24" fill="#e74c3c" stroke="#c0392b" stroke-width="2"/>
            <rect x="8" y="8" width="16" height="2" fill="#ecf0f1"/>
            <rect x="8" y="12" width="16" height="2" fill="#ecf0f1"/>
            <rect x="8" y="16" width="16" height="2" fill="#ecf0f1"/>
            <rect x="8" y="20" width="16" height="2" fill="#ecf0f1"/>
            <rect x="8" y="24" width="16" height="2" fill="#ecf0f1"/>
        </svg>`,

        // Quarter item
        quarter: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#bdc3c7" stroke="#95a5a6" stroke-width="2"/>
            <text x="16" y="20" font-size="12" text-anchor="middle" fill="#7f8c8d">25¢</text>
        </svg>`,

        // Energy bar item
        energyBar: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="8" width="20" height="16" fill="#f39c12" stroke="#d35400" stroke-width="2"/>
            <rect x="8" y="10" width="16" height="12" fill="#e67e22"/>
            <text x="16" y="20" font-size="8" text-anchor="middle" fill="#ffffff">ENERGY</text>
        </svg>`,

        // Wall tile
        wall: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="32" height="32" fill="#95a5a6"/>
            <rect x="0" y="0" width="16" height="16" fill="#7f8c8d"/>
            <rect x="16" y="16" width="16" height="16" fill="#7f8c8d"/>
        </svg>`,

        // Floor tile
        floor: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="32" height="32" fill="#ecf0f1"/>
            <rect x="0" y="0" width="1" height="32" fill="#bdc3c7"/>
            <rect x="0" y="0" width="32" height="1" fill="#bdc3c7"/>
        </svg>`,

        // Door
        door: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="32" height="32" fill="#d35400"/>
            <rect x="4" y="4" width="24" height="24" fill="#e67e22"/>
            <circle cx="24" cy="16" r="2" fill="#f39c12"/>
        </svg>`,

        // Exit door
        exitDoor: `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="32" height="32" fill="#27ae60"/>
            <rect x="4" y="4" width="24" height="24" fill="#2ecc71"/>
            <text x="16" y="20" font-size="10" text-anchor="middle" fill="#ffffff">EXIT</text>
        </svg>`
    },

    // Convert SVG to Image
    svgToImage(svgString) {
        const img = new Image();
        const blob = new Blob([svgString], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        img.src = url;
        return img;
    },

    // Load all assets
    loadAssets() {
        // Convert all SVG assets to images
        for (const [key, svg] of Object.entries(this.svgAssets)) {
            const img = this.svgToImage(svg);
            const promise = new Promise(resolve => {
                img.onload = () => resolve();
            });
            this.loadPromises.push(promise);
            this.images[key] = img;
        }

        // Wait for all assets to load
        return Promise.all(this.loadPromises).then(() => {
            this.loaded = true;
            console.log('All assets loaded');
        });
    }
};