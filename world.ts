export type WorldRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: number;
  alpha?: number;
  strokeColor?: number;
  strokeWidth?: number;
  strokeAlpha?: number;
  depth?: number;
  solid?: boolean;
  label?: string;
  labelColor?: string;
  labelOffset?: { x: number; y: number };
  mapColor?: string;
  mapOpacity?: number;
  texture?:
    | "cobble"
    | "pavers"
    | "boardwalk"
    | "brick"
    | "clinic"
    | "plaza"
    | "water"
    | "grove"
    | "gravel";
  accentColor?: number;
  roofColor?: number;
  windowPattern?: { rows: number; cols: number; color?: number };
  door?: { width?: number; height?: number; color?: number };
};

export type LandmarkLabel = {
  text: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
  opacity?: number;
};

export const WORLD_BOUNDS = { width: 4200, height: 3000 };

export const SPAWN_POINT = { x: 420, y: 420 };
export const PROFESSOR_SPOT = { x: 460, y: 340 };
export const TUTOR_SPOT = { x: 520, y: 520 };
export const PROFESSOR_ROUTE = [
  { label: "Unit1Front", offset: { x: 0, y: 140 } },
  { label: "Unit1Side", offset: { x: 160, y: 110 } },
  { label: "Unit2Front", offset: { x: -20, y: 150 }, gymIndex: 1 },
  { label: "Unit1Return", offset: { x: -160, y: 120 } }
];

export const ROAD_SEGMENTS: WorldRect[] = [
  {
    x: WORLD_BOUNDS.width / 2,
    y: 360,
    w: WORLD_BOUNDS.width - 220,
    h: 100,
    color: 0x9ca3af,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.6,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: WORLD_BOUNDS.width / 2,
    y: 1600,
    w: WORLD_BOUNDS.width - 280,
    h: 90,
    color: 0x9ca3af,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.6,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 640,
    y: WORLD_BOUNDS.height / 2,
    w: 110,
    h: WORLD_BOUNDS.height - 240,
    color: 0x94a3b8,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.5,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 1780,
    y: WORLD_BOUNDS.height / 2,
    w: 120,
    h: WORLD_BOUNDS.height - 360,
    color: 0x94a3b8,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.5,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 2850,
    y: WORLD_BOUNDS.height / 2,
    w: 110,
    h: WORLD_BOUNDS.height - 320,
    color: 0x94a3b8,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.5,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 640,
    y: 420,
    w: 420,
    h: 220,
    color: 0x9ca3af,
    alpha: 0.78,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.6,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 1720,
    y: 640,
    w: 520,
    h: 260,
    color: 0x9ca3af,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.6,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 2840,
    y: 1720,
    w: 520,
    h: 260,
    color: 0x9ca3af,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.6,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 1600,
    y: 1900,
    w: 460,
    h: 200,
    color: 0x9ca3af,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.6,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: WORLD_BOUNDS.width / 2 + 420,
    y: WORLD_BOUNDS.height - 420,
    w: 720,
    h: 120,
    color: 0x9ca3af,
    alpha: 0.95,
    strokeColor: 0x7c3f13,
    strokeAlpha: 0.6,
    mapColor: "#94a3b8",
    mapOpacity: 0.6,
    texture: "gravel",
    accentColor: 0xcbd5f5
  },
  {
    x: 1100,
    y: WORLD_BOUNDS.height - 520,
    w: 3200,
    h: 80,
    color: 0xd6b370,
    alpha: 0.32,
    strokeColor: 0x78350f,
    strokeAlpha: 0.3,
    mapColor: "#b45309",
    mapOpacity: 0.45,
    texture: "boardwalk",
    accentColor: 0xfef3c7
  }
];

