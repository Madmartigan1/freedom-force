// =============================================================
//  THE VAULT — a top-down Zelda-style dungeon stage.
//
//  A 3x3 grid of single-screen rooms. The camera snaps room to
//  room rather than scrolling, the way A Link to the Past does.
//  Find the small key, open the locked door, beat what is behind
//  it. Gravity is off in here; movement is 8-way.
// =============================================================

const ROOM_W = GAME_W, ROOM_H = GAME_H;
const DUN_COLS = 3, DUN_ROWS = 3;
const WALL = 16;                      // wall thickness, px
const DOOR_W = 44;                    // door opening, px
const DUN_SPEED = 130;
const DUN_FIRE_CD = 190;

// Room grid, row-major. Each room lists which sides have doors.
// 'lock' marks a door that needs the small key.
const DUNGEON = {
  name: 'THE VAULT',
  start: { col: 1, row: 2 },
  rooms: [
    // row 0
    { doors: { s: 1, e: 1 }, enemies: 2, item: 'heart' },
    { doors: { w: 1, s: 'lock' }, enemies: 0, boss: true },
    { doors: { w: 1, s: 1 }, enemies: 2, item: 'pod_laser' },
    // row 1
    { doors: { n: 1, e: 1 }, enemies: 3, item: 'heartc' },
    { doors: { w: 1, e: 1, s: 1, n: 'lock' }, enemies: 3 },
    { doors: { n: 1, w: 1 }, enemies: 2, key: true },
    // row 2
    { doors: { e: 1 }, enemies: 2, item: 'pod_spread' },
    { doors: { w: 1, n: 1, e: 1 }, enemies: 0, entrance: true },
    { doors: { w: 1 }, enemies: 2, item: 'heart' },
  ],
};

class DungeonScene extends Phaser.Scene {
  constructor() { super('Dungeon'); }

  init(data) {
    this.score = (data && data.score) ? data.score : 0;
    this.maxHearts = (data && data.maxHearts) ? data.maxHearts : HEARTS_START;
    this.weapon = (data && data.weapon) ? data.weapon : 'normal';
  }

