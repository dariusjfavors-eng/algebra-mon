import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0f172a);
    this.scene.start("PreloadScene");
  }
}
