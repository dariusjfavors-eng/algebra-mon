import Phaser from "phaser";
import { loadTSV } from "../lib/sheetLoader";
import { QUESTIONS_TSV } from "../config";
import { GYMS } from "../data/gyms";
import { BATTLE_NPCS, type BattleNPC } from "../data/npcs";
import { getUnitNormFromRow } from "../lib/questionUtils";
import { ensureSceneAssets, type AssetDescriptor } from "../lib/runtimeLoader";
import BattleScene from "./BattleScene";
import QuizScene from "./QuizScene";
import GymScene from "./GymScene";
import ProfessorScene from "./ProfessorScene";
import {
  WORLD_BOUNDS,
  SPAWN_POINT,
  PROFESSOR_SPOT,
  TUTOR_SPOT,
  PROFESSOR_ROUTE,
  ROAD_SEGMENTS,
  BUILDINGS,
  WATER_ZONES,
  FOREST_ZONES,
  GRASS_PATCHES,
  LANDMARK_LABELS,
  type WorldRect,
  type LandmarkLabel
} from "../config/world";

const sheetUrl = new URL("../assets/sprites/player_sheet.png", import.meta.url).href;
const bgmMp3 = new URL("../assets/audio/bgm.mp3", import.meta.url).href;
const bgmWav = new URL("../assets/audio/bgm.wav", import.meta.url).href;

export default class WorldScene extends Phaser.Scene {
  static ASSETS: AssetDescriptor[] = [
    {
      type: "spritesheet",
      key: "player",
      url: sheetUrl,
      frameConfig: { frameWidth: 32, frameHeight: 48 }
    },
    { type: "audio", key: "bgm", urls: [bgmMp3, bgmWav] }
  ];

  declare input: Phaser.Input.InputPlugin;
  declare physics: Phaser.Physics.Arcade.ArcadePhysics;

  bgm!: Phaser.Sound.BaseSound;
  __bgm__!: Phaser.Sound.BaseSound;
  musicStoppedByPlayer = false;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  lastDir: "down" | "up" | "left" | "right" = "down";
  keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  baseSpeed = 180;
  professor!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  worldW = WORLD_BOUNDS.width;
  worldH = WORLD_BOUNDS.height;
  gymsGroup!: Phaser.GameObjects.Container;
  obstacles!: Phaser.Physics.Arcade.StaticGroup;
  npcGroup!: Phaser.Physics.Arcade.Group;
  battleNpcs: { sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody; data: BattleNPC }[] = [];

  constructor() {
    super({ key: "WorldScene" });
  }

