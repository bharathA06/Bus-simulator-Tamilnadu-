import { BUS_LIVERIES, PAINT_PALETTE, TimeOfDayId, UPHOLSTERY_STYLES, WeatherId, WHEEL_STYLES } from './constants';
import { DailyMissionsState, getLocalDateKey, syncDailyMissionsState } from './dailyMissions';

export type GameMode = 'free' | 'career';
export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';
export type SpeedUnit = 'kmh' | 'mph';
export type ControlScheme = 'both' | 'wasd' | 'arrows';
export type SteeringControlMode = 'wheel' | 'arrows' | 'tilt';
export type OrientationPreference = 'auto' | 'landscape' | 'portrait';
export type TrafficDensity = 'off' | 'light' | 'normal' | 'heavy' | 'rush';
export type TrafficSpeedMode = 'calm' | 'normal' | 'fast';

export interface BusShopSpec {
  liveryId: string;
  price: number;
  engineHp: number;
  topSpeedKmh: number;
  brakingScore: number;
  comfortScore: number;
  seats: number;
  weightKg: number;
  lengthMeters: number;
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

export interface TripLogEntry {
  id: string;
  routeCode: string;
  routeTitle: string;
  busName: string;
  netProfit: number;
  satisfaction: number;
  kmDriven: number;
  success: boolean;
  timestamp: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  reward: number;
}

export interface GameSettings {
  graphicsQuality: GraphicsQuality;
  targetFps: 30 | 60 | 0; // 0 = Auto / Native Display
  masterVolume: number; // 0..100
  musicVolume: number; // 0..100
  steeringSensitivity: number; // 0.5..1.8
  cameraSensitivity: number; // 0.5..2.0
  defaultCamera: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  speedUnit: SpeedUnit;
  autoReverse: boolean;
  manualGearbox: boolean;
  speedLimiter80: boolean;
  controlScheme: ControlScheme;
  steeringMode: SteeringControlMode;
  vibrationEnabled: boolean;
  orientationPreference: OrientationPreference;
  hudOpacity: number; // 0.65..1.0
  voiceNavigation: boolean;
  preferredTimeOfDay: TimeOfDayId;
  preferredWeather: WeatherId;
  trafficDensity: TrafficDensity;
  trafficSpeed: TrafficSpeedMode;
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
  unlockedAchievements: string[];
  tripLogs: TripLogEntry[];
  dailyMissions: DailyMissionsState;
  settings: GameSettings;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_trip', title: 'First Departure', desc: 'Complete your first Tamil Nadu passenger trip', reward: 150 },
  { id: 'ghat_master', title: 'Ghat Pilot', desc: 'Drive 5+ cumulative km across hills & highways', reward: 250 },
  { id: 'fleet_owner', title: 'Depot Magnate', desc: 'Own at least 3 Tamil Nadu buses in your fleet', reward: 400 },
  { id: 'five_star_service', title: '5-Star Conductor', desc: 'Complete a route with 90%+ passenger satisfaction', reward: 300 },
  { id: 'highway_veteran', title: 'State Highway Veteran', desc: 'Complete 5 scheduled Career trips', reward: 500 },
];

export const BUS_SHOP_SPECS: BusShopSpec[] = [
  {
    liveryId: 'tnstc_ordinary',
    price: 0,
    engineHp: 195,
    topSpeedKmh: 78,
    brakingScore: 74,
    comfortScore: 72,
    seats: 48,
    weightKg: 10800,
    lengthMeters: 11.0,
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
    weightKg: 11400,
    lengthMeters: 11.8,
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
    weightKg: 11800,
    lengthMeters: 12.0,
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
    weightKg: 12200,
    lengthMeters: 12.0,
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
    weightKg: 12600,
    lengthMeters: 12.5,
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
    weightKg: 13400,
    lengthMeters: 13.0,
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
    weightKg: 13600,
    lengthMeters: 13.2,
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
    weightKg: 14500,
    lengthMeters: 13.8,
    chassisModel: 'B11R Multi-Axle Panorama Luxury',
    unlockLevel: 4,
  },
];

export const UPGRADE_CATALOG: UpgradeItem[] = [
  {
    id: 'engine_stage2',
    name: 'Turbo Diesel Stage II Tune',
    category: 'powertrain',
    description: 'Higher low-end torque for Nilgiri & Valparai ghat climbs and +16% acceleration.',
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
  graphicsQuality: 'medium', // Balanced default for mobile smartphones & tablets
  targetFps: 60,
  masterVolume: 80,
  musicVolume: 45,
  steeringSensitivity: 1.0,
  cameraSensitivity: 1.0,
  defaultCamera: 0, // First-person Driver Cockpit default!
  speedUnit: 'kmh',
  autoReverse: true,
  manualGearbox: false,
  speedLimiter80: true,
  controlScheme: 'both',
  steeringMode: 'wheel',
  vibrationEnabled: true,
  orientationPreference: 'landscape',
  hudOpacity: 0.92,
  voiceNavigation: true,
  preferredTimeOfDay: 'day',
  preferredWeather: 'sunny',
  trafficDensity: 'normal',
  trafficSpeed: 'normal',
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
  unlockedAchievements: [],
  tripLogs: [],
  dailyMissions: syncDailyMissionsState(undefined, getLocalDateKey()),
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
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
      tripLogs: Array.isArray(parsed.tripLogs) ? parsed.tripLogs : [],
      dailyMissions: syncDailyMissionsState(parsed.dailyMissions, getLocalDateKey()),
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
