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
  roadAxis: 'vertical' | 'horizontal';
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

export const ROAD_NETWORK = {
  verticalX: [-240, -80, 80, 240] as readonly number[],
  horizontalZ: [-280, -100, 100, 280] as readonly number[],
  roadWidth: 20, // 20m divided 4-lane highways & city boulevards
  medianWidth: 1.4,
  laneOffset: 5.2,
  innerLaneOffset: 2.6,
  uturnBaysVerticalZ: [-190, 0, 190] as readonly number[],
  uturnBaysHorizontalX: [-160, 0, 160] as readonly number[],
  minX: -340,
  maxX: 340,
  minZ: -380,
  maxZ: 380,
};

/**
 * Smooth continuous terrain height function for Nilgiri Hills (Ooty/Coonoor plateau in NW corner)
 * so roads climb smoothly up the ghat gradient without sudden steps.
 */
export function getTerrainHeight(x: number, z: number): number {
  const hillX = Math.max(0, Math.min(1, (-130 - x) / 110));
  const hillZ = Math.max(0, Math.min(1, (-130 - z) / 130));
  // Smoothstep curve for smooth climb up to 7.2m Nilgiri elevation
  const sx = hillX * hillX * (3 - 2 * hillX);
  const sz = hillZ * hillZ * (3 - 2 * hillZ);
  return sx * sz * 7.2;
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
  { id: 'toll_nh544', type: 'toll', name: 'Neelambur Fastag Toll Plaza', x: -80, z: -190, axis: 'vertical', radius: 13, fee: 35 },
  { id: 'toll_nh48', type: 'toll', name: 'Krishnagiri-Chennai Toll Gate', x: 160, z: -280, axis: 'horizontal', radius: 13, fee: 45 },
  { id: 'petrol_kovai', type: 'petrol', name: 'Bharat Petroleum Kongu Bunk', x: -66, z: -38, axis: 'vertical', radius: 13 },
  { id: 'petrol_trichy', type: 'petrol', name: 'IndianOil Kaveri Bunk', x: 94, z: -35, axis: 'vertical', radius: 13 },
  { id: 'rail_central', type: 'rail_crossing', name: 'Southern Railway Crossing', x: 160, z: 100, axis: 'horizontal', radius: 12 },
  { id: 'rail_south', type: 'rail_crossing', name: 'Madurai Rail Gate', x: 80, z: 190, axis: 'vertical', radius: 12 },
  { id: 'bridge_pamban', type: 'bridge', name: 'Pamban Sea Viaduct', x: 240, z: 225, axis: 'vertical', radius: 22 },
  { id: 'bridge_kaveri', type: 'bridge', name: 'Cauvery Heritage Bridge', x: 80, z: 0, axis: 'vertical', radius: 20 },
  { id: 'rest_salem', type: 'rest_stop', name: 'A2B Highway Plaza & Tea Stall', x: 14, z: -288, axis: 'horizontal', radius: 15 },
  { id: 'police_nh44', type: 'police_check', name: 'TN Traffic Police Highway Checkpost', x: -80, z: 190, axis: 'vertical', radius: 13 },
  { id: 'const_central', type: 'construction', name: 'NH Road Work & Diversion Zone (Slow)', x: 0, z: -100, axis: 'horizontal', radius: 15 },
];

