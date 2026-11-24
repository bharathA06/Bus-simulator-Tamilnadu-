import { BUS_LIVERIES, PAINT_PALETTE, TimeOfDayId, UPHOLSTERY_STYLES, WeatherId, WHEEL_STYLES } from './constants';

export type GameMode = 'free' | 'career';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type SpeedUnit = 'kmh' | 'mph';
export type ControlScheme = 'both' | 'wasd' | 'arrows';

export interface BusShopSpec {
  liveryId: string;
  price: number;
  engineHp: number;
  topSpeedKmh: number;
  brakingScore: number;
  comfortScore: number;
  seats: number;
  chassisModel: string;
  unlockLevel: number;
}

export interface UpgradeItem {
  id: string;
  name: string;
  category: 'powertrain' | 'safety' | 'tires' | 'accessories';
  description: string;
  price: number;
  statBoost: string;
}

export interface BusCustomization {
  bodyColorHex: number;
  stripeColorHex: number;
  registrationNumber: string;
  upholsteryId: string;
  wheelStyleId: string;
}

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  targetFps: 30 | 60 | 0; // 0 = Uncapped / Native Display
  masterVolume: number; // 0..100
  musicVolume: number; // 0..100
  steeringSensitivity: number; // 0.5..1.8
  defaultCamera: 0 | 1 | 2 | 3 | 4 | 5;
  speedUnit: SpeedUnit;
  autoReverse: boolean;
  manualGearbox: boolean;
  speedLimiter80: boolean;
  controlScheme: ControlScheme;
  preferredTimeOfDay: TimeOfDayId;
  preferredWeather: WeatherId;
}

export interface PlayerProgress {
  driverName: string;
  companyName: string;
  money: number;
  xp: number;
  ownedBusIds: string[];
  selectedBusId: string;
  ownedUpgrades: string[];
  equippedUpgrades: string[];
  busCustomizations: Record<string, BusCustomization>;
  completedRoutesCount: number;
  totalPassengersCarried: number;
  totalKmDriven: number;
  totalFuelSpent: number;
  totalTollsPaid: number;
  dirtinessPct: number;
  vehicleHealthPct: number;
  settings: GameSettings;
}

export const BUS_SHOP_SPECS: BusShopSpec[] = [
  {
    liveryId: 'tnstc_ordinary',
    price: 0,
    engineHp: 195,
    topSpeedKmh: 78,
    brakingScore: 74,
    comfortScore: 72,
    seats: 48,
    chassisModel: 'TNSTC Viking Town 11M',
    unlockLevel: 1,
  },
  {
    liveryId: 'tnstc_mofussil',
    price: 650,
    engineHp: 230,
    topSpeedKmh: 84,
    brakingScore: 78,
    comfortScore: 78,
    seats: 52,
    chassisModel: 'TNSTC District Intercity 12M',
    unlockLevel: 1,
  },
  {
    liveryId: 'tnstc_express',
    price: 950,
    engineHp: 260,
    topSpeedKmh: 88,
    brakingScore: 82,
    comfortScore: 82,
    seats: 50,
    chassisModel: 'TN Express Fast-Track BS6',
    unlockLevel: 1,
  },
  {
    liveryId: 'tnstc_deluxe',
    price: 1350,
    engineHp: 280,
    topSpeedKmh: 90,
    brakingScore: 85,
    comfortScore: 86,
    seats: 44,
    chassisModel: 'TNSTC Air-Ride Deluxe 2+2',
    unlockLevel: 2,
  },
  {
    liveryId: 'setc_ultra_deluxe',
    price: 1800,
    engineHp: 310,
    topSpeedKmh: 94,
    brakingScore: 88,
    comfortScore: 90,
    seats: 40,
    chassisModel: 'SETC Ultra Deluxe Cruiser',
    unlockLevel: 2,
  },
  {
    liveryId: 'setc_ac_sleeper',
    price: 2400,
    engineHp: 335,
    topSpeedKmh: 96,
    brakingScore: 90,
    comfortScore: 94,
    seats: 32,
    chassisModel: 'SETC Twin-Deck AC Sleeper',
    unlockLevel: 3,
  },
  {
    liveryId: 'private_semi_sleeper',
    price: 2900,
    engineHp: 360,
    topSpeedKmh: 98,
    brakingScore: 92,
    comfortScore: 95,
    seats: 38,
    chassisModel: 'Kovai Private Semi-Sleeper',
    unlockLevel: 3,
  },
  {
    liveryId: 'private_luxury_volvo',
    price: 3800,
    engineHp: 410,
    topSpeedKmh: 102,
    brakingScore: 96,
    comfortScore: 99,
    seats: 44,
    chassisModel: 'B11R Multi-Axle Panorama Luxury',
    unlockLevel: 4,
  },
];

