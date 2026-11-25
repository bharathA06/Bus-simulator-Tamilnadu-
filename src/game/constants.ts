export type EnvironmentZone = 'city' | 'highway' | 'hill' | 'village' | 'coastal';

export interface BusStop {
  id: string;
  nameEn: string;
  nameTa: string;
  city: string;
  x: number;
  z: number;
  radius: number;
  passengersWaiting: number;
  passengerGroup: 'Commuters' | 'Students' | 'Pilgrims' | 'Tourists';
  landmark: string;
  environment: EnvironmentZone;
  roadAxis: 'vertical' | 'horizontal' | 'curved';
  idealHeading: number;
  shelterOffsetX: number;
  shelterOffsetZ: number;
  shelterRotY: number;
  ticketRate: number;
  unlockLevel: number;
}

export interface RouteDefinition {
  id: string;
  code: string;
  titleEn: string;
  titleTa: string;
  description: string;
  stops: string[];
  targetSeconds: number;
  baseReward: number;
  color: string;
  unlockLevel: number;
}

export interface BusLivery {
  id: string;
  busClass: string;
  name: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bodyColorHex: number;
  stripeColorHex: number;
  roofColorHex: number;
  hornDefault: number;
  ledTamil: string;
  ledEnglish: string;
  isSleeper?: boolean;
  defaultReg: string;
}

export interface HornSoundOption {
  id: number;
  name: string;
  desc: string;
  shortcut: string;
}

export interface HighwayFacility {
  id: string;
  type: 'toll' | 'petrol' | 'rail_crossing' | 'bridge' | 'rest_stop' | 'police_check' | 'construction';
  name: string;
  x: number;
  z: number;
  axis: 'vertical' | 'horizontal';
  radius: number;
  fee?: number;
}

export interface CurvedRoadSegment {
  id: string;
  name: string;
  zone: EnvironmentZone;
  width: number;
  speedLimitKmh: number;
  fromAnchor: { x: number; z: number; axis: 'vertical' | 'horizontal' };
  toAnchor: { x: number; z: number; axis: 'vertical' | 'horizontal' };
  points: Array<{ x: number; z: number }>;
}

// Expanded Tamil Nadu Open-World Road Network (5x5 Trunk Highways + Winding Mountain Hairpins)
export const ROAD_NETWORK = {
  verticalX: [-480, -240, 0, 240, 480] as readonly number[],
  horizontalZ: [-520, -260, 0, 260, 520] as readonly number[],
  roadWidth: 20, // 20m divided 4-lane highways & city boulevards
  medianWidth: 1.4,
  laneOffset: 5.2,
  innerLaneOffset: 2.6,
  uturnBaysVerticalZ: [-390, -130, 130, 390] as readonly number[],
  uturnBaysHorizontalX: [-360, -120, 120, 360] as readonly number[],
  minX: -620,
  maxX: 620,
  minZ: -660,
  maxZ: 660,
};

/**
 * Scenic curved mountain hairpin & coastal bypass routes connected directly into the trunk highway grid.
 */
export const CURVED_ROADS: CurvedRoadSegment[] = [
  {
    id: 'ghat_ooty_hairpins',
    name: 'Nilgiri 36-Hairpin Kallar–Ooty Ghat Road',
    zone: 'hill',
    width: 14,
    speedLimitKmh: 40,
    fromAnchor: { x: -240, z: -260, axis: 'horizontal' },
    toAnchor: { x: -480, z: -520, axis: 'vertical' },
    points: [
      { x: -252, z: -260 },
      { x: -305, z: -285 },
      { x: -292, z: -340 },
      { x: -365, z: -365 },
      { x: -348, z: -425 },
      { x: -430, z: -445 },
      { x: -415, z: -495 },
      { x: -468, z: -520 },
    ],
  },
  {
    id: 'ghat_valparai_hairpins',
    name: 'Aliyar – Valparai 40-Hairpin Estate Climb',
    zone: 'hill',
    width: 14,
    speedLimitKmh: 38,
    fromAnchor: { x: -480, z: 260, axis: 'vertical' },
    toAnchor: { x: -480, z: 520, axis: 'horizontal' },
    points: [
      { x: -492, z: 270 },
      { x: -555, z: 310 },
      { x: -512, z: 355 },
      { x: -575, z: 398 },
      { x: -522, z: 445 },
      { x: -565, z: 492 },
      { x: -494, z: 520 },
    ],
  },
  {
    id: 'ghat_kodaikanal_climb',
    name: 'Palani – Kodaikanal Silver Cascade Ghat',
    zone: 'hill',
    width: 14,
    speedLimitKmh: 42,
    fromAnchor: { x: -240, z: 260, axis: 'horizontal' },
    toAnchor: { x: 0, z: 260, axis: 'vertical' },
    points: [
      { x: -228, z: 260 },
      { x: -175, z: 318 },
      { x: -120, z: 290 },
      { x: -70, z: 332 },
      { x: -18, z: 274 },
    ],
  },
];

