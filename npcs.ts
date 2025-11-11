export type BattleNPC = {
  id: string;
  name: string;
  title?: string;
  x: number;
  y: number;
  tint?: number;
  frame?: number;
  skill: number; // chance the NPC answers correctly
  units?: string[];
  flavor?: string;
  lossesToLose?: number;
};

export const BATTLE_NPCS: BattleNPC[] = [
  {
    id: "sprout",
    name: "Coach Sprout",
    title: "Slope Rookie",
    x: 640,
    y: 780,
    tint: 0x4ade80,
    frame: 6,
    skill: 0.55,
    units: ["1"],
    flavor: "Boosts fundamentals with Unit 1 drills."
  },
  {
    id: "delta",
    name: "Agent Delta",
    title: "Rate Analyst",
    x: 1480,
    y: 1040,
    tint: 0x60a5fa,
    frame: 0,
    skill: 0.68,
    units: ["2", "3"],
    flavor: "Specializes in proportional reasoning and linear forms."
  },
  {
    id: "ember",
    name: "Scout Ember",
    title: "Inequality Ace",
    x: 1820,
    y: 2240,
    tint: 0xf87171,
    frame: 9,
    skill: 0.72,
    units: ["3", "4"],
    flavor: "Pressures you with compounding inequality questions."
  },
  {
    id: "noir",
    name: "Captain Noir",
    title: "Systems Tactician",
    x: 2460,
    y: 1480,
    tint: 0x6366f1,
    frame: 3,
    skill: 0.75,
    units: ["4", "5"],
    flavor: "Switches between substitution and elimination mind games."
  },
  {
    id: "flux",
    name: "Ranger Flux",
    title: "Function Scout",
    x: 3140,
    y: 2120,
    tint: 0x2dd4bf,
    frame: 7,
    skill: 0.65,
    units: ["5", "6"],
    flavor: "Reads patterns in tables before you can blink."
  },
  {
    id: "tundra",
    name: "Lt. Tundra",
    title: "Expression Guard",
    x: 980,
    y: 2320,
    tint: 0xfef3c7,
    frame: 2,
    skill: 0.58,
    units: ["6", "7"],
    flavor: "Keeps a cool head while factoring expressions."
  },
  {
    id: "aurora",
    name: "Aurora",
    title: "Endgame Mentor",
    x: 3620,
    y: 1080,
    tint: 0xf472b6,
    frame: 11,
    skill: 0.82,
    units: ["7"],
    flavor: "Finishes battles with advanced synthesis questions.",
    lossesToLose: 4
  }
];
