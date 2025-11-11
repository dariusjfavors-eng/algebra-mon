import Phaser from "phaser";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";

export default class PreloadScene extends Phaser.Scene {
  static ASSETS: AssetDescriptor[] = [];

  private progressBar!: Phaser.GameObjects.Rectangle;
  private progressBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: "PreloadScene" });
  }

  async create() {
    const { width, height } = this.scale;
    this.progressBg = this.add.rectangle(width / 2, height / 2, 260, 18, 0x1e293b, 0.8);
    this.progressBg.setStrokeStyle(2, 0x334155, 0.8);
    this.progressBar = this.add.rectangle(width / 2 - 128, height / 2, 4, 12, 0x38bdf8, 1).setOrigin(0, 0.5);
    this.add
      .text(width / 2, height / 2 - 30, "Initializing world...", { fontFamily: "monospace", fontSize: 14, color: "#cbd5f5" })
      .setOrigin(0.5);

    await ensureSceneAssets(this, PreloadScene.ASSETS, (progress) => this.updateProgress(progress));

    this.progressBar.width = 252;
    this.scene.launch("UIScene");
    this.scene.start("WorldScene");
  }

  private updateProgress(value: number) {
    const clamped = Phaser.Math.Clamp(value, 0.01, 1);
    this.progressBar.width = 252 * clamped;
  }
}
