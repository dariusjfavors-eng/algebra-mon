import Phaser from "phaser";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";
import { GYMS } from "../data/gyms";

const gymBg = new URL("../assets/react.svg", import.meta.url).href;
const sheetUrl = new URL("../assets/sprites/player_sheet.png", import.meta.url).href;

type GymData = {
  returnScene?: string;
  gymUnit?: string;
};

type Palette = {
  floor: number;
  stage: number;
  carpet: number;
  accent: number;
};

export default class GymScene extends Phaser.Scene {
  static ASSETS: AssetDescriptor[] = [
    { type: "image", key: "gym-bg", url: gymBg },
    { type: "spritesheet", key: "player", url: sheetUrl, frameConfig: { frameWidth: 32, frameHeight: 48 } }
  ];

  private returnScene?: string;
  private gymUnit?: string;
  private gymCfg = GYMS[0];
  private leaderSprite?: Phaser.GameObjects.Sprite;
  private dialogue!: Phaser.GameObjects.Text;
  private battleStarting = false;

  constructor() {
    super({ key: "GymScene" });
  }

  init(data: GymData) {
    this.returnScene = data?.returnScene;
    this.gymUnit = data?.gymUnit;
    const match = GYMS.find((g) => g.unit === this.gymUnit);
    if (match) this.gymCfg = match;
  }

  async create() {
    await ensureSceneAssets(this, GymScene.ASSETS);

    const palette = this.resolvePalette();
    this.drawInterior(palette);
    this.spawnLeader(palette);
    this.drawUI();

    this.input.keyboard!.on("keydown-B", () => this.beginLeaderBattle());
    this.input.keyboard!.on("keydown-ENTER", () => this.beginLeaderBattle());
    this.input.keyboard!.on("keydown-ESC", () => this.exit());
  }

  private resolvePalette(): Palette {
    return {
      floor: this.gymCfg.floorColor ?? 0xf4f4f5,
      stage: this.gymCfg.stageColor ?? 0xe5e7eb,
      carpet: this.gymCfg.carpetColor ?? 0xf97316,
      accent: this.gymCfg.color ?? 0xf97316
    };
  }

  private drawInterior(palette: Palette) {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x020617, 1).setOrigin(0);
    this.add.image(width / 2, height / 2, "gym-bg").setScale(0.4).setAlpha(0.05);

    this.add
      .rectangle(width / 2, height / 2 + 10, width - 120, height - 100, palette.floor, 1)
      .setStrokeStyle(6, palette.accent, 0.35);
    this.add
      .rectangle(width / 2, height - 150, width * 0.35, 160, palette.carpet, 0.85)
      .setStrokeStyle(4, 0x0f172a, 0.4);
    this.add
      .rectangle(width / 2, height / 2 - 50, width - 220, 150, palette.stage, 1)
      .setStrokeStyle(4, palette.accent, 0.5);

    [-1, 1].forEach((dir) => {
      this.add
        .rectangle(width / 2 + dir * (width / 2 - 140), height / 2, 30, height - 180, palette.accent, 0.22)
        .setStrokeStyle(2, 0xf8fafc, 0.3);
    });

    const exitDoor = this.add
      .rectangle(width / 2, height - 60, 120, 50, 0x0f172a, 0.8)
      .setStrokeStyle(3, 0xf8fafc, 0.7)
      .setInteractive({ useHandCursor: true });
    exitDoor.on("pointerdown", () => this.exit());
    this.add
      .text(exitDoor.x, exitDoor.y - 8, "EXIT", { fontFamily: "monospace", fontSize: 14, color: "#f8fafc" })
      .setOrigin(0.5);

    for (let i = 0; i < 6; i++) {
      this.add.rectangle(140 + i * 130, 70, 40, 10, 0xfef9c3, 0.8);
    }
  }

  private spawnLeader(palette: Palette) {
    const { width, height } = this.scale;
    this.leaderSprite = this.add
      .sprite(width / 2, height / 2 - 70, "player", 0)
      .setTint(this.gymCfg.leaderTint ?? palette.accent)
      .setScale(2);

    this.add
      .text(width / 2, height / 2 - 140, `${this.gymCfg.leader ?? "Leader"} — ${this.gymCfg.leaderTitle ?? "Gym Leader"}`, {
        fontFamily: "monospace",
        fontSize: 14,
        color: "#f8fafc",
        backgroundColor: "rgba(15,23,42,0.7)",
        padding: { left: 8, right: 8, top: 4, bottom: 4 }
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: this.leaderSprite,
      y: this.leaderSprite.y - 6,
      duration: 1800,
      yoyo: true,
      repeat: -1
    });
  }

  private drawUI() {
    const { width, height } = this.scale;
    const intro =
      `${this.gymCfg.leader ?? "Leader"}: Welcome challenger!` +
      ` Unit ${this.gymCfg.unit} mastery is decided inside these walls.`;
    this.dialogue = this.add
      .text(width / 2, height - 95, intro, {
        fontFamily: "monospace",
        fontSize: 15,
        color: "#111827",
        wordWrap: { width: width - 160 },
        backgroundColor: "rgba(248,250,252,0.9)",
        padding: { left: 16, right: 16, top: 8, bottom: 8 }
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height - 32, "Press B to battle • ESC to leave the gym", {
        fontFamily: "monospace",
        fontSize: 14,
        color: "#f8fafc"
      })
      .setOrigin(0.5);
  }

  private beginLeaderBattle() {
    if (this.battleStarting || !this.gymUnit) return;
    this.battleStarting = true;
    const pun = this.gymCfg.pun ?? "Math puns are the first sine you'll lose.";
    this.dialogue.setText(`${this.gymCfg.leader ?? "Leader"}: ${pun}`);
    if (this.leaderSprite) {
      this.tweens.add({
        targets: this.leaderSprite,
        scale: 2.2,
        duration: 150,
        yoyo: true,
        repeat: 2
      });
    }
    this.time.delayedCall(1500, () => {
      const fn = (window as any).ALGMON_TRY_GYM;
      if (typeof fn === "function") fn(this.gymUnit!);
    });
  }

  private exit() {
    this.scene.stop();
    if (this.returnScene) this.scene.resume(this.returnScene);
  }
}
