class Character {
    #data;
    sprite;

    constructor(data = {}) {
        this.#data = Character.#normalize(data);
    }

    // ---------- defaults & helpers ----------
    static defaults() {
        return {
            name: 'Hero',
            level: 1,
            hp: 100, maxHp: 100,
            mp: 30, maxMp: 30,
            attack: 10,
            defense: 8,
            speed: 2,
            exp: 0,
            gold: 0,
            inventory: [],
            position: { x: 200, y: 150 },
        };
    }

    static #clone(o) {
        return typeof structuredClone === 'function'
            ? structuredClone(o)
            : JSON.parse(JSON.stringify(o));
    }
    static #clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

    static #normalize(data) {
        const d = { ...Character.defaults(), ...Character.#clone(data) };
        if (!Array.isArray(d.inventory)) d.inventory = [];
        if (!d.position) d.position = { x: 0, y: 0 };
        d.hp = Character.#clamp(d.hp, 0, d.maxHp);
        d.mp = Character.#clamp(d.mp, 0, d.maxMp);
        return d;
    }

    // ---------- read-only snapshot ----------
    snapshot() { return Character.#clone(this.#data); }
    toJSON() { return this.snapshot(); }

    // ---------- getters / setters ----------
    get inventory() { return this.#data.inventory.map(Character.#clone); }
    set inventory(arr) { this.#data.inventory = Array.isArray(arr) ? arr.map(Character.#clone) : []; }

    get name() { return this.#data.name; }
    set name(v) { this.#data.name = String(v); }

    get level() { return this.#data.level; }
    set level(n) { this.#data.level = Math.max(1, n | 0); }

    get hp() { return this.#data.hp; }
    set hp(n) { this.#data.hp = Character.#clamp(n | 0, 0, this.#data.maxHp); }

    get maxHp() { return this.#data.maxHp; }
    set maxHp(n) {
        this.#data.maxHp = Math.max(1, n | 0);
        this.hp = this.#data.hp; // re-clamp
    }

    get mp() { return this.#data.mp; }
    set mp(n) { this.#data.mp = Character.#clamp(n | 0, 0, this.#data.maxMp); }

    get maxMp() { return this.#data.maxMp; }
    set maxMp(n) {
        this.#data.maxMp = Math.max(0, n | 0);
        this.mp = this.#data.mp; // re-clamp
    }

    get attack() { return this.#data.attack; }
    set attack(n) { this.#data.attack = n | 0; }

    get defense() { return this.#data.defense; }
    set defense(n) { this.#data.defense = n | 0; }

    get speed() { return this.#data.speed; }
    set speed(n) { this.#data.speed = n | 0; }

    get exp() { return this.#data.exp; }
    set exp(n) { this.#data.exp = Math.max(0, n | 0); }

    get gold() { return this.#data.gold; }
    set gold(n) { this.#data.gold = Math.max(0, n | 0); }

    get size() { return this.#data.size; }
    set size(n) { this.#data.size = Math.max(1, n | 0); }

    // Position proxies
    get position() { return Character.#clone(this.#data.position); }
    set position(p) {
        const x = (p?.x) | 0, y = (p?.y) | 0;
        this.#data.position = { x, y };
    }
    get x() { return this.#data.position.x; }
    set x(n) { this.#data.position.x = n | 0; }
    get y() { return this.#data.position.y; }
    set y(n) { this.#data.position.y = n | 0; }

    // ---------- actions (mutating helpers) ----------
    moveBy(dx, dy) {
        this.#data.position.x += dx | 0;
        this.#data.position.y += dy | 0;
        return this;
    }

    clampToBounds(minX, minY, maxX, maxY) {
        this.x = Character.#clamp(this.x, minX, maxX);
        this.y = Character.#clamp(this.y, minY, maxY);
        return this;
    }

    addItem(item) {
        this.#data.inventory.push(Character.#clone(item));
        return this;
    }
    removeItem(predicate) {
        this.#data.inventory = this.#data.inventory.filter(i => !predicate(i));
        return this;
    }

    takeDamage(n) { this.hp = this.hp - Math.max(0, n | 0); return this; }
    heal(n) { this.hp = this.hp + Math.max(0, n | 0); return this; }
    spendMp(n) { this.mp = this.mp - Math.max(0, n | 0); return this; }
    gainMp(n) { this.mp = this.mp + Math.max(0, n | 0); return this; }
}

const world_config = {
    width: 1600,
    height: 900,
    grid_size: 40
}

class GameState {
    clientData;
    constructor() {
        this.clientData = { characters: [] };
    }
}

// Entry point: sets up Phaser and starts the game
function gameMain() {
    const config = {
        type: Phaser.AUTO,
        width: 1600,
        height: 900,
        backgroundColor: '#7ec850',
        parent: 'game-container',
        scene: [createScene()]
    };
    new Phaser.Game(config);
}

function createScene() {
    return {
        create: createGameObjects,
        update: updateGame
    };
}


// Sync client and server character data
function updateGameServer(scene, serverGameState) {
    if (!scene.gameState)
        scene.gameState = new GameState();

    if (!scene.gameState.clientData)
        scene.gameState.clientData = { characters: [] };

    const users = serverGameState.users;
    clientChars = scene.gameState.clientData.characters;
    console.log("current clients:", clientChars);

    // Update or add client characters to match server data
    for (const [id, serverCharData] of Object.entries(users)) {
        let clientCharacter = clientChars.find(c => c.id == id);
        if (!clientCharacter) {
            const char = new Character(serverCharData);
            clientCharacter = { id: id, character: char, sprite: null };
            clientChars.push(clientCharacter);
            console.log("Added new client character:", clientCharacter);
        } else {
            // Update all relevant properties
            clientCharacter.character.position = serverCharData.position;
            clientCharacter.character.hp = serverCharData.hp;
            clientCharacter.character.mp = serverCharData.mp;
            clientCharacter.character.inventory = serverCharData.inventory;
            clientCharacter.character.level = serverCharData.level;
            clientCharacter.character.maxHp = serverCharData.maxHp;
            clientCharacter.character.maxMp = serverCharData.maxMp;
            clientCharacter.character.attack = serverCharData.attack;
            clientCharacter.character.defense = serverCharData.defense;
            clientCharacter.character.speed = serverCharData.speed;
            clientCharacter.character.exp = serverCharData.exp;
            clientCharacter.character.gold = serverCharData.gold;
            clientCharacter.character.size = serverCharData.size;
            clientCharacter.character.name = serverCharData.name;
            console.log("Updated client character:", clientCharacter);
        }
    }

    // Remove client characters that no longer exist on the server
    for (let i = clientChars.length - 1; i >= 0; i--) {
        if (!users[clientChars[i].id]) {
            console.log("Removing client character:", clientChars[i]);
            if (clientChars[i].sprite) clientChars[i].sprite.destroy();
            clientChars.splice(i, 1);
        }
    }
}

// Game object setup
function createGameObjects() {
    window.activeScene = this;     // <-- keep a global pointer to the scene
    // Draw grid
    const gridGraphics = this.add.graphics();
    gridGraphics.lineStyle(1, '#110101ff', 0.5);
    for (let x = 0; x <= 1600; x += world_config.grid_size) {
        gridGraphics.beginPath();
        gridGraphics.moveTo(x, 0);
        gridGraphics.lineTo(x, 900);
        gridGraphics.strokePath();
    }
    for (let y = 0; y <= 900; y += world_config.grid_size) {
        gridGraphics.beginPath();
        gridGraphics.moveTo(0, y);
        gridGraphics.lineTo(1600, y);
        gridGraphics.strokePath();
    }
    gridGraphics.setDepth(1);

    // Statue setup
    this.statue = this.add.rectangle(400, 300, 40, 40, 0x888888).setStrokeStyle(2, 0xffffff);
    this.statue.setDepth(10);

    // Create HUD text display
    this.statsText = this.add.text(16, 16, '', {
        font: '16px monospace',
        fill: '#fff',
        backgroundColor: '#222',
        padding: { left: 8, right: 8, top: 8, bottom: 8 },
        fixedWidth: 300,
        fixedHeight: 220,
        align: 'left'
    });
    this.statsText.setScrollFactor(0);
    this.statsText.setDepth(1000);
    this.statsText.setVisible(false);

    // Interaction prompt
    this.interactText = this.add.text(0, 0, '', {
        font: '18px monospace',
        fill: '#ffff00',
        backgroundColor: '#222',
        padding: { left: 8, right: 8, top: 8, bottom: 8 },
        align: 'center'
    });
    this.interactText.setScrollFactor(0);
    this.interactText.setDepth(1001);
    this.interactText.setVisible(false);

    server_fetchAndUpdate(this);
}

// Game update loop
function updateGame() {
    const clientChars = this.gameState?.clientData?.characters;
    for (clientCharacter of clientChars) {
        character = clientCharacter.character;
        if (!character)
            continue;

        const position = character.position;
        if (!clientCharacter.sprite) {
            clientCharacter.sprite = this.add.circle(position.x + world_config.grid_size * .5, position.y + world_config.grid_size * .5, 20, 0x3498db);
            console.log("Added new sprite for character:", clientCharacter);
        }

        clientCharacter.sprite.x = position.x + world_config.grid_size * 0.5;
        clientCharacter.sprite.y = position.y + world_config.grid_size * 0.5;
    }

    updateCharacter.call(this);
}

function handleInput(character, direction) {
    let dx = 0, dy = 0;
    switch (direction) {
        case Direction.LEFT:
            dx -= world_config.grid_size;
            break;
        case Direction.RIGHT:
            dx += world_config.grid_size;
            break;
        case Direction.UP:
            dy -= world_config.grid_size;
            break;
        case Direction.DOWN:
            dy += world_config.grid_size;
            break;
        default:
            break;
    }
    if (dx !== 0 || dy !== 0) {
        character.x = Math.round((character.x + dx) / world_config.grid_size) * world_config.grid_size;
        character.y = Math.round((character.y + dy) / world_config.grid_size) * world_config.grid_size;
    }
};

function updateCharacter() {
    if (!this.character) {
        return;
    }

    // this.statsText.setVisible(true);
    this.cameras.main.setBounds(0, 0, world_config.width, world_config.height);
    this.cameras.main.startFollow(this.character.sprite, true, 0.1, 0.1);

    const stats = this.character.snapshot();
    let statsStr = '';
    for (const key in stats) {
        if (typeof stats[key] === 'object') {
            statsStr += `${key}: ${JSON.stringify(stats[key])}\n`;
        } else {
            statsStr += `${key}: ${stats[key]}\n`;
        }
    }
    this.statsText.setText(statsStr);
    this.statsText.setVisible(true);
}

// Fetch server data and update game state
function server_fetchAndUpdate(scene) {
    const serverData = sup.get("server_data");
    console.log("Fetched server data:", serverData);
    updateGameServer(scene, serverData);
}

function server_setServerData(newGameState) {
    console.log("Setting server data:", newGameState);
    sup.set("server_data", newGameState);
}

function moveCharacter(scene, direction) {
    let dx = 0, dy = 0;
    switch (direction) {
        case Direction.LEFT:  dx -= world_config.grid_size; break;
        case Direction.RIGHT: dx += world_config.grid_size; break;
        case Direction.UP:    dy -= world_config.grid_size; break;
        case Direction.DOWN:  dy += world_config.grid_size; break;
    }

    const userId = 1;
    const serverData = sup.get("server_data");
    const charData = serverData.users[userId];
    if (charData) {
        charData.position.x = Math.round((charData.position.x + dx) / world_config.grid_size) * world_config.grid_size;
        charData.position.y = Math.round((charData.position.y + dy) / world_config.grid_size) * world_config.grid_size;
    }

    server_setServerData(serverData);
    server_fetchAndUpdate(scene); 
}