/**
 * Multi-biome continuous Tamil Nadu terrain elevation function:
 * - Nilgiri & Ooty plateau (NW) up to ~17.5m
 * - Valparai / Anaimalai Western Ghats ridge (SW-West) up to ~14.5m
 * - Kodaikanal / Palani hills plateau (South-Central West) up to ~13.5m
 * - Cauvery river channel depression around z ~ 0
 * - Rolling Kongu plains and coastal flats near Chennai / Rameswaram / Kanyakumari
 */
export function getTerrainHeight(x: number, z: number): number {
  const smoothstep = (edge0: number, edge1: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  };

  // 1. Nilgiri Hills (Ooty / Coonoor NW region)
  const nilX = smoothstep(-220, -455, x);
  const nilZ = smoothstep(-220, -485, z);
  const nilgiriLift = nilX * nilZ * 17.5;

  // 2. Valparai / Anaimalai Western Ghats (SW-West edge)
  const valX = smoothstep(-420, -565, x);
  const valZ = smoothstep(230, 380, z) * (1 - smoothstep(465, 585, z));
  const valparaiLift = valX * valZ * 14.5;

  // 3. Kodaikanal / Palani Hills plateau
  const kodX = smoothstep(-220, -145, x) * (1 - smoothstep(-50, 20, x));
  const kodZ = smoothstep(235, 315, z) * (1 - smoothstep(370, 460, z));
  const kodaiLift = kodX * kodZ * 13.0;

  // 4. Subtle undulating countryside swells outside trunk road medians
  const undulation =
    Math.sin(x * 0.009) * Math.cos(z * 0.0085) * 0.65 +
    Math.sin((x + z) * 0.005) * 0.45;

  // Keep city intersections & main highways gently graded
  const nearMajorTrunk =
    ROAD_NETWORK.verticalX.some((vx) => Math.abs(x - vx) < 16) ||
    ROAD_NETWORK.horizontalZ.some((hz) => Math.abs(z - hz) < 16);
  const swellFactor = nearMajorTrunk ? 0.18 : 1.0;

  return Math.max(0, nilgiriLift + valparaiLift + kodaiLift + Math.max(0, undulation * swellFactor));
}

export const TRAFFIC_RULES = {
  citySpeedLimitKmh: 60,
  highwaySpeedLimitKmh: 80,
  hillSpeedLimitKmh: 45,
  redLightFine: 60,
  collisionFine: 50,
  wrongWayFine: 35,
  safeStopBonus: 40,
  policeCheckFine: 100,
  policeCleanBonus: 50,
  repairCost: 150,
  washCost: 80,
  teaBreakCost: 40,
};

export const FM_RADIO_STATIONS = [
  { id: 0, name: 'FM Radio OFF', freq: '---', genre: 'Ambient Highway Only' },
  { id: 1, name: 'Kovai Melody FM', freq: '89.4', genre: 'Classic Western Ghats Acoustic' },
  { id: 2, name: 'Chennai Mass FM', freq: '93.5', genre: 'High-Energy Tamil Highway Beats' },
  { id: 3, name: 'Madurai Gold FM', freq: '98.3', genre: 'Twilight Retro Pad' },
] as const;

export const HORN_OPTIONS: HornSoundOption[] = [
  { id: 0, name: 'TNSTC Dual Air', desc: 'Classic Tamil Nadu twin brass trumpet', shortcut: '1' },
  { id: 1, name: 'Kovai DJ Melody', desc: 'Upbeat multi-note musical arpeggio', shortcut: '2' },
  { id: 2, name: 'SETC Express Horn', desc: 'Deep resonant highway air blast', shortcut: '3' },
  { id: 3, name: 'Madurai Mass Brass', desc: 'Festive high-energy chord fanfare', shortcut: '4' },
];

export const PAINT_PALETTE = [
  { id: 'tnstc_green', name: 'TNSTC Heritage Green', bodyHex: 0x059669, stripeHex: 0xfacc15, hex: '#059669' },
  { id: 'mofussil_blue', name: 'Mofussil Classic Blue', bodyHex: 0x0284c7, stripeHex: 0xf8fafc, hex: '#0284c7' },
  { id: 'setc_royal', name: 'SETC Royal Indigo', bodyHex: 0x1e3a8a, stripeHex: 0x38bdf8, hex: '#1e3a8a' },
  { id: 'express_crimson', name: 'Govt Express Crimson', bodyHex: 0xb91c1c, stripeHex: 0xfef08a, hex: '#b91c1c' },
  { id: 'marudham_amber', name: 'Nilgiri Gold & Navy', bodyHex: 0xd97706, stripeHex: 0x1e293b, hex: '#d97706' },
  { id: 'luxury_obsidian', name: 'Private Obsidian Black', bodyHex: 0x18181b, stripeHex: 0xf59e0b, hex: '#18181b' },
  { id: 'madurai_saffron', name: 'Temple Saffron Orange', bodyHex: 0xea580c, stripeHex: 0xffffff, hex: '#ea580c' },
  { id: 'coastal_teal', name: 'Kanyakumari Ocean Teal', bodyHex: 0x0f766e, stripeHex: 0xfde047, hex: '#0f766e' },
] as const;

