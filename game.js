// =============================================================
//  OPERATION: FREEDOM FORCE  — a Contra-style parody run-and-gun
//  Stage 1 (8-bit classic): The Donald vs "Barack O."
//  Stage 2 (neon-tech):      new moves — slide / kick / charge shots
//  Phaser 3 · zero build step · procedural pixel-art sprites
// =============================================================

const GAME_W = 480, GAME_H = 270;
const WORLD_W = 3600, GROUND_TOP = 240;
const BULLET_SPEED = 430, ENEMY_BULLET_SPEED = 165;
const SPIN_SPEED = 12;                 // somersault spin (rad/s)
const SLIDE_SPEED = 260, SLIDE_TIME = 420, SLIDE_CD = 260;  // ms
const KICK_CD = 360, KICK_RANGE = 24;
const CHARGE_TIME = 600;               // ms held for a full charge shot

// ---------- THE BEAST (rideable carriage) ----------
const CAR_ARMOR = 8;                   // shells the carriage soaks before it blows
const CAR_SPEED = 205;                 // faster than on foot (145)
const CAR_JUMP = -290;                 // heavier hop than the Donald's -335
const CAR_FIRE_CD = 300;               // cannon cadence
const CAR_SHELL_SPEED = 500;
const CAR_SHELL_DMG = 3;
const CAR_MOUNT_RANGE = 34;

// ---------- Level data (Stage 1 = classic, Stage 2 = enhanced) ----------
const LEVELS = [
  {
    theme: 'city', enhanced: false,
    plats: [[380,190,110],[640,158,90],[860,200,80],[1080,165,120],[1320,148,90],
            [1540,195,90],[1780,160,110],[2020,185,100],[2280,150,90],[2540,190,120],[2820,160,100]],
    grunts: [[500,210],[780,210],[1000,150],[1240,210],[1480,140],[1700,210],
             [1940,175],[2180,210],[2440,140],[2680,210],[2960,150]],
    boss: { key: 'obama', name: 'BARACK O.', hp: 10 },
    carriage: 900,
  },
  {
    theme: 'neon', enhanced: true,
    plats: [[360,185,90],[560,150,80],[760,200,90],[980,160,110],[1240,150,90],
            [1460,190,80],[1680,155,100],[1920,180,90],[2160,145,90],[2420,185,110],[2700,155,100],[2980,180,90]],
    grunts: [[520,210],[720,150],[940,210],[1180,150],[1420,210],[1640,150],
             [1880,175],[2120,210],[2380,140],[2620,210],[2880,150],[3080,210]],
    boss: { key: 'robo', name: 'OMEGA AGENT', hp: 16 },
    carriage: 760,
  },
  {
    theme: 'marble', enhanced: true,
    plats: [[340,190,100],[540,152,90],[740,196,90],[940,158,110],[1180,144,90],
            [1400,192,90],[1620,150,110],[1860,182,90],[2100,140,100],[2340,188,110],
            [2600,150,100],[2860,184,90],[3100,146,100]],
    grunts: [[480,210],[700,150],[900,210],[1120,145],[1360,210],[1580,150],
             [1820,175],[2060,210],[2300,140],[2540,210],[2800,150],[3040,185],[3220,210]],
    boss: { key: 'idol', name: 'THE GOLDEN IDOL', hp: 22 },
    carriage: 620,
  },
];

// ---------- tiny color helper ----------
function shade(hex, amt) {
  const c = hex.replace('#', '');
  let r = parseInt(c.substr(0, 2), 16) + amt;
  let g = parseInt(c.substr(2, 2), 16) + amt;
  let b = parseInt(c.substr(4, 2), 16) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// draw a beveled, shaded box (top-left light, bottom-right shadow) — the 16-bit look
function shbox(ctx, x, y, w, h, base) {
  x = Math.round(x); y = Math.round(y); w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  ctx.fillStyle = base; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = shade(base, 34); ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
  ctx.fillStyle = shade(base, -34); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
}

// ---------- procedural SHADED humanoid (draws facing RIGHT) ----------
function drawHumanoid(ctx, o) {
  const { w, h, skin, hair, suit, tie, pants = suit, shoe = '#141414', hairStyle = 'short', eye = '#20140a', frame = 0 } = o;
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const R = (x, y, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(ww)), Math.max(1, Math.round(hh))); };

  const headW = Math.round(w * 0.50), headH = Math.round(h * 0.26);
  const headX = Math.round(cx - headW / 2), headY = Math.round(h * 0.10);
  const torsoW = Math.round(w * 0.62), torsoH = Math.round(h * 0.40);
  const torsoX = Math.round(cx - torsoW / 2), torsoY = headY + headH;
  const legY = torsoY + torsoH, legH = h - legY, legW = Math.round(torsoW * 0.34);

  // legs (shaded) + shoes
  const sp = frame === 1 ? legW * 0.7 : legW * 0.05;
  shbox(ctx, cx - sp - legW, legY, legW, legH - 2, pants);
  shbox(ctx, cx + sp, legY, legW, legH - 2, pants);
  shbox(ctx, cx - sp - legW, legY + legH - 3, legW + 1, 3, shoe);
  shbox(ctx, cx + sp, legY + legH - 3, legW + 1, 3, shoe);

  // torso (shaded suit) + lapels + shirt + tie
  shbox(ctx, torsoX, torsoY, torsoW, torsoH, suit);
  R(torsoX + 2, torsoY + 1, 2, torsoH * 0.55, shade(suit, -34));
  R(torsoX + torsoW - 4, torsoY + 1, 2, torsoH * 0.55, shade(suit, -34));
  R(cx - 2, torsoY + 1, 4, torsoH * 0.85, '#f2f2f2');
  R(cx - 1, torsoY + 1, 2, torsoH * 0.78, tie);
  R(cx - 1, torsoY + 1, 1, torsoH * 0.5, shade(tie, 45));            // tie highlight
  R(cx, torsoY + torsoH * 0.55, 1, 1, shade(suit, 45));             // button glint

  // head (shaded) + face detail
  shbox(ctx, headX, headY, headW, headH, skin);
  R(headX + headW - 2, headY + 1, 2, headH - 2, shade(skin, -26));   // shaded cheek
  R(headX + 1, headY + headH * 0.32, 2, 2, shade(skin, 28));         // lit cheek
  R(headX - 1, headY + headH * 0.44, 1, 3, shade(skin, -14));        // ears
  R(headX + headW, headY + headH * 0.44, 1, 3, shade(skin, -22));
  R(headX + headW * 0.26, headY + headH * 0.5, 2, 2, eye);
  R(headX + headW * 0.60, headY + headH * 0.5, 2, 2, eye);
  R(headX + headW * 0.34, headY + headH * 0.78, headW * 0.34, 1, shade(skin, -34)); // mouth

  // hair (shaded + sheen)
  if (hairStyle === 'swoop') {          // The Donald: big yellow sweep
    shbox(ctx, headX - 2, headY - h * 0.055, headW + 3, h * 0.11, hair);
    R(headX - 2, headY, 2, headH * 0.55, hair);
    R(headX + headW, headY, 2, headH * 0.30, hair);
    R(headX, headY - h * 0.028, headW * 0.7, 1, shade(hair, 50));
  } else {                               // short crop / helmet
    shbox(ctx, headX - 1, headY - h * 0.02, headW + 2, h * 0.07, hair);
    R(headX - 1, headY, 1, headH * 0.55, hair);
    R(headX + headW, headY, 1, headH * 0.55, hair);
    R(headX, headY - h * 0.004, headW * 0.5, 1, shade(hair, 44));
  }

  // arm + metallic gun
  const armY = torsoY + torsoH * 0.28;
  shbox(ctx, torsoX + torsoW - 2, armY, w * 0.22, torsoH * 0.20, skin);
  shbox(ctx, cx + w * 0.28, armY - 1, w * 0.30, torsoH * 0.26, '#3a3f47');
  R(cx + w * 0.55, armY, w * 0.16, torsoH * 0.12, '#9aa0a8');
}

