import Phaser from "phaser";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";

const gymBg = new URL("../assets/react.svg", import.meta.url).href;

type GymData = {
  returnScene?: string;
  gymUnit?: string;
};

export default class GymScene extends Phaser.Scene {
  static ASSETS: AssetDescriptor[] = [{ type: "image", key: "gym-bg", url: gymBg }];

  private returnScene?: string;
  private gymUnit?: string;

  constructor() {
    super({ key: "GymScene" });
  }

  init(data: GymData) {
    this.returnScene = data?.returnScene;
    this.gymUnit = data?.gymUnit;
  }

  async create() {
    await ensureSceneAssets(this, GymScene.ASSETS);

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x0f172a, 0.95).setOrigin(0);
    this.add.image(width / 2, height / 2, "gym-bg").setScale(0.3).setAlpha(0.1);

    this.add
      .text(width / 2, 80, `Gym Lobby${this.gymUnit ? ` — Unit ${this.gymUnit}` : ""}`, {
        fontFamily: "monospace",
        fontSize: 26,
        color: "#f8fafc"
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2 - 20,
        "Press ENTER to challenge the gym.\nPress ESC to exit back to the world.",
        {
          fontFamily: "monospace",
          fontSize: 16,
          color: "#cbd5f5",
          align: "center"
        }
      )
      .setOrigin(0.5);

    this.input.keyboard!.once("keydown-ENTER", () => {
      const fn = (window as any).ALGMON_TRY_GYM;
      if (typeof fn === "function" && this.gymUnit) {
        fn(this.gymUnit);
      }
    });

    this.input.keyboard!.once("keydown-ESC", () => this.exit());
  }

  private exit() {
    this.scene.stop();
    if (this.returnScene) this.scene.resume(this.returnScene);
  }
}