export const UPHOLSTERY_STYLES = [
  { id: 'red_rexine', name: 'Classic TNSTC Red Rexine', hex: 0x991b1b, accent: '#dc2626' },
  { id: 'setc_blue', name: 'SETC Executive Navy Cloth', hex: 0x1e3a8a, accent: '#2563eb' },
  { id: 'luxury_cream', name: 'Private Cream Quilted Leather', hex: 0xd6c7b2, accent: '#d97706' },
] as const;

export const WHEEL_STYLES = [
  { id: 'steel', name: 'Heavy Steel Commercial', hex: 0x94a3b8 },
  { id: 'chrome', name: 'Mirror Chrome Highway', hex: 0xf8fafc },
  { id: 'gold', name: 'Brushed Gold Alloy', hex: 0xfacc15 },
] as const;

export const BUS_LIVERIES: BusLivery[] = [
  {
    id: 'tnstc_ordinary',
    busClass: 'TNSTC Ordinary',
    name: 'TNSTC Town Ordinary',
    tagline: 'தமிழ்நாடு அரசு போக்குவரத்துக் கழகம் • City Lifeline',
    primaryColor: '#059669',
    secondaryColor: '#facc15',
    accentColor: '#ffffff',
    bodyColorHex: 0x059669,
    stripeColorHex: 0xfacc15,
    roofColorHex: 0xf3f4f6,
    hornDefault: 0,
    ledTamil: 'காந்திபுரம் ➔ உக்கடம்',
    ledEnglish: 'COIMBATORE TOWN 3D',
    defaultReg: 'TN 38 N 1402',
  },
  {
    id: 'tnstc_mofussil',
    busClass: 'Mofussil Intercity',
    name: 'TNSTC District Mofussil',
    tagline: 'மாவட்ட புறநகர் • Reliable District Runner',
    primaryColor: '#0284c7',
    secondaryColor: '#f8fafc',
    accentColor: '#facc15',
    bodyColorHex: 0x0284c7,
    stripeColorHex: 0xf8fafc,
    roofColorHex: 0xffffff,
    hornDefault: 0,
    ledTamil: 'ஈரோடு ➔ திருப்பூர் ➔ சேலம்',
    ledEnglish: 'ERODE ➔ TIRUPPUR ➔ SALEM',
    defaultReg: 'TN 33 N 2819',
  },
  {
    id: 'tnstc_express',
    busClass: 'Govt Express',
    name: 'TNSTC Government Express',
    tagline: 'அரசு விரைவு பேருந்து • Limited Stop Fast Track',
    primaryColor: '#dc2626',
    secondaryColor: '#fef08a',
    accentColor: '#ffffff',
    bodyColorHex: 0xb91c1c,
    stripeColorHex: 0xfef08a,
    roofColorHex: 0xf8fafc,
    hornDefault: 2,
    ledTamil: 'மதுரை பெரியார் ➔ திருச்சி',
    ledEnglish: 'MADURAI ➔ TRICHY EXPRESS',
    defaultReg: 'TN 58 N 4092',
  },
  {
    id: 'tnstc_deluxe',
    busClass: 'TNSTC Deluxe',
    name: 'TNSTC Deluxe 2+2 Coach',
    tagline: 'டீலக்ஸ் பேருந்து • Cushioned Air Suspension',
    primaryColor: '#0f766e',
    secondaryColor: '#fbbf24',
    accentColor: '#ffffff',
    bodyColorHex: 0x0f766e,
    stripeColorHex: 0xfbbf24,
    roofColorHex: 0xf1f5f9,
    hornDefault: 1,
    ledTamil: 'ஊட்டி ➔ குன்னூர் ➔ மேட்டுப்பாளையம்',
    ledEnglish: 'OOTY ➔ COONOOR DELUXE',
    defaultReg: 'TN 43 N 0918',
  },
  {
    id: 'setc_ultra_deluxe',
    busClass: 'SETC Ultra Deluxe',
    name: 'SETC Ultra Deluxe Cruiser',
    tagline: 'அரசு விரைவு போக்குவரத்து (SETC) • State Highway King',
    primaryColor: '#1e3a8a',
    secondaryColor: '#38bdf8',
    accentColor: '#ffffff',
    bodyColorHex: 0x1e3a8a,
    stripeColorHex: 0x38bdf8,
    roofColorHex: 0xf8fafc,
    hornDefault: 2,
    ledTamil: 'சென்னை கோயம்பேடு ➔ மதுரை',
    ledEnglish: 'CHENNAI CMBT ➔ MADURAI',
    defaultReg: 'TN 01 AN 6621',
  },
  {
    id: 'setc_ac_sleeper',
    busClass: 'Sleeper Bus',
    name: 'SETC Classic AC Sleeper',
    tagline: 'குளிர்சாதன படுக்கை வசதி • Overnight Highway Cruiser',
    primaryColor: '#0f172a',
    secondaryColor: '#14b8a6',
    accentColor: '#f59e0b',
    bodyColorHex: 0x134e4a,
    stripeColorHex: 0xf59e0b,
    roofColorHex: 0xe2e8f0,
    hornDefault: 2,
    ledTamil: 'சென்னை ➔ கன்னியாகுமரி ஸ்லீப்பர்',
    ledEnglish: 'CHENNAI ➔ KANYAKUMARI SLEEPER',
    isSleeper: true,
    defaultReg: 'TN 01 AN 8845',
  },
  {
    id: 'private_semi_sleeper',
    busClass: 'Semi-Sleeper',
    name: 'Kovai Mass Semi-Sleeper',
    tagline: 'கோவை கெத்து • Private Express Highway Charger',
    primaryColor: '#ea580c',
    secondaryColor: '#18181b',
    accentColor: '#facc15',
    bodyColorHex: 0xea580c,
    stripeColorHex: 0x18181b,
    roofColorHex: 0xf8fafc,
    hornDefault: 3,
    ledTamil: 'பொள்ளாச்சி ➔ கோவை ➔ சேலம்',
    ledEnglish: 'POLLACHI ➔ KOVAI ➔ SALEM',
    isSleeper: true,
    defaultReg: 'TN 38 CQ 7777',
  },
  {
    id: 'private_luxury_volvo',
    busClass: 'Private Luxury',
    name: 'Kaveri Twin-Axle Luxury',
    tagline: 'சொகுசு பஸ் • Executive Panorama Touring Coach',
    primaryColor: '#27272a',
    secondaryColor: '#f59e0b',
    accentColor: '#ffffff',
    bodyColorHex: 0x18181b,
    stripeColorHex: 0xf59e0b,
    roofColorHex: 0x27272a,
    hornDefault: 3,
    ledTamil: 'சென்னை ➔ ராமேஸ்வரம் லக்ஸரி',
    ledEnglish: 'CHENNAI ➔ RAMESWARAM LUXURY',
    defaultReg: 'TN 09 DK 9999',
  },
];

