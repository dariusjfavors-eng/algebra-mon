import Phaser from "phaser";

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    this.scene.bringToTop();
    this.input.mouse?.disableContextMenu();

    const hint = this.add
      .text(10, 10, "UI Layer Active", {
        fontFamily: "monospace",
        fontSize: 10,
        color: "#94a3b8"
      })
      .setScrollFactor(0)
      .setDepth(10000);

    hint.setAlpha(0.5);
  }
}