  async create() {
    await ensureSceneAssets(this, WorldScene.ASSETS);
    this.obstacles = this.physics.add.staticGroup();
    this.add.grid(0, 0, this.worldW, this.worldH, 64, 64, 0x0f172a, 0.06, 0x10b981, 0.15).setOrigin(0, 0);

    this.initAudio();

    const addFeatureRect = (feature: WorldRect, depthFallback = 2) => {
      const rect = this.add.rectangle(
        feature.x,
        feature.y,
        feature.w,
        feature.h,
        feature.color,
        feature.alpha ?? 1
      );
      rect.setDepth(feature.depth ?? depthFallback);
      if (feature.strokeColor) {
        rect.setStrokeStyle(
          feature.strokeWidth ?? 2,
          feature.strokeColor,
          feature.strokeAlpha ?? 1
        );
      }
      if (feature.solid) {
        this.physics.add.existing(rect, true);
        this.obstacles.add(rect as any);
      }
      if (feature.label) {
        this.add
          .text(
            feature.x + (feature.labelOffset?.x ?? -feature.w / 2 + 6),
            feature.y + (feature.labelOffset?.y ?? -feature.h / 2 - 18),
            feature.label,
            {
              fontFamily: "monospace",
              fontSize: "12px",
              color: feature.labelColor ?? "#0f172a"
            }
          )
          .setDepth((feature.depth ?? depthFallback) + 1);
      }
      this.paintPattern(feature);
      if (
        feature.solid &&
        feature.texture &&
        ["brick", "clinic", "plaza"].includes(feature.texture)
      ) {
        this.decorateBuilding(feature);
      }
      return rect;
    };

    ROAD_SEGMENTS.forEach((road) => addFeatureRect(road, 1));
    FOREST_ZONES.forEach((zone) => addFeatureRect(zone, 2));
    WATER_ZONES.forEach((zone) => addFeatureRect(zone, 3));
    BUILDINGS.forEach((building) => addFeatureRect(building, 7));

    LANDMARK_LABELS.forEach((mark: LandmarkLabel) => {
      this.add
        .text(mark.x, mark.y, mark.text, {
          fontFamily: "monospace",
          fontSize: `${mark.fontSize ?? 18}px`,
          color: mark.color ?? "#e2e8f0"
        })
        .setOrigin(0.5)
        .setDepth(4)
        .setAlpha(mark.opacity ?? 0.85);
    });

    this.player = this.physics.add.sprite(SPAWN_POINT.x, SPAWN_POINT.y, "player", 0);
    this.player.setCollideWorldBounds(true);
    this.player.setSize(18, 28).setOffset(7, 16);
    this.player.setDepth(5);

    this.physics.world.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.physics.add.collider(this.player, this.obstacles);

    this.anims.create({
      key: "walk-down",
      frames: [{ key: "player", frame: 0 }, { key: "player", frame: 1 }, { key: "player", frame: 2 }],
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "walk-left",
      frames: [{ key: "player", frame: 3 }, { key: "player", frame: 4 }, { key: "player", frame: 5 }],
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "walk-right",
      frames: [{ key: "player", frame: 6 }, { key: "player", frame: 7 }, { key: "player", frame: 8 }],
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: "walk-up",
      frames: [{ key: "player", frame: 9 }, { key: "player", frame: 10 }, { key: "player", frame: 11 }],
      frameRate: 8,
      repeat: -1
    });
    this.player.setFrame(1);

    this.input.keyboard!.on("keydown-P", () => {
      const target = this.findNearbyNpc(120);
      if (target) {
        (window as any).ALGMON_START_NPC_BATTLE?.(target.id);
      } else {
        (window as any).ALGMON_TOGGLE_HELP?.();
      }
    });
    this.input.keyboard!.on("keydown-H", () => (window as any).ALGMON_TOGGLE_HELP?.());

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D,SPACE,E") as any;

    this.add
      .text(
        16,
        12,
        `SPACE: Study • E: Gym • F: Professor • T: Tutor • M: Map • P: Battle • H: Help`,
        { fontFamily: "monospace", fontSize: "12px", color: "#334155" }
      )
      .setScrollFactor(0)
      .setDepth(1000);

    this.gymsGroup = this.add.container(0, 0);
    this.gymsGroup.setDepth(8);
    for (const gym of GYMS) {
      this.renderGymExterior(gym);
    }

    this.spawnProfessor();
    this.spawnBattleNPCs();

    this.input.keyboard!.on("keydown-F", async () => {
      if (!this.professor) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.professor.x, this.professor.y);
      if (dist > 90) return;
      try {
        const all = await loadTSV(QUESTIONS_TSV);
        if (!all?.length) return alert("No questions loaded");
        const pool = all.filter((r) => getUnitNormFromRow(r) === "1");
        if (pool.length < 2) return alert("Need more Unit 1 questions for tutoring.");
        const [model, practice] = this.pickTwoRandom(pool);
        this.launchSceneWithLoader("ProfessorScene", ProfessorScene.ASSETS, { model, practice });
      } catch (e) {
        console.error(e);
        alert("Professor error — check console");
      }
    });

    this.input.keyboard!.on("keydown-M", () => (window as any).ALGMON_TOGGLE_MINIMAP?.());

    const grassLayer = this.add.container(0, 0);
    grassLayer.setDepth(2);
    const grassRects: Phaser.GameObjects.Rectangle[] = [];
    GRASS_PATCHES.forEach((patch) => {
      const rect = this.add.rectangle(
        patch.x,
        patch.y,
        patch.w,
        patch.h,
        patch.color,
        patch.alpha ?? 0.18
      );
      rect.setDepth(2);
      rect.setStrokeStyle(patch.strokeWidth ?? 1, patch.strokeColor ?? 0x065f46, patch.strokeAlpha ?? 0.8);
      grassLayer.add(rect);
      grassRects.push(rect);
    });

