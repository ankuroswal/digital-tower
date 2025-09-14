class Character {
  #data;

  constructor(data = {}) {
    this.#data = Character.#normalize(data);
  }

  // ---------- defaults & helpers ----------
  static defaults() {
    return {
      name: 'Hero',
      level: 1,
      hp: 100, maxHp: 100,
      mp: 30,  maxMp: 30,
      attack: 10,
      defense: 8,
      speed: 2,
      exp: 0,
      gold: 0,
      inventory: [],
      position: { x: 200, y: 150 },
      size: 20, // <- radius for the circle
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
  toJSON()   { return this.snapshot(); }

  // ---------- getters / setters ----------
  get name()  { return this.#data.name; }
  set name(v) { this.#data.name = String(v); }

  get level()     { return this.#data.level; }
  set level(n)    { this.#data.level = Math.max(1, n|0); }

  get hp()        { return this.#data.hp; }
  set hp(n)       { this.#data.hp = Character.#clamp(n|0, 0, this.#data.maxHp); }

  get maxHp()     { return this.#data.maxHp; }
  set maxHp(n)    {
    this.#data.maxHp = Math.max(1, n|0);
    this.hp = this.#data.hp; // re-clamp
  }

  get mp()        { return this.#data.mp; }
  set mp(n)       { this.#data.mp = Character.#clamp(n|0, 0, this.#data.maxMp); }

  get maxMp()     { return this.#data.maxMp; }
  set maxMp(n)    {
    this.#data.maxMp = Math.max(0, n|0);
    this.mp = this.#data.mp; // re-clamp
  }

  get attack()    { return this.#data.attack; }
  set attack(n)   { this.#data.attack = n|0; }

  get defense()   { return this.#data.defense; }
  set defense(n)  { this.#data.defense = n|0; }

  get speed()     { return this.#data.speed; }
  set speed(n)    { this.#data.speed = n|0; }

  get exp()       { return this.#data.exp; }
  set exp(n)      { this.#data.exp = Math.max(0, n|0); }

  get gold()      { return this.#data.gold; }
  set gold(n)     { this.#data.gold = Math.max(0, n|0); }

  get size()      { return this.#data.size; }
  set size(n)     { this.#data.size = Math.max(1, n|0); }

  // Position proxies
  get position()  { return Character.#clone(this.#data.position); }
  set position(p) {
    const x = (p?.x)|0, y = (p?.y)|0;
    this.#data.position = { x, y };
  }
  get x()         { return this.#data.position.x; }
  set x(n)        { this.#data.position.x = n|0; }
  get y()         { return this.#data.position.y; }
  set y(n)        { this.#data.position.y = n|0; }

  get inventory() { return this.#data.inventory.map(Character.#clone); }

  // ---------- actions (mutating helpers) ----------
  moveBy(dx, dy) {
    this.#data.position.x += dx|0;
    this.#data.position.y += dy|0;
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

  takeDamage(n) { this.hp = this.hp - Math.max(0, n|0); return this; }
  heal(n)       { this.hp = this.hp + Math.max(0, n|0); return this; }
  spendMp(n)    { this.mp = this.mp - Math.max(0, n|0); return this; }
  gainMp(n)     { this.mp = this.mp + Math.max(0, n|0); return this; }
}

// Entry point: sets up Phaser and starts the game
function gameMain() {
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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

// Game object setup
function createGameObjects() {
  this.character = new Character(Character.defaults());
  this.ball = this.add.circle(this.character.x, this.character.y, this.character.size, 0x3498db);
  this.cursors = this.input.keyboard.createCursorKeys();
  this.speed = this.character.speed;

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

  updateStatsText.call(this);

  // Center camera on character
  this.cameras.main.setBounds(0, 0, 800, 600);
  this.cameras.main.startFollow(this.ball, true, 0.1, 0.1);
}

// Game update loop
function updateGame() {
    const cursors = this.cursors;
    const speed = this.speed;

    // Move character and sync ball
    handleInput(this.character, cursors, speed);
    this.character.clampToBounds(20, 20, 780, 580);
    this.ball.x = this.character.x;
    this.ball.y = this.character.y;

    updateStatsText.call(this);

    // Statue interaction logic
    const dist = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.statue.x, this.statue.y);
    if (dist < 60) {
      this.interactText.setText('Press [E] to interact with the statue');
      this.interactText.setPosition(this.statue.x - 120, this.statue.y - 60);
      this.interactText.setVisible(true);
    } else {
      this.interactText.setVisible(false);
    }

    // Expose UI state
    window.gameUIState = {
      canInteract: this.interactText.visible,
      interactionText: this.interactText.visible ? this.interactText.text : '',
    };
}

// --- Helper functions ---
function handleInput(character, cursors, speed) {
  let dx = 0, dy = 0;
  if (cursors.left.isDown)  dx -= speed;
  if (cursors.right.isDown) dx += speed;
  if (cursors.up.isDown)    dy -= speed;
  if (cursors.down.isDown)  dy += speed;
  character.moveBy(dx, dy);
}

function updateStatsText() {
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
}
