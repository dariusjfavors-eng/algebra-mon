export type GymCfg = {
  unit: string;
  x: number;
  y: number;
  threshold: number;
  name: string;
  color?: number;
  roofColor?: number;
  trimColor?: number;
  doorColor?: number;
  size?: { w: number; h: number };
  leader?: string;
  leaderTitle?: string;
  leaderTint?: number;
  pun?: string;
  floorColor?: number;
  stageColor?: number;
  carpetColor?: number;
};

export const GYMS: GymCfg[] = [
  {
    unit: "1",
    x: 205,
    y: 240,
    threshold: 1,
    name: "Unit 1 Gym",
    color: 0xf97316,
    roofColor: 0xfcd34d,
    trimColor: 0xffffff,
    doorColor: 0x78350f,
    size: { w: 240, h: 160 },
    leader: "Roxy",
    leaderTitle: "Linear Ace",
    leaderTint: 0xf97316,
    pun: "We're friends right? ... We're Alge-bruhs!!",
    floorColor: 0xfef3c7,
    stageColor: 0xfcd34d,
    carpetColor: 0xfda4af
  },
  {
    unit: "2",
    x: 1200,
    y: 520,
    threshold: 10,
    name: "Unit 2 Gym",
    color: 0x7c3aed,
    roofColor: 0xc4b5fd,
    trimColor: 0xf5f3ff,
    doorColor: 0x4c1d95,
    size: { w: 260, h: 170 },
    leader: "Vector",
    leaderTitle: "Rate Captain",
    leaderTint: 0x7c3aed,
    pun: "I'm derivative of fun — you'll slope down in no time!",
    floorColor: 0xfdf4ff,
    stageColor: 0xc4b5fd,
    carpetColor: 0x818cf8
  },
  {
    unit: "3",
    x: 1850,
    y: 120,
    threshold: 12,
    name: "Unit 3 Gym",
    color: 0x2563eb,
    roofColor: 0x60a5fa,
    trimColor: 0xe0f2fe,
    doorColor: 0x1e3a8a,
    size: { w: 270, h: 180 },
    leader: "Slope",
    leaderTitle: "Graph Guru",
    leaderTint: 0x2563eb,
    pun: "I'll intercept your plans and rise above!",
    floorColor: 0xebf2ff,
    stageColor: 0x93c5fd,
    carpetColor: 0x2563eb
  },
  {
    unit: "4",
    x: 2885,
    y: 670,
    threshold: 12,
    name: "Unit 4 Gym",
    color: 0xdb2777,
    roofColor: 0xf472b6,
    trimColor: 0xfdf2f8,
    doorColor: 0x831843,
    size: { w: 260, h: 175 },
    leader: "Iris",
    leaderTitle: "System Diva",
    leaderTint: 0xdb2777,
    pun: "My solutions are exclusive — no extraneous guests allowed!",
    floorColor: 0xfdf2f8,
    stageColor: 0xfbb6ce,
    carpetColor: 0xdb2777
  },
  {
    unit: "5",
    x: 3000,
    y: 1500,
    threshold: 14,
    name: "Unit 5 Gym",
    color: 0xf59e0b,
    roofColor: 0xfcd34d,
    trimColor: 0xfffbeb,
    doorColor: 0x92400e,
    size: { w: 280, h: 185 },
    leader: "Factor",
    leaderTitle: "Polynomial Pro",
    leaderTint: 0xf97316,
    pun: "I'll FOIL your plans before you can distribute!",
    floorColor: 0xfffbeb,
    stageColor: 0xfcd34d,
    carpetColor: 0xf97316
  },
  {
    unit: "6",
    x: 2200,
    y: 1900,
    threshold: 14,
    name: "Unit 6 Gym",
    color: 0x0ea5e9,
    roofColor: 0x67e8f9,
    trimColor: 0xe0f2fe,
    doorColor: 0x0c4a6e,
    size: { w: 280, h: 190 },
    leader: "Delta",
    leaderTitle: "Function Ranger",
    leaderTint: 0x0ea5e9,
    pun: "I always keep it real — imaginary rivals don't stand a chance!",
    floorColor: 0xecfeff,
    stageColor: 0xbae6fd,
    carpetColor: 0x0ea5e9
  },
  {
    unit: "7",
    x: 1200,
    y: 1900,
    threshold: 16,
    name: "Unit 7 Gym",
    color: 0x0f172a,
    roofColor: 0x475569,
    trimColor: 0xf8fafc,
    doorColor: 0xf59e0b,
    size: { w: 300, h: 200 },
    leader: "Nova",
    leaderTitle: "Endgame Prof",
    leaderTint: 0xf59e0b,
    pun: "Piecewise or peace-wise — your choice before we battle!",
    floorColor: 0xf8fafc,
    stageColor: 0xcbd5f5,
    carpetColor: 0xf59e0b
  }
];