export const HIGHWAY_FACILITIES: HighwayFacility[] = [
  { id: 'toll_nh544', type: 'toll', name: 'Neelambur Fastag Toll Plaza', x: -240, z: -130, axis: 'vertical', radius: 14, fee: 35 },
  { id: 'toll_nh48', type: 'toll', name: 'Krishnagiri-Chennai Toll Gate', x: 360, z: -520, axis: 'horizontal', radius: 14, fee: 55 },
  { id: 'toll_nh44_south', type: 'toll', name: 'Kappalur Madurai FASTag Plaza', x: 0, z: 390, axis: 'vertical', radius: 14, fee: 45 },
  { id: 'petrol_kovai', type: 'petrol', name: 'Bharat Petroleum Kongu Bunk', x: -226, z: -60, axis: 'vertical', radius: 14 },
  { id: 'petrol_trichy', type: 'petrol', name: 'IndianOil Kaveri Bunk', x: 14, z: -85, axis: 'vertical', radius: 14 },
  { id: 'petrol_madurai', type: 'petrol', name: 'HP Highway Diesel Hub (Theni)', x: -226, z: 430, axis: 'vertical', radius: 14 },
  { id: 'rail_central', type: 'rail_crossing', name: 'Southern Railway Crossing', x: 120, z: 0, axis: 'horizontal', radius: 12 },
  { id: 'rail_south', type: 'rail_crossing', name: 'Madurai–Tirunelveli Rail Gate', x: 240, z: 390, axis: 'vertical', radius: 12 },
  { id: 'bridge_pamban', type: 'bridge', name: 'Pamban Sea Viaduct', x: 480, z: 130, axis: 'vertical', radius: 22 },
  { id: 'bridge_kaveri', type: 'bridge', name: 'Cauvery Heritage Bridge', x: 0, z: 0, axis: 'vertical', radius: 22 },
  { id: 'rest_salem', type: 'rest_stop', name: 'A2B Highway Plaza & Tea Stall', x: -120, z: -528, axis: 'horizontal', radius: 16 },
  { id: 'rest_pollachi', type: 'rest_stop', name: 'Anaimalai Coconut Chai Stop', x: -360, z: 252, axis: 'horizontal', radius: 16 },
  { id: 'police_nh44', type: 'police_check', name: 'TN Traffic Police Highway Checkpost', x: -240, z: 130, axis: 'vertical', radius: 14 },
  { id: 'police_south', type: 'police_check', name: 'Tirunelveli Highway Patrol', x: 240, z: 520, axis: 'horizontal', radius: 14 },
  { id: 'const_central', type: 'construction', name: 'NH-44 Flyover Construction Zone (Slow)', x: -120, z: -260, axis: 'horizontal', radius: 16 },
];