export const BUILDINGS: WorldRect[] = [
  {
    x: 760,
    y: 260,
    w: 170,
    h: 130,
    color: 0x14b8a6,
    strokeColor: 0x0f766e,
    solid: true,
    depth: 8,
    label: "Dormitories",
    labelOffset: { x: -70, y: -90 },
    mapColor: "#2dd4bf",
    texture: "brick",
    accentColor: 0x99f6e4,
    roofColor: 0x0f766e,
    windowPattern: { rows: 2, cols: 2, color: 0xecfeff },
    door: { width: 36, height: 52, color: 0x0c4a6e }
  },
  {
    x: 450,
    y: 500,
    w: 150,
    h: 110,
    color: 0xfacc15,
    strokeColor: 0xb45309,
    solid: true,
    depth: 8,
    label: "Cafe",
    labelOffset: { x: -50, y: -80 },
    mapColor: "#fcd34d",
    texture: "plaza",
    accentColor: 0xfef9c3,
    roofColor: 0xbe123c,
    windowPattern: { rows: 1, cols: 3, color: 0xfffbeb },
    door: { width: 46, height: 48, color: 0x7f1d1d }
  },
  {
    x: 300,
    y: 520,
    w: 150,
    h: 110,
    color: 0xf87171,
    strokeColor: 0xb91c1c,
    solid: true,
    depth: 8,
    label: "Clinic",
    labelOffset: { x: -60, y: -80 },
    mapColor: "#fecaca",
    texture: "clinic",
    accentColor: 0xfef2f2,
    roofColor: 0xbe123c,
    windowPattern: { rows: 2, cols: 2, color: 0xfef2f2 },
    door: { width: 40, height: 52, color: 0x7f1d1d }
  },
  {
    x: 1550,
    y: 660,
    w: 210,
    h: 150,
    color: 0x60a5fa,
    strokeColor: 0x1d4ed8,
    solid: true,
    depth: 8,
    label: "Library",
    labelOffset: { x: -80, y: -100 },
    mapColor: "#60a5fa",
    texture: "brick",
    accentColor: 0xbfdbfe,
    roofColor: 0x1d4ed8,
    windowPattern: { rows: 2, cols: 4, color: 0xebf4ff },
    door: { width: 52, height: 60, color: 0x172554 }
  },
  {
    x: 1750,
    y: 430,
    w: 180,
    h: 220,
    color: 0x7c3aed,
    strokeColor: 0x581c87,
    solid: true,
    depth: 8,
    label: "Research Tower",
    labelOffset: { x: -100, y: -140 },
    mapColor: "#c084fc",
    texture: "brick",
    accentColor: 0xf3e8ff,
    roofColor: 0x581c87,
    windowPattern: { rows: 3, cols: 2, color: 0xfdf4ff },
    door: { width: 40, height: 70, color: 0x312e81 }
  },
  {
    x: 1900,
    y: 520,
    w: 220,
    h: 200,
    color: 0x0ea5e9,
    strokeColor: 0x0369a1,
    solid: true,
    depth: 8,
    label: "Graph Gym",
    labelOffset: { x: -90, y: -120 },
    mapColor: "#0ea5e9",
    texture: "brick",
    accentColor: 0x7dd3fc,
    roofColor: 0x0369a1,
    windowPattern: { rows: 2, cols: 3, color: 0xebf8ff },
    door: { width: 70, height: 70, color: 0x0f172a }
  },
  {
    x: 2500,
    y: 620,
    w: 220,
    h: 180,
    color: 0x155e75,
    strokeColor: 0x082f49,
    solid: true,
    depth: 8,
    label: "Hydro Plant",
    labelOffset: { x: -90, y: -110 },
    labelColor: "#e0f2fe",
    mapColor: "#06b6d4",
    texture: "boardwalk",
    accentColor: 0x0ea5e9,
    roofColor: 0x082f49,
    windowPattern: { rows: 1, cols: 4, color: 0xe0f2fe },
    door: { width: 60, height: 60, color: 0x082f49 }
  },
  {
    x: 2700,
    y: 1500,
    w: 240,
    h: 160,
    color: 0xfbbf24,
    strokeColor: 0xb45309,
    solid: true,
    depth: 8,
    label: "Bazaar",
    labelOffset: { x: -80, y: -110 },
    mapColor: "#fcd34d",
    texture: "plaza",
    accentColor: 0xfffbeb,
    roofColor: 0x9a3412,
    windowPattern: { rows: 1, cols: 4, color: 0xfffbeb },
    door: { width: 80, height: 60, color: 0x92400e }
  },
  {
    x: 3000,
    y: 1820,
    w: 220,
    h: 160,
    color: 0xb91c1c,
    strokeColor: 0x1e3a8a,
    solid: true,
    depth: 8,
    label: "Harbor HQ",
    labelOffset: { x: -90, y: -110 },
    labelColor: "#e0f2fe",
    mapColor: "#93c5fd",
    texture: "brick",
    accentColor: 0x93c5fd,
    roofColor: 0x1e3a8a,
    windowPattern: { rows: 2, cols: 3, color: 0xebf4ff },
    door: { width: 58, height: 58, color: 0x1e3a8a }
  },
  {
    x: 3240,
    y: 1500,
    w: 110,
    h: 230,
    color: 0xfef3c7,
    strokeColor: 0xfacc15,
    solid: true,
    depth: 8,
    label: "Lighthouse",
    labelOffset: { x: -70, y: -150 },
    labelColor: "#92400e",
    mapColor: "#fde68a",
    texture: "plaza",
    accentColor: 0xfcd34d,
    roofColor: 0xf97316,
    windowPattern: { rows: 3, cols: 1, color: 0xfffbeb },
    door: { width: 36, height: 64, color: 0x92400e }
  },
  {
    x: 960,
    y: 1100,
    w: 200,
    h: 150,
    color: 0x34d399,
    strokeColor: 0x15803d,
    solid: true,
    depth: 8,
    label: "Tutor Villa",
    labelOffset: { x: -80, y: -110 },
    mapColor: "#4ade80",
    texture: "brick",
    accentColor: 0xbbf7d0,
    roofColor: 0x166534,
    windowPattern: { rows: 2, cols: 3, color: 0xf0fdf4 },
    door: { width: 52, height: 60, color: 0x052e16 }
  },
  {
    x: 1200,
    y: 1320,
    w: 240,
    h: 180,
    color: 0xf472b6,
    strokeColor: 0xbe185d,
    solid: true,
    depth: 8,
    label: "Academy Annex",
    labelOffset: { x: -110, y: -120 },
    mapColor: "#fb7185",
    texture: "brick",
    accentColor: 0xfdf2f8,
    roofColor: 0xbe185d,
    windowPattern: { rows: 2, cols: 4, color: 0xfdf2f8 },
    door: { width: 70, height: 64, color: 0x831843 }
  },
  {
    x: 3600,
    y: 1060,
    w: 220,
    h: 170,
    color: 0xc084fc,
    strokeColor: 0x7c3aed,
    solid: true,
    depth: 8,
    label: "Celestial Observatory",
    labelOffset: { x: -130, y: -120 },
    labelColor: "#fdf4ff",
    mapColor: "#d8b4fe",
    texture: "brick",
    accentColor: 0xf3e8ff,
    roofColor: 0x6d28d9,
    windowPattern: { rows: 2, cols: 3, color: 0xfdf4ff },
    door: { width: 60, height: 64, color: 0x4c1d95 }
  },
  {
    x: 3320,
    y: 2140,
    w: 240,
    h: 160,
    color: 0x0ea5e9,
    strokeColor: 0x0369a1,
    solid: true,
    depth: 8,
    label: "Marina Terminal",
    labelOffset: { x: -110, y: -110 },
    labelColor: "#e0f2fe",
    mapColor: "#38bdf8",
    texture: "plaza",
    accentColor: 0x7dd3fc,
    roofColor: 0x075985,
    windowPattern: { rows: 1, cols: 4, color: 0xe0f2fe },
    door: { width: 70, height: 62, color: 0x0c4a6e }
  },
  {
    x: 1180,
    y: 2520,
    w: 220,
    h: 150,
    color: 0xfacc15,
    strokeColor: 0xa16207,
    solid: true,
    depth: 8,
    label: "South Labs",
    labelOffset: { x: -90, y: -110 },
    mapColor: "#fde047",
    texture: "brick",
    accentColor: 0xfefce8,
    roofColor: 0xd97706,
    windowPattern: { rows: 2, cols: 3, color: 0xfffbeb },
    door: { width: 64, height: 60, color: 0x92400e }
  }
];

