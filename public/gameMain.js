
/// SUP START

// ---- CONSTANTS ----
const WORLD_CONFIG = {
    width: 1600,
    height: 900,
    grid_size: 40,
};

const Direction = {
    UP: "up",
    DOWN: "down",
    LEFT: "left",
    RIGHT: "right",
};

const DEFAULT_STATS = {
    level: 1,
    hp: 100,
    maxHp: 100,
    intelligence: 0,
    might: 0,
    agility: 0,
    exp: 0,
    gold: 0,
};

const USER_STORE_KEYS = {
    position: "pos",
    stats: "stats",
    inventory: "inv",
    skillpoints: "sp",
    displayName: "displayName",
};

// ---- SERVER STORE ----
const SERVER_STORE_KEYS = {
    users: "ul",
};

// ---- HELPERS ----
function getUserId() {
    return sup.user.id;
}

function getGlobalUserKey(key, userId = getUserId()) {
    return sup.global.get(userId + "##" + key);
}

function setGlobalUserKey(key, value, userId = getUserId()) {
    return sup.global.set(userId + "##" + key, value);
}

// ---- USER STORE ----
const UserStore = {
    getUserId() {
        return sup.user.id;
    },

    createUser() {
        // local/user scoped values
        sup.user.set(USER_STORE_KEYS.skillpoints, 3);
        sup.user.set(USER_STORE_KEYS.inventory, []);

        // per-user globals so the server snapshot can read them
        setGlobalUserKey(USER_STORE_KEYS.stats, {
            ...DEFAULT_STATS
        });
        setGlobalUserKey(USER_STORE_KEYS.displayName, sup.user.displayName);

        const defaultPosition = {
            x: 200,
            y: 150
        };
        this.setPosition(defaultPosition);
    },

    getDisplayName(userId = UserStore.getUserId()) {
        return getGlobalUserKey(USER_STORE_KEYS.displayName, userId);
    },

    getPosition(userId = getUserId()) {
        const positionMarker = this.getPositionMarker(userId);
        if (!positionMarker) return null;
        return positionMarker.position;
    },

    getPositionMarker(userId = getUserId()) {
        return getGlobalUserKey(USER_STORE_KEYS.position, userId);
    },

    setPosition(position, userId = getUserId()) {
        const positionMarker = {
            position,
            timestamp: Date.now(),
        };
        setGlobalUserKey(USER_STORE_KEYS.position, positionMarker, userId);
    },

    move(direction) {
        let dx = 0;
        let dy = 0;

        switch (direction) {
            case Direction.LEFT:
                dx -= WORLD_CONFIG.grid_size;
                break;
            case Direction.RIGHT:
                dx += WORLD_CONFIG.grid_size;
                break;
            case Direction.UP:
                dy -= WORLD_CONFIG.grid_size;
                break;
            case Direction.DOWN:
                dy += WORLD_CONFIG.grid_size;
                break;
        }

        const gridSize = WORLD_CONFIG.grid_size;
        let position = this.getPosition() || {
            x: 0,
            y: 0
        };

        position.x = Math.round((position.x + dx) / gridSize) * gridSize;
        position.y = Math.round((position.y + dy) / gridSize) * gridSize;

        this.setPosition(position);
    },

    getStats(userId = getUserId()) {
        return getGlobalUserKey(userId, USER_STORE_KEYS.stats);
    },

    getSkillpoints() {
        return sup.user.get(USER_STORE_KEYS.skillpoints);
    },

    allocateSkillPoint(stat) {
        let skillPoints = this.getSkillpoints() ?? 0;
        if (skillPoints <= 0) return;

        let stats = this.getStats() || {
            ...DEFAULT_STATS
        };

        switch (stat) {
            case "intelligence":
                stats.intelligence += 1;
                break;
            case "might":
                stats.might += 1;
                break;
            case "agility":
                stats.agility += 1;
                break;
            default:
                return; // unknown stat, do nothing
        }

        skillPoints -= 1;

        setGlobalUserKey(USER_STORE_KEYS.stats, stats);
        sup.user.set(USER_STORE_KEYS.skillpoints, skillPoints);
    },
};