// All 20+ Authentic Tamil Nadu Terminals across the Open-World State Network (strictly LHT kerbside!)
export const BUS_STOPS: BusStop[] = [
  {
    id: 'stop_cbt_gandhipuram',
    city: 'Coimbatore',
    nameEn: 'Coimbatore — Gandhipuram',
    nameTa: 'கோயம்புத்தூர் — காந்திபுரம்',
    x: -234.8,
    z: -165,
    radius: 9,
    passengersWaiting: 8,
    passengerGroup: 'Commuters',
    landmark: 'Gandhipuram Central Bus Terminus',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0, // Southbound (+Z) on X=-240
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 25,
    unlockLevel: 1,
  },
  {
    id: 'stop_cbt_ukkadam',
    city: 'Coimbatore',
    nameEn: 'Coimbatore — Ukkadam',
    nameTa: 'கோயம்புத்தூர் — உக்கடம்',
    x: -234.8,
    z: 65,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Commuters',
    landmark: 'Ukkadam Lake & Town Terminal',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 25,
    unlockLevel: 1,
  },
  {
    id: 'stop_cbt_singanallur',
    city: 'Coimbatore',
    nameEn: 'Coimbatore — Singanallur',
    nameTa: 'கோயம்புத்தூர் — சிங்காநல்லூர்',
    x: -140,
    z: -5.2,
    radius: 9,
    passengersWaiting: 6,
    passengerGroup: 'Students',
    landmark: 'Singanallur Trichy Road Hub',
    environment: 'city',
    roadAxis: 'horizontal',
    idealHeading: Math.PI / 2, // Eastbound (+X) on Z=0
    shelterOffsetX: 0,
    shelterOffsetZ: -7.4,
    shelterRotY: 0,
    ticketRate: 28,
    unlockLevel: 1,
  },
  {
    id: 'stop_cbt_mtp',
    city: 'Mettupalayam',
    nameEn: 'Mettupalayam Foothills',
    nameTa: 'மேட்டுப்பாளையம் பேருந்து நிலையம்',
    x: -315,
    z: -265.2,
    radius: 9,
    passengersWaiting: 6,
    passengerGroup: 'Tourists',
    landmark: 'Nilgiri Mountain Railway Foothill Gate',
    environment: 'highway',
    roadAxis: 'horizontal',
    idealHeading: Math.PI / 2,
    shelterOffsetX: 0,
    shelterOffsetZ: -7.4,
    shelterRotY: 0,
    ticketRate: 35,
    unlockLevel: 1,
  },
  {
    id: 'stop_coonoor',
    city: 'Coonoor',
    nameEn: 'Coonoor Tea Estates',
    nameTa: 'குன்னூர் மலைப்பாதை',
    x: -485.2,
    z: -345,
    radius: 9,
    passengersWaiting: 5,
    passengerGroup: 'Tourists',
    landmark: 'Sim’s Park & Nilgiri Tea Slopes',
    environment: 'hill',
    roadAxis: 'vertical',
    idealHeading: Math.PI, // Northbound (-Z) on X=-480
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 52,
    unlockLevel: 2,
  },
  {
    id: 'stop_ooty',
    city: 'Ooty',
    nameEn: 'Ooty (Udhagamandalam)',
    nameTa: 'ஊட்டி (உதகமண்டலம்)',
    x: -474.8,
    z: -445,
    radius: 9.5,
    passengersWaiting: 8,
    passengerGroup: 'Tourists',
    landmark: 'Queen of Hill Stations · Botanical Garden',
    environment: 'hill',
    roadAxis: 'vertical',
    idealHeading: 0, // Southbound (+Z) on X=-480
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 62,
    unlockLevel: 2,
  },
  {
    id: 'stop_pollachi',
    city: 'Pollachi',
    nameEn: 'Pollachi Coconut Hub',
    nameTa: 'பொள்ளாச்சி பேருந்து நிலையம்',
    x: -474.8,
    z: 175,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Commuters',
    landmark: 'Anaimalai Groves & Village Market',
    environment: 'village',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 38,
    unlockLevel: 1,
  },
  {
    id: 'stop_valparai',
    city: 'Valparai',
    nameEn: 'Valparai Tea Plateau',
    nameTa: 'வால்பாறை தேயிலை தோட்டம்',
    x: -555,
    z: 525.2,
    radius: 9.5,
    passengersWaiting: 6,
    passengerGroup: 'Tourists',
    landmark: '40-Hairpin Western Ghats Tea Estates',
    environment: 'hill',
    roadAxis: 'horizontal',
    idealHeading: -Math.PI / 2, // Westbound on Z=520
    shelterOffsetX: 0,
    shelterOffsetZ: 7.4,
    shelterRotY: Math.PI,
    ticketRate: 65,
    unlockLevel: 2,
  },
  {
    id: 'stop_tiruppur',
    city: 'Tiruppur',
    nameEn: 'Tiruppur New Bus Stand',
    nameTa: 'திருப்பூர் புதிய பேருந்து நிலையம்',
    x: -75,
    z: -254.8,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Commuters',
    landmark: 'Knitwear Capital Avinashi Highway',
    environment: 'city',
    roadAxis: 'horizontal',
    idealHeading: -Math.PI / 2, // Westbound (-X) on Z=-260
    shelterOffsetX: 0,
    shelterOffsetZ: 7.4,
    shelterRotY: Math.PI,
    ticketRate: 36,
    unlockLevel: 1,
  },
  {
    id: 'stop_erode',
    city: 'Erode',
    nameEn: 'Erode Central Terminal',
    nameTa: 'ஈரோடு மத்திய பேருந்து நிலையம்',
    x: 5.2,
    z: -165,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Students',
    landmark: 'Turmeric City & Bhavani Junction',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 44,
    unlockLevel: 1,
  },
  {
    id: 'stop_salem',
    city: 'Salem',
    nameEn: 'Salem — New Bus Stand',
    nameTa: 'சேலம் — புதிய பேருந்து நிலையம்',
    x: -245.2,
    z: -425,
    radius: 9.5,
    passengersWaiting: 8,
    passengerGroup: 'Commuters',
    landmark: 'Yercaud Foothills & NH-544 Hub',
    environment: 'highway',
    roadAxis: 'vertical',
    idealHeading: Math.PI, // Northbound (-Z) on X=-240
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 50,
    unlockLevel: 1,
  },
  {
    id: 'stop_trichy',
    city: 'Trichy',
    nameEn: 'Trichy — Central Bus Stand',
    nameTa: 'திருச்சி — மத்திய பேருந்து நிலையம்',
    x: 245.2,
    z: -165,
    radius: 9.5,
    passengersWaiting: 8,
    passengerGroup: 'Pilgrims',
    landmark: 'Rockfort Temple & Kaveri Basin',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 55,
    unlockLevel: 1,
  },
  {
    id: 'stop_palani',
    city: 'Palani',
    nameEn: 'Palani Hill Temple Stand',
    nameTa: 'பழனி அடிவாரம் பேருந்து நிலையம்',
    x: -234.8,
    z: 185,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Pilgrims',
    landmark: 'Murugan Hill Temple & Foothills',
    environment: 'village',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 46,
    unlockLevel: 1,
  },
  {
    id: 'stop_kodaikanal',
    city: 'Kodaikanal',
    nameEn: 'Kodaikanal Star Lake',
    nameTa: 'கொடைக்கானல் ஏரி நிலையம்',
    x: -115,
    z: 292,
    radius: 9.5,
    passengersWaiting: 6,
    passengerGroup: 'Tourists',
    landmark: 'Princess of Hill Stations · Coaker’s Walk',
    environment: 'hill',
    roadAxis: 'curved',
    idealHeading: Math.PI / 2,
    shelterOffsetX: 0,
    shelterOffsetZ: -7.4,
    shelterRotY: 0,
    ticketRate: 64,
    unlockLevel: 2,
  },
  {
    id: 'stop_dindigul',
    city: 'Dindigul',
    nameEn: 'Dindigul Lock & Biriyani Hub',
    nameTa: 'திண்டுக்கல் பேருந்து நிலையம்',
    x: 5.2,
    z: 115,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Commuters',
    landmark: 'Rock Fort & Highway Junction',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 52,
    unlockLevel: 1,
  },
  {
    id: 'stop_theni',
    city: 'Theni',
    nameEn: 'Theni Western Ghats Stand',
    nameTa: 'தேனி புதிய பேருந்து நிலையம்',
    x: -234.8,
    z: 365,
    radius: 9,
    passengersWaiting: 6,
    passengerGroup: 'Commuters',
    landmark: 'Cardamom & Vaigai Dam Gateway',
    environment: 'village',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 50,
    unlockLevel: 2,
  },
  {
    id: 'stop_madurai_mat',
    city: 'Madurai',
    nameEn: 'Madurai — Mattuthavani',
    nameTa: 'மதுரை — மாட்டுத்தாவணி',
    x: 115,
    z: 254.8,
    radius: 9.5,
    passengersWaiting: 9,
    passengerGroup: 'Pilgrims',
    landmark: 'MGR Integrated Bus Terminus',
    environment: 'city',
    roadAxis: 'horizontal',
    idealHeading: Math.PI / 2, // Eastbound (+X) on Z=260
    shelterOffsetX: 0,
    shelterOffsetZ: -7.4,
    shelterRotY: 0,
    ticketRate: 62,
    unlockLevel: 2,
  },
  {
    id: 'stop_madurai_per',
    city: 'Madurai',
    nameEn: 'Madurai — Periyar Bus Stand',
    nameTa: 'மதுரை — பெரியார் பேருந்து நிலையம்',
    x: 234.8,
    z: 335,
    radius: 9,
    passengersWaiting: 8,
    passengerGroup: 'Pilgrims',
    landmark: 'Meenakshi Amman Temple Old City Hub',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: Math.PI,
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 64,
    unlockLevel: 2,
  },
  {
    id: 'stop_chennai_cmbt',
    city: 'Chennai',
    nameEn: 'Chennai — CMBT Koyambedu',
    nameTa: 'சென்னை — கோயம்பேடு (CMBT)',
    x: 474.8,
    z: -440,
    radius: 10,
    passengersWaiting: 10,
    passengerGroup: 'Commuters',
    landmark: 'Asia’s Largest Bus Terminus · Koyambedu',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: Math.PI,
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 82,
    unlockLevel: 2,
  },
  {
    id: 'stop_chennai_tambaram',
    city: 'Chennai',
    nameEn: 'Chennai — Tambaram',
    nameTa: 'சென்னை — தாம்பரம்',
    x: 485.2,
    z: -335,
    radius: 9,
    passengersWaiting: 8,
    passengerGroup: 'Students',
    landmark: 'GST Road Southern Gateway',
    environment: 'highway',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 76,
    unlockLevel: 2,
  },
  {
    id: 'stop_rameswaram',
    city: 'Rameswaram',
    nameEn: 'Rameswaram Pamban Terminal',
    nameTa: 'ராமேஸ்வரம் பாம்பன் பாலம்',
    x: 485.2,
    z: 185,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Pilgrims',
    landmark: 'Pamban Sea Bridge & Ramanathaswamy Isle',
    environment: 'coastal',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 86,
    unlockLevel: 3,
  },
  {
    id: 'stop_tirunelveli',
    city: 'Tirunelveli',
    nameEn: 'Tirunelveli — Vannarpettai',
    nameTa: 'திருநெல்வேலி — வண்ணாரப்பேட்டை',
    x: 5.2,
    z: 455,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Commuters',
    landmark: 'Thamirabarani River & Halwa City Hub',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 74,
    unlockLevel: 3,
  },
  {
    id: 'stop_kanyakumari',
    city: 'Kanyakumari',
    nameEn: 'Kanyakumari Vivekananda Hub',
    nameTa: 'கன்னியாகுமரி முக்கடல் சங்கமம்',
    x: 165,
    z: 525.2,
    radius: 9.5,
    passengersWaiting: 8,
    passengerGroup: 'Tourists',
    landmark: 'Triveni Sangam Southern Tip of India',
    environment: 'coastal',
    roadAxis: 'horizontal',
    idealHeading: -Math.PI / 2,
    shelterOffsetX: 0,
    shelterOffsetZ: 7.4,
    shelterRotY: Math.PI,
    ticketRate: 92,
    unlockLevel: 3,
  },
];

