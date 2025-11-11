export type GymCfg = {
  unit: string;
  x: number;
  y: number;
  threshold: number;
  name: string;
  color?: number;
};

export const GYMS: GymCfg[] = [
  { unit: "1", x: 520, y: 360, threshold: 1, name: "Unit 1 Gym", color: 0x047857 },
  { unit: "2", x: 1200, y: 520, threshold: 10, name: "Unit 2 Gym", color: 0x7c3aed },
  { unit: "3", x: 1850, y: 600, threshold: 12, name: "Unit 3 Gym", color: 0x2563eb },
  { unit: "4", x: 2500, y: 820, threshold: 12, name: "Unit 4 Gym", color: 0xdb2777 },
  { unit: "5", x: 2900, y: 1500, threshold: 14, name: "Unit 5 Gym", color: 0xf59e0b },
  { unit: "6", x: 2200, y: 1900, threshold: 14, name: "Unit 6 Gym", color: 0x10b981 },
  { unit: "7", x: 1200, y: 1900, threshold: 16, name: "Unit 7 Gym", color: 0xef4444 },
];