// ---------- THE BEAST: the Donald's gilded armored carriage ----------
// Drawn facing RIGHT, same convention as the humanoids.
const CAR_W = 52, CAR_H = 30;
function drawCarriage(ctx, frame) {
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };
  const GOLD = '#c9921c', HI = '#ffe27a', LO = '#7a5810', PLATE = '#a8790f';
  const IRON = '#3a3f47', IRON_HI = '#767d88', GLASS = '#16243f';

  // ---- wheels (armoured, spokes spin between frames) ----
  const wheel = (cx, cy) => {
    ctx.save(); ctx.translate(cx, cy);
    ctx.fillStyle = '#15181d'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = IRON;      ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(frame ? Math.PI / 4 : 0);
    ctx.fillStyle = HI;
    for (let i = 0; i < 4; i++) { ctx.fillRect(-0.7, -4, 1.4, 8); ctx.rotate(Math.PI / 4); }
    ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  wheel(14, 24); wheel(38, 24);

  // ---- chassis / armour skirt ----
  shbox(ctx, 6, 19, 40, 5, PLATE);
  R(6, 19, 40, 1, HI);
  for (let x = 8; x < 44; x += 6) R(x, 21, 3, 2, LO);          // rivet dither

  // ---- main body ----
  shbox(ctx, 7, 8, 38, 12, GOLD);
  R(7, 8, 38, 1, HI);                                          // lit roofline
  R(7, 8, 1, 12, HI);                                          // lit left edge
  R(44, 9, 1, 11, LO);                                         // shadowed right edge
  R(9, 17, 34, 1, LO);                                         // lower shade band

  // ---- armoured glass + a very small Donald at the wheel ----
  R(11, 10, 14, 7, GLASS);
  R(11, 10, 14, 1, '#31507f');                                 // glare
  R(15, 12, 5, 4, '#e3a86b');                                  // face
  R(15, 11, 6, 2, '#f4d43a');                                  // hair
  R(21, 11, 2, 1, '#f4d43a');                                  // swoop
  R(16, 13, 1, 1, '#1b1b1b'); R(18, 13, 1, 1, '#1b1b1b');      // eyes

  // ---- rear cargo: gilded strongboxes ----
  shbox(ctx, 27, 11, 7, 6, '#8c6a14');
  shbox(ctx, 34, 12, 6, 5, '#8c6a14');
  R(28, 13, 5, 1, HI); R(35, 14, 4, 1, HI);

  // ---- cannon ----
  shbox(ctx, 24, 3, 14, 5, IRON);
  R(24, 3, 14, 1, IRON_HI);
  shbox(ctx, 38, 4, 11, 3, IRON);
  R(49, 4, 2, 3, '#1d2026');                                   // muzzle
  R(26, 5, 3, 2, GOLD);                                        // gilded collar

  // ---- ram / plough ----
  ctx.fillStyle = IRON;
  ctx.beginPath(); ctx.moveTo(45, 10); ctx.lineTo(52, 19); ctx.lineTo(45, 23); ctx.closePath(); ctx.fill();
  ctx.fillStyle = IRON_HI;
  ctx.beginPath(); ctx.moveTo(45, 10); ctx.lineTo(52, 19); ctx.lineTo(48, 19); ctx.closePath(); ctx.fill();
  R(45, 12, 1, 10, HI);

  // ---- pennant ----
  R(9, 0, 1, 9, '#d8d8d8');
  R(10, 1, 8, 4, '#d21f1f');
  R(10, 1, 8, 1, '#ff6a5a');
}

function makeCarriage(scene, key, frame) {
  const tex = scene.textures.createCanvas(key, CAR_W, CAR_H);
  drawCarriage(tex.context, frame);
  tex.refresh();
}

function makeChar(scene, key, o) {
  const tex = scene.textures.createCanvas(key, o.w, o.h);
  drawHumanoid(tex.context, o);
  tex.refresh();
}

// =============================================================
//  BOOT — generate all textures + animations
// =============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const trump = { w: 20, h: 28, skin: '#e3a86b', hair: '#f4d43a', hairStyle: 'swoop', suit: '#1b2a4a', tie: '#d21f1f', pants: '#22345a' };
    makeChar(this, 'trump0', { ...trump, frame: 0 });
    makeChar(this, 'trump1', { ...trump, frame: 1 });

    const grunt = { w: 20, h: 28, skin: '#c98a5a', hair: '#2b2b2b', hairStyle: 'short', suit: '#3c4a28', tie: '#3c4a28', pants: '#2e3a20' };
    makeChar(this, 'grunt0', { ...grunt, frame: 0 });
    makeChar(this, 'grunt1', { ...grunt, frame: 1 });

    const obama = { w: 40, h: 56, skin: '#7c5236', hair: '#141414', hairStyle: 'short', suit: '#5a616e', tie: '#2f6fb0', pants: '#464c58' };
    makeChar(this, 'obama0', { ...obama, frame: 0 });
    makeChar(this, 'obama1', { ...obama, frame: 1 });

    // Stage 2 boss — a chrome cyber-agent with a red visor
    const robo = { w: 44, h: 60, skin: '#b9c2cc', hair: '#5a6473', hairStyle: 'short', suit: '#33405a', tie: '#ff3b3b', pants: '#28324a', eye: '#ff3b3b' };
    makeChar(this, 'robo0', { ...robo, frame: 0 });
    makeChar(this, 'robo1', { ...robo, frame: 1 });

    // Stage 3 boss — a gilded colossus
    const idol = { w: 46, h: 62, skin: '#d9a521', hair: '#ffe27a', hairStyle: 'swoop', suit: '#8c6a14', tie: '#d21f1f', pants: '#6b500f', eye: '#ffffff' };
    makeChar(this, 'idol0', { ...idol, frame: 0 });
    makeChar(this, 'idol1', { ...idol, frame: 1 });

    // THE BEAST
    makeCarriage(this, 'car0', 0);
    makeCarriage(this, 'car1', 1);

    const g = this.add.graphics();
    // player bullet — shaded amber tracer with a white core
    g.fillStyle(0xff9e18, 1).fillRect(0, 0, 9, 4);
    g.fillStyle(0xffe14d, 1).fillRect(0, 1, 8, 2);
    g.fillStyle(0xffffff, 1).fillRect(1, 1, 4, 1);
    g.generateTexture('pbullet', 9, 4); g.clear();
    // charged bullet — glowing cyan slug
    g.fillStyle(0x1f8fe0, 1).fillRect(0, 0, 16, 7);
    g.fillStyle(0x8fd9ff, 1).fillRect(1, 1, 14, 5);
    g.fillStyle(0xffffff, 1).fillRect(3, 2, 9, 2);
    g.generateTexture('cbullet', 16, 7); g.clear();
    // enemy bullet — shaded plasma orb
    g.fillStyle(0xa82616, 1).fillCircle(4, 4, 4);
    g.fillStyle(0xff5a3c, 1).fillCircle(4, 4, 3);
    g.fillStyle(0xffd0a0, 1).fillCircle(3, 3, 1);
    g.generateTexture('ebullet', 9, 9); g.clear();
    // cannon shell — heavy iron slug with a gold band
    g.fillStyle(0x2a2f38, 1).fillRect(0, 0, 14, 6);
    g.fillStyle(0x767d88, 1).fillRect(0, 1, 13, 3);
    g.fillStyle(0xffe27a, 1).fillRect(3, 0, 3, 6);
    g.fillStyle(0xffffff, 1).fillRect(9, 2, 4, 1);
    g.generateTexture('shell', 14, 6); g.clear();
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3); g.generateTexture('spark', 3, 3); g.clear();
    g.destroy();

    this.anims.create({ key: 'trump-run', frames: [{ key: 'trump0' }, { key: 'trump1' }], frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'grunt-run', frames: [{ key: 'grunt0' }, { key: 'grunt1' }], frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'obama-run', frames: [{ key: 'obama0' }, { key: 'obama1' }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'robo-run', frames: [{ key: 'robo0' }, { key: 'robo1' }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'idol-run', frames: [{ key: 'idol0' }, { key: 'idol1' }], frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'car-roll', frames: [{ key: 'car0' }, { key: 'car1' }], frameRate: 14, repeat: -1 });

    this.scene.start('Title');
  }
}