export const ROUTES: RouteDefinition[] = [
  {
    id: 'route_3d_kovai',
    code: '3D',
    titleEn: 'Kongu Express: Gandhipuram ➔ Singanallur ➔ Tiruppur',
    titleTa: 'கொங்கு நகர்: காந்திபுரம் ➔ சிங்காநல்லூர் ➔ திருப்பூர்',
    description: 'Start at Gandhipuram Central, serve Ukkadam & Singanallur commuters, and cruise the industrial corridor to Tiruppur.',
    stops: ['stop_cbt_gandhipuram', 'stop_cbt_ukkadam', 'stop_cbt_singanallur', 'stop_tiruppur'],
    targetSeconds: 260,
    baseReward: 540,
    color: '#10b981',
    unlockLevel: 1,
  },
  {
    id: 'route_salem_trichy',
    code: '11M',
    titleEn: 'Delta Express: Tiruppur ➔ Erode ➔ Salem ➔ Trichy',
    titleTa: 'காவிரி எக்ஸ்பிரஸ்: திருப்பூர் ➔ ஈரோடு ➔ சேலம் ➔ திருச்சி',
    description: 'Operate TNSTC Mofussil service across the Cauvery basin with petrol bunk stops and the Cauvery Bridge crossing.',
    stops: ['stop_tiruppur', 'stop_erode', 'stop_salem', 'stop_trichy'],
    targetSeconds: 320,
    baseReward: 720,
    color: '#0ea5e9',
    unlockLevel: 1,
  },
  {
    id: 'route_nilgiri_ghat',
    code: 'OOTY',
    titleEn: 'Nilgiri Hairpin Climber: Coimbatore ➔ MTP ➔ Coonoor ➔ Ooty',
    titleTa: 'நீலகிரி மலைப்பாதை: கோவை ➔ மேட்டுப்பாளையம் ➔ குன்னூர் ➔ ஊட்டி',
    description: 'Ascend winding Kallar–Nilgiri hairpin bends into cool misty tea estates toward Coonoor and Ooty.',
    stops: ['stop_cbt_gandhipuram', 'stop_cbt_mtp', 'stop_coonoor', 'stop_ooty'],
    targetSeconds: 340,
    baseReward: 880,
    color: '#f59e0b',
    unlockLevel: 2,
  },
  {
    id: 'route_valparai_ghat',
    code: 'VLP',
    titleEn: 'Western Ghats Express: Coimbatore ➔ Pollachi ➔ Valparai',
    titleTa: 'வால்பாறை எக்ஸ்பிரஸ்: கோவை ➔ பொள்ளாச்சி ➔ வால்பாறை',
    description: 'Cruise Pollachi coconut groves and climb the 40-hairpin Aliyar–Valparai forest ridge.',
    stops: ['stop_cbt_ukkadam', 'stop_pollachi', 'stop_valparai'],
    targetSeconds: 330,
    baseReward: 850,
    color: '#14b8a6',
    unlockLevel: 2,
  },
  {
    id: 'route_temple_belt',
    code: 'SETC-1',
    titleEn: 'Hill & Temple Run: Palani ➔ Kodaikanal ➔ Dindigul ➔ Madurai',
    titleTa: 'மலை & ஆன்மீக வழித்தடம்: பழனி ➔ கொடைக்கானல் ➔ மதுரை',
    description: 'Climb Silver Cascade hairpins to Kodaikanal Star Lake, descend through Dindigul, and reach Madurai Mattuthavani.',
    stops: ['stop_palani', 'stop_kodaikanal', 'stop_dindigul', 'stop_madurai_mat'],
    targetSeconds: 360,
    baseReward: 940,
    color: '#ef4444',
    unlockLevel: 2,
  },
  {
    id: 'route_kovai_chennai',
    code: 'SETC-C',
    titleEn: 'Capital Night Flyer: Coimbatore ➔ Salem ➔ Trichy ➔ Chennai CMBT',
    titleTa: 'கோவை ➔ சேலம் ➔ சென்னை கோயம்பேடு விரைவு',
    description: 'High-speed interstate SETC trunk link across NH-544 & NH-48 into Tambaram and Koyambedu CMBT.',
    stops: ['stop_cbt_gandhipuram', 'stop_salem', 'stop_trichy', 'stop_chennai_tambaram', 'stop_chennai_cmbt'],
    targetSeconds: 420,
    baseReward: 1240,
    color: '#38bdf8',
    unlockLevel: 2,
  },
  {
    id: 'route_chennai_kk',
    code: 'SETC-X',
    titleEn: 'Grand State Cruiser: Chennai ➔ Rameswaram ➔ Madurai ➔ Tirunelveli ➔ Kanyakumari',
    titleTa: 'மாநில விரைவு: சென்னை ➔ ராமேஸ்வரம் ➔ திருநெல்வேலி ➔ கன்னியாகுமரி',
    description: 'Flagship east-coast marathon linking Koyambedu CMBT, Pamban Sea Bridge, Tirunelveli, and Kanyakumari Sangam.',
    stops: ['stop_chennai_cmbt', 'stop_rameswaram', 'stop_madurai_per', 'stop_tirunelveli', 'stop_kanyakumari'],
    targetSeconds: 480,
    baseReward: 1580,
    color: '#8b5cf6',
    unlockLevel: 3,
  },
];

