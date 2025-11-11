import Phaser from "phaser";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";

type LoadingData = {
  origin?: string;
  targetScene: string;
  assets: AssetDescriptor[];
  payload?: Record<string, any>;
};

export default class LoadingScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Rectangle;
  private infoText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "LoadingScene" });
  }

  create(data: LoadingData) {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x020617, 0.75).setOrigin(0);
    this.add
      .text(width / 2, height / 2 - 40, "Preparing next area...", {
        fontFamily: "monospace",
        fontSize: 16,
        color: "#e2e8f0"
      })
      .setOrigin(0.5);

    this.progressBar = this.add.rectangle(width / 2 - 150, height / 2, 4, 18, 0x38bdf8).setOrigin(0, 0.5);
    this.progressBar.setStrokeStyle(2, 0x334155, 0.9);
    this.infoText = this.add
      .text(width / 2, height / 2 + 35, "0%", { fontFamily: "monospace", fontSize: 12, color: "#94a3b8" })
      .setOrigin(0.5);

    this.beginLoad(data);
  }

  private async beginLoad(data: LoadingData) {
    const { assets, targetScene, origin, payload } = data;
    try {
      await ensureSceneAssets(this, assets, (value) => this.updateProgress(value));
      this.scene.launch(targetScene, { ...(payload ?? {}), returnScene: origin });
      this.scene.stop(this.scene.key);
    } catch (err) {
      this.infoText.setText("Load failed. Press ESC to return.");
      this.input.keyboard?.once("keydown-ESC", () => {
        this.scene.stop(this.scene.key);
        if (origin) this.scene.resume(origin);
      });
      console.error(err);
    }
  }

  private updateProgress(value: number) {
    const barWidth = Math.max(12, 300 * Phaser.Math.Clamp(value, 0.01, 1));
    this.progressBar.width = barWidth;
    this.infoText.setText(`${Math.round(value * 100)}%`);
  }
}
