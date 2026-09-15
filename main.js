// =============================================================
//  Bootstrap. Lives in its own file and loads last, because
//  dungeon.js reads GAME_W/GAME_H from game.js at load time
//  while game.js needs DungeonScene to exist for the scene list.
//  Neither can be last, so the Phaser.Game call is.
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
  scene: [BootScene, TitleScene, GameScene, DungeonScene]
});