export const TIME_OF_DAY_PRESETS = [
  { id: 'day', name: 'Sunny Tamil Nadu Noon', skyColor: 0x60a5fa, sunColor: 0xfffbeb, ambientColor: 0xe0e7ff, fogColor: 0x93c5fd, sunIntensity: 1.4, isNight: false },
  { id: 'sunset', name: 'Western Ghats Golden Hour', skyColor: 0xfdba74, sunColor: 0xffedd5, ambientColor: 0xfed7aa, fogColor: 0xfb923c, sunIntensity: 1.2, isNight: false },
  { id: 'night', name: 'Highway Night Express', skyColor: 0x090d16, sunColor: 0x38bdf8, ambientColor: 0x1e293b, fogColor: 0x090d16, sunIntensity: 0.35, isNight: true },
] as const;

export type TimeOfDayId = typeof TIME_OF_DAY_PRESETS[number]['id'];

export const CAMERA_MODES = [
  { id: 0, name: 'Driver Cockpit', hint: 'First-Person RHD & Animated Hands' },
  { id: 1, name: 'Dashboard View', hint: 'Focused Gauges, Wheel & Windshield' },
  { id: 2, name: 'Front Camera', hint: 'Low Bumper Highway View' },
  { id: 3, name: 'Rear Camera', hint: 'Rear Reverse & Tail Mirror' },
  { id: 4, name: 'Exterior Chase', hint: '3rd Person Coach View' },
  { id: 5, name: 'Passenger View', hint: 'Inside Cabin Aisle Seat' },
  { id: 6, name: 'Cinematic Cam', hint: 'Dynamic Three-Quarter Orbit' },
] as const;