// =============================================================
//  TITLE
// =============================================================
class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    const cx = GAME_W / 2;
    this.cameras.main.setBackgroundColor('#101826');
    this.add.text(cx, 50, 'OPERATION', { fontFamily: 'monospace', fontSize: '26px', color: '#ffd23a' }).setOrigin(0.5);
    this.add.text(cx, 80, 'FREEDOM FORCE', { fontFamily: 'monospace', fontSize: '26px', color: '#ff5a3c' }).setOrigin(0.5);
    this.add.image(cx, 142, 'trump0').setScale(3.2);
    this.add.text(cx, 188, '3 STAGES  ·  NEW MOVES  ·  RIDE THE BEAST', { fontFamily: 'monospace', fontSize: '9px', color: '#27e0e0' }).setOrigin(0.5);
    const prompt = this.add.text(cx, 214, 'PRESS ENTER  /  (A) TO START', { fontFamily: 'monospace', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(cx, 240, 'KEYBOARD:  ARROWS/WASD · SPACE jump · X shoot · DOWN+JUMP slide · V kick', { fontFamily: 'monospace', fontSize: '8px', color: '#88ffaa' }).setOrigin(0.5);
    this.add.text(cx, 252, 'XBOX PAD:  STICK/D-PAD · A jump · X shoot · DOWN+A slide · Y kick · START', { fontFamily: 'monospace', fontSize: '8px', color: '#88ffaa' }).setOrigin(0.5);
    if (CRT.available()) {
      this.add.text(cx, 264, 'C  toggle CRT filter', { fontFamily: 'monospace', fontSize: '8px', color: '#6f7d92' }).setOrigin(0.5);
    }
    CRT.apply(this);

    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Game'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Game'));
    if (this.input.gamepad) this.input.gamepad.once('down', () => this.scene.start('Game'));
  }
}