    const tutor = this.add.rectangle(TUTOR_SPOT.x, TUTOR_SPOT.y, 24, 24, 0x2563eb, 1);
    tutor.setStrokeStyle(2, 0x0f172a, 1);
    this.add.text(TUTOR_SPOT.x - 30, TUTOR_SPOT.y - 24, "Tutor", {
      fontFamily: "monospace",
      fontSize: "10px",
      color: "#0f172a"
    });

    this.input.keyboard!.on("keydown-T", async () => {
      const nearTutor = Math.hypot(this.player.x - tutor.x, this.player.y - tutor.y) < 60;
      let nearGymUnit: string | null = null;
      for (const gym of GYMS) {
        const d = Math.hypot(this.player.x - gym.x, this.player.y - gym.y);
        if (d < 80) {
          nearGymUnit = gym.unit;
          break;
        }
      }
      if (!nearTutor && !nearGymUnit) {
        return alert("Find a Tutor station or stand near a Gym for targeted tips (press T).");
      }
      try {
        const all = await loadTSV(QUESTIONS_TSV);
        if (!all?.length) return alert("No questions loaded.");
        const pool = nearGymUnit ? all.filter((r) => getUnitNormFromRow(r) === nearGymUnit) : all;
        if (!pool.length) {
          return alert(nearGymUnit ? `No questions found for Unit ${nearGymUnit} yet.` : "No questions available.");
        }
        const row = pool[Math.floor(Math.random() * pool.length)];
        (window as any).__lastQ = row;
        const explanation = (row.explanation ?? row.hint ?? row.worked_solution ?? "").toString().trim();
        if (explanation) {
          alert((nearGymUnit ? `Tutor Tip (Unit ${nearGymUnit}):\n` : "Tutor Tip:\n") + explanation);
        } else {
          const stem = (row.question ?? "").toString();
          const fallback = stem.includes("=")
            ? "Step plan: (1) Undo addition/subtraction, (2) Undo multiplication/division, (3) Check."
            : "Look for slope & intercept or combine like terms first.";
          alert((nearGymUnit ? `Tutor Tip (Unit ${nearGymUnit}):\n` : "Tutor Tip:\n") + fallback);
        }
      } catch (e) {
        console.error("tutor error", e);
        alert("Tutor unavailable (check console).");
      }
    });