export const WATER_ZONES: WorldRect[] = [
  {
    x: 2800,
    y: 520,
    w: 520,
    h: 280,
    color: 0x2563eb,
    alpha: 0.85,
    strokeColor: 0x1d4ed8,
    solid: true,
    depth: 3,
    mapColor: "#38bdf8",
    mapOpacity: 0.8,
    texture: "water",
    accentColor: 0x93c5fd
  },
  {
    x: 3000,
    y: 1850,
    w: 540,
    h: 320,
    color: 0x1d4ed8,
    alpha: 0.9,
    strokeColor: 0x1e3a8a,
    solid: true,
    depth: 3,
    mapColor: "#0ea5e9",
    mapOpacity: 0.85,
    texture: "water",
    accentColor: 0x7dd3fc
  },
  {
    x: 1800,
    y: 2000,
    w: 360,
    h: 220,
    color: 0x3b82f6,
    alpha: 0.8,
    strokeColor: 0x1e3a8a,
    solid: true,
    depth: 3,
    mapColor: "#38bdf8",
    mapOpacity: 0.75,
    texture: "water",
    accentColor: 0x93c5fd
  },
  {
    x: 3600,
    y: 720,
    w: 420,
    h: 260,
    color: 0x2563eb,
    alpha: 0.88,
    strokeColor: 0x1d4ed8,
    solid: true,
    depth: 3,
    mapColor: "#38bdf8",
    mapOpacity: 0.8,
    texture: "water",
    accentColor: 0x93c5fd
  },
  {
    x: 1400,
    y: 2620,
    w: 520,
    h: 260,
    color: 0x0ea5e9,
    alpha: 0.85,
    strokeColor: 0x075985,
    solid: true,
    depth: 3,
    mapColor: "#67e8f9",
    mapOpacity: 0.8,
    texture: "water",
    accentColor: 0x99f6e4
  }
];

