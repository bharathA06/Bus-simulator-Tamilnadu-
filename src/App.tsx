import { useEffect, useRef, useState, useCallback } from 'react';
import { MotionConfig } from 'motion/react';
import { Maximize2, Power, RefreshCw, RotateCw } from 'lucide-react';
import { GameEngine, GameTelemetry } from './game/gameEngine';
import { CanvasEngine } from './game/canvasEngine';
import {
  BUS_LIVERIES,
  BUS_STOPS,
  ROUTES,
  BusLivery,
  RouteDefinition,
  TimeOfDayId,
  WeatherId,
} from './game/constants';
import {
  ACHIEVEMENTS,
  BusCustomization,
  GameMode,
  GameSettings,
  PlayerProgress,
  TrafficDensity,
  TrafficSpeedMode,
  TripLogEntry,
  getCareerLevel,
  getEffectiveBusCustomization,
  loadPlayerProgress,
  savePlayerProgress,
} from './game/gameStore';
import { ROAD_NAMES_VERTICAL } from './game/navigationSystem';
import { ConvoyPeerTelemetry, convoySync } from './game/convoySync';
import {
  COIMBATORE_CORRIDOR_KM_SCALE,
  DAILY_SWEEP_BONUS,
  DailyMissionMetric,
  applyLiveDrivingToMissions,
  applyTripCompletionToMissions,
  getLocalDateKey,
  getMissionDef,
  isCoimbatoreCityRouteOrZone,
  syncDailyMissionsState,
} from './game/dailyMissions';
import { IntroSequence, LoadingScreen } from './components/IntroLoadingScreens';
import { MainMenu } from './components/MainMenu';
import { InteractiveMapScreen } from './components/InteractiveMapScreen';
import { GarageScreen } from './components/GarageScreen';
import { ShopScreen } from './components/ShopScreen';
import { BusDepotScreen } from './components/BusDepotScreen';
import { MultiplayerScreen } from './components/MultiplayerScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { GameHUD } from './components/GameHUD';
import { PauseModal, GameOverModal } from './components/GameModals';
import { OfflineIndicator } from './components/OfflineIndicator';
import { busAudio } from './audio/busAudio';

type ScreenState =
  | 'INTRO'
  | 'LOADING'
  | 'MAIN_MENU'
  | 'MAP_PLANNER'
  | 'GARAGE'
  | 'SHOP'
  | 'BUS_DEPOT'
  | 'MULTIPLAYER'
  | 'SETTINGS'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAMEOVER'
  | 'EXITED';

interface SimulatorEngine {
  setRoute: (r: RouteDefinition) => void;
  setLivery: (l: BusLivery) => void;
  setCustomization: (c: BusCustomization) => void;
  setGameMode: (mode: GameMode) => void;
  setShowcaseOrbit: (active: boolean) => void;
  applySettings: (settings: GameSettings, applyDefaultCamera?: boolean) => void;
  applyUpgrades: (equippedIds: string[]) => void;
  playAirHorn: () => void;
  startAirHorn: () => void;
  stopAirHorn: () => void;
  playConductorWhistle: () => void;
  setHornSound: (id: number) => void;
  toggleDoors: () => void;
  toggleReverse: () => void;
  toggleParkingBrake: () => void;
  shiftGearUp: () => void;
  shiftGearDown: () => void;
  refuelBus: () => void;
  setCondition: (healthPct: number, dirtinessPct: number) => void;
  toggleIgnition: () => void;
  cycleRadioStation: () => void;
  setRadioStation: (id: number) => void;
  restAtStop: () => void;
  repairBusRoadside: () => void;
  washBusRoadside: () => void;
  adjustSeat: (deltaY: number) => void;
  toggleMirrorView: () => void;
  announceNextStop: () => void;
  startReplay: () => void;
  stopReplay: () => void;
  toggleReplayPause: () => void;
  setReplaySpeed: (mult: 1 | 2) => void;
  scrubReplay: (pct: number) => void;
  toggleHeadlights: () => void;
  toggleHighBeam: () => void;
  toggleLeftIndicator: () => void;
  toggleRightIndicator: () => void;
  toggleHazardLights: () => void;
  toggleCruiseControl: () => void;
  toggleWipers: () => void;
  cycleCamera: () => void;
  setCameraMode: (m: number) => void;
  setCameraLookDelta: (dxNorm: number, dyNorm: number) => void;
  resetCameraLook: () => void;
  setTimeOfDay: (t: TimeOfDayId) => void;
  setWeather: (w: WeatherId) => void;
  cycleWeather: () => void;
  setConvoyPeers: (peers: ConvoyPeerTelemetry[]) => void;
  setMobileInput: (
    th: number,
    st: number,
    br: boolean | number,
    rev: boolean,
    clutch?: boolean,
    handbrake?: boolean
  ) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SimulatorEngine | null>(null);