  create() {
    this.hearts = this.maxHearts;
    this.hasKey = false;
    this.cleared = {};                       // roomIndex -> true once emptied
    this.gameOverFlag = false; this.won = false;
    this.facing = { x: 1, y: 0 };
    this.nextShot = 0; this.invulnUntil = 0;
    this.transitioning = false;
    this.padShootPrev = false; this.padStartPrev = false;

    this.physics.world.gravity.y = 0;
    this.physics.world.setBounds(0, 0, ROOM_W * DUN_COLS, ROOM_H * DUN_ROWS);
    this.cameras.main.setBackgroundColor('#0b0a12');

    this.solids = this.physics.add.staticGroup();
    this.pbullets = this.physics.add.group({ allowGravity: false });
    this.ebullets = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group({ allowGravity: false });
    this.items = this.physics.add.group({ allowGravity: false });
    this.doorBlocks = this.physics.add.staticGroup();

    this.buildRooms();

    const s = DUNGEON.start;
    this.room = { col: s.col, row: s.row };
    this.player = this.physics.add.sprite(
      s.col * ROOM_W + ROOM_W / 2, s.row * ROOM_H + ROOM_H / 2, 'trump0');
    this.player.body.setSize(12, 16).setOffset(4, 10);
    this.player.setDepth(5);
    this.player.body.setAllowGravity(false);

    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.player, this.doorBlocks);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.pbullets, this.solids, b => this.killBullet(b));
    this.physics.add.collider(this.pbullets, this.doorBlocks, b => this.killBullet(b));
    this.physics.add.collider(this.ebullets, this.solids, b => this.killBullet(b));
    this.physics.add.overlap(this.pbullets, this.enemies, (b, e) => this.hitEnemy(b, e));
    this.physics.add.overlap(this.ebullets, this.player, (pl, b) => { this.killBullet(b); this.damagePlayer(); });
    this.physics.add.overlap(this.enemies, this.player, () => this.damagePlayer());
    this.physics.add.overlap(this.player, this.items, (pl, it) => this.takeItem(it));

    this.keys = this.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN',
      a: 'A', d: 'D', w: 'W', s: 'S',
      shoot: 'X', shoot2: 'J', jump: 'SPACE', restart: 'R',
    });
    this.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    this.hud = this.add.text(8, 6, '', { fontFamily: 'monospace', fontSize: '10px', color: '#ff6a7a' }).setScrollFactor(0).setDepth(50);
    this.keyHud = this.add.text(466, 6, '', { fontFamily: 'monospace', fontSize: '10px', color: '#ffd23a' }).setOrigin(1, 0).setScrollFactor(0).setDepth(50);
    this.roomHud = this.add.text(GAME_W / 2, 252, '', { fontFamily: 'monospace', fontSize: '8px', color: '#6f7d92' }).setOrigin(0.5).setScrollFactor(0).setDepth(50);

    this.bossBarBg = this.add.rectangle(GAME_W / 2, 16, 134, 9, 0x222222).setScrollFactor(0).setDepth(50).setStrokeStyle(1, 0xffffff).setVisible(false);
    this.bossBar = this.add.rectangle(GAME_W / 2 - 65, 16, 130, 5, 0xff3b3b).setOrigin(0, 0.5).setScrollFactor(0).setDepth(51).setVisible(false);

    this.snapCamera(true);
    this.enterRoom();
    this.updateHud();

    Sound.init();
    Sound.music(3);
    this.input.keyboard.on('keydown-M', () => Sound.toggleMute());
    this.events.once('shutdown', () => { this.physics.world.gravity.y = 900; Sound.stopMusic(); });

    CRT.apply(this);

    const t = this.add.text(GAME_W / 2, 110, DUNGEON.name, { fontFamily: 'monospace', fontSize: '20px', color: '#ffd23a' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    const t2 = this.add.text(GAME_W / 2, 134, 'FIND THE KEY', { fontFamily: 'monospace', fontSize: '9px', color: '#88ffaa' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.tweens.add({ targets: [t, t2], alpha: 0, delay: 1700, duration: 800, onComplete: () => { t.destroy(); t2.destroy(); } });
  }

  idx(col, row) { return row * DUN_COLS + col; }

  // Walls for every room, with gaps where doors are declared.
  buildRooms() {
    const g = this.add.graphics().setDepth(0);
    for (let row = 0; row < DUN_ROWS; row++) {
      for (let col = 0; col < DUN_COLS; col++) {
        const r = DUNGEON.rooms[this.idx(col, row)];
        const ox = col * ROOM_W, oy = row * ROOM_H;

        // floor — deliberately brighter than it first looks right. The CRT
        // filter darkens everything, and at the original values the rooms
        // read as near-black once the shader was on.
        g.fillStyle(0x2e2744, 1).fillRect(ox, oy, ROOM_W, ROOM_H);
        g.fillStyle(0x393152, 1);
        for (let y = oy + WALL; y < oy + ROOM_H - WALL; y += 16)
          for (let x = ox + WALL + ((y / 16 | 0) % 2 ? 8 : 0); x < ox + ROOM_W - WALL; x += 16)
            g.fillRect(x, y, 8, 8);
        // flagstone joints
        g.fillStyle(0x241e38, 1);
        for (let y = oy + WALL; y < oy + ROOM_H - WALL; y += 16) g.fillRect(ox + WALL, y, ROOM_W - WALL * 2, 1);

        // wall slabs, split around door gaps
        const cx = ox + ROOM_W / 2, cy = oy + ROOM_H / 2;
        const seg = (x, y, w, h) => {
          g.fillStyle(0x554a75, 1).fillRect(x, y, w, h);
          g.fillStyle(0x7d6ea6, 1).fillRect(x, y, w, 2);
          g.fillStyle(0x241e38, 1).fillRect(x, y + h - 2, w, 2);
          const s = this.add.rectangle(x + w / 2, y + h / 2, w, h);
          this.physics.add.existing(s, true); this.solids.add(s);
        };
        const half = (ROOM_W - DOOR_W) / 2, halfV = (ROOM_H - DOOR_W) / 2;
        if (r.doors.n) { seg(ox, oy, half, WALL); seg(cx + DOOR_W / 2, oy, half, WALL); }
        else seg(ox, oy, ROOM_W, WALL);
        if (r.doors.s) { seg(ox, oy + ROOM_H - WALL, half, WALL); seg(cx + DOOR_W / 2, oy + ROOM_H - WALL, half, WALL); }
        else seg(ox, oy + ROOM_H - WALL, ROOM_W, WALL);
        if (r.doors.w) { seg(ox, oy, WALL, halfV); seg(ox, cy + DOOR_W / 2, WALL, halfV); }
        else seg(ox, oy, WALL, ROOM_H);
        if (r.doors.e) { seg(ox + ROOM_W - WALL, oy, WALL, halfV); seg(ox + ROOM_W - WALL, cy + DOOR_W / 2, WALL, halfV); }
        else seg(ox + ROOM_W - WALL, oy, WALL, ROOM_H);

        // wall torches: pooled light on the floor plus a flickering flame
        [0.22, 0.78].forEach(f => {
          const tx = ox + ROOM_W * f, ty = oy + WALL + 4;
          this.add.circle(tx, ty + 16, 30, 0xffb44d, 0.07).setDepth(0);
          this.add.circle(tx, ty + 10, 18, 0xffb44d, 0.09).setDepth(0);
          this.add.rectangle(tx, ty + 2, 4, 8, 0x4a3a28).setDepth(1);
          const flame = this.add.circle(tx, ty - 4, 4, 0xffc14d).setDepth(1);
          this.add.circle(tx, ty - 5, 2, 0xfff0c0).setDepth(1);
          this.tweens.add({ targets: flame, scale: 0.72, alpha: 0.8, duration: 260 + Math.random() * 180, yoyo: true, repeat: -1 });
        });

        // locked doors get a physical barrier until the key is used
        const lockAt = (x, y, w, h, side) => {
          const d = this.doorBlocks.create(x, y, 'lockdoor');
          d.setDisplaySize(w, h).refreshBody();
          d.side = side; d.roomIdx = this.idx(col, row);
          d.setDepth(2);
        };
        if (r.doors.n === 'lock') lockAt(cx, oy + WALL / 2, DOOR_W, WALL, 'n');
        if (r.doors.s === 'lock') lockAt(cx, oy + ROOM_H - WALL / 2, DOOR_W, WALL, 's');
        if (r.doors.w === 'lock') lockAt(ox + WALL / 2, cy, WALL, DOOR_W, 'w');
        if (r.doors.e === 'lock') lockAt(ox + ROOM_W - WALL / 2, cy, WALL, DOOR_W, 'e');
      }
    }
  }

  snapCamera(instant) {
    const x = this.room.col * ROOM_W, y = this.room.row * ROOM_H;
    this.cameras.main.setBounds(x, y, ROOM_W, ROOM_H);
    if (instant) this.cameras.main.setScroll(x, y);
  }

  // Populate the current room the first time it is entered.
  enterRoom() {
    const i = this.idx(this.room.col, this.room.row);
    const r = DUNGEON.rooms[i];
    if (this.cleared[i]) { this.updateHud(); return; }
    this.cleared[i] = true;

    const ox = this.room.col * ROOM_W, oy = this.room.row * ROOM_H;
    for (let n = 0; n < (r.enemies || 0); n++) {
      const e = this.enemies.create(
        ox + WALL + 40 + Math.random() * (ROOM_W - WALL * 2 - 80),
        oy + WALL + 30 + Math.random() * (ROOM_H - WALL * 2 - 60), 'grunt0');
      e.body.setSize(12, 16).setOffset(4, 10);
      e.body.setAllowGravity(false);
      e.hp = 3; e.nextShot = 0; e.roomIdx = i;
      e.play('grunt-run');
    }
    if (r.key && !this.hasKey) {
      const k = this.items.create(ox + ROOM_W / 2, oy + ROOM_H / 2, 'smallkey');
      k.kind = 'key'; k.setDepth(7);
      this.tweens.add({ targets: k, y: k.y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (r.item) {
      const it = this.items.create(ox + ROOM_W / 2, oy + ROOM_H / 2 + 26, r.item);
      it.kind = r.item.startsWith('pod_') ? 'pod' : r.item;
      if (it.kind === 'pod') it.wtype = r.item.slice(4);
      it.setDepth(7);
      this.tweens.add({ targets: it, y: it.y - 6, duration: 860, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    if (r.boss) this.startBoss(ox, oy);
    this.updateHud();
  }

  startBoss(ox, oy) {
    const b = this.enemies.create(ox + ROOM_W / 2, oy + 80, 'idol0');
    b.body.setSize(30, 40).setOffset(8, 14);
    b.body.setAllowGravity(false);
    b.isBoss = true; b.hp = 20; b.maxHp = 20; b.nextShot = 0; b.phase = 1;
    b.play('idol-run');
    this.bossBarBg.setVisible(true); this.bossBar.setVisible(true);
    this.bossBar.width = 130;
    Sound.sfx('warn');
  }

  killBullet(b) { if (b && b.active) b.destroy(); }

  fire(dx, dy) {
    const p = this.player;
    const b = this.pbullets.create(p.x + dx * 10, p.y + dy * 10, this.weapon === 'laser' ? 'cbullet' : 'pbullet');
    const spd = 380;
    b.setVelocity(dx * spd, dy * spd);
    b.rotation = Math.atan2(dy, dx);
    b.setDepth(6);
    b.dmg = this.weapon === 'laser' ? 2 : 1;
    if (this.weapon !== 'normal') b.setTint(WEAPONS[this.weapon].tint);
    this.time.delayedCall(1200, () => b.active && b.destroy());
    Sound.sfx(WEAPONS[this.weapon].sfx);
  }

  hitEnemy(b, e) {
    const dmg = b.dmg || 1;
    this.killBullet(b);
    e.hp -= dmg;
    e.setTintFill(0xffffff);
    this.time.delayedCall(60, () => e.active && e.clearTint());
    if (e.isBoss) {
      this.bossBar.width = Math.max(0, 130 * (e.hp / e.maxHp));
      if (e.hp <= 0) { this.winDungeon(e); return; }
      Sound.sfx('hit');
      return;
    }
    if (e.hp <= 0) { this.spark(e.x, e.y, 0xffc14d); e.destroy(); this.score += 100; this.updateHud(); Sound.sfx('explode'); }
    else Sound.sfx('hit');
  }

  spark(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const p = this.add.rectangle(x, y, 2, 2, color).setDepth(9);
      const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 55;
      this.tweens.add({ targets: p, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 260, onComplete: () => p.destroy() });
    }
  }

  takeItem(it) {
    if (!it.active) return;
    if (it.kind === 'key') {
      this.hasKey = true; this.score += 200;
      Sound.sfx('key'); this.banner('SMALL KEY', '#ffd23a');
    } else if (it.kind === 'heartc') {
      this.maxHearts = Math.min(HEARTS_MAX, this.maxHearts + 1);
      this.hearts = this.maxHearts; this.score += 500;
      Sound.sfx('secret'); this.banner('HEART CONTAINER!', '#ffd23a');
    } else if (it.kind === 'heart') {
      this.hearts = Math.min(this.maxHearts, this.hearts + 1);
      Sound.sfx('pickup'); this.banner('+1 HEART', '#ff6a7a');
    } else if (it.kind === 'pod') {
      this.weapon = it.wtype; this.score += 200;
      Sound.sfx('pickup'); this.banner(WEAPONS[this.weapon].label + '!', '#ffd23a');
    }
    this.spark(it.x, it.y, 0xffe27a, 12);
    it.destroy();
    this.updateHud();
  }

  banner(text, color) {
    if (this._banner && this._banner.active) this._banner.destroy();
    const t = this.add.text(GAME_W / 2, 92, text, { fontFamily: 'monospace', fontSize: '12px', color })
      .setOrigin(0.5).setScrollFactor(0).setDepth(55);
    this._banner = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 600, onComplete: () => t.destroy() });
  }

  tryUnlock() {
    if (!this.hasKey) return false;
    const p = this.player;
    let used = false;
    this.doorBlocks.getChildren().forEach(d => {
      if (!d.active || used) return;
      if (Phaser.Math.Distance.Between(p.x, p.y, d.x, d.y) < 40) {
        this.spark(d.x, d.y, 0xffd23a, 18);
        d.destroy();
        used = true;
      }
    });
    if (used) { this.hasKey = false; Sound.sfx('unlock'); this.banner('UNLOCKED', '#88ffaa'); this.updateHud(); }
    return used;
  }

  damagePlayer() {
    if (this.time.now < this.invulnUntil || this.gameOverFlag || this.won) return;
    this.hearts--; this.updateHud();
    this.invulnUntil = this.time.now + 1200;
    Sound.sfx('hurt');
    this.spark(this.player.x, this.player.y, 0xff5a3c);
    if (this.hearts <= 0) this.gameOver();
  }

  updateHud() {
    const h = Math.max(0, this.hearts);
    this.hud.setText(`${'♥'.repeat(h)}${'♡'.repeat(Math.max(0, this.maxHearts - h))}`);
    this.hud.setColor(h <= 1 ? '#ff3b3b' : h <= 2 ? '#ffd23a' : '#ff6a7a');
    this.keyHud.setText(`${this.hasKey ? '⚷ KEY   ' : ''}SCORE ${this.score}`);
    this.roomHud.setText(`ROOM ${this.room.col + 1},${this.room.row + 1}   ${WEAPONS[this.weapon].label}`);
  }

  gameOver() {
    if (this.gameOverFlag) return; this.gameOverFlag = true;
    this.player.setTint(0x555555);
    this.physics.pause();
    Sound.stopMusic(); Sound.sfx('gameover');
    this.t1 = this.add.text(GAME_W / 2, 110, 'GAME OVER', { fontFamily: 'monospace', fontSize: '24px', color: '#ff3b3b' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.t2 = this.add.text(GAME_W / 2, 146, 'PRESS R TO CONTINUE HERE', { fontFamily: 'monospace', fontSize: '9px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
  }

  revive() {
    if (this.t1) { this.t1.destroy(); this.t2.destroy(); this.t1 = null; }
    this.gameOverFlag = false;
    this.hearts = this.maxHearts; this.updateHud();
    this.player.clearTint().setAlpha(1).setVelocity(0, 0);
    this.invulnUntil = this.time.now + 2000;
    this.physics.resume();
    Sound.music(3);
  }

  winDungeon(boss) {
    if (this.won) return; this.won = true;
    this.spark(boss.x, boss.y, 0xffffff, 30); boss.destroy();
    this.ebullets.clear(true, true);
    this.bossBarBg.setVisible(false); this.bossBar.setVisible(false);
    this.physics.pause();
    Sound.stopMusic(); Sound.sfx('explode');
    this.time.delayedCall(700, () => Sound.sfx('clear'));
    this.add.text(GAME_W / 2, 104, 'VAULT CLEARED', { fontFamily: 'monospace', fontSize: '18px', color: '#ffd23a' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.add.text(GAME_W / 2, 132, `SCORE ${this.score}`, { fontFamily: 'monospace', fontSize: '12px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.add.text(GAME_W / 2, 162, 'PRESS R TO RETURN', { fontFamily: 'monospace', fontSize: '10px', color: '#88ffaa' }).setOrigin(0.5).setScrollFactor(0).setDepth(60);
    this.time.addEvent({ delay: 80, repeat: 45, callback: () => this.spark(Phaser.Math.Between(0, GAME_W) + this.cameras.main.scrollX, this.cameras.main.scrollY + 16, Phaser.Display.Color.RandomRGB().color, 3) });
  }

  // Walk off a screen edge and the camera snaps to the neighbouring room.
  checkRoomChange() {
    if (this.transitioning) return;
    const p = this.player;
    const ox = this.room.col * ROOM_W, oy = this.room.row * ROOM_H;
    let dc = 0, dr = 0;
    if (p.x < ox + 4) dc = -1;
    else if (p.x > ox + ROOM_W - 4) dc = 1;
    else if (p.y < oy + 4) dr = -1;
    else if (p.y > oy + ROOM_H - 4) dr = 1;
    if (!dc && !dr) return;

    const nc = this.room.col + dc, nr = this.room.row + dr;
    if (nc < 0 || nc >= DUN_COLS || nr < 0 || nr >= DUN_ROWS) return;

    this.transitioning = true;
    this.room = { col: nc, row: nr };
    // setBounds clamps scroll immediately, so the room snaps the way A Link to
    // the Past does. A fixed timer clears the flag rather than a pan callback:
    // if that callback were ever missed, room changes would lock up for good.
    this.snapCamera(true);
    // nudge the player clear of the doorway so they do not bounce straight back
    p.x += dc * 22; p.y += dr * 22;
    this.cameras.main.flash(90, 0, 0, 0);
    this.time.delayedCall(120, () => { this.transitioning = false; this.enterRoom(); });
    this.updateHud();
  }

  update(time) {
    const k = this.keys, p = this.player;
    const pad = (this.input.gamepad && this.input.gamepad.total) ? this.input.gamepad.getPad(0) : null;
    const dir = padDir(pad);
    const left  = k.left.isDown  || k.a.isDown || dir.left;
    const right = k.right.isDown || k.d.isDown || dir.right;
    const up    = k.up.isDown    || k.w.isDown || dir.up;
    const down  = k.down.isDown  || k.s.isDown || dir.down;
    const shoot = k.shoot.isDown || k.shoot2.isDown || (pad && (pad.X || pad.B || pad.R1));
    const act   = Phaser.Input.Keyboard.JustDown(k.jump) || (pad && pad.A && !this.padShootPrev);
    this.padShootPrev = pad ? pad.A : false;
    const restart = Phaser.Input.Keyboard.JustDown(k.restart) ||
      (pad && !!(pad.buttons[9] && pad.buttons[9].pressed) && !this.padStartPrev);
    this.padStartPrev = pad ? !!(pad.buttons[9] && pad.buttons[9].pressed) : false;

    if (this.won) { if (restart) this.scene.start('Title'); return; }
    if (this.gameOverFlag) { if (restart) this.revive(); return; }

    // 8-way movement, normalised so diagonals are not faster
    let vx = (right ? 1 : 0) - (left ? 1 : 0);
    let vy = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    p.setVelocity(vx / len * DUN_SPEED, vy / len * DUN_SPEED);
    if (vx || vy) {
      this.facing = { x: vx / len, y: vy / len };
      p.setFlipX(vx < 0);
      if (p.anims.currentAnim?.key !== 'trump-run') p.play('trump-run');
    } else { p.stop(); p.setTexture('trump0'); }

    if (act) this.tryUnlock();
    if (shoot && time > this.nextShot) {
      this.nextShot = time + (this.weapon === 'machine' ? 90 : DUN_FIRE_CD);
      this.fire(this.facing.x, this.facing.y);
    }

    p.setAlpha(time < this.invulnUntil ? ((Math.floor(time / 60) % 2) ? 0.3 : 1) : 1);

    // enemies: drift toward the player and take pot shots, but only in this room
    const ri = this.idx(this.room.col, this.room.row);
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      if (e.roomIdx !== undefined && e.roomIdx !== ri && !e.isBoss) { e.setVelocity(0, 0); return; }
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      const sp = e.isBoss ? 46 : 58;
      e.setVelocity(dx / d * sp, dy / d * sp);
      e.setFlipX(dx < 0);
      if (time > e.nextShot && d < 220) {
        e.nextShot = time + (e.isBoss ? 700 : 1500) + Math.random() * 600;
        const b = this.ebullets.create(e.x, e.y, 'ebullet');
        b.setVelocity(dx / d * ENEMY_BULLET_SPEED, dy / d * ENEMY_BULLET_SPEED);
        b.setDepth(6);
        this.time.delayedCall(2600, () => b.active && b.destroy());
      }
    });

    this.checkRoomChange();
  }
}