const ServerStore = {
    reset() {
        sup.global.set(SERVER_STORE_KEYS.users, []);
    },

    createUser() {
        const userId = sup.user.id;
        const users = sup.global.get(SERVER_STORE_KEYS.users) || [];
        if (!users.includes(userId)) {
            users.push(userId);
            sup.global.set(SERVER_STORE_KEYS.users, users);
            UserStore.createUser();
        }
    },

    getSnapshot(currentUserId = getUserId()) {
        const users = sup.global.get(SERVER_STORE_KEYS.users) || [];
        const scene = [];
        const sceneById = {};

        // Build global scene for everyone
        for (let i = 0; i < users.length; i++) {
            const uid = users[i];

            const posMarker = getGlobalUserKey(USER_STORE_KEYS.position, uid) || null;
            const position = posMarker?.position || {
                x: 200,
                y: 150
            };

            const name = getGlobalUserKey(USER_STORE_KEYS.displayName, uid) || "ERROR";

            const entry = {
                userId: uid,
                name,
                position,
                updatedAt: posMarker?.timestamp || null,
            };

            scene.push(entry);
            sceneById[uid] = entry;
        }

        // Separate: enrich current user with local-only data
        const currentStats =
            getGlobalUserKey(USER_STORE_KEYS.stats, currentUserId) || {
                ...DEFAULT_STATS
            };
        const currentPosition =
            UserStore.getPosition(currentUserId) || {
                x: 200,
                y: 150
            };

        const currentUser = {
            userId: currentUserId,
            name: UserStore.getDisplayName(currentUserId),
            position: currentPosition,
            stats: currentStats,
            skillpoints: UserStore.getSkillpoints() ?? 0,
            inventory: sup.user.get(USER_STORE_KEYS.inventory) || [],
        };

        return {
            timestamp: Date.now(),
            users,
            scene, // array for rendering all players
            sceneById, // map for O(1) lookups
            currentUser,
        };
    },

    debug: {
        createMockUser(character, isPlayer) {
            setGlobalUserKey(USER_STORE_KEYS.displayName, character.displayName, character.userId);
            setGlobalUserKey(USER_STORE_KEYS.position, {
                position: { ...character.position },
                timestamp: Date.now(),
            }, character.userId);
            setGlobalUserKey(USER_STORE_KEYS.stats, { ...DEFAULT_STATS, ...character.stats }, character.userId);

            if (isPlayer) {
                sup.user.set(USER_STORE_KEYS.skillpoints, character.skillpoints);
                sup.user.set(USER_STORE_KEYS.inventory, [...character.inventory]);

                sup.user.id = "u_123";
                sup.user.displayName = "Alice";
            }

            const users = sup.global.get(SERVER_STORE_KEYS.users) || [];
            users.push(character.userId);
            sup.global.set(SERVER_STORE_KEYS.users, users);
            
        }
    }
};

// SUP END
class Character {
    constructor({ userid, name, position }) {
        this.userid = userid;
        this.name = name;
        this.position = position;
        this.size = 20; // default size
    }
}


class ClientStore {
    snapshot = null;
    userId = null;
    local = {
        userId: null,
        player: null,
        characters: []
    };