// Authentic Tamil Nadu Terminals across the 4x4 State Corridor Grid (strictly LHT kerbside!)
export const BUS_STOPS: BusStop[] = [
  {
    id: 'stop_cbt_gandhipuram',
    city: 'Coimbatore',
    nameEn: 'Coimbatore — Gandhipuram',
    nameTa: 'கோயம்புத்தூர் — காந்திபுரம்',
    x: -74.8,
    z: -155,
    radius: 8.5,
    passengersWaiting: 7,
    passengerGroup: 'Commuters',
    landmark: 'Gandhipuram Central Bus Terminus',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0, // Southbound (+Z) on X=-80
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
    x: -74.8,
    z: 45,
    radius: 8.5,
    passengersWaiting: 6,
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
    x: -10,
    z: 94.8,
    radius: 8.5,
    passengersWaiting: 5,
    passengerGroup: 'Students',
    landmark: 'Singanallur Trichy Road Hub',
    environment: 'city',
    roadAxis: 'horizontal',
    idealHeading: Math.PI / 2, // Eastbound (+X) on Z=100, left curb at -Z
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
    x: -175,
    z: -105.2,
    radius: 8.5,
    passengersWaiting: 5,
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
    x: -245.2,
    z: -155,
    radius: 8.5,
    passengersWaiting: 5,
    passengerGroup: 'Tourists',
    landmark: 'Sim’s Park & Nilgiri Tea Slopes',
    environment: 'hill',
    roadAxis: 'vertical',
    idealHeading: Math.PI, // Northbound (-Z) on X=-240, left curb at -X
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 48,
    unlockLevel: 2,
  },
  {
    id: 'stop_ooty',
    city: 'Ooty',
    nameEn: 'Ooty (Udhagamandalam)',
    nameTa: 'ஊட்டி (உதகமண்டலம்)',
    x: -234.8,
    z: -215,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Tourists',
    landmark: 'Queen of Hill Stations · Botanical Garden',
    environment: 'hill',
    roadAxis: 'vertical',
    idealHeading: 0, // Southbound (+Z) on X=-240
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 58,
    unlockLevel: 2,
  },
  {
    id: 'stop_pollachi',
    city: 'Pollachi',
    nameEn: 'Pollachi Coconut Hub',
    nameTa: 'பொள்ளாச்சி பேருந்து நிலையம்',
    x: -234.8,
    z: 215,
    radius: 8.5,
    passengersWaiting: 6,
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
    id: 'stop_tiruppur',
    city: 'Tiruppur',
    nameEn: 'Tiruppur New Bus Stand',
    nameTa: 'திருப்பூர் புதிய பேருந்து நிலையம்',
    x: -20,
    z: -94.8,
    radius: 8.5,
    passengersWaiting: 6,
    passengerGroup: 'Commuters',
    landmark: 'Knitwear Capital Avinashi Highway',
    environment: 'city',
    roadAxis: 'horizontal',
    idealHeading: -Math.PI / 2, // Westbound (-X) on Z=-100, left curb at +Z
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
    x: 85.2,
    z: -155,
    radius: 8.5,
    passengersWaiting: 6,
    passengerGroup: 'Students',
    landmark: 'Turmeric City & Bhavani Junction',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 42,
    unlockLevel: 1,
  },
  {
    id: 'stop_salem',
    city: 'Salem',
    nameEn: 'Salem — New Bus Stand',
    nameTa: 'சேலம் — புதிய பேருந்து நிலையம்',
    x: -85.2,
    z: -230,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Commuters',
    landmark: 'Yercaud Foothills & NH-544 Hub',
    environment: 'highway',
    roadAxis: 'vertical',
    idealHeading: Math.PI, // Northbound (-Z) on X=-80
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 48,
    unlockLevel: 1,
  },
  {
    id: 'stop_trichy',
    city: 'Trichy',
    nameEn: 'Trichy — Central Bus Stand',
    nameTa: 'திருச்சி — மத்திய பேருந்து நிலையம்',
    x: 85.2,
    z: 45,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Pilgrims',
    landmark: 'Rockfort Temple & Kaveri Basin',
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
    id: 'stop_madurai_mat',
    city: 'Madurai',
    nameEn: 'Madurai — Mattuthavani',
    nameTa: 'மதுரை — மாட்டுத்தாவணி',
    x: 155,
    z: 94.8,
    radius: 9,
    passengersWaiting: 8,
    passengerGroup: 'Pilgrims',
    landmark: 'MGR Integrated Bus Terminus',
    environment: 'city',
    roadAxis: 'horizontal',
    idealHeading: Math.PI / 2, // Eastbound (+X) on Z=100
    shelterOffsetX: 0,
    shelterOffsetZ: -7.4,
    shelterRotY: 0,
    ticketRate: 60,
    unlockLevel: 2,
  },
  {
    id: 'stop_madurai_per',
    city: 'Madurai',
    nameEn: 'Madurai — Periyar Bus Stand',
    nameTa: 'மதுரை — பெரியார் பேருந்து நிலையம்',
    x: 74.8,
    z: 220,
    radius: 8.5,
    passengersWaiting: 7,
    passengerGroup: 'Pilgrims',
    landmark: 'Meenakshi Amman Temple Old City Hub',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: Math.PI,
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 62,
    unlockLevel: 2,
  },
  {
    id: 'stop_chennai_cmbt',
    city: 'Chennai',
    nameEn: 'Chennai — CMBT Koyambedu',
    nameTa: 'சென்னை — கோயம்பேடு (CMBT)',
    x: 234.8,
    z: -225,
    radius: 9.5,
    passengersWaiting: 9,
    passengerGroup: 'Commuters',
    landmark: 'Asia’s Largest Bus Terminus · Koyambedu',
    environment: 'city',
    roadAxis: 'vertical',
    idealHeading: Math.PI,
    shelterOffsetX: -7.4,
    shelterOffsetZ: 0,
    shelterRotY: Math.PI / 2,
    ticketRate: 78,
    unlockLevel: 2,
  },
  {
    id: 'stop_chennai_tambaram',
    city: 'Chennai',
    nameEn: 'Chennai — Tambaram',
    nameTa: 'சென்னை — தாம்பரம்',
    x: 245.2,
    z: -165,
    radius: 8.5,
    passengersWaiting: 7,
    passengerGroup: 'Students',
    landmark: 'GST Road Southern Gateway',
    environment: 'highway',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 72,
    unlockLevel: 2,
  },
  {
    id: 'stop_rameswaram',
    city: 'Rameswaram',
    nameEn: 'Rameswaram Pamban Terminal',
    nameTa: 'ராமேஸ்வரம் பாம்பன் பாலம்',
    x: 245.2,
    z: 160,
    radius: 8.5,
    passengersWaiting: 6,
    passengerGroup: 'Pilgrims',
    landmark: 'Pamban Sea Bridge & Ramanathaswamy Isle',
    environment: 'coastal',
    roadAxis: 'vertical',
    idealHeading: 0,
    shelterOffsetX: 7.4,
    shelterOffsetZ: 0,
    shelterRotY: -Math.PI / 2,
    ticketRate: 82,
    unlockLevel: 3,
  },
  {
    id: 'stop_kanyakumari',
    city: 'Kanyakumari',
    nameEn: 'Kanyakumari Vivekananda Hub',
    nameTa: 'கன்னியாகுமரி முக்கடல் சங்கமம்',
    x: 160,
    z: 285.2,
    radius: 9,
    passengersWaiting: 7,
    passengerGroup: 'Tourists',
    landmark: 'Triveni Sangam Southern Tip of India',
    environment: 'coastal',
    roadAxis: 'horizontal',
    idealHeading: -Math.PI / 2,
    shelterOffsetX: 0,
    shelterOffsetZ: 7.4,
    shelterRotY: Math.PI,
    ticketRate: 88,
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
    targetSeconds: 210,
    baseReward: 480,
    color: '#10b981',
    unlockLevel: 1,
  },
  {
    id: 'route_salem_trichy',
    code: '11M',
    titleEn: 'Delta Express: Tiruppur ➔ Erode ➔ Trichy',
    titleTa: 'காவிரி எக்ஸ்பிரஸ்: திருப்பூர் ➔ ஈரோடு ➔ திருச்சி',
    description: 'Operate TNSTC Mofussil service across the Cauvery basin with petrol bunk access and Cauvery Bridge crossing.',
    stops: ['stop_tiruppur', 'stop_erode', 'stop_trichy'],
    targetSeconds: 195,
    baseReward: 560,
    color: '#0ea5e9',
    unlockLevel: 1,
  },
  {
    id: 'route_nilgiri_ghat',
    code: 'OOTY',
    titleEn: 'Nilgiri Hill Climber: Coimbatore ➔ Mettupalayam ➔ Coonoor ➔ Ooty',
    titleTa: 'நீலகிரி மலைப்பாதை: கோவை ➔ மேட்டுப்பாளையம் ➔ குன்னூர் ➔ ஊட்டி',
    description: 'Climb out of the Kongu plains into cool misty mountain hairpins toward Coonoor tea estates and Ooty.',
    stops: ['stop_cbt_gandhipuram', 'stop_cbt_mtp', 'stop_coonoor', 'stop_ooty'],
    targetSeconds: 260,
    baseReward: 740,
    color: '#f59e0b',
    unlockLevel: 2,
  },
  {
    id: 'route_temple_belt',
    code: 'SETC-1',
    titleEn: 'Temple Highway: Trichy ➔ Madurai Mattuthavani ➔ Periyar ➔ Pollachi',
    titleTa: 'ஆன்மீக வழித்தடம்: திருச்சி ➔ மதுரை ➔ பொள்ளாச்சி',
    description: 'Navigate southern railway crossings, temple hubs in Madurai, and lush Pollachi coconut groves.',
    stops: ['stop_trichy', 'stop_madurai_mat', 'stop_madurai_per', 'stop_pollachi'],
    targetSeconds: 270,
    baseReward: 820,
    color: '#ef4444',
    unlockLevel: 2,
  },
  {
    id: 'route_chennai_kk',
    code: 'SETC-X',
    titleEn: 'Grand State Cruiser: Chennai CMBT ➔ Tambaram ➔ Rameswaram ➔ Kanyakumari',
    titleTa: 'மாநில விரைவு: சென்னை ➔ தாம்பரம் ➔ ராமேஸ்வரம் ➔ கன்னியாகுமரி',
    description: 'Flagship east-coast SETC marathon linking Koyambedu CMBT, Pamban Bridge, and Kanyakumari Sangam.',
    stops: ['stop_chennai_cmbt', 'stop_chennai_tambaram', 'stop_rameswaram', 'stop_kanyakumari'],
    targetSeconds: 340,
    baseReward: 1180,
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
  { id: 1, name: 'Front Camera', hint: 'Low Bumper Highway View' },
  { id: 2, name: 'Rear Camera', hint: 'Rear Reverse & Tail Mirror' },
  { id: 3, name: 'Exterior Chase', hint: '3rd Person Coach View' },
  { id: 4, name: 'Passenger View', hint: 'Inside Cabin Aisle Seat' },
  { id: 5, name: 'Cinematic Cam', hint: 'Dynamic Three-Quarter Orbit' },
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