// =============================================================
//  GAME
// =============================================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.level = (data && data.level) ? data.level : 1;
    this.startScore = (data && data.score) ? data.score : 0;
  }

  create() {
    this.levelData = LEVELS[this.level - 1];
    this.enhanced = this.levelData.enhanced;

    this.gameOverFlag = false; this.won = false;
    this.score = this.startScore; this.lives = 3;
    this.facing = 1; this.nextShot = 0; this.invulnUntil = 0;
    this.jumping = false;
    this.sliding = false; this.slideUntil = 0; this.slideCdUntil = 0;
    this.chargeStart = 0; this.kickCdUntil = 0;
    this.padJumpPrev = false; this.padStartPrev = false; this.padSlidePrev = false; this.padKickPrev = false;
    this.bossStarted = false;
    this.riding = false; this.carriage = null; this.ramCdUntil = 0;

    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    CRT.apply(this);

    this.buildBackground(this.levelData.theme);

    // ---- solids (ground + platforms) ----
    const neon = this.levelData.theme === 'neon';
    this.solids = this.add.group();
    this.addSolid(WORLD_W / 2, GROUND_TOP + 18, WORLD_W, 40, neon ? 0x1c1430 : 0x4a3320);
    // shaded ground surface drawn over the ground body (lit edge + soil + dither)
    const gsurf = this.add.graphics().setDepth(1);
    gsurf.fillStyle(neon ? 0x3affff : 0x7fae4a, 1).fillRect(0, GROUND_TOP - 1, WORLD_W, 2);
    gsurf.fillStyle(neon ? 0x27173f : 0x5c4026, 1).fillRect(0, GROUND_TOP + 1, WORLD_W, 5);
    gsurf.fillStyle(neon ? 0x1a1030 : 0x3d2c19, 1);
    for (let x = 0; x < WORLD_W; x += 6) gsurf.fillRect(x + ((Math.floor(x / 6) % 2) ? 3 : 0), GROUND_TOP + 6, 3, 2);
    const platCol = neon ? 0x241a3a : 0x3a4152, platStroke = neon ? 0x27e0e0 : 0x5a6478;
    const platHi = neon ? 0x5affff : 0x8794a8;
    this.levelData.plats.forEach(pl => {
      this.addSolid(pl[0], pl[1], pl[2], 14, platCol, platStroke);
      this.add.rectangle(pl[0], pl[1] - 6, pl[2] - 2, 2, platHi).setDepth(1);   // lit top edge
    });

    // ---- groups ----
    this.pbullets = this.physics.add.group({ allowGravity: false });
    this.ebullets = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group();

    // ---- player ----
    this.player = this.physics.add.sprite(60, 180, 'trump0');
    this.player.body.setSize(12, 26).setOffset(4, 2);
    this.player.setCollideWorldBounds(true).setDepth(5);

    // ---- camera / world ----
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_H);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setFollowOffset(-60, 20);

    // ---- colliders ----
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.pbullets, this.solids, b => this.killBullet(b));
    this.physics.add.collider(this.ebullets, this.solids, b => this.killBullet(b));
    this.physics.add.overlap(this.pbullets, this.enemies, (b, e) => this.hitEnemy(b, e));
    this.physics.add.overlap(this.ebullets, this.player, (pl, b) => { this.killBullet(b); this.damagePlayer(); });
    this.physics.add.overlap(this.enemies, this.player, () => this.damagePlayer());

    // ---- grunts ----
    this.levelData.grunts.forEach(s => this.spawnGrunt(s[0], s[1]));

    // ---- THE BEAST ----
    this.mountHint = this.add.text(0, 0, '\u25b2 UP TO RIDE', { fontFamily: 'monospace', fontSize: '8px', color: '#ffd23a' })
      .setOrigin(0.5).setDepth(20).setVisible(false);
    if (this.levelData.carriage) this.spawnCarriage(this.levelData.carriage);

    // ---- input ----
    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S',
      jump: 'SPACE', jump2: 'Z', shoot: 'X', shoot2: 'J',
      kick: 'V', restart: 'R'
    });

    // ---- HUD ----
    this.hud = this.add.text(8, 6, '', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' }).setScrollFactor(0).setDepth(50);
    // Score is right-aligned: the boss health bar owns the centre strip (x 173-307),
    // and a single left-aligned HUD line ran underneath it during boss fights.
    this.scoreHud = this.add.text(466, 6, '', { fontFamily: 'monospace', fontSize: '10px', color: '#ffffff' }).setOrigin(1, 0).setScrollFactor(0).setDepth(50);
    this.beastHud = this.add.text(8, 250, '', { fontFamily: 'monospace', fontSize: '9px', color: '#88ffaa' }).setScrollFactor(0).setDepth(50).setVisible(false);
    this.updateHud();
    this.bossBarBg = this.add.rectangle(GAME_W / 2, 14, 134, 9, 0x222222).setScrollFactor(0).setDepth(50).setStrokeStyle(1, 0xffffff).setVisible(false);
    this.bossBar = this.add.rectangle(GAME_W / 2 - 65, 14, 130, 5, 0xff3b3b).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51).setVisible(false);
    this.bossLabel = this.add.text(GAME_W / 2, 26, '', { fontFamily: 'monospace', fontSize: '8px', color: '#ffd23a' }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setVisible(false);

    this.bossTriggerX = WORLD_W - 520;

    // ---- Stage 2 new-moves hint ----
    if (this.enhanced) {
      const hint = this.add.text(GAME_W / 2, 64, 'NEW MOVES!   SLIDE: DOWN+JUMP     KICK: V / Y     HOLD SHOOT TO CHARGE',
        { fontFamily: 'monospace', fontSize: '8px', color: '#27e0e0' }).setOrigin(0.5).setScrollFactor(0).setDepth(55);
      this.tweens.add({ targets: hint, alpha: 0, delay: 4200, duration: 1000, onComplete: () => hint.destroy() });
    }
  }

  // smooth SNES-style vertical gradient sky (banded)
  skyGradient(topHex, botHex, toY, steps = 16) {
    const a = Phaser.Display.Color.ValueToColor(topHex);
    const b = Phaser.Display.Color.ValueToColor(botHex);
    const bandH = toY / steps;
    for (let i = 0; i < steps; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, steps, i);
      const col = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      this.add.rectangle(0, Math.round(i * bandH), GAME_W, Math.ceil(bandH) + 1, col).setOrigin(0).setScrollFactor(0);
    }
  }

  buildBackground(theme) {
    if (theme === 'neon') {
      this.cameras.main.setBackgroundColor('#0d0a1a');
      this.skyGradient(0x140a2e, 0x3a1150, GAME_H);
      // neon moon with glow halo
      this.add.circle(GAME_W - 74, 54, 40, 0xff2fae, 0.12).setScrollFactor(0.15);
      this.add.circle(GAME_W - 74, 54, 32, 0xff2fae, 0.28).setScrollFactor(0.15);
      this.add.circle(GAME_W - 74, 54, 26, 0xff8fd0).setScrollFactor(0.15);
      // far skyline silhouette
      const far = this.add.graphics().setScrollFactor(0.22);
      far.fillStyle(0x1a1030, 1);
      for (let x = -60; x < WORLD_W; x += 120) far.fillRect(x, GROUND_TOP - (30 + ((x * 5) % 40)), 80, 60);
      // hills
      const hills = this.add.graphics().setScrollFactor(0.3);
      hills.fillStyle(0x241246, 1);
      for (let x = -100; x < WORLD_W; x += 190) hills.fillCircle(x, GROUND_TOP + 14, 95);
      // near buildings with neon windows + lit roofs
      const bld = this.add.graphics().setScrollFactor(0.55);
      for (let x = 0; x < WORLD_W; x += 92) {
        const bh = 46 + ((x * 7) % 74);
        bld.fillStyle(0x150c28, 1).fillRect(x, GROUND_TOP - bh, 60, bh);
        bld.fillStyle(0x2a1a48, 1).fillRect(x, GROUND_TOP - bh, 60, 2);          // lit roof
        bld.fillStyle(0x0c0718, 1).fillRect(x + 57, GROUND_TOP - bh, 3, bh);     // right shadow
        const wc = (Math.floor(x / 92) % 2 === 0) ? 0x27e0e0 : 0xff2fae;
        bld.fillStyle(wc, 1);
        for (let wy = GROUND_TOP - bh + 6; wy < GROUND_TOP - 6; wy += 12)
          for (let wx = x + 6; wx < x + 54; wx += 12) bld.fillRect(wx, wy, 5, 5);
      }
    } else if (theme === 'marble') {
      this.cameras.main.setBackgroundColor('#2a2033');
      this.skyGradient(0x3a2a52, 0xffc98a, GAME_H);   // dawn: violet → gold
      // low sun burning through the haze
      this.add.circle(96, 76, 44, 0xffd99a, 0.14).setScrollFactor(0.15);
      this.add.circle(96, 76, 30, 0xffe9c4, 0.30).setScrollFactor(0.15);
      this.add.circle(96, 76, 21, 0xfff4de).setScrollFactor(0.15);
      // distant ridge
      const far = this.add.graphics().setScrollFactor(0.2);
      far.fillStyle(0x4a3a5c, 1);
      for (let x = -80; x < WORLD_W; x += 150) far.fillTriangle(x, GROUND_TOP, x + 75, GROUND_TOP - 56, x + 150, GROUND_TOP);
      // the gilded dome, once per stretch
      const dome = this.add.graphics().setScrollFactor(0.34);
      for (let x = 120; x < WORLD_W; x += 1150) {
        dome.fillStyle(0x6b5540, 1).fillRect(x - 54, GROUND_TOP - 96, 108, 96);     // block
        dome.fillStyle(0x8a6f52, 1).fillRect(x - 54, GROUND_TOP - 96, 108, 3);
        dome.fillStyle(0xc9921c, 1).fillCircle(x, GROUND_TOP - 96, 34);             // dome
        dome.fillStyle(0xffe27a, 1).fillCircle(x - 9, GROUND_TOP - 104, 13);        // lit side
        dome.fillStyle(0x7a5810, 1).fillRect(x - 34, GROUND_TOP - 96, 68, 3);       // springline shadow
        dome.fillStyle(0xffe27a, 1).fillRect(x - 2, GROUND_TOP - 142, 4, 16);       // spire
        dome.fillStyle(0xfff4de, 1).fillRect(x - 1, GROUND_TOP - 146, 2, 5);
      }
      // marble colonnade
      const col = this.add.graphics().setScrollFactor(0.58);
      for (let x = 0; x < WORLD_W; x += 96) {
        const ch = 58 + ((x * 11) % 44);
        col.fillStyle(0x6d6480, 1).fillRect(x, GROUND_TOP - ch, 72, ch);            // wall
        col.fillStyle(0x8f86a6, 1).fillRect(x, GROUND_TOP - ch, 72, 4);             // entablature
        col.fillStyle(0xc9921c, 1).fillRect(x, GROUND_TOP - ch + 4, 72, 2);         // gold frieze
        for (let cx = x + 6; cx < x + 68; cx += 15) {
          col.fillStyle(0xb9b0cc, 1).fillRect(cx, GROUND_TOP - ch + 7, 8, ch - 7);  // shaft
          col.fillStyle(0xe4dcf2, 1).fillRect(cx, GROUND_TOP - ch + 7, 2, ch - 7);  // lit edge
          col.fillStyle(0x4f4860, 1).fillRect(cx + 7, GROUND_TOP - ch + 7, 1, ch - 7);
          col.fillStyle(0xd9cff0, 1).fillRect(cx - 1, GROUND_TOP - ch + 7, 10, 2);  // capital
        }
      }
    } else {
      this.cameras.main.setBackgroundColor('#1b2740');
      this.skyGradient(0x2b4a86, 0xf2b271, GAME_H);   // dusk: deep blue → warm horizon
      // sun with halo
      this.add.circle(GAME_W - 72, 60, 34, 0xffe6b0, 0.18).setScrollFactor(0.15);
      this.add.circle(GAME_W - 72, 60, 24, 0xffdca8).setScrollFactor(0.15);
      // far mountains
      const far = this.add.graphics().setScrollFactor(0.22);
      far.fillStyle(0x2c3f63, 1);
      for (let x = -80; x < WORLD_W; x += 160) far.fillTriangle(x, GROUND_TOP, x + 80, GROUND_TOP - 70, x + 160, GROUND_TOP);
      // hills
      const hills = this.add.graphics().setScrollFactor(0.3);
      hills.fillStyle(0x24324f, 1);
      for (let x = -100; x < WORLD_W; x += 190) hills.fillCircle(x, GROUND_TOP + 12, 95);
      // near buildings, shaded, with lit windows
      const bld = this.add.graphics().setScrollFactor(0.55);
      for (let x = 0; x < WORLD_W; x += 92) {
        const bh = 42 + ((x * 7) % 70);
        bld.fillStyle(0x172033, 1).fillRect(x, GROUND_TOP - bh, 60, bh);
        bld.fillStyle(0x243458, 1).fillRect(x, GROUND_TOP - bh, 3, bh);          // lit left edge
        bld.fillStyle(0x0f1626, 1).fillRect(x + 57, GROUND_TOP - bh, 3, bh);     // right shadow
        bld.fillStyle(0xffd97a, 1);
        for (let wy = GROUND_TOP - bh + 6; wy < GROUND_TOP - 6; wy += 12)
          for (let wx = x + 6; wx < x + 54; wx += 12) bld.fillRect(wx, wy, 5, 6);
      }
    }
  }

  // ---- helpers ----
  addSolid(cx, cy, w, h, color, stroke) {
    const r = this.add.rectangle(cx, cy, w, h, color);
    if (stroke) r.setStrokeStyle(1, stroke);
    this.physics.add.existing(r, true);
    this.solids.add(r);
    return r;
  }

  spawnGrunt(x, y) {
    const g = this.physics.add.sprite(x, y, 'grunt0');
    g.body.setSize(12, 26).setOffset(4, 2);
    g.setCollideWorldBounds(true);
    g.hp = this.enhanced ? 3 : 2; g.dir = -1; g.nextShot = 0; g.homeX = x;
    g.play('grunt-run');
    this.enemies.add(g);
    return g;
  }

  spark(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const p = this.add.rectangle(x, y, 2, 2, color).setDepth(9);
      const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 55;
      this.tweens.add({ targets: p, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 250 + Math.random() * 200, onComplete: () => p.destroy() });
    }
  }

  killBullet(b) { if (b && b.active) { this.spark(b.x, b.y, 0xffffff, 3); b.destroy(); } }

  spawnPlayerBullet(ax, ay, charged) {
    const p = this.player;
    const mx = p.x + (ax !== 0 ? Math.sign(ax) * 10 : 0);
    const my = p.y - 4 + (ay > 0 ? 8 : 0) + (ay < 0 ? -2 : 0);
    const b = this.pbullets.create(mx, my, charged ? 'cbullet' : 'pbullet');
    const len = Math.hypot(ax, ay) || 1;
    const spd = charged ? BULLET_SPEED * 1.35 : BULLET_SPEED;
    b.setVelocity(ax / len * spd, ay / len * spd);
    b.rotation = Math.atan2(ay, ax); b.setDepth(6);
    b.dmg = charged ? 3 : 1;
    this.time.delayedCall(charged ? 1800 : 1400, () => b.active && b.destroy());
  }

  spawnEnemyBullet(x, y, tx, ty, speed = ENEMY_BULLET_SPEED) {
    const b = this.ebullets.create(x, y, 'ebullet');
    let ax = tx - x, ay = ty - y; const len = Math.hypot(ax, ay) || 1;
    b.setVelocity(ax / len * speed, ay / len * speed); b.setDepth(6);
    this.time.delayedCall(3000, () => b.active && b.destroy());
  }

  // =====================================================
  //  THE BEAST — mount, drive, fire, die
  // =====================================================
  spawnCarriage(x) {
    const c = this.physics.add.sprite(x, GROUND_TOP - 20, 'car0');
    c.body.setSize(46, 24).setOffset(3, 5);
    c.setCollideWorldBounds(true).setDepth(4);
    c.armor = CAR_ARMOR;
    c.setBounce(0);
    this.carriage = c;

    this.physics.add.collider(c, this.solids);
    // ramming: flattens grunts, staggers a boss
    this.physics.add.overlap(c, this.enemies, (cc, e) => {
      if (!this.riding || !e.active) return;
      if (e.isBoss) {
        if (this.time.now < this.ramCdUntil) return;
        this.ramCdUntil = this.time.now + 420;
        e.setVelocityY(-150); e.body.velocity.x = this.facing * 180;
        this.hitBoss(e, 2);
        this.spark(e.x, e.y, 0xffe27a, 12);
        this.cameras.main.shake(140, 0.006);
      } else {
        this.spark(e.x, e.y, 0xffc14d, 10);
        e.destroy(); this.score += 150; this.updateHud();
      }
    });
    this.physics.add.overlap(this.ebullets, c, (cc, b) => {
      // Phaser hands these back in group/object order; find the bullet either way.
      const bullet = (b && b.texture && b.texture.key === 'ebullet') ? b : cc;
      if (!this.riding) return;
      this.killBullet(bullet);
      this.damageCarriage();
    });
    return c;
  }

  mountCarriage() {
    const p = this.player, c = this.carriage;
    this.riding = true;
    this.mountHint.setVisible(false);
    this.sliding = false; this.chargeStart = 0;
    p.setScale(1, 1).clearTint().setAlpha(1);
    p.body.enable = false;
    p.setVisible(false);
    c.play('car-roll');
    c.setFlipX(this.facing < 0);
    this.cameras.main.startFollow(c, true, 0.12, 0.12);
    this.spark(c.x, c.y, 0xffe27a, 16);
    this.updateHud();

    const t = this.add.text(GAME_W / 2, 74, 'THE BEAST!   V / Y TO EJECT',
      { fontFamily: 'monospace', fontSize: '9px', color: '#ffd23a' }).setOrigin(0.5).setScrollFactor(0).setDepth(55);
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 700, onComplete: () => t.destroy() });
  }

  // Step out under your own power; the carriage keeps its remaining armour.
  dismountCarriage(ejected) {
    const p = this.player, c = this.carriage;
    this.riding = false;
    p.body.enable = true;
    p.setVisible(true);
    p.setPosition(c.x - this.facing * 10, c.y - 26);
    p.setVelocity(ejected ? -this.facing * 90 : 0, ejected ? -240 : -120);
    if (c.active) { c.stop(); c.setTexture('car0'); c.setVelocityX(0); }
    this.cameras.main.startFollow(p, true, 0.12, 0.12);
    if (ejected) this.invulnUntil = Math.max(this.invulnUntil, this.time.now + 1600);
    this.updateHud();
  }

  damageCarriage() {
    const c = this.carriage;
    if (!this.riding || !c.active) return;
    c.armor--;
    c.setTintFill(0xffffff);
    this.time.delayedCall(70, () => c.active && c.clearTint());
    this.cameras.main.shake(90, 0.004);
    this.updateHud();
    if (c.armor <= 0) this.explodeCarriage();
  }

  explodeCarriage() {
    const c = this.carriage;
    this.spark(c.x, c.y, 0xffe27a, 26);
    this.spark(c.x, c.y - 6, 0xff5a3c, 20);
    this.cameras.main.shake(320, 0.012);
    this.dismountCarriage(true);
    c.destroy();
    this.carriage = null;
    this.updateHud();
  }

  fireCannon(ay) {
    const c = this.carriage;
    const mx = c.x + this.facing * 26, my = c.y - 11;
    const b = this.pbullets.create(mx, my, 'shell');
    const ax = this.facing;
    const len = Math.hypot(ax, ay) || 1;
    b.setVelocity(ax / len * CAR_SHELL_SPEED, ay / len * CAR_SHELL_SPEED);
    b.rotation = Math.atan2(ay, ax);
    b.setDepth(6);
    b.dmg = CAR_SHELL_DMG;
    this.spark(mx, my, 0xffe27a, 4);
    this.cameras.main.shake(60, 0.003);
    c.body.velocity.x -= this.facing * 26;          // recoil
    this.time.delayedCall(1600, () => b.active && b.destroy());
  }

  updateCarriage(time, delta, inp) {
    const c = this.carriage, cb = c.body, p = this.player;
    if (!c.active) { this.riding = false; return; }

    // floor + boss-arena clamp, mirroring the on-foot net
    if (cb.bottom > GROUND_TOP + 2) { cb.y = (GROUND_TOP + 2) - cb.height; if (cb.velocity.y > 0) cb.velocity.y = 0; }
    if (this.bossStarted) {
      if (cb.x < this.arenaMinX) { cb.x = this.arenaMinX; if (cb.velocity.x < 0) cb.velocity.x = 0; }
      if (cb.right > this.arenaMaxX) { cb.x = this.arenaMaxX - cb.width; if (cb.velocity.x > 0) cb.velocity.x = 0; }
    }
    const onGround = cb.blocked.down || cb.touching.down || cb.bottom >= GROUND_TOP + 1;

    // drive
    if (inp.left && !inp.right) { c.setVelocityX(-CAR_SPEED); this.facing = -1; c.setFlipX(true); }
    else if (inp.right && !inp.left) { c.setVelocityX(CAR_SPEED); this.facing = 1; c.setFlipX(false); }
    else c.setVelocityX(cb.velocity.x * 0.82);      // heavy coast

    if (Math.abs(cb.velocity.x) > 12) { if (c.anims.currentAnim?.key !== 'car-roll') c.play('car-roll'); }
    else { c.stop(); c.setTexture('car0'); }

    if (inp.jumpJustPressed && onGround) { c.setVelocityY(CAR_JUMP); this.spark(c.x, c.y + 12, 0xbbbbbb, 5); }

    // cannon — flat, or angled with up/down
    let ay = 0;
    if (inp.up) ay = -0.55; else if (inp.down && !onGround) ay = 0.55;
    if (inp.shootHeld && time > this.nextShot) { this.nextShot = time + CAR_FIRE_CD; this.fireCannon(ay); }

    // eject
    if (inp.kickPressed) { this.dismountCarriage(false); return; }

    // keep the hidden player glued on for camera/bookkeeping
    p.setPosition(c.x, c.y - 6);

    // exhaust
    if (Math.abs(cb.velocity.x) > 40 && Math.floor(time / 90) % 2 === 0)
      this.spark(c.x - this.facing * 26, c.y + 8, 0x6b7280, 1);
  }

  // melee kick: destroys grunts, deflects bullets, chips + knocks the boss
  doKick() {
    const p = this.player;
    const kx = p.x + this.facing * 18, ky = p.y + 2;
    this.spark(kx, ky, 0xffffff, 7);
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (Math.abs(e.x - kx) < KICK_RANGE && Math.abs(e.y - ky) < 26) {
        if (e.isBoss) { e.setVelocityY(-140); e.body.velocity.x = this.facing * 140; this.hitBoss(e, 1); }
        else { this.spark(e.x, e.y, 0xffc14d); e.destroy(); this.score += 150; this.updateHud(); }
      }
    });
    this.ebullets.getChildren().forEach(b => {
      if (b.active && Math.abs(b.x - kx) < KICK_RANGE + 2 && Math.abs(b.y - ky) < 26) this.killBullet(b);
    });
  }

  hitEnemy(b, e) {
    const dmg = b.dmg || 1;
    this.killBullet(b);
    if (e.isBoss) { this.hitBoss(e, dmg); return; }
    e.hp -= dmg; e.setTintFill(0xffffff);
    this.time.delayedCall(60, () => e.active && e.clearTint());
    if (e.hp <= 0) { this.spark(e.x, e.y, 0xffc14d); e.destroy(); this.score += 100; this.updateHud(); }
  }

  damagePlayer() {
    if (this.riding) { this.damageCarriage(); return; }
    if (this.time.now < this.invulnUntil || this.gameOverFlag || this.won || this.sliding) return;
    this.lives--; this.updateHud();
    this.invulnUntil = this.time.now + 1300;
    this.chargeStart = 0;
    this.player.setVelocity(-this.facing * 120, -160);
    this.spark(this.player.x, this.player.y, 0xff5a3c);
    if (this.lives <= 0) this.gameOver();
  }

  updateHud() {
    this.hud.setText(`STAGE ${this.level}   DONALD x${Math.max(0, this.lives)}`);
    this.scoreHud.setText(`SCORE ${this.score}`);
    // Armour lives on its own line bottom-left: the top row collides with the boss bar.
    const riding = this.riding && this.carriage && this.carriage.active;
    this.beastHud.setVisible(!!riding);
    if (riding) {
      const a = this.carriage.armor;
      this.beastHud.setText(`BEAST ${'\u2588'.repeat(a)}${'\u2591'.repeat(Math.max(0, CAR_ARMOR - a))}`);
      this.beastHud.setColor(a <= 2 ? '#ff5a3c' : a <= 4 ? '#ffd23a' : '#88ffaa');
    }
  }

  // ---- boss ----
  startBoss() {
    this.bossStarted = true;
    const cam = this.cameras.main;
    cam.stopFollow();
    const viewL = Phaser.Math.Clamp(Math.round(this.player.x - GAME_W / 2), 0, WORLD_W - GAME_W);
    cam.setScroll(viewL, 0);
    const arenaL = viewL + 16, arenaR = viewL + GAME_W - 16;
    this.arenaMinX = arenaL; this.arenaMaxX = arenaR;
    this.addSolid(arenaL - 16, GAME_H / 2, 30, GAME_H, 0x2a1a10);
    this.addSolid(arenaR + 16, GAME_H / 2, 30, GAME_H, 0x2a1a10);

    const bcfg = this.levelData.boss;
    const boss = this.physics.add.sprite(arenaR - 44, 110, bcfg.key + '0');
    const bw = boss.width, bh = boss.height;
    boss.body.setSize(bw * 0.62, bh * 0.9).setOffset(bw * 0.19, bh * 0.07);
    boss.setCollideWorldBounds(true).setDepth(5);
    boss.isBoss = true; boss.hp = bcfg.hp; boss.maxHp = bcfg.hp;
    boss.nextHop = 0; boss.nextShot = 0; boss.phase = 1; boss.tier = this.level;
    boss.play(bcfg.key + '-run');
    this.boss = boss;
    this.enemies.add(boss);
    this.physics.add.collider(boss, this.solids);

    this.bossBarBg.setVisible(true);
    this.bossBar.setVisible(true).scaleX = 1;
    this.bossLabel.setVisible(true).setText(bcfg.name);

    const warn = this.add.text(GAME_W / 2, GAME_H / 2, '!  WARNING  !', { fontFamily: 'monospace', fontSize: '20px', color: '#ff3b3b' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.tweens.add({ targets: warn, alpha: 0, duration: 260, yoyo: true, repeat: 4, onComplete: () => warn.destroy() });
  }

  hitBoss(boss, dmg = 1) {
    boss.hp -= dmg; boss.setTintFill(0xffffff);
    this.time.delayedCall(60, () => boss.active && boss.clearTint());
    this.spark(boss.x, boss.y - 10, 0xffc14d, 4);
    this.bossBar.scaleX = Math.max(0, boss.hp) / boss.maxHp;
    if (boss.hp <= boss.maxHp / 2 && boss.phase === 1) { boss.phase = 2; boss.setTint(0xffbbbb); }
    if (boss.hp <= 0) this.win(boss);
  }

  updateBoss(boss, time) {
    const p = this.player;
    const bd = boss.body;

    // HARD SAFETY NET — pin the boss to the floor and inside the arena every frame.
    const floorTop = GROUND_TOP - 2;
    let onFloor = bd.blocked.down || bd.touching.down;
    if (bd.bottom >= floorTop) { bd.y = floorTop - bd.height; if (bd.velocity.y > 0) bd.velocity.y = 0; onFloor = true; }
    if (bd.x < this.arenaMinX) { bd.x = this.arenaMinX; if (bd.velocity.x < 0) bd.velocity.x = 0; }
    if (bd.right > this.arenaMaxX) { bd.x = this.arenaMaxX - bd.width; if (bd.velocity.x > 0) bd.velocity.x = 0; }

    boss.setFlipX(p.x < boss.x);
    const t = boss.tier - 1;  // 0 for stage 1, 1 for stage 2 (harder)
    if (onFloor) {
      boss.setVelocityX(bd.velocity.x * 0.85);
      if (time > boss.nextHop) {
        boss.nextHop = time + (boss.phase === 2 ? 1100 : 1500) - t * 150;
        boss.setVelocityX((p.x < boss.x ? -1 : 1) * (60 + t * 20));
        boss.setVelocityY(-300);
      }
    }
    if (time > boss.nextShot) {
      boss.nextShot = time + (boss.phase === 2 ? 1500 : 2100) - t * 350;
      const n = (boss.phase === 2 ? 3 : 2) + t;
      const base = Math.atan2(p.y - boss.y, p.x - boss.x);
      const spd = ENEMY_BULLET_SPEED * (boss.phase === 2 ? 1.1 : 0.9) * (1 + t * 0.12);
      for (let i = 0; i < n; i++) {
        const ang = base + (i - (n - 1) / 2) * 0.26;
        const eb = this.ebullets.create(boss.x, boss.y - 6, 'ebullet');
        eb.setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd); eb.setDepth(6);
        this.time.delayedCall(3500, () => eb.active && eb.destroy());
      }
    }
  }

  // ---- end states ----
  win(boss) {
    if (this.won) return; this.won = true;
    this.spark(boss.x, boss.y, 0xffffff, 30); boss.destroy();
    this.ebullets.clear(true, true);
    this.physics.pause();
    const last = this.level >= LEVELS.length;
    const title = last ? 'MISSION COMPLETE' : `STAGE ${this.level} CLEAR`;
    this.add.text(GAME_W / 2, 104, title, { fontFamily: 'monospace', fontSize: '18px', color: '#ffd23a' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.add.text(GAME_W / 2, 132, `SCORE ${this.score}`, { fontFamily: 'monospace', fontSize: '12px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    const prompt = last ? 'PRESS R / START TO PLAY AGAIN' : `PRESS R / START FOR STAGE ${this.level + 1}`;
    this.add.text(GAME_W / 2, 162, prompt, { fontFamily: 'monospace', fontSize: '10px', color: '#88ffaa' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    if (last) {
      this.time.addEvent({ delay: 80, repeat: 45, callback: () => this.spark(Phaser.Math.Between(0, GAME_W), 16, Phaser.Display.Color.RandomRGB().color, 3) });
      this.pendingContinue = () => this.scene.start('Title');
    } else {
      this.pendingContinue = () => this.scene.restart({ level: this.level + 1, score: this.score });
    }
  }

  gameOver() {
    if (this.gameOverFlag) return; this.gameOverFlag = true;
    this.player.setTint(0x555555);
    this.physics.pause();
    const t1 = this.add.text(GAME_W / 2, 110, 'GAME OVER', { fontFamily: 'monospace', fontSize: '24px', color: '#ff3b3b' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    const t2 = this.add.text(GAME_W / 2, 146, 'PRESS R / START TO CONTINUE HERE', { fontFamily: 'monospace', fontSize: '9px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.gameOverTexts = [t1, t2];
  }

  // Respawn in place: refill lives and pick up right where the Donald fell.
  revive() {
    if (this.gameOverTexts) { this.gameOverTexts.forEach(t => t.destroy()); this.gameOverTexts = null; }
    this.gameOverFlag = false;
    this.lives = 3; this.updateHud();
    this.sliding = false; this.chargeStart = 0;
    this.player.setScale(1, 1).clearTint().setAlpha(1).setVelocity(0, 0);
    this.invulnUntil = this.time.now + 2000;
    this.physics.resume();
  }

  // ---- main loop ----
  update(time, delta) {
    const k = this.keys, p = this.player, pb = p.body;

    // ---- unified input: keyboard OR Xbox pad ----
    const pad = (this.input.gamepad && this.input.gamepad.total) ? this.input.gamepad.getPad(0) : null;
    const sx = pad ? pad.leftStick.x : 0, sy = pad ? pad.leftStick.y : 0, DZ = 0.35;
    const padLeft  = pad ? (pad.left  || sx < -DZ) : false;
    const padRight = pad ? (pad.right || sx >  DZ) : false;
    const padUp    = pad ? (pad.up    || sy < -DZ) : false;
    const padDown  = pad ? (pad.down  || sy >  DZ) : false;
    const padA     = pad ? pad.A : false;
    const padShoot = pad ? (pad.X || pad.B || pad.R1) : false;
    const padStart = pad ? !!(pad.buttons[9] && pad.buttons[9].pressed) : false;
    const padKickBtn  = pad ? pad.Y : false;

    // continue / menu (R key or START)
    const startEdge = padStart && !this.padStartPrev; this.padStartPrev = padStart;
    const continuePressed = Phaser.Input.Keyboard.JustDown(k.restart) || startEdge;
    if (this.won) { if (continuePressed) this.pendingContinue(); this.padJumpPrev = padA; return; }
    if (this.gameOverFlag) { if (continuePressed) this.revive(); this.padJumpPrev = padA; return; }

    // jump input up-front (also drives the Mega Man-style Down+Jump slide)
    const jumpJustPressed = Phaser.Input.Keyboard.JustDown(k.jump) || Phaser.Input.Keyboard.JustDown(k.jump2) || (padA && !this.padJumpPrev);
    const jumpHeld = k.jump.isDown || k.jump2.isDown || padA;
    this.padJumpPrev = padA;

    // kick edge
    const kickEdge = padKickBtn && !this.padKickPrev; this.padKickPrev = padKickBtn;
    const kickPressed = Phaser.Input.Keyboard.JustDown(k.kick) || kickEdge;

    const left  = k.left.isDown  || k.a.isDown || padLeft;
    const right = k.right.isDown || k.d.isDown || padRight;
    const up    = k.up.isDown    || k.w.isDown || padUp;
    const down  = k.down.isDown  || k.s.isDown || padDown;
    const shootHeld = k.shoot.isDown || k.shoot2.isDown || padShoot;

    // ---- mount prompt / mounting ----
    if (this.carriage && this.carriage.active && !this.riding) {
      const near = Math.abs(p.x - this.carriage.x) < CAR_MOUNT_RANGE && Math.abs(p.y - this.carriage.y) < 34;
      this.mountHint.setVisible(near);
      if (near) this.mountHint.setPosition(this.carriage.x, this.carriage.y - 26);
      if (near && up) { this.mountCarriage(); return; }
    }

    if (this.riding) {
      this.updateCarriage(time, delta, { left, right, up, down, jumpJustPressed, shootHeld, kickPressed });
    } else {

    // ---- player floor + arena safety net ----
    let clampedGround = false;
    if (pb.bottom > GROUND_TOP - 2) { pb.y = (GROUND_TOP - 2) - pb.height; if (pb.velocity.y > 0) pb.velocity.y = 0; clampedGround = true; }
    if (this.bossStarted) {
      if (pb.x < this.arenaMinX) { pb.x = this.arenaMinX; if (pb.velocity.x < 0) pb.velocity.x = 0; }
      if (pb.right > this.arenaMaxX) { pb.x = this.arenaMaxX - pb.width; if (pb.velocity.x > 0) pb.velocity.x = 0; }
    }
    const onGround = pb.blocked.down || pb.touching.down || clampedGround;

    // ---- Mega Man-style slide: hold DOWN + press JUMP (Stage 2) ----
    if (this.enhanced && down && jumpJustPressed && onGround && !this.sliding && time > this.slideCdUntil) {
      this.sliding = true;
      this.slideUntil = time + SLIDE_TIME;
      this.slideCdUntil = time + SLIDE_TIME + SLIDE_CD;
      this.invulnUntil = Math.max(this.invulnUntil, time + SLIDE_TIME + 80); // i-frames cover the whole slide + recovery
      this.chargeStart = 0; p.clearTint();
      p.setScale(1, 0.7);
    }

    if (this.sliding) {
      if (time > this.slideUntil || pb.blocked.left || pb.blocked.right) {
        this.sliding = false; p.setScale(1, 1);
      } else {
        p.setVelocityX(this.facing * SLIDE_SPEED);
        p.stop(); p.setTexture('trump0'); p.setRotation(0);
        p.setAlpha(0.4);                    // transparent + intangible dash
      }
    } else {
      // ----- movement -----
      const SPEED = 145;
      if (left && !right) { p.setVelocityX(-SPEED); this.facing = -1; p.setFlipX(true); }
      else if (right && !left) { p.setVelocityX(SPEED); this.facing = 1; p.setFlipX(false); }
      else p.setVelocityX(0);

      // ----- jump (+ variable height, somersault); Down+Jump was consumed by the slide above -----
      if (jumpJustPressed && onGround) { p.setVelocityY(-335); this.jumping = true; }
      if (!jumpHeld && pb.velocity.y < -120) p.setVelocityY(pb.velocity.y * 0.55);

      // ----- animation + Contra somersault -----
      if (onGround) {
        if (this.jumping && pb.velocity.y >= 0) { this.jumping = false; p.setRotation(0); }
        if (pb.velocity.x !== 0) { if (p.anims.currentAnim?.key !== 'trump-run') p.play('trump-run'); }
        else { p.stop(); p.setTexture('trump0'); }
      } else {
        p.stop(); p.setTexture('trump1');
        if (this.jumping) p.rotation += this.facing * SPIN_SPEED * (delta / 1000);
        else p.setRotation(0);
      }

      // invuln blink (steady 1 when not invulnerable)
      p.setAlpha(time < this.invulnUntil ? ((Math.floor(time / 60) % 2) ? 0.3 : 1) : 1);

      // ----- 8-way aim -----
      let ax = 0, ay = 0;
      if (left) ax = -1; if (right) ax = 1;
      if (up) ay = -1; else if (down && !onGround) ay = 1;
      if (ax === 0 && ay === 0) ax = this.facing;

      // ----- kick (Stage 2) -----
      if (this.enhanced && kickPressed && time > this.kickCdUntil) {
        this.kickCdUntil = time + KICK_CD;
        this.doKick();
      }

      // ----- shoot (Stage 1: rapid fire · Stage 2: hold to charge) -----
      if (this.enhanced) {
        if (shootHeld) {
          if (this.chargeStart === 0) this.chargeStart = time;
          const charged = time - this.chargeStart >= CHARGE_TIME;
          p.setTint(charged ? 0x8fd9ff : 0xffcf9e);                 // glow while charging
          if (charged && Math.floor(time / 90) % 2 === 0) this.spark(p.x + this.facing * 10, p.y - 4, 0x8fd9ff, 1);
        } else if (this.chargeStart > 0) {
          const held = time - this.chargeStart; this.chargeStart = 0;
          p.clearTint();
          this.spawnPlayerBullet(ax, ay, held >= CHARGE_TIME);      // release to fire (charged if held long enough)
        }
      } else {
        if (shootHeld && time > this.nextShot) { this.nextShot = time + 170; this.spawnPlayerBullet(ax, ay, false); }
      }
    }

    }   // end on-foot branch

    // ---- enemies ----
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (e.isBoss) { this.updateBoss(e, time); return; }
      const dx = p.x - e.x;
      const range = this.enhanced ? 260 : 230;
      if (Math.abs(dx) < range && Math.abs(p.y - e.y) < 80) {
        e.dir = dx < 0 ? -1 : 1;
        e.setVelocityX(e.dir * (this.enhanced ? 55 : 45));
        if (time > e.nextShot) { e.nextShot = time + (this.enhanced ? 1200 : 1500) + Math.random() * 700; this.spawnEnemyBullet(e.x, e.y - 2, p.x, p.y - 2); }
      } else {
        if (Math.abs(e.x - e.homeX) > 60) e.dir = e.x > e.homeX ? -1 : 1;
        e.setVelocityX(e.dir * 35);
      }
      e.setFlipX(e.dir < 0);
    });

    // trigger boss near the end of the stage
    if (!this.bossStarted && p.x > this.bossTriggerX) this.startBoss();
  }
}

// =============================================================
new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_W, height: GAME_H,
  parent: 'game',
  pixelArt: true,
  backgroundColor: '#101826',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: false } },
  scene: [BootScene, TitleScene, GameScene]
});
