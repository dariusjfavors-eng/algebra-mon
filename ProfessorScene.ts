import Phaser from "phaser";
import type { QuestionRow } from "../lib/sheetLoader";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";

type ProfessorData = {
  model: QuestionRow;
  practice: QuestionRow;
  returnScene?: string;
};

export default class ProfessorScene extends Phaser.Scene {
  static ASSETS: AssetDescriptor[] = [];

  private model!: QuestionRow;
  private practice!: QuestionRow;
  private returnScene?: string;

  constructor() {
    super({ key: "ProfessorScene" });
  }

  init(data: ProfessorData) {
    this.model = data.model;
    this.practice = data.practice;
    this.returnScene = data.returnScene;
  }

  async create() {
    await ensureSceneAssets(this, ProfessorScene.ASSETS);
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x020617, 0.88).setOrigin(0);
    const bubble = this.add
      .rectangle(width / 2, height / 2, width - 160, height - 200, 0x0f172a, 0.95)
      .setStrokeStyle(2, 0x475569, 0.8);

    this.add
      .text(bubble.x, bubble.y - bubble.height / 2 + 30, "Professor's Coaching", {
        fontFamily: "monospace",
        fontSize: 20,
        color: "#f8fafc"
      })
      .setOrigin(0.5, 0);

    const modelText = this.composeModelingText();
    this.add
      .text(bubble.x - bubble.width / 2 + 30, bubble.y - bubble.height / 2 + 70, modelText, {
        fontFamily: "monospace",
        fontSize: 14,
        color: "#e2e8f0",
        wordWrap: { width: bubble.width - 60 }
      })
      .setOrigin(0, 0);

    const instructions = this.add
      .text(bubble.x, bubble.y + bubble.height / 2 - 50, "Press ENTER to try a similar problem • ESC to skip", {
        fontFamily: "monospace",
        fontSize: 14,
        color: "#cbd5f5"
      })
      .setOrigin(0.5);

    const continueBtn = this.add
      .rectangle(bubble.x, instructions.y + 40, 200, 36, 0x22c55e, 0.9)
      .setStrokeStyle(2, 0x15803d, 0.9)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(continueBtn.x, continueBtn.y, "I'm Ready  →", {
        fontFamily: "monospace",
        fontSize: 16,
        color: "#052e16"
      })
      .setOrigin(0.5);

    const sendPractice = () => {
      if (this.practice) (window as any).ALGMON_SHOW_Q?.(this.practice);
      this.exit();
    };

    continueBtn.on("pointerdown", sendPractice);
    continueBtn.on("pointerover", () => continueBtn.setFillStyle(0x4ade80, 1));
    continueBtn.on("pointerout", () => continueBtn.setFillStyle(0x22c55e, 0.9));

    this.input.keyboard!.once("keydown-ENTER", sendPractice);
    this.input.keyboard!.once("keydown-SPACE", sendPractice);
    this.input.keyboard!.once("keydown-ESC", () => this.exit());
  }

  private composeModelingText() {
    const hint =
      (this.model.explanation ||
        this.model.hint ||
        this.model.worked_solution ||
        "Identify inverse operations to isolate the variable.")?.toString();
    return [
      "Model Problem:",
      `Q: ${this.model.question ?? "Solve the equation."}`,
      `Answer: ${this.model.answer ?? "?"}`,
      "",
      "Thinking aloud:",
      `• ${hint}`,
      "",
      "Your Turn:",
      "I'll give you a fresh question with the same concept next!"
    ].join("\n");
  }

  private exit() {
    this.scene.stop();
    if (this.returnScene) this.scene.resume(this.returnScene);
  }
}