  const [progress, setProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
  const [screen, setScreen] = useState<ScreenState>('INTRO');
  const [activeMode, setActiveMode] = useState<GameMode>('career');
  const [mapInitialFocus, setMapInitialFocus] = useState<'map' | 'route'>('route');
  const [selectedRoute, setSelectedRoute] = useState<RouteDefinition>(ROUTES[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [is2DMode, setIs2DMode] = useState<boolean>(false);
  const [isPortrait, setIsPortrait] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );
  const [gameOverData, setGameOverData] = useState<{
    isVictory: boolean;
    earnings: number;
    fuelSpent: number;
    tollsPaid: number;
    xpEarned: number;
    satisfaction: number;
  }>({
    isVictory: false,
    earnings: 0,
    fuelSpent: 0,
    tollsPaid: 0,
    xpEarned: 0,
    satisfaction: 100,
  });

  const activeLivery =
    BUS_LIVERIES.find((b) => b.id === progress.selectedBusId) || BUS_LIVERIES[0];
  const activeCustom = getEffectiveBusCustomization(progress, activeLivery.id);
  const levelInfo = getCareerLevel(progress.xp);

  const activeModeRef = useRef<GameMode>(activeMode);
  activeModeRef.current = activeMode;
  const selectedRouteRef = useRef<RouteDefinition>(selectedRoute);
  selectedRouteRef.current = selectedRoute;
  const activeLiveryRef = useRef<BusLivery>(activeLivery);
  activeLiveryRef.current = activeLivery;
  const driverNameRef = useRef<string>(progress.driverName);
  driverNameRef.current = progress.driverName;

  const distanceRef = useRef<number>(0);
  const passengersBoardedRef = useRef<number>(0);
  const lastConvoyPushRef = useRef<number>(0);
  const lastLiveMissionDistRef = useRef<number>(0);
  const lastLiveMissionPaxRef = useRef<number>(0);
  const liveCbtKmAccumRef = useRef<number>(0);
  const livePaxAccumRef = useRef<number>(0);
  const lastLiveMissionFlushRef = useRef<number>(0);
  const lastWeatherRef = useRef<WeatherId>(progress.settings.preferredWeather);
  const lastTimeOfDayRef = useRef<TimeOfDayId>(progress.settings.preferredTimeOfDay);
  const [dailyMissionBanner, setDailyMissionBanner] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);
  const prevDefaultCameraRef = useRef<number>(progress.settings.defaultCamera);
  const prevCompletedMissionsRef = useRef<{ dateKey: string; completedIds: Set<DailyMissionMetric> }>({
    dateKey: progress.dailyMissions.dateKey,
    completedIds: new Set(
      progress.dailyMissions.missions
        .filter((m) => m.progress >= getMissionDef(m.id).target)
        .map((m) => m.id)
    ),
  });

  const showMissionBanner = useCallback((ids: DailyMissionMetric[]) => {
    if (ids.length === 0) return;
    const def = getMissionDef(ids[0]);
    setDailyMissionBanner(`DAILY MISSION COMPLETED: ${def.title} (+₹${def.rewardCash} · +${def.rewardXp} XP)`);
    if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = window.setTimeout(() => setDailyMissionBanner(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) window.clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const dm = progress.dailyMissions;
    const currentCompleted = new Set<DailyMissionMetric>(
      dm.missions.filter((m) => m.progress >= getMissionDef(m.id).target).map((m) => m.id)
    );
    if (prevCompletedMissionsRef.current.dateKey !== dm.dateKey) {
      prevCompletedMissionsRef.current = { dateKey: dm.dateKey, completedIds: currentCompleted };
      return;
    }
    const newlyCompleted: DailyMissionMetric[] = [];
    currentCompleted.forEach((id) => {
      if (!prevCompletedMissionsRef.current.completedIds.has(id)) {
        newlyCompleted.push(id);
      }
    });
    prevCompletedMissionsRef.current = { dateKey: dm.dateKey, completedIds: currentCompleted };
    if (newlyCompleted.length > 0) {
      showMissionBanner(newlyCompleted);
    }
  }, [progress.dailyMissions, showMissionBanner]);

  const initialStop = BUS_STOPS[0];
  const [telemetry, setTelemetry] = useState<GameTelemetry>({
    speedKmh: 0,
    rpm: 0,
    airPressure: 115,
    fuelPct: 100,
    engineTempC: 84,
    engineRunning: false,
    fatiguePct: 5,
    healthPct: progress.vehicleHealthPct,
    dirtinessPct: progress.dirtinessPct,
    ticketsIssued: 0,
    radioStationId: 1,
    seatOffsetY: 0,
    mirrorWide: false,
    announcementText: null,
    gear: 'N',
    currentStopName: initialStop.nameEn,
    currentStopTamil: initialStop.nameTa,
    passengerGroup: initialStop.passengerGroup,
    nextStopDistanceMeters: 0,
    isAtStop: true,
    canOpenDoors: true,
    doorsOpen: false,
    parkingBrake: false,
    clutchPressed: false,
    manualGearbox: progress.settings.manualGearbox,
    passengersBoarded: 0,
    passengersOnboard: 0,
    totalMassKg: 10800,
    totalPassengers: 18,
    totalEarnings: 0,
    fuelSpentTrip: 0,
    tollsPaidTrip: 0,
    passengerSatisfaction: 100,
    timeRemaining: ROUTES[0].targetSeconds,
    routeCompleted: false,
    missionFailed: false,
    activeRoute: ROUTES[0],
    cameraMode: progress.settings.defaultCamera,
    timeOfDay: progress.settings.preferredTimeOfDay,
    weather: progress.settings.preferredWeather,
    gripFactor: 1.0,
    isDrifting: false,
    isBraking: false,
    leftIndicator: false,
    rightIndicator: false,
    hazardLights: false,
    wipersOn: false,
    cruiseSpeed: null,
    headlightsOn: false,
    highBeam: false,
    activeHornId: activeLivery.hornDefault,
    livery: activeLivery,
    busX: initialStop.x,
    busZ: initialStop.z,
    busHeading: initialStop.idealHeading,
    nextStopX: initialStop.x,
    nextStopZ: initialStop.z,
    nextManeuver: 'arrive',
    maneuverDistance: 0,
    nextRoadName: ROAD_NAMES_VERTICAL[-240],
    routePolyline: [],
    trafficDots: [],
    convoyPeers: [],
    isWrongWay: false,
    isSpeeding: false,
    zoneSpeedLimitKmh: 60,
    upcomingSignal: null,
    upcomingSignalDistance: 999,
    ruleAlert: null,
    nearFacilityPrompt: null,
    gameMode: 'career',
    speedUnit: progress.settings.speedUnit,
    estimatedArrivalSec: 0,
    totalDistanceTraveledM: 0,
    isReplaying: false,
    replayPaused: false,
    replayProgressPct: 0,
    replayFrameCount: 0,
    replaySpeedMult: 1,
    collisionsCountTrip: 0,
  });

  const updateProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      savePlayerProgress(next);
      return next;
    });
  }, []);

  const handleTelemetry = useCallback(
    (t: GameTelemetry) => {
      distanceRef.current = t.totalDistanceTraveledM;
      passengersBoardedRef.current = t.passengersBoarded;
      lastWeatherRef.current = t.weather;
      lastTimeOfDayRef.current = t.timeOfDay;
      setTelemetry(t);

      // Accumulate live Coimbatore corridor km & passenger boarding deltas for Daily Missions
      if (!t.isReplaying) {
        const dMeters = t.totalDistanceTraveledM - lastLiveMissionDistRef.current;
        if (dMeters > 0 && isCoimbatoreCityRouteOrZone(t.activeRoute, t.busX, t.busZ)) {
          liveCbtKmAccumRef.current += (dMeters / 1000) * COIMBATORE_CORRIDOR_KM_SCALE;
        }
        if (t.totalDistanceTraveledM >= lastLiveMissionDistRef.current) {
          lastLiveMissionDistRef.current = t.totalDistanceTraveledM;
        } else {
          // Route was reset
          lastLiveMissionDistRef.current = t.totalDistanceTraveledM;
        }

        const dPax = t.passengersBoarded - lastLiveMissionPaxRef.current;
        if (dPax > 0) {
          livePaxAccumRef.current += dPax;
        }
        lastLiveMissionPaxRef.current = t.passengersBoarded;

        const nowMs = performance.now();
        if (
          (liveCbtKmAccumRef.current >= 0.3 || livePaxAccumRef.current > 0) &&
          nowMs - lastLiveMissionFlushRef.current > 1800
        ) {
          const addKm = liveCbtKmAccumRef.current;
          const addPax = livePaxAccumRef.current;
          liveCbtKmAccumRef.current = 0;
          livePaxAccumRef.current = 0;
          lastLiveMissionFlushRef.current = nowMs;

          updateProgress((prev) => ({
            ...prev,
            dailyMissions: applyLiveDrivingToMissions(prev.dailyMissions, addKm, addPax).nextState,
          }));
        }
      }

      if (convoySync.getRoomCode()) {
        const now = performance.now();
        if (now - lastConvoyPushRef.current > 220) {
          lastConvoyPushRef.current = now;
          convoySync.publishTelemetry({
            driverName: driverNameRef.current,
            liveryId: t.livery.id,
            routeId: t.activeRoute.id,
            x: t.busX,
            z: t.busZ,
            heading: t.busHeading,
            speedKmh: t.speedKmh,
            activeStopName: t.currentStopName,
          });
        }
      }
    },
    [updateProgress]
  );

  const handleRouteFinish = useCallback(
    (
      success: boolean,
      earnings: number,
      satisfaction: number,
      expenses?: {
        fuelSpent: number;
        tollsPaid: number;
        healthPct?: number;
        dirtinessPct?: number;
        collisionsCount?: number;
      }
    ) => {
      const modeNow = activeModeRef.current;
      const routeNow = selectedRouteRef.current;
      const busNow = activeLiveryRef.current;
      const xpEarned = success
        ? modeNow === 'career'
          ? 120 + Math.round(satisfaction * 0.8)
          : 40
        : 20;

      const fuelSpent = expenses?.fuelSpent ?? 0;
      const tollsPaid = expenses?.tollsPaid ?? 0;
      const netCash = earnings - fuelSpent - tollsPaid;
      const kmAdded = Number((distanceRef.current / 1000).toFixed(2));
      const paxAdded = passengersBoardedRef.current;
      const flushKm = liveCbtKmAccumRef.current;
      const flushPax = livePaxAccumRef.current;
      liveCbtKmAccumRef.current = 0;
      livePaxAccumRef.current = 0;

      const tripEntry: TripLogEntry = {
        id: `trip_${Date.now()}`,
        routeCode: routeNow.code,
        routeTitle: routeNow.titleEn,
        busName: busNow.name,
        netProfit: netCash,
        satisfaction,
        kmDriven: kmAdded,
        success,
        timestamp: Date.now(),
      };

      updateProgress((prev) => {
        const nextCompleted = success ? prev.completedRoutesCount + 1 : prev.completedRoutesCount;
        const nextKm = Number((prev.totalKmDriven + kmAdded).toFixed(2));
        const nextPax = prev.totalPassengersCarried + paxAdded;
        const unlocked = new Set(prev.unlockedAchievements);
        let achievementBonus = 0;

        const awardIf = (id: string, condition: boolean) => {
          if (condition && !unlocked.has(id)) {
            unlocked.add(id);
            const def = ACHIEVEMENTS.find((a) => a.id === id);
            if (def) achievementBonus += def.reward;
          }
        };

        awardIf('first_trip', success && nextCompleted >= 1);
        awardIf('ghat_master', nextKm >= 5);
        awardIf('fleet_owner', prev.ownedBusIds.length >= 3);
        awardIf('five_star_service', success && satisfaction >= 90);
        awardIf('highway_veteran', nextCompleted >= 5);

        const afterLive = applyLiveDrivingToMissions(prev.dailyMissions, flushKm, flushPax);
        const afterTrip = applyTripCompletionToMissions(afterLive.nextState, {
          success,
          collisionsCount: expenses?.collisionsCount ?? 0,
          satisfaction,
          route: routeNow,
          weather: lastWeatherRef.current,
          timeOfDay: lastTimeOfDayRef.current,
        });

        return {
          ...prev,
          money: Math.max(0, prev.money + netCash + achievementBonus),
          xp: prev.xp + xpEarned,
          completedRoutesCount: nextCompleted,
          totalPassengersCarried: nextPax,
          totalKmDriven: nextKm,
          totalFuelSpent: prev.totalFuelSpent + fuelSpent,
          totalTollsPaid: prev.totalTollsPaid + tollsPaid,
          vehicleHealthPct: expenses?.healthPct ?? prev.vehicleHealthPct,
          dirtinessPct: expenses?.dirtinessPct ?? prev.dirtinessPct,
          unlockedAchievements: Array.from(unlocked),
          tripLogs: [tripEntry, ...prev.tripLogs].slice(0, 30),
          dailyMissions: afterTrip.nextState,
        };
      });

      setGameOverData({
        isVictory: success,
        earnings,
        fuelSpent,
        tollsPaid,
        xpEarned,
        satisfaction,
      });
      setScreen('GAMEOVER');
    },
    [updateProgress]
  );

  const handleClaimDailyMission = useCallback(
    (missionId: DailyMissionMetric) => {
      updateProgress((prev) => {
        const synced = syncDailyMissionsState(prev.dailyMissions, getLocalDateKey());
        const targetEntry = synced.missions.find((m) => m.id === missionId);
        const def = getMissionDef(missionId);
        if (!targetEntry || targetEntry.claimed || targetEntry.progress < def.target) {
          return { ...prev, dailyMissions: synced };
        }
        return {
          ...prev,
          money: prev.money + def.rewardCash,
          xp: prev.xp + def.rewardXp,
          dailyMissions: {
            ...synced,
            missions: synced.missions.map((m) =>
              m.id === missionId ? { ...m, claimed: true } : m
            ),
          },
        };
      });
    },
    [updateProgress]
  );

  const handleClaimDailySweep = useCallback(() => {
    updateProgress((prev) => {
      const synced = syncDailyMissionsState(prev.dailyMissions, getLocalDateKey());
      const allDone =
        synced.missions.length > 0 &&
        synced.missions.every((m) => m.progress >= getMissionDef(m.id).target);
      if (!allDone || synced.sweepBonusClaimed) {
        return { ...prev, dailyMissions: synced };
      }
      return {
        ...prev,
        money: prev.money + DAILY_SWEEP_BONUS.cash,
        xp: prev.xp + DAILY_SWEEP_BONUS.xp,
        dailyMissions: {
          ...synced,
          sweepBonusClaimed: true,
        },
      };
    });
  }, [updateProgress]);

  // Track device portrait vs landscape orientation and attempt automatic landscape lock
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    const orientationApi = window.screen?.orientation as unknown as {
      lock?: (orientation: string) => Promise<void>;
    } | undefined;
    orientationApi?.lock?.('landscape').catch(() => {});
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Subscribe to Convoy peer positions
  useEffect(() => {
    const syncPeers = () => {
      engineRef.current?.setConvoyPeers(convoySync.getPeers());
    };
    const unsub = convoySync.subscribe(syncPeers);
    syncPeers();
    return () => unsub();
  }, []);

  // Initialize Simulator Engine once on mount with WebGL2 -> 2D Canvas fallback
  useEffect(() => {
    if (!canvasMountRef.current) return;

    let engine: SimulatorEngine;
    const webGlSupported = GameEngine.isWebGLSupported();

    if (webGlSupported) {
      try {
        engine = new GameEngine(
          canvasMountRef.current,
          ROUTES[0].id,
          progress.selectedBusId,
          handleTelemetry,
          handleRouteFinish
        );
        setIs2DMode(false);
      } catch (err) {
        console.warn('WebGL initialization failed, falling back to 2D Canvas Engine:', err);
        engine = new CanvasEngine(
          canvasMountRef.current,
          ROUTES[0].id,
          progress.selectedBusId,
          handleTelemetry,
          handleRouteFinish
        );
        setIs2DMode(true);
      }
    } else {
      console.info('WebGL unsupported on this graphics device; running in High-Performance 2D Canvas mode.');
      engine = new CanvasEngine(
        canvasMountRef.current,
        ROUTES[0].id,
        progress.selectedBusId,
        handleTelemetry,
        handleRouteFinish
      );
      setIs2DMode(true);
    }

    engineRef.current = engine;
    engine.applySettings(progress.settings, true);
    engine.applyUpgrades(progress.equippedUpgrades);
    engine.setCustomization(activeCustom);
    engine.setCondition(progress.vehicleHealthPct, progress.dirtinessPct);
    engine.setTimeOfDay(progress.settings.preferredTimeOfDay);
    engine.setWeather(progress.settings.preferredWeather);
    engine.setPaused(true);
    engine.setShowcaseOrbit(false);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleTelemetry, handleRouteFinish]);

  // Keep engine synced with selected livery, customization, equipped upgrades, and settings
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setLivery(activeLivery);
  }, [activeLivery]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setCustomization(activeCustom);
  }, [activeCustom]);

  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.applyUpgrades(progress.equippedUpgrades);
  }, [progress.equippedUpgrades]);

  useEffect(() => {
    if (!engineRef.current) return;
    const defaultCameraChanged = prevDefaultCameraRef.current !== progress.settings.defaultCamera;
    prevDefaultCameraRef.current = progress.settings.defaultCamera;
    engineRef.current.applySettings(progress.settings, defaultCameraChanged);
  }, [progress.settings]);

  useEffect(() => {
    if (!engineRef.current || screen === 'PLAYING') return;
    engineRef.current.setCondition(progress.vehicleHealthPct, progress.dirtinessPct);
  }, [progress.vehicleHealthPct, progress.dirtinessPct, screen]);

  // Sync Engine Pause, Showcase Orbit, Replay/Audio Standby, Daily Mission Rollover & Buffered Live Deltas with ScreenState
  useEffect(() => {
    busAudio.setStandbyPaused(screen === 'EXITED');
    if (!engineRef.current) return;
    engineRef.current.setPaused(screen !== 'PLAYING');
    engineRef.current.setShowcaseOrbit(screen === 'MAIN_MENU' || screen === 'GARAGE');
    if (screen !== 'PLAYING' && screen !== 'PAUSED') {
      engineRef.current.stopReplay();
    }

    if (screen !== 'PLAYING' && (liveCbtKmAccumRef.current > 0 || livePaxAccumRef.current > 0)) {
      const addKm = liveCbtKmAccumRef.current;
      const addPax = livePaxAccumRef.current;
      liveCbtKmAccumRef.current = 0;
      livePaxAccumRef.current = 0;
      updateProgress((prev) => ({
        ...prev,
        dailyMissions: applyLiveDrivingToMissions(prev.dailyMissions, addKm, addPax).nextState,
      }));
    } else if (screen === 'MAIN_MENU' || screen === 'BUS_DEPOT') {
      const todayKey = getLocalDateKey();
      setProgress((prev) => {
        if (prev.dailyMissions.dateKey === todayKey) return prev;
        const synced = {
          ...prev,
          dailyMissions: syncDailyMissionsState(prev.dailyMissions, todayKey),
        };
        savePlayerProgress(synced);
        return synced;
      });
    }
  }, [screen, updateProgress]);

  // Global Keyboard Navigation (Esc toggles Pause during gameplay or returns from sub-screens)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (screen === 'PLAYING') {
          if (telemetry.isReplaying) {
            engineRef.current?.stopReplay();
            setScreen('GAMEOVER');
          } else {
            setScreen('PAUSED');
          }
        } else if (screen === 'PAUSED') {
          setScreen('PLAYING');
        } else if (
          screen === 'MAP_PLANNER' ||
          screen === 'GARAGE' ||
          screen === 'SHOP' ||
          screen === 'BUS_DEPOT' ||
          screen === 'MULTIPLAYER' ||
          screen === 'SETTINGS'
        ) {
          setScreen('MAIN_MENU');
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, telemetry.isReplaying]);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    busAudio.setMuted(nextMute);
  };

  const handleSelectMode = (mode: GameMode) => {
    setActiveMode(mode);
    setMapInitialFocus('route');
    setScreen('MAP_PLANNER');
  };

  const handleOpenMapPlanner = (focus: 'map' | 'route') => {
    setMapInitialFocus(focus);
    setScreen('MAP_PLANNER');
  };

  const handleLaunchDrive = (
    route: RouteDefinition,
    timeOfDay: TimeOfDayId,
    weather: WeatherId,
    trafficDensity?: TrafficDensity,
    modeOverride?: GameMode
  ) => {
    const effectiveMode = modeOverride ?? activeMode;
    setActiveMode(effectiveMode);
    setSelectedRoute(route);
    const nextTrafficDensity = trafficDensity ?? progress.settings.trafficDensity;
    updateProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        preferredTimeOfDay: timeOfDay,
        preferredWeather: weather,
        trafficDensity: trafficDensity ?? prev.settings.trafficDensity,
      },
    }));

    lastLiveMissionDistRef.current = 0;
    lastLiveMissionPaxRef.current = 0;
    liveCbtKmAccumRef.current = 0;
    livePaxAccumRef.current = 0;

    if (engineRef.current) {
      engineRef.current.stopReplay();
      engineRef.current.setGameMode(effectiveMode);
      engineRef.current.setCustomization(activeCustom);
      engineRef.current.setLivery(activeLivery);
      engineRef.current.applySettings(
        {
          ...progress.settings,
          preferredTimeOfDay: timeOfDay,
          preferredWeather: weather,
          trafficDensity: nextTrafficDensity,
        },
        true
      );
      engineRef.current.applyUpgrades(progress.equippedUpgrades);
      engineRef.current.setRoute(route);
      engineRef.current.setCondition(progress.vehicleHealthPct, progress.dirtinessPct);
      engineRef.current.setTimeOfDay(timeOfDay);
      engineRef.current.setWeather(weather);
      engineRef.current.setShowcaseOrbit(false);
      engineRef.current.setPaused(false);
    }

    busAudio.startAmbientMusic();
    setScreen('PLAYING');
  };

  const handleSelectBus = (busId: string) => {
    updateProgress((prev) => ({ ...prev, selectedBusId: busId }));
  };

  const handleUpdateCustomization = (busId: string, custom: BusCustomization) => {
    updateProgress((prev) => ({
      ...prev,
      busCustomizations: {
        ...prev.busCustomizations,
        [busId]: custom,
      },
    }));
  };

  const handleBuyBus = (busId: string, price: number) => {
    updateProgress((prev) => {
      if (prev.ownedBusIds.includes(busId) || prev.money < price) return prev;
      const nextOwned = [...prev.ownedBusIds, busId];
      const unlocked = new Set(prev.unlockedAchievements);
      let bonus = 0;
      if (nextOwned.length >= 3 && !unlocked.has('fleet_owner')) {
        unlocked.add('fleet_owner');
        bonus = ACHIEVEMENTS.find((a) => a.id === 'fleet_owner')?.reward ?? 0;
      }
      return {
        ...prev,
        money: prev.money - price + bonus,
        ownedBusIds: nextOwned,
        selectedBusId: busId,
        unlockedAchievements: Array.from(unlocked),
      };
    });
  };

  const handleBuyUpgrade = (upgradeId: string, price: number) => {
    updateProgress((prev) => {
      if (prev.ownedUpgrades.includes(upgradeId) || prev.money < price) return prev;
      return {
        ...prev,
        money: prev.money - price,
        ownedUpgrades: [...prev.ownedUpgrades, upgradeId],
        equippedUpgrades: [...prev.equippedUpgrades, upgradeId],
      };
    });
  };

  const handleToggleUpgrade = (upgradeId: string) => {
    updateProgress((prev) => {
      if (!prev.ownedUpgrades.includes(upgradeId)) return prev;
      const isEquipped = prev.equippedUpgrades.includes(upgradeId);
      return {
        ...prev,
        equippedUpgrades: isEquipped
          ? prev.equippedUpgrades.filter((id) => id !== upgradeId)
          : [...prev.equippedUpgrades, upgradeId],
      };
    });
  };

  const handleUpdateSettings = (nextSettings: GameSettings) => {
    updateProgress((prev) => ({
      ...prev,
      settings: nextSettings,
    }));
  };

  const handleGarageRepair = () => {
    updateProgress((prev) => {
      if (prev.money < 150 || prev.vehicleHealthPct >= 99) return prev;
      return { ...prev, money: prev.money - 150, vehicleHealthPct: 100 };
    });
  };

  const handleGarageWash = () => {
    updateProgress((prev) => {
      if (prev.money < 80 || prev.dirtinessPct <= 2) return prev;
      return { ...prev, money: prev.money - 80, dirtinessPct: 0 };
    });
  };

  const handleRestart = () => {
    lastLiveMissionDistRef.current = 0;
    lastLiveMissionPaxRef.current = 0;
    liveCbtKmAccumRef.current = 0;
    livePaxAccumRef.current = 0;
    if (engineRef.current) {
      engineRef.current.stopReplay();
      engineRef.current.setGameMode(activeMode);
      engineRef.current.setRoute(selectedRoute);
      engineRef.current.setCondition(progress.vehicleHealthPct, progress.dirtinessPct);
      engineRef.current.setPaused(false);
    }
    setScreen('PLAYING');
  };

  const handleNextRoute = () => {
    const currIdx = ROUTES.findIndex((r) => r.id === selectedRoute.id);
    const nextRoute = currIdx >= 0 ? ROUTES[(currIdx + 1) % ROUTES.length] : ROUTES[0];
    setSelectedRoute(nextRoute);
    lastLiveMissionDistRef.current = 0;
    lastLiveMissionPaxRef.current = 0;
    liveCbtKmAccumRef.current = 0;
    livePaxAccumRef.current = 0;
    if (engineRef.current) {
      engineRef.current.stopReplay();
      engineRef.current.setGameMode(activeMode);
      engineRef.current.setRoute(nextRoute);
      engineRef.current.setCondition(progress.vehicleHealthPct, progress.dirtinessPct);
      engineRef.current.setPaused(false);
    }
    setScreen('PLAYING');
  };

  const handleWatchReplay = () => {
    if (engineRef.current) {
      engineRef.current.startReplay();
      setScreen('PLAYING');
    }
  };

  const handleExitReplay = () => {
    engineRef.current?.stopReplay();
    setScreen('GAMEOVER');
  };

  const handleLockLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      const orientationApi = window.screen?.orientation as unknown as {
        lock?: (orientation: string) => Promise<void>;
      } | undefined;
      await orientationApi?.lock?.('landscape');
    } catch {
      // Ignore browser orientation lock restrictions
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative w-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-neutral-950 font-sans">
        {/* Persistent Live 3D / 2D Simulation Viewport */}
        <div ref={canvasMountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />

        {/* PWA Offline Notice */}
        <OfflineIndicator />

        {/* Fixed Landscape Orientation Guard when device is held vertically */}
        {isPortrait && (
          <div className="fixed inset-0 z-[100] bg-neutral-950/98 backdrop-blur-xl flex items-center justify-center p-6 text-white select-none overflow-hidden">
            <div className="max-w-sm w-full rounded-2xl bg-neutral-900 border border-amber-400/40 p-6 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center mx-auto">
                <RotateCw className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Rotate Device to Landscape</h2>
                <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                  Tamil Nadu Bus Simulator runs on a fixed landscape screen with zero scrolling for full cockpit visibility and touch controls.
                </p>
              </div>
              <button
                onClick={handleLockLandscape}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                Lock Landscape Fullscreen
              </button>
            </div>
          </div>
        )}

        {/* 2D Fallback Notice */}
        {is2DMode && screen === 'PLAYING' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono pointer-events-none">
            Safe 2D Canvas Mode
          </div>
        )}

        {/* 1. 5-Second Animated Logo Intro */}
        {screen === 'INTRO' && <IntroSequence onComplete={() => setScreen('LOADING')} />}

        {/* 2. Loading Screen with Staged Progress Bar */}
        {screen === 'LOADING' && <LoadingScreen onLoaded={() => setScreen('MAIN_MENU')} />}

        {/* 3. Main Menu */}
        {screen === 'MAIN_MENU' && (
          <MainMenu
            progress={progress}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onSelectMode={handleSelectMode}
            onOpenMapPlanner={handleOpenMapPlanner}
            onOpenGarage={() => setScreen('GARAGE')}
            onOpenShop={() => setScreen('SHOP')}
            onOpenDepot={() => setScreen('BUS_DEPOT')}
            onOpenMultiplayer={() => setScreen('MULTIPLAYER')}
            onOpenSettings={() => setScreen('SETTINGS')}
            onClaimDailyMission={handleClaimDailyMission}
            onClaimDailySweep={handleClaimDailySweep}
            onExitApp={() => setScreen('EXITED')}
          />
        )}

        {/* 4. Interactive GPS Map & Route Planner */}
        {screen === 'MAP_PLANNER' && (
          <InteractiveMapScreen
            mode={activeMode}
            careerLevel={levelInfo.level}
            initialFocus={mapInitialFocus}
            initialTimeOfDay={progress.settings.preferredTimeOfDay}
            initialWeather={progress.settings.preferredWeather}
            initialTrafficDensity={progress.settings.trafficDensity ?? 'normal'}
            onChangeMode={setActiveMode}
            onBack={() => setScreen('MAIN_MENU')}
            onLaunchDrive={handleLaunchDrive}
          />
        )}

        {/* 5. Garage Showcase & Coach Customization */}
        {screen === 'GARAGE' && (
          <GarageScreen
            progress={progress}
            onBack={() => setScreen('MAIN_MENU')}
            onSelectBus={handleSelectBus}
            onToggleUpgrade={handleToggleUpgrade}
            onUpdateCustomization={handleUpdateCustomization}
            onRepairBus={handleGarageRepair}
            onWashBus={handleGarageWash}
            onOpenShop={() => setScreen('SHOP')}
          />
        )}

        {/* 6. Bus Dealership & Accessories Shop */}
        {screen === 'SHOP' && (
          <ShopScreen
            progress={progress}
            onBack={() => setScreen('MAIN_MENU')}
            onOpenGarage={() => setScreen('GARAGE')}
            onBuyBus={handleBuyBus}
            onBuyUpgrade={handleBuyUpgrade}
          />
        )}

        {/* 7. Bus Depot Operations, Schedule & Trip Logs */}
        {screen === 'BUS_DEPOT' && (
          <BusDepotScreen
            progress={progress}
            onBack={() => setScreen('MAIN_MENU')}
            onRepairBus={handleGarageRepair}
            onWashBus={handleGarageWash}
            onLaunchScheduledRoute={(route, tod, w) => {
              handleLaunchDrive(route, tod, w, undefined, 'career');
            }}
            onOpenGarage={() => setScreen('GARAGE')}
            onClaimDailyMission={handleClaimDailyMission}
            onClaimDailySweep={handleClaimDailySweep}
          />
        )}

        {/* 8. Online Convoy Multiplayer Lobby */}
        {screen === 'MULTIPLAYER' && (
          <MultiplayerScreen
            progress={progress}
            onBack={() => setScreen('MAIN_MENU')}
            onLaunchConvoy={(route, tod, w) => {
              handleLaunchDrive(route, tod, w, undefined, 'free');
            }}
          />
        )}

        {/* 9. Simulator Settings */}
        {screen === 'SETTINGS' && (
          <SettingsScreen
            settings={progress.settings}
            onUpdateSettings={handleUpdateSettings}
            onBack={() => setScreen('MAIN_MENU')}
          />
        )}

        {/* 10. In-Game Mobile & Desktop Driving HUD */}
        {(screen === 'PLAYING' || screen === 'PAUSED') && (
          <GameHUD
            telemetry={telemetry}
            dailyMissionBanner={dailyMissionBanner}
            steeringMode={progress.settings.steeringMode}
            hudOpacity={progress.settings.hudOpacity}
            vibrationEnabled={progress.settings.vibrationEnabled}
            onAirHorn={() => engineRef.current?.playAirHorn()}
            onStartAirHorn={() => engineRef.current?.startAirHorn()}
            onStopAirHorn={() => engineRef.current?.stopAirHorn()}
            onConductorWhistle={() => engineRef.current?.playConductorWhistle()}
            onToggleDoors={() => engineRef.current?.toggleDoors()}
            onToggleReverse={() => engineRef.current?.toggleReverse()}
            onToggleParkingBrake={() => engineRef.current?.toggleParkingBrake()}
            onShiftGearUp={() => engineRef.current?.shiftGearUp()}
            onShiftGearDown={() => engineRef.current?.shiftGearDown()}
            onRefuel={() => engineRef.current?.refuelBus()}
            onToggleIgnition={() => engineRef.current?.toggleIgnition()}
            onCycleRadio={() => engineRef.current?.cycleRadioStation()}
            onSelectRadio={(id) => engineRef.current?.setRadioStation(id)}
            onRestBreak={() => engineRef.current?.restAtStop()}
            onRepairRoadside={() => engineRef.current?.repairBusRoadside()}
            onWashRoadside={() => engineRef.current?.washBusRoadside()}
            onAdjustSeat={(deltaY) => engineRef.current?.adjustSeat(deltaY)}
            onToggleMirror={() => engineRef.current?.toggleMirrorView()}
            onAnnounceStop={() => engineRef.current?.announceNextStop()}
            onToggleReplayPause={() => engineRef.current?.toggleReplayPause()}
            onScrubReplay={(pct) => engineRef.current?.scrubReplay(pct)}
            onSetReplaySpeed={(mult) => engineRef.current?.setReplaySpeed(mult)}
            onExitReplay={handleExitReplay}
            onCycleCamera={() => engineRef.current?.cycleCamera()}
            onSetCameraMode={(m) => engineRef.current?.setCameraMode(m)}
            onCameraLookDelta={(dx, dy) => engineRef.current?.setCameraLookDelta(dx, dy)}
            onResetCameraLook={() => engineRef.current?.resetCameraLook()}
            onSetTimeOfDay={(t: TimeOfDayId) => engineRef.current?.setTimeOfDay(t)}
            onSetWeather={(w: WeatherId) => engineRef.current?.setWeather(w)}
            onCycleWeather={() => engineRef.current?.cycleWeather()}
            onToggleHeadlights={() => engineRef.current?.toggleHeadlights()}
            onToggleHighBeam={() => engineRef.current?.toggleHighBeam()}
            onToggleLeftIndicator={() => engineRef.current?.toggleLeftIndicator()}
            onToggleRightIndicator={() => engineRef.current?.toggleRightIndicator()}
            onToggleHazardLights={() => engineRef.current?.toggleHazardLights()}
            onToggleCruiseControl={() => engineRef.current?.toggleCruiseControl()}
            onToggleWipers={() => engineRef.current?.toggleWipers()}
            onSelectHorn={(id) => engineRef.current?.setHornSound(id)}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPause={() => setScreen('PAUSED')}
            onMobileInput={(th, st, br, rev, cl, hb) =>
              engineRef.current?.setMobileInput(th, st, br, rev, cl, hb)
            }
          />
        )}

        {/* 11. Pause Modal */}
        <PauseModal
          isOpen={screen === 'PAUSED'}
          onResume={() => setScreen('PLAYING')}
          onRestart={handleRestart}
          onOpenMap={() => {
            engineRef.current?.stopReplay();
            setScreen('MAP_PLANNER');
          }}
          onExitToMenu={() => {
            engineRef.current?.stopReplay();
            setScreen('MAIN_MENU');
          }}
          route={selectedRoute}
          livery={activeLivery}
          gameMode={activeMode}
          trafficDensity={progress.settings.trafficDensity ?? 'normal'}
          trafficSpeed={progress.settings.trafficSpeed ?? 'normal'}
          onChangeTraffic={(density: TrafficDensity, speed: TrafficSpeedMode) => {
            handleUpdateSettings({
              ...progress.settings,
              trafficDensity: density,
              trafficSpeed: speed,
            });
          }}
        />

        {/* 12. Route Completion / Game Over Modal */}
        <GameOverModal
          isOpen={screen === 'GAMEOVER'}
          isVictory={gameOverData.isVictory}
          earnings={gameOverData.earnings}
          fuelSpent={gameOverData.fuelSpent}
          tollsPaid={gameOverData.tollsPaid}
          xpEarned={gameOverData.xpEarned}
          satisfaction={gameOverData.satisfaction}
          newRank={levelInfo.rank}
          gameMode={activeMode}
          route={selectedRoute}
          hasReplay={telemetry.replayFrameCount >= 2}
          onWatchReplay={handleWatchReplay}
          onNextRoute={handleNextRoute}
          onRetry={handleRestart}
          onOpenMap={() => setScreen('MAP_PLANNER')}
          onExitToMenu={() => setScreen('MAIN_MENU')}
          dailyMissions={progress.dailyMissions}
          onClaimDailyMission={handleClaimDailyMission}
          onClaimDailySweep={handleClaimDailySweep}
        />

        {/* 13. Exit Standby Confirmation Screen */}
        {screen === 'EXITED' && (
          <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-xl flex items-center justify-center p-6 text-white select-none">
            <div className="max-w-md w-full rounded-2xl bg-neutral-900 border border-white/15 p-7 text-center space-y-5 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center mx-auto">
                <Power className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl font-black">Depot Shift Ended</h2>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  All progress, fleet vehicles, customizations, and earnings for{' '}
                  <strong className="text-white">{progress.driverName}</strong> have been safely
                  saved. You may close this tab or resume your Tamil Nadu driving shift below.
                </p>
              </div>
              <button
                onClick={() => setScreen('MAIN_MENU')}
                className="w-full min-h-[44px] py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Resume Driving Session
              </button>
            </div>
          </div>
        )}
      </main>
    </MotionConfig>
  );
}