export const UPGRADE_CATALOG: UpgradeItem[] = [
  {
    id: 'engine_stage2',
    name: 'Turbo Diesel Stage II Tune',
    category: 'powertrain',
    description: 'Higher low-end torque for Nilgiri ghat climbs and +16% acceleration.',
    price: 420,
    statBoost: '+16% Acceleration',
  },
  {
    id: 'abs_brakes',
    name: 'ABS Pneumatic Air Brakes',
    category: 'safety',
    description: 'Shorter downhill & emergency stopping distances and faster PSI recovery.',
    price: 360,
    statBoost: '+18% Braking Power',
  },
  {
    id: 'monsoon_tires',
    name: 'Western Ghats Wet-Grip Radials',
    category: 'tires',
    description: 'Deep hydroplane tread boosting wet grip in rain and hill fog.',
    price: 390,
    statBoost: '+16% Wet Traction',
  },
  {
    id: 'air_horn_pack',
    name: 'Multi-Tone Brass Horn Kit',
    category: 'accessories',
    description: 'High-output air horn compressor with full Tamil Nadu melody banks.',
    price: 240,
    statBoost: 'Custom Brass Horns',
  },
  {
    id: 'interior_comfort',
    name: 'Executive Cabin & Push-Back Seats',
    category: 'accessories',
    description: 'Boosts passenger ticket earnings by +18% per completed trip.',
    price: 550,
    statBoost: '+18% Fare Income',
  },
  {
    id: 'aux_fuel_tank',
    name: 'Long-Haul 420L Auxiliary Diesel Tank',
    category: 'powertrain',
    description: 'Reduces fuel burn rate by 30% across cross-state trips to Kanyakumari.',
    price: 480,
    statBoost: '-30% Fuel Burn',
  },
];

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsQuality: 'high',
  targetFps: 60,
  masterVolume: 80,
  musicVolume: 45,
  steeringSensitivity: 1.0,
  defaultCamera: 0, // First-person Driver Cockpit default!
  speedUnit: 'kmh',
  autoReverse: true,
  manualGearbox: false,
  speedLimiter80: true,
  controlScheme: 'both',
  preferredTimeOfDay: 'day',
  preferredWeather: 'sunny',
};

export const DEFAULT_PROGRESS: PlayerProgress = {
  driverName: 'Bharath Arumugam',
  companyName: 'Tamil Nadu State & Express Fleet',
  money: 1500,
  xp: 120,
  ownedBusIds: [BUS_LIVERIES[0].id],
  selectedBusId: BUS_LIVERIES[0].id,
  ownedUpgrades: [],
  equippedUpgrades: [],
  busCustomizations: {},
  completedRoutesCount: 0,
  totalPassengersCarried: 0,
  totalKmDriven: 0,
  totalFuelSpent: 0,
  totalTollsPaid: 0,
  dirtinessPct: 8,
  vehicleHealthPct: 100,
  settings: DEFAULT_SETTINGS,
};

const STORAGE_KEY = 'tn_bus_sim_progress_v2';

export function getDriverRank(xp: number): string {
  if (xp < 300) return 'Beginner Trainee Driver';
  if (xp < 600) return 'Town Route Driver';
  if (xp < 1000) return 'District Mofussil Pilot';
  if (xp < 1500) return 'SETC Express Captain';
  if (xp < 2200) return 'Nilgiri Ghat Specialist';
  return 'Tamil Nadu Master Pilot';
}

export function getCareerLevel(xp: number): {
  level: number;
  rank: string;
  currentLevelXp: number;
  nextLevelXp: number;
} {
  const xpPerLevel = 300;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXp = xp % xpPerLevel;
  return { level, rank: getDriverRank(xp), currentLevelXp, nextLevelXp: xpPerLevel };
}

export function getEffectiveBusCustomization(progress: PlayerProgress, busId: string): BusCustomization {
  const livery = BUS_LIVERIES.find((b) => b.id === busId) || BUS_LIVERIES[0];
  const saved = progress.busCustomizations[busId];
  return {
    bodyColorHex: saved?.bodyColorHex ?? livery.bodyColorHex,
    stripeColorHex: saved?.stripeColorHex ?? livery.stripeColorHex,
    registrationNumber: saved?.registrationNumber || livery.defaultReg,
    upholsteryId: saved?.upholsteryId || UPHOLSTERY_STYLES[0].id,
    wheelStyleId: saved?.wheelStyleId || WHEEL_STYLES[0].id,
  };
}

export function getPaintSwatchHex(bodyColorHex: number): string {
  const found = PAINT_PALETTE.find((p) => p.bodyHex === bodyColorHex);
  return found ? found.hex : '#059669';
}

export function loadPlayerProgress(): PlayerProgress {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_PROGRESS;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      ownedBusIds:
        Array.isArray(parsed.ownedBusIds) && parsed.ownedBusIds.length > 0
          ? parsed.ownedBusIds
          : DEFAULT_PROGRESS.ownedBusIds,
      ownedUpgrades: Array.isArray(parsed.ownedUpgrades) ? parsed.ownedUpgrades : [],
      equippedUpgrades: Array.isArray(parsed.equippedUpgrades) ? parsed.equippedUpgrades : [],
      busCustomizations:
        parsed.busCustomizations && typeof parsed.busCustomizations === 'object'
          ? parsed.busCustomizations
          : {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function savePlayerProgress(progress: PlayerProgress): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  } catch {
    // Ignore storage quota errors in sandboxed frames
  }
}