    let encounterCooldown = 0;
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: async () => {
        if ((window as any).__BOSS_LOCK || (window as any).__NPC_LOCK) return;
        if (!this.player.body) return;
        const inGrass = grassRects.some((r) => {
          const dx = Math.abs(this.player.x - r.x);
          const dy = Math.abs(this.player.y - r.y);
          return dx < r.width / 2 && dy < r.height / 2;
        });
        if (!inGrass) {
          encounterCooldown = 0;
          return;
        }
        if (encounterCooldown > 0) {
          encounterCooldown -= 1;
          return;
        }
        const moving = Math.hypot(this.player.body.velocity.x, this.player.body.velocity.y) > 5;
        if (moving && Math.random() < 0.15) {
          encounterCooldown = 5;
          try {
            const rows = await loadTSV(QUESTIONS_TSV);
            if (!rows?.length) return;
            const q = rows[Math.floor(Math.random() * rows.length)];
            (window as any).__lastQ = q;
            (window as any).ALGMON_SHOW_Q?.(q);
          } catch (e) {
            console.error("encounter load error", e);
          }
        }
      }
    });

    this.input.keyboard!.on("keydown-SPACE", async () => {
      if ((window as any).__BOSS_LOCK || (window as any).__NPC_LOCK) return;
      try {
        const rows = await loadTSV(QUESTIONS_TSV);
        if (!rows || rows.length === 0) {
          alert("No questions loaded. Check your QUESTIONS_TSV URL in src/config.ts");
          const sample = {
            question: "Solve: 2x + 5 = 17",
            answer: "6",
            distractors: "7|5|4",
            unit_id: "1",
            standard: "A.REI.3"
          };
          (window as any).__lastQ = sample;
          (window as any).ALGMON_SHOW_Q?.(sample);
          return;
        }
        const q = rows[Math.floor(Math.random() * rows.length)];
        (window as any).__lastQ = q;
        (window as any).ALGMON_SHOW_Q?.(q);
      } catch (e) {
        console.error("Failed to load questions TSV:", e);
        alert("Could not load questions (see console). Using a sample instead.");
        const sample = {
          question: "Solve: 2x + 5 = 17",
          answer: "6",
          distractors: "7|5|4",
          unit_id: "1",
          standard: "A.REI.3"
        };
        (window as any).__lastQ = sample;
        (window as any).ALGMON_SHOW_Q?.(sample);
      }
    });

    this.input.keyboard!.on("keydown-E", () => {
      if ((window as any).__BOSS_LOCK || (window as any).__NPC_LOCK) return;
      const near = (window as any).__NEAR_GYM_UNIT as string | null;
      if (!near) return;
      this.launchSceneWithLoader("GymScene", GymScene.ASSETS, { gymUnit: near });
    });

    this.input.keyboard!.on("keydown-B", () => {
      this.launchSceneWithLoader("BattleScene", BattleScene.ASSETS, { source: "WorldScene" });
    });

    this.input.keyboard!.on("keydown-U", () => {
      this.launchSceneWithLoader("QuizScene", QuizScene.ASSETS, { message: "Study tips incoming..." });
    });
  }

  update() {
    if (!this.player || !this.cursors || !this.keys) return;
    const speed = 180;
    let vx = 0;
    let vy = 0;
    let playing = false;
    const currentSpeed = this.baseSpeed;

    if (this.cursors.left?.isDown || this.keys["A"].isDown) {
      vx = -currentSpeed;
      this.player.anims.play("walk-left", true);
      this.lastDir = "left";
      playing = true;
    } else if (this.cursors.right?.isDown || this.keys["D"].isDown) {
      vx = currentSpeed;
      this.player.anims.play("walk-right", true);
      this.lastDir = "right";
      playing = true;
    }

    if (this.cursors.up?.isDown || this.keys["W"].isDown) {
      vy = -currentSpeed;
      this.player.anims.play("walk-up", true);
      this.lastDir = "up";
      playing = true;
    } else if (this.cursors.down?.isDown || this.keys["S"].isDown) {
      vy = currentSpeed;
      this.player.anims.play("walk-down", true);
      this.lastDir = "down";
      playing = true;
    }

    const mag = Math.hypot(vx, vy);
    if (mag > 0) {
      const scale = speed / mag;
      vx *= scale;
      vy *= scale;
    }
    this.player.setVelocity(vx, vy);

    if (!playing) {
      this.player.anims.stop();
      const idleFrame = { down: 1, left: 4, right: 7, up: 10 } as const;
      this.player.setFrame(idleFrame[this.lastDir]);
    }

    (window as any).__PLAYER_POS = { x: this.player.x, y: this.player.y };

    let prompt = "";
    const nearNpc = this.findNearbyNpc(110);
    if (nearNpc) {
      (window as any).__NEAR_GYM_UNIT = null;
      prompt = `Press P to battle ${nearNpc.name}`;
    } else {
      let found: { unit: string; name: string } | null = null;
      for (const gym of GYMS) {
        const dx = this.player.x - gym.x;
        const dy = this.player.y - gym.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 90) {
          found = gym;
          break;
        }
      }
      if (found) {
        (window as any).__NEAR_GYM_UNIT = found.unit;
        prompt = `Press E to challenge ${found.name}`;
      } else {
        (window as any).__NEAR_GYM_UNIT = null;
      }
    }
    (window as any).ALGMON_SET_PROMPT?.(prompt);
  }

  private launchSceneWithLoader(targetScene: string, assets: AssetDescriptor[], payload: Record<string, any> = {}) {
    if (this.scene.isActive("LoadingScene")) return;
    this.scene.launch("LoadingScene", {
      origin: this.scene.key,
      targetScene,
      assets,
      payload
    });
    this.scene.pause();
  }

  private renderGymExterior(gym: (typeof GYMS)[number]) {
    const width = gym.size?.w ?? 210;
    const height = gym.size?.h ?? 150;
    const baseColor = gym.color ?? 0xf97316;
    const roofColor = gym.roofColor ?? this.shiftColor(baseColor, 0.15);
    const trimColor = gym.trimColor ?? 0xf8fafc;
    const doorColor = gym.doorColor ?? 0x0f172a;
    const depth = 7.2;

    const base = this.add
      .rectangle(gym.x, gym.y, width, height, baseColor, 1)
      .setStrokeStyle(4, trimColor, 0.95)
      .setDepth(depth);
    const roof = this.add
      .rectangle(gym.x, gym.y - height / 2 + 24, width + 28, 48, roofColor, 1)
      .setStrokeStyle(3, trimColor, 0.9)
      .setDepth(depth + 0.01);

    const towerWidth = 34;
    const towerHeight = height - 18;
    const towerOffset = width / 2 - towerWidth / 2 - 6;
    const towers = [-1, 1].map((dir) =>
      this.add
        .rectangle(gym.x + dir * towerOffset, gym.y + 6, towerWidth, towerHeight, roofColor, 0.9)
        .setStrokeStyle(3, trimColor, 0.8)
        .setDepth(depth - 0.01)
    );

    const door = this.add
      .rectangle(gym.x, gym.y + height / 2 - 42, width * 0.26, 56, doorColor, 1)
      .setDepth(depth + 0.02);
    const knob = this.add.circle(gym.x + (width * 0.26) / 2 - 8, gym.y + height / 2 - 42, 4, trimColor, 0.8).setDepth(depth + 0.03);

    const windowColor = this.shiftColor(baseColor, 0.3);
    const windowWidth = 32;
    const windowHeight = 22;
    const windowOffsetY = 14;
    const windows = [-1, 0, 1].map((slot) =>
      this.add
        .rectangle(gym.x + slot * (windowWidth + 24), gym.y - windowOffsetY, windowWidth, windowHeight, windowColor, 0.92)
        .setStrokeStyle(2, trimColor, 0.7)
        .setDepth(depth + 0.02)
    );

    const signBg = this.add
      .rectangle(gym.x, gym.y - height / 2 - 18, width * 0.5, 26, trimColor, 1)
      .setStrokeStyle(2, baseColor, 0.9)
      .setDepth(depth + 0.2);
    const label = this.add
      .text(gym.x, gym.y - height / 2 - 22, gym.name, {
        fontFamily: "monospace",
        fontSize: 12,
        color: "#0f172a",
        align: "center",
        wordWrap: { width: width * 0.45 }
      })
      .setOrigin(0.5)
      .setDepth(depth + 0.21);

    const badge = this.add.circle(gym.x, gym.y - height / 2 + 24, 11, doorColor, 1).setDepth(depth + 0.3);
    this.add
      .text(badge.x, badge.y - 6, gym.unit, { fontFamily: "monospace", fontSize: 11, color: "#f8fafc" })
      .setOrigin(0.5)
      .setDepth(depth + 0.31);

    const colliderWidth = width - 30;
    const colliderHeight = height - 28;
    const collider = this.add.rectangle(gym.x, gym.y + 10, colliderWidth, colliderHeight, 0xffffff, 0).setDepth(depth - 0.2);
    this.physics.add.existing(collider, true);
    this.obstacles.add(collider as any);

    this.gymsGroup.add([...towers, roof, base, ...windows, door, knob, signBg, label, badge, collider]);
  }

  private spawnBattleNPCs() {
    if (this.npcGroup) {
      this.npcGroup.clear(true, true);
      this.battleNpcs = [];
    }
    this.npcGroup = this.physics.add.group({ immovable: true, allowGravity: false });
    BATTLE_NPCS.forEach((npc) => {
      const sprite = this.physics.add
        .sprite(npc.x, npc.y, "player", npc.frame ?? 0)
        .setDepth(6)
        .setImmovable(true)
        .setSize(18, 28)
        .setOffset(7, 16);
      if (npc.tint) sprite.setTint(npc.tint);
      this.npcGroup.add(sprite);
      this.battleNpcs.push({ sprite, data: npc });
      this.add
        .text(npc.x, npc.y - 36, npc.name, {
          fontFamily: "monospace",
          fontSize: "11px",
          color: "#0f172a",
          backgroundColor: "rgba(255,255,255,0.7)",
          padding: { left: 4, right: 4, top: 1, bottom: 1 }
        })
        .setOrigin(0.5)
        .setDepth(6);
      if (npc.title) {
        this.add
          .text(npc.x, npc.y - 20, npc.title, {
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#475569"
          })
          .setOrigin(0.5)
          .setDepth(6);
      }
    });
    if (this.player) {
      this.physics.add.collider(this.player, this.npcGroup);
    }
  }

  private spawnProfessor() {
    const routePoints =
      PROFESSOR_ROUTE.map((step) => {
        const gymIndex = Math.min(step.gymIndex ?? 0, GYMS.length - 1);
        const gym = GYMS[gymIndex] ?? GYMS[0];
        return {
          x: (gym?.x ?? PROFESSOR_SPOT.x) + (step.offset?.x ?? 0),
          y: (gym?.y ?? PROFESSOR_SPOT.y) + (step.offset?.y ?? 0)
        };
      }) ?? [];

    const firstPoint = routePoints[0] ?? { x: PROFESSOR_SPOT.x, y: PROFESSOR_SPOT.y };

    this.professor = this.physics.add
      .sprite(firstPoint.x, firstPoint.y, "player", 0)
      .setDepth(6)
      .setImmovable(true)
      .setSize(18, 28)
      .setOffset(7, 16);
    this.professor.setTint(0xfde68a);
    this.professor.anims.play("walk-down");

    this.physics.add.collider(this.player, this.professor);

    if (routePoints.length > 1) {
      const moveToPoint = (currentIndex: number) => {
        const nextIndex = (currentIndex + 1) % routePoints.length;
        const target = routePoints[nextIndex];
        const duration = Phaser.Math.Distance.Between(this.professor.x, this.professor.y, target.x, target.y) * 12;

        this.tweens.add({
          targets: this.professor,
          x: target.x,
          y: target.y,
          duration,
          onStart: () => this.updateProfessorAnim(target.x, target.y),
          onComplete: () => moveToPoint(nextIndex)
        });
      };

      moveToPoint(0);
    } else {
      this.professor.anims.play("walk-down", true);
    }
  }

  private findNearbyNpc(maxDistance: number): BattleNPC | null {
    if (!this.player) return null;
    for (const entry of this.battleNpcs) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, entry.sprite.x, entry.sprite.y);
      if (dist <= maxDistance) return entry.data;
    }
    return null;
  }

  private updateProfessorAnim(targetX: number, targetY: number) {
    const dx = targetX - this.professor.x;
    const dy = targetY - this.professor.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    let key: "walk-down" | "walk-up" | "walk-left" | "walk-right" = "walk-down";
    if (absX > absY) {
      key = dx > 0 ? "walk-right" : "walk-left";
    } else if (absY >= absX) {
      key = dy > 0 ? "walk-down" : "walk-up";
    }
    this.professor.anims.play(key, true);
  }

  private paintPattern(feature: WorldRect) {
    if (!feature.texture) return;
    const depth = (feature.depth ?? 2) + 0.05;
    const startX = feature.x - feature.w / 2;
    const startY = feature.y - feature.h / 2;
    const accent =
      feature.accentColor ?? this.shiftColor(feature.color, feature.texture === "water" ? 0.35 : 0.2);
    const gfx = this.add.graphics({ x: startX, y: startY });
    gfx.setDepth(depth);

    const fillDots = (tile: number, size: number, alpha = 0.3) => {
      for (let y = size; y < feature.h; y += tile) {
        for (let x = (y / tile) % 2 === 0 ? size : size * 2; x < feature.w; x += tile) {
          gfx.fillStyle(accent, alpha);
          gfx.fillRoundedRect(x - size / 2, y - size / 2, size, size, 2);
        }
      }
    };

    switch (feature.texture) {
      case "cobble":
        fillDots(28, 8, 0.25);
        break;
      case "pavers":
        gfx.lineStyle(1, accent, 0.25);
        for (let y = 16; y < feature.h; y += 16) gfx.lineBetween(0, y, feature.w, y);
        for (let x = 20; x < feature.w; x += 20) gfx.lineBetween(x, 0, x, feature.h);
        break;
      case "boardwalk":
        gfx.fillStyle(accent, 0.22);
        for (let y = 0; y < feature.h; y += 18) {
          gfx.fillRect(0, y + 4, feature.w, 6);
          gfx.lineStyle(1, this.shiftColor(accent, -0.2), 0.3);
          gfx.lineBetween(0, y + 4, feature.w, y + 4);
        }
        break;
      case "brick":
      case "clinic":
      case "plaza": {
        const brickH = 18;
        const brickW = 26;
        const brickColor = feature.texture === "clinic" ? 0xffffff : accent;
        gfx.lineStyle(1, this.shiftColor(feature.color, -0.25), 0.25);
        for (let y = 0; y < feature.h; y += brickH) {
          const offset = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
          for (let x = offset; x < feature.w; x += brickW) {
            gfx.fillStyle(brickColor, 0.18);
            gfx.fillRect(x, y, brickW - 4, brickH - 6);
            gfx.strokeRect(x, y, brickW - 4, brickH - 6);
          }
        }
        break;
      }
      case "water":
        gfx.lineStyle(2, accent, 0.3);
        for (let y = 12; y < feature.h; y += 18) {
          let prevX = 0;
          let prevY = y;
          for (let x = 6; x <= feature.w; x += 6) {
            const wave = Math.sin((x + y) / 12) * 4;
            gfx.lineBetween(prevX, prevY, x, y + wave);
            prevX = x;
            prevY = y + wave;
          }
        }
        break;
      case "grove":
        for (let i = 0; i < Math.max(6, (feature.w * feature.h) / 15000); i++) {
          const cx = Phaser.Math.Between(12, feature.w - 12);
          const cy = Phaser.Math.Between(12, feature.h - 12);
          const radius = Phaser.Math.Between(8, 18);
          gfx.fillStyle(accent, 0.35);
          gfx.fillCircle(cx, cy, radius);
          gfx.fillStyle(this.shiftColor(accent, 0.2), 0.4);
          gfx.fillCircle(cx - radius / 4, cy - radius / 4, radius / 2);
        }
        break;
    }
  }

  private decorateBuilding(feature: WorldRect) {
    const depth = (feature.depth ?? 7) + 0.2;
    const roofHeight = Math.min(32, feature.h * 0.22);
    const roofColor = feature.roofColor ?? this.shiftColor(feature.color, -0.25);
    this.add
      .rectangle(
        feature.x,
        feature.y - feature.h / 2 + roofHeight / 2 + 4,
        feature.w - 16,
        roofHeight,
        roofColor,
        0.95
      )
      .setDepth(depth);

    const trimHeight = 6;
    this.add
      .rectangle(
        feature.x,
        feature.y - feature.h / 2 + roofHeight + trimHeight / 2 + 4,
        feature.w - 12,
        trimHeight,
        this.shiftColor(roofColor, 0.2),
        0.8
      )
      .setDepth(depth + 0.01);

    const doorCfg = feature.door ?? {};
    const doorWidth = doorCfg.width ?? Math.min(60, feature.w * 0.28);
    const doorHeight = doorCfg.height ?? Math.min(70, feature.h * 0.45);
    const doorColor = doorCfg.color ?? 0x1f2937;
    const doorY = feature.y + feature.h / 2 - doorHeight / 2 - 6;
    this.add
      .rectangle(feature.x, doorY, doorWidth, doorHeight, doorColor, 1)
      .setDepth(depth + 0.02);
    this.add
      .circle(feature.x + doorWidth / 2 - 8, doorY, 3, this.shiftColor(doorColor, 0.4))
      .setDepth(depth + 0.03);

    const windows = feature.windowPattern ?? { rows: 2, cols: 2, color: 0xf8fafc };
    const usableWidth = feature.w - 30;
    const usableHeight = feature.h - roofHeight - doorHeight - 30;
    if (usableWidth <= 0 || usableHeight <= 0) return;
    const windowWidth = Math.min(28, usableWidth / (windows.cols + 0.5));
    const windowHeight = Math.min(24, usableHeight / (windows.rows + 0.7));
    const spacingX = (feature.w - windowWidth * windows.cols) / (windows.cols + 1);
    const spacingY = (feature.h - roofHeight - doorHeight - windowHeight * windows.rows) / (windows.rows + 1);

    for (let row = 0; row < windows.rows; row++) {
      for (let col = 0; col < windows.cols; col++) {
        const wx =
          feature.x - feature.w / 2 + spacingX * (col + 1) + windowWidth * col + windowWidth / 2;
        const wy =
          feature.y -
          feature.h / 2 +
          roofHeight +
          spacingY * (row + 1) +
          windowHeight * row +
          windowHeight / 2;
        const pane = this.add
          .rectangle(wx, wy, windowWidth, windowHeight, windows.color ?? 0xf8fafc, 0.92)
          .setDepth(depth + 0.02);
        pane.setStrokeStyle(1, this.shiftColor(feature.color, -0.4), 0.4);
      }
    }
  }

  private shiftColor(hex: number, percent: number) {
    const clamped = Phaser.Math.Clamp(percent, -1, 1);
    const color = Phaser.Display.Color.IntegerToColor(hex);
    if (clamped >= 0) {
      color.lighten(Math.floor(clamped * 100));
    } else {
      color.darken(Math.floor(-clamped * 100));
    }
    return Phaser.Display.Color.GetColor(color.red, color.green, color.blue);
  }

  private pickTwoRandom<T>(arr: T[]): [T, T] {
    if (arr.length < 2) throw new Error("Need at least two elements");
    const firstIndex = Phaser.Math.Between(0, arr.length - 1);
    let secondIndex = Phaser.Math.Between(0, arr.length - 1);
    if (secondIndex === firstIndex) {
      secondIndex = (secondIndex + 1) % arr.length;
    }
    return [arr[firstIndex], arr[secondIndex]];
  }

  private initAudio() {
    const audioPrefs = (window as any).__AUDIO_PREFS__ || { muted: false, musicVol: 0.6 };
    this.sound.mute = audioPrefs.muted;
    try {
      if (!this.cache.audio.exists("bgm")) {
        console.warn('[AUDIO] "bgm" not in cache; skipping music.');
        return;
      }
      this.bgm = this.sound.add("bgm", { loop: true, volume: audioPrefs.musicVol });
      const requestUnlock = () => {
        const resume = () => {
          this.sound.off(Phaser.Sound.Events.UNLOCKED, resume);
          this.startMusic();
        };
        this.sound.once(Phaser.Sound.Events.UNLOCKED, resume);
        this.input.once("pointerdown", resume);
        this.input.keyboard?.once("keydown", resume);
      };

      this.startMusic(requestUnlock);

      this.input.keyboard!.on("keydown-Y", (ev: KeyboardEvent) => {
        if (!this.bgm || ev.repeat) return;
        if (this.bgm.isPlaying) {
          this.bgm.stop();
          this.musicStoppedByPlayer = true;
        } else {
          this.musicStoppedByPlayer = false;
          this.startMusic(requestUnlock);
        }
      });

      (this as any).__bgm__ = this.bgm;
    } catch (err) {
      console.warn("[AUDIO] Failed to start BGM, continuing without music:", err);
    }
  }

  private startMusic(onBlocked?: () => void) {
    if (!this.bgm || this.bgm.isPlaying || this.musicStoppedByPlayer) return;
    if (this.sound.locked) {
      try {
        this.sound.unlock();
      } catch (unlockErr) {
        console.debug("Sound unlock failed", unlockErr);
      }
    }
    try {
      const playResult = this.bgm.play();
      const maybePromise = playResult as unknown as { catch?: (fn: (err?: any) => void) => void };
      if (maybePromise && typeof maybePromise.catch === "function") {
        maybePromise.catch(() => onBlocked?.());
      } else if (playResult === false) {
        onBlocked?.();
      }
    } catch (err) {
      console.debug("BGM play blocked; awaiting unlock.", err);
      onBlocked?.();
    }
  }
}
