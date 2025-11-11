import Phaser from "phaser";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";

const battleBg = new URL("../assets/react.svg", import.meta.url).href;

type BattleData = {
  source?: string;
  returnScene?: string;
};

export default class BattleScene extends Phaser.Scene {
  static ASSETS: AssetDescriptor[] = [{ type: "image", key: "battle-bg", url: battleBg }];

  private source?: string;
  private returnScene?: string;

  constructor() {
    super({ key: "BattleScene" });
  }

  init(data: BattleData) {
    this.source = data?.source;
    this.returnScene = data?.returnScene;
  }

  async create() {
    await ensureSceneAssets(this, BattleScene.ASSETS);

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0f172a, 0.92).setOrigin(0);
    this.add.image(width / 2, height / 2, "battle-bg").setAlpha(0.08).setScale(0.3);

    this.add
      .text(
        width / 2,
        height / 2 - 20,
        "Battle Scene (placeholder)",
        { fontFamily: "monospace", fontSize: "28px", color: "#f8fafc" }
      )
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2 + 20,
        `Source: ${this.source ?? "unknown"} • Press ESC to return`,
        { fontFamily: "monospace", fontSize: "16px", color: "#cbd5f5" }
      )
      .setOrigin(0.5);

    this.input.keyboard!.once("keydown-ESC", () => this.exit());
    this.input.keyboard!.once("keydown-B", () => this.exit());
  }

  private exit() {
    this.scene.stop();
    if (this.returnScene) this.scene.resume(this.returnScene);
  }
}