    applySnapshot(snapshot, userId) {
        if (!snapshot || !Array.isArray(snapshot.scene)) {
            console.warn("No server scene provided to applySnapshot");
            return;
        }

        // Ignore stale or duplicate snapshots
        if (this.snapshot && this.snapshot.timestamp >= snapshot.timestamp) return;

        this.userId = userId;
        this.snapshot = snapshot;

        // Ensure local shape
        if (!this.local) this.local = { userId: null, player: null, characters: [] };
        if (!Array.isArray(this.local.characters)) this.local.characters = [];

        const serverScene = snapshot.scene;
        const serverSceneById = snapshot.sceneById || {};

        // Build a fast index of local characters
        const localCharacters = this.local.characters;
        const localById = new Map(localCharacters.map((c) => [c.id, c]));

        // Upsert characters from server
        for (let i = 0; i < serverScene.length; i++) {
            const s = serverScene[i];
            const uid = s.userId;
            const px = (s.position?.x ?? 0) | 0;
            const py = (s.position?.y ?? 0) | 0;

            let localCharacter = localById.get(uid);
            if (!localCharacter) {
                const charData = {
                    userid: uid,
                    name: s.name,
                    position: { x: px, y: py },
                };
                const char = new Character(charData);
                localCharacter = { id: uid, character: charData, sprite: null, nameplate: null };
                localCharacters.push(localCharacter);
                localById.set(uid, localCharacter);
            } else {
                localCharacter.character.name = s.name;
                localCharacter.character.position = { x: px, y: py };
            }
        }

        // Remove locals that no longer exist server-side
        for (let i = localCharacters.length - 1; i >= 0; i--) {
            const uid = localCharacters[i].id;
            if (!serverSceneById[uid]) {
                localCharacters[i].sprite?.destroy?.();
                localCharacters[i].nameplate?.destroy?.();
                localCharacters.splice(i, 1);
            }
        }

        // Optional: wire quick references
        this.local.userId = this.userId;
        this.local.player = localCharacters.find((c) => c.id === this.userId) || null;
    }
}

function gameMain(initialServerData, userId) {
    const config = {
        type: Phaser.AUTO,
        width: 1600,
        height: 900,
        backgroundColor: '#7ec850',
        parent: 'game-container',
        scene: [createScene(initialServerData, userId)]
    };
    new Phaser.Game(config);
}

function createScene(initialServerData, userId) {
    return {
        create() {
            window.activeScene = this;
            this.clientStore = new ClientStore();
            this.clientStore.applySnapshot(initialServerData, userId);

            createGameObjects.call(this);

        },
        update: updateGame
    };
}

// Game object setup
function createGameObjects() {
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
}


// Game update loop
function updateGame() {
    const clientChars = this.clientStore.local.characters;
    for (const clientCharacter of clientChars) {
        const character = clientCharacter.character;
        if (!clientCharacter.character)
            continue;

        const position = character.position;
        if (!clientCharacter.sprite) {
            clientCharacter.sprite = this.add.circle(position.x + WORLD_CONFIG.grid_size * .5, position.y + WORLD_CONFIG.grid_size * .5, character.size || 20, 0x3498db);
            console.log("Added new sprite for character:", clientCharacter);
        }

        clientCharacter.sprite.x = position.x + WORLD_CONFIG.grid_size * 0.5;
        clientCharacter.sprite.y = position.y + WORLD_CONFIG.grid_size * 0.5;
        // Create nameplate if missing
        if (!clientCharacter.nameplate) {
            clientCharacter.nameplate = this.add.text(0, 0, character.name, {
                font: '14px monospace',
                fill: '#fff',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: { left: 4, right: 4, top: 2, bottom: 2 },
                align: 'center'
            });
            clientCharacter.nameplate.setDepth(1002);
        }
        // Position nameplate above sprite
        clientCharacter.nameplate.x = clientCharacter.sprite.x - clientCharacter.nameplate.width / 2;
        clientCharacter.nameplate.y = clientCharacter.sprite.y - (character.size || 20) - clientCharacter.nameplate.height - 4;

        // Update name if changed
        if (clientCharacter.nameplate.text !== character.name) {
            clientCharacter.nameplate.setText(character.name);
        }
    }
    updateCharacter.call(this);
}

function updateCharacter() {
    if (!this.character) {
        return;
    }

    this.cameras.main.setBounds(0, 0, world_config.width * 1.5, world_config.height * 1.5);
    this.cameras.main.startFollow(this.character.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(3);
    this.cameras.main.roundPixels = true;
}

function MockMove(scene, direction) {
    UserStore.move(direction);
    const snapshot = ServerStore.getSnapshot();
    scene.clientStore.applySnapshot(snapshot, scene.clientStore.userId);
    updateGame.call(scene);
}