export type WeatherId = 'sunny' | 'cloudy' | 'fog' | 'rain';

export interface WeatherPreset {
  id: WeatherId;
  name: string;
  nameTa: string;
  desc: string;
  gripFactor: number;
  rainIntensity: number;
  skyDarken: number;
  fogDensityMult: number;
  thunderInterval: number;
}

export const WEATHER_PRESETS: WeatherPreset[] = [
  {
    id: 'sunny',
    name: 'Sunny',
    nameTa: 'தெளிவான வெயில்',
    desc: 'Dry Tamil Nadu asphalt, 100% tire grip, crisp highway visibility',
    gripFactor: 1.0,
    rainIntensity: 0,
    skyDarken: 1.0,
    fogDensityMult: 1.0,
    thunderInterval: 0,
  },
  {
    id: 'cloudy',
    name: 'Cloudy',
    nameTa: 'மேகமூட்டம்',
    desc: 'Cool overcast monsoon clouds, gentle breeze, 94% tire grip',
    gripFactor: 0.94,
    rainIntensity: 0.08,
    skyDarken: 0.82,
    fogDensityMult: 1.45,
    thunderInterval: 0,
  },
  {
    id: 'fog',
    name: 'Hill Fog',
    nameTa: 'பனிமூட்டம்',
    desc: 'Dense Nilgiri & highway morning mist, reduced visibility, 85% grip',
    gripFactor: 0.85,
    rainIntensity: 0,
    skyDarken: 0.72,
    fogDensityMult: 3.1,
    thunderInterval: 0,
  },
  {
    id: 'rain',
    name: 'Monsoon Rain',
    nameTa: 'பருவமழை',
    desc: 'Heavy monsoon downpour, reflective slick roads (68% grip), wipers & thunder',
    gripFactor: 0.68,
    rainIntensity: 1.0,
    skyDarken: 0.48,
    fogDensityMult: 2.5,
    thunderInterval: 9,
  },
];
