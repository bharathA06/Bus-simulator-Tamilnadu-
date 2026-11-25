import { BUS_STOPS, RouteDefinition, TimeOfDayId, WeatherId } from './constants';

export type DailyMissionMetric =
  | 'no_damage_trips'
  | 'coimbatore_50km'
  | 'passengers_40'
  | 'monsoon_or_fog_trip'
  | 'high_satisfaction_trips'
  | 'ghat_trip'
  | 'night_express_trip'
  | 'completed_trips_4';

export interface DailyMissionDef {
  id: DailyMissionMetric;
  title: string;
  titleTa: string;
  description: string;
  target: number;
  unit: string;
  rewardCash: number;
  rewardXp: number;
}

export interface DailyMissionEntry {
  id: DailyMissionMetric;
  progress: number;
  claimed: boolean;
}

export interface DailyMissionsState {
  dateKey: string;
  missions: DailyMissionEntry[];
  sweepBonusClaimed: boolean;
}

export const DAILY_SWEEP_BONUS = {
  cash: 500,
  xp: 250,
};

export const COIMBATORE_CORRIDOR_KM_SCALE = 25;

export const DAILY_MISSION_POOL: DailyMissionDef[] = [
  {
    id: 'no_damage_trips',
    title: 'Complete 3 trips without damage',
    titleTa: 'சேதமின்றி 3 பயணங்கள் முடிக்கவும்',
    description: 'Finish 3 career trips with zero collisions and clean highway handling.',
    target: 3,
    unit: 'trips',
    rewardCash: 450,
    rewardXp: 220,
  },
  {
    id: 'coimbatore_50km',
    title: 'Drive 50 km in Coimbatore city routes',
    titleTa: 'கோவை நகர வழித்தடத்தில் 50 கி.மீ ஓட்டவும்',
    description: 'Clock 50 corridor km across Gandhipuram, Ukkadam, Singanallur, and MTP routes.',
    target: 50,
    unit: 'km',
    rewardCash: 400,
    rewardXp: 200,
  },
  {
    id: 'passengers_40',
    title: 'Board 40 Tamil Nadu passengers',
    titleTa: '40 பயணிகளை பாதுகாப்பாக ஏற்றவும்',
    description: 'Pick up commuters, students, and pilgrims across terminal bus stands.',
    target: 40,
    unit: 'pax',
    rewardCash: 320,
    rewardXp: 160,
  },
  {
    id: 'monsoon_or_fog_trip',
    title: 'Complete a Monsoon Rain or Hill Fog trip',
    titleTa: 'மழை அல்லது பனிமூட்டத்தில் ஒரு பயணம்',
    description: 'Deliver passengers safely during heavy Monsoon Rain or dense Hill Fog.',
    target: 1,
    unit: 'trip',
    rewardCash: 380,
    rewardXp: 190,
  },
  {
    id: 'high_satisfaction_trips',
    title: 'Earn 90%+ passenger rating on 2 trips',
    titleTa: '2 பயணங்களில் 90%+ பயணிகள் திருப்தி',
    description: 'Maintain smooth braking, proper indicators, and timely terminal stops.',
    target: 2,
    unit: 'trips',
    rewardCash: 420,
    rewardXp: 210,
  },
  {
    id: 'ghat_trip',
    title: 'Conquer a Western Ghats mountain route',
    titleTa: 'மலைப்பாதை பேருந்து பயணத்தை முடிக்கவும்',
    description: 'Complete a trip reaching Ooty, Coonoor, Valparai, or Kodaikanal.',
    target: 1,
    unit: 'trip',
    rewardCash: 500,
    rewardXp: 250,
  },
  {
    id: 'night_express_trip',
    title: 'Finish an Overnight Express trip',
    titleTa: 'இரவு நேர விரைவுப் பேருந்து பயணம்',
    description: 'Complete any scheduled trip under Highway Night Express conditions.',
    target: 1,
    unit: 'trip',
    rewardCash: 360,
    rewardXp: 180,
  },
  {
    id: 'completed_trips_4',
    title: 'Complete 4 passenger routes today',
    titleTa: 'இன்று 4 பயணங்களை வெற்றிகரமாக முடிக்கவும்',
    description: 'Serve terminals across the Tamil Nadu highway network in Career Mode.',
    target: 4,
    unit: 'trips',
    rewardCash: 480,
    rewardXp: 240,
  },
];

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTimeUntilMidnightLabel(now: Date = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

function hashDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateDailyMissionsForDate(dateKey: string): DailyMissionsState {
  const seed = hashDateKey(dateKey);
  const pool = [...DAILY_MISSION_POOL];

  // Ensure the signature missions anchor the initial rotation cleanly, while rotating day-to-day
  const primaryPool = pool.slice(0, 2);
  const secondaryPool = pool.slice(2);

  // Deterministic Fisher-Yates shuffle on secondary pool
  let s = seed;
  for (let i = secondaryPool.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = secondaryPool[i];
    secondaryPool[i] = secondaryPool[j];
    secondaryPool[j] = tmp;
  }

  // Day-of-month rotation: always include 1–2 signature tasks plus rotating tasks
  const dayNum = Number(dateKey.split('-')[2] || 1);
  const chosen: DailyMissionDef[] =
    dayNum % 3 === 0
      ? [primaryPool[0], primaryPool[1], secondaryPool[0]]
      : dayNum % 3 === 1
        ? [primaryPool[0], secondaryPool[0], secondaryPool[1]]
        : [primaryPool[1], secondaryPool[0], secondaryPool[1]];

  return {
    dateKey,
    missions: chosen.map((def) => ({
      id: def.id,
      progress: 0,
      claimed: false,
    })),
    sweepBonusClaimed: false,
  };
}

export function syncDailyMissionsState(
  existing: DailyMissionsState | undefined,
  dateKey: string = getLocalDateKey()
): DailyMissionsState {
  if (!existing || existing.dateKey !== dateKey || !Array.isArray(existing.missions) || existing.missions.length === 0) {
    return generateDailyMissionsForDate(dateKey);
  }
  return existing;
}

export function getMissionDef(id: DailyMissionMetric): DailyMissionDef {
  return DAILY_MISSION_POOL.find((m) => m.id === id) || DAILY_MISSION_POOL[0];
}

export function isCoimbatoreCityRouteOrZone(
  route: RouteDefinition,
  busX: number,
  busZ: number
): boolean {
  if (route.id === 'route_3d_kovai') return true;
  const cbtStopIds = new Set(
    BUS_STOPS.filter((s) => s.city === 'Coimbatore').map((s) => s.id)
  );
  const cbtStopsCount = route.stops.filter((id) => cbtStopIds.has(id)).length;
  if (cbtStopsCount >= 2) return true;
  // Also count driving inside Coimbatore metro / MTP corridor bounds
  return busX >= -520 && busX <= -140 && busZ >= -290 && busZ <= 220;
}

export function applyLiveDrivingToMissions(
  state: DailyMissionsState,
  deltaCoimbatoreKm: number,
  deltaPassengers: number,
  dateKey: string = state.dateKey || getLocalDateKey()
): { nextState: DailyMissionsState; newlyCompletedIds: DailyMissionMetric[] } {
  const synced = syncDailyMissionsState(state, dateKey);
  const newlyCompletedIds: DailyMissionMetric[] = [];
  let changed = false;

  const nextMissions = synced.missions.map((entry) => {
    const def = getMissionDef(entry.id);
    if (entry.progress >= def.target) return entry;

    let add = 0;
    if (entry.id === 'coimbatore_50km' && deltaCoimbatoreKm > 0) {
      add = deltaCoimbatoreKm;
    } else if (entry.id === 'passengers_40' && deltaPassengers > 0) {
      add = deltaPassengers;
    }

    if (add <= 0) return entry;
    changed = true;
    const rawNext = entry.progress + add;
    const clamped =
      def.unit === 'km'
        ? Math.min(def.target, Number(rawNext.toFixed(2)))
        : Math.min(def.target, Math.floor(rawNext));

    if (entry.progress < def.target && clamped >= def.target) {
      newlyCompletedIds.push(entry.id);
    }

    return {
      ...entry,
      progress: clamped,
    };
  });

  if (!changed) {
    return { nextState: synced, newlyCompletedIds: [] };
  }

  return {
    nextState: {
      ...synced,
      missions: nextMissions,
    },
    newlyCompletedIds,
  };
}

export function applyTripCompletionToMissions(
  state: DailyMissionsState,
  params: {
    success: boolean;
    collisionsCount: number;
    satisfaction: number;
    route: RouteDefinition;
    weather: WeatherId;
    timeOfDay: TimeOfDayId;
    dateKey?: string;
  }
): { nextState: DailyMissionsState; newlyCompletedIds: DailyMissionMetric[] } {
  const synced = syncDailyMissionsState(state, params.dateKey || state.dateKey || getLocalDateKey());
  if (!params.success) {
    return { nextState: synced, newlyCompletedIds: [] };
  }

  const hillStopIds = new Set(
    BUS_STOPS.filter((s) => s.environment === 'hill').map((s) => s.id)
  );
  const hasGhatStop = params.route.stops.some((id) => hillStopIds.has(id));
  const newlyCompletedIds: DailyMissionMetric[] = [];
  let changed = false;

  const nextMissions = synced.missions.map((entry) => {
    const def = getMissionDef(entry.id);
    if (entry.progress >= def.target) return entry;

    let add = 0;
    switch (entry.id) {
      case 'no_damage_trips':
        if (params.collisionsCount === 0) add = 1;
        break;
      case 'monsoon_or_fog_trip':
        if (params.weather === 'rain' || params.weather === 'fog') add = 1;
        break;
      case 'high_satisfaction_trips':
        if (params.satisfaction >= 90) add = 1;
        break;
      case 'ghat_trip':
        if (hasGhatStop) add = 1;
        break;
      case 'night_express_trip':
        if (params.timeOfDay === 'night') add = 1;
        break;
      case 'completed_trips_4':
        add = 1;
        break;
      default:
        break;
    }

    if (add <= 0) return entry;
    changed = true;
    const clamped = Math.min(def.target, entry.progress + add);
    if (entry.progress < def.target && clamped >= def.target) {
      newlyCompletedIds.push(entry.id);
    }

    return {
      ...entry,
      progress: clamped,
    };
  });

  if (!changed) {
    return { nextState: synced, newlyCompletedIds: [] };
  }

  return {
    nextState: {
      ...synced,
      missions: nextMissions,
    },
    newlyCompletedIds,
  };
}