export const FOREST_ZONES: WorldRect[] = [
  {
    x: 1100,
    y: 950,
    w: 600,
    h: 400,
    color: 0x14532d,
    alpha: 0.65,
    strokeColor: 0x052e16,
    solid: true,
    depth: 2,
    mapColor: "#15803d",
    mapOpacity: 0.75,
    texture: "grove",
    accentColor: 0x22c55e
  },
  {
    x: 820,
    y: 1850,
    w: 500,
    h: 360,
    color: 0x166534,
    alpha: 0.6,
    strokeColor: 0x052e16,
    solid: true,
    depth: 2,
    mapColor: "#166534",
    mapOpacity: 0.7,
    texture: "grove",
    accentColor: 0x65a30d
  },
  {
    x: 2400,
    y: 1000,
    w: 520,
    h: 420,
    color: 0x14532d,
    alpha: 0.6,
    strokeColor: 0x052e16,
    solid: true,
    depth: 2,
    mapColor: "#15803d",
    mapOpacity: 0.7,
    texture: "grove",
    accentColor: 0x22c55e
  },
  {
    x: 3200,
    y: 2300,
    w: 520,
    h: 380,
    color: 0x0f5132,
    alpha: 0.6,
    strokeColor: 0x022c22,
    solid: true,
    depth: 2,
    mapColor: "#166534",
    mapOpacity: 0.7,
    texture: "grove",
    accentColor: 0x4ade80
  },
  {
    x: 600,
    y: 2380,
    w: 480,
    h: 360,
    color: 0x14532d,
    alpha: 0.6,
    strokeColor: 0x052e16,
    solid: true,
    depth: 2,
    mapColor: "#15803d",
    mapOpacity: 0.7,
    texture: "grove",
    accentColor: 0x22c55e
  }
];

export const GRASS_PATCHES: WorldRect[] = [
  { x: 900, y: 600, w: 280, h: 180, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 1400, y: 1400, w: 340, h: 260, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 2100, y: 1500, w: 260, h: 220, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 2600, y: 1180, w: 280, h: 200, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 3200, y: 900, w: 260, h: 200, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 600, y: 1600, w: 300, h: 200, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 1800, y: 900, w: 320, h: 220, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 2200, y: 2100, w: 280, h: 180, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 3600, y: 1220, w: 300, h: 180, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 3400, y: 2400, w: 320, h: 200, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 1200, y: 2600, w: 320, h: 200, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 },
  { x: 700, y: 2200, w: 260, h: 180, color: 0x16a34a, alpha: 0.18, strokeColor: 0x065f46 }
];

export const LANDMARK_LABELS: LandmarkLabel[] = [
  { text: "Alpha Fields", x: 520, y: 620, color: "#fefce8", fontSize: 18, opacity: 0.8 },
  { text: "Graphridge City", x: 1720, y: 420, color: "#c7d2fe", fontSize: 18, opacity: 0.85 },
  { text: "Exponent Forest", x: 1120, y: 950, color: "#bbf7d0", fontSize: 16, opacity: 0.85 },
  { text: "Slope Harbor", x: 2920, y: 1500, color: "#bae6fd", fontSize: 18, opacity: 0.85 },
  { text: "Delta Plains", x: 2000, y: 1900, color: "#fde68a", fontSize: 16, opacity: 0.8 },
  { text: "Aurora Coast", x: 3600, y: 760, color: "#fbcfe8", fontSize: 18, opacity: 0.85 },
  { text: "South Loop Sound", x: 1500, y: 2620, color: "#cffafe", fontSize: 16, opacity: 0.85 },
  { text: "Verdant Verge", x: 3300, y: 2340, color: "#bbf7d0", fontSize: 16, opacity: 0.8 }
];
