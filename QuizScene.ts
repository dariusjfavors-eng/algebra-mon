import Phaser from "phaser";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";

type QuizData = {
  message?: string;
  returnScene?: string;
};

export default class QuizScene extends Phaser.Scene {
  static ASSETS: AssetDescriptor[] = [];

  private message?: string;
  private returnScene?: string;

  constructor() {
    super({ key: "QuizScene" });
  }

  init(data: QuizData) {
    this.message = data?.message;
    this.returnScene = data?.returnScene;
  }

  async create() {
    await ensureSceneAssets(this, QuizScene.ASSETS);

    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x111827, 0.92).setOrigin(0);

    this.add
      .text(
        width / 2,
        height / 2 - 30,
        "Quiz Scene",
        { fontFamily: "monospace", fontSize: "28px", color: "#f8fafc" }
      )
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2 + 10,
        this.message ?? "Use this scene for custom tutoring overlays.",
        {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#cbd5f5",
          align: "center",
          wordWrap: { width: width - 80 }
        }
      )
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        height / 2 + 80,
        "Press ESC to return to the overworld.",
        { fontFamily: "monospace", fontSize: "14px", color: "#94a3b8" }
      )
      .setOrigin(0.5);

    this.input.keyboard!.once("keydown-ESC", () => this.exitToWorld());
    this.input.keyboard!.once("keydown-U", () => this.exitToWorld());
  }

  private exitToWorld() {
    this.scene.stop();
    if (this.returnScene) {
      this.scene.resume(this.returnScene);
    }
  }
}
