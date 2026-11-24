import { useEffect, useRef, useState, useCallback } from 'react';
import { MotionConfig } from 'motion/react';
import { Power, RefreshCw } from 'lucide-react';
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
  BusCustomization,
  GameMode,
  GameSettings,
  PlayerProgress,
  getCareerLevel,
  getEffectiveBusCustomization,
  loadPlayerProgress,
  savePlayerProgress,
} from './game/gameStore';
import { ROAD_NAMES_VERTICAL } from './game/navigationSystem';
import { IntroSequence, LoadingScreen } from './components/IntroLoadingScreens';
import { MainMenu } from './components/MainMenu';
import { InteractiveMapScreen } from './components/InteractiveMapScreen';
import { GarageScreen } from './components/GarageScreen';
import { ShopScreen } from './components/ShopScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { GameHUD } from './components/GameHUD';
import { PauseModal, GameOverModal } from './components/GameModals';
import { busAudio } from './audio/busAudio';

type ScreenState =
  | 'INTRO'
  | 'LOADING'
  | 'MAIN_MENU'
  | 'MAP_PLANNER'
  | 'GARAGE'
  | 'SHOP'
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
  applySettings: (settings: GameSettings) => void;
  applyUpgrades: (equippedIds: string[]) => void;
  playAirHorn: () => void;
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
  setTimeOfDay: (t: TimeOfDayId) => void;
  setWeather: (w: WeatherId) => void;
  cycleWeather: () => void;
  setMobileInput: (th: number, st: number, br: boolean, rev: boolean) => void;
  setPaused: (paused: boolean) => void;
  dispose: () => void;
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SimulatorEngine | null>(null);

  const [progress, setProgress] = useState<PlayerProgress>(() => loadPlayerProgress());
  const [screen, setScreen] = useState<ScreenState>('INTRO');
  const [activeMode, setActiveMode] = useState<GameMode>('career');
  const [selectedRoute, setSelectedRoute] = useState<RouteDefinition>(ROUTES[0]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [is2DMode, setIs2DMode] = useState<boolean>(false);
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
  const distanceRef = useRef<number>(0);

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
    nextRoadName: ROAD_NAMES_VERTICAL[-80],
    routePolyline: [],
    trafficDots: [],
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
  });

  const updateProgress = useCallback((updater: (prev: PlayerProgress) => PlayerProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      savePlayerProgress(next);
      return next;
    });
  }, []);

  const handleTelemetry = useCallback((t: GameTelemetry) => {
    distanceRef.current = t.totalDistanceTraveledM;
    setTelemetry(t);
  }, []);

  const handleRouteFinish = useCallback(
    (
      success: boolean,
      earnings: number,
      satisfaction: number,
      expenses?: { fuelSpent: number; tollsPaid: number; healthPct?: number; dirtinessPct?: number }
    ) => {
      const modeNow = activeModeRef.current;
      const xpEarned = success
        ? modeNow === 'career'
          ? 120 + Math.round(satisfaction * 0.8)
          : 40
        : 20;

      const fuelSpent = expenses?.fuelSpent ?? 0;
      const tollsPaid = expenses?.tollsPaid ?? 0;
      const netCash = earnings - fuelSpent - tollsPaid;
      const kmAdded = Number((distanceRef.current / 1000).toFixed(2));

      updateProgress((prev) => ({
        ...prev,
        money: Math.max(0, prev.money + netCash),
        xp: prev.xp + xpEarned,
        completedRoutesCount: success ? prev.completedRoutesCount + 1 : prev.completedRoutesCount,
        totalKmDriven: Number((prev.totalKmDriven + kmAdded).toFixed(2)),
        totalFuelSpent: prev.totalFuelSpent + fuelSpent,
        totalTollsPaid: prev.totalTollsPaid + tollsPaid,
        vehicleHealthPct: expenses?.healthPct ?? prev.vehicleHealthPct,
        dirtinessPct: expenses?.dirtinessPct ?? prev.dirtinessPct,
      }));

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
    engine.applySettings(progress.settings);
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
    engineRef.current.applySettings(progress.settings);
  }, [progress.settings]);

  useEffect(() => {
    if (!engineRef.current || screen === 'PLAYING') return;
    engineRef.current.setCondition(progress.vehicleHealthPct, progress.dirtinessPct);
  }, [progress.vehicleHealthPct, progress.dirtinessPct, screen]);

  // Sync Engine Pause & Showcase Camera Orbit with active ScreenState
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setPaused(screen !== 'PLAYING');
    engineRef.current.setShowcaseOrbit(screen === 'MAIN_MENU' || screen === 'GARAGE');
  }, [screen]);

  // Global Keyboard Navigation (Esc toggles Pause during gameplay or returns from sub-screens)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (screen === 'PLAYING') {
          setScreen('PAUSED');
        } else if (screen === 'PAUSED') {
          setScreen('PLAYING');
        } else if (
          screen === 'MAP_PLANNER' ||
          screen === 'GARAGE' ||
          screen === 'SHOP' ||
          screen === 'SETTINGS'
        ) {
          setScreen('MAIN_MENU');
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen]);

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    busAudio.setMuted(nextMute);
  };

  const handleSelectMode = (mode: GameMode) => {
    setActiveMode(mode);
    setScreen('MAP_PLANNER');
  };

  const handleLaunchDrive = (
    route: RouteDefinition,
    timeOfDay: TimeOfDayId,
    weather: WeatherId
  ) => {
    setSelectedRoute(route);
    updateProgress((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        preferredTimeOfDay: timeOfDay,
        preferredWeather: weather,
      },
    }));

    if (engineRef.current) {
      engineRef.current.setGameMode(activeMode);
      engineRef.current.setCustomization(activeCustom);
      engineRef.current.setLivery(activeLivery);
      engineRef.current.applySettings({
        ...progress.settings,
        preferredTimeOfDay: timeOfDay,
        preferredWeather: weather,
      });
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
      return {
        ...prev,
        money: prev.money - price,
        ownedBusIds: [...prev.ownedBusIds, busId],
        selectedBusId: busId,
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

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative w-screen h-screen overflow-hidden bg-neutral-950 font-sans">
        {/* Persistent Live 3D / 2D Simulation Viewport */}
        <div ref={canvasMountRef} className="absolute inset-0 w-full h-full z-0 pointer-events-auto" />

        {/* 2D Fallback Notice */}
        {is2DMode && screen === 'PLAYING' && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono pointer-events-none">
            Safe 2D Canvas Mode
          </div>
        )}

        {/* 1. 5-Second Animated Logo Intro */}
        {screen === 'INTRO' && (
          <IntroSequence onComplete={() => setScreen('LOADING')} />
        )}

        {/* 2. Loading Screen with Staged Progress Bar */}
        {screen === 'LOADING' && (
          <LoadingScreen onLoaded={() => setScreen('MAIN_MENU')} />
        )}

        {/* 3. Main Menu */}
        {screen === 'MAIN_MENU' && (
          <MainMenu
            progress={progress}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onSelectMode={handleSelectMode}
            onOpenGarage={() => setScreen('GARAGE')}
            onOpenShop={() => setScreen('SHOP')}
            onOpenSettings={() => setScreen('SETTINGS')}
            onExitApp={() => setScreen('EXITED')}
          />
        )}

        {/* 4. Interactive GPS Map & Route Planner */}
        {screen === 'MAP_PLANNER' && (
          <InteractiveMapScreen
            mode={activeMode}
            careerLevel={levelInfo.level}
            initialTimeOfDay={progress.settings.preferredTimeOfDay}
            initialWeather={progress.settings.preferredWeather}
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

        {/* 7. Simulator Settings */}
        {screen === 'SETTINGS' && (
          <SettingsScreen
            settings={progress.settings}
            onUpdateSettings={handleUpdateSettings}
            onBack={() => setScreen('MAIN_MENU')}
          />
        )}

        {/* 8. In-Game Driving HUD */}
        {(screen === 'PLAYING' || screen === 'PAUSED') && (
          <GameHUD
            telemetry={telemetry}
            onAirHorn={() => engineRef.current?.playAirHorn()}
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
            onMobileInput={(th, st, br, rev) => engineRef.current?.setMobileInput(th, st, br, rev)}
          />
        )}

        {/* 9. Pause Modal */}
        <PauseModal
          isOpen={screen === 'PAUSED'}
          onResume={() => setScreen('PLAYING')}
          onRestart={handleRestart}
          onOpenMap={() => setScreen('MAP_PLANNER')}
          onExitToMenu={() => setScreen('MAIN_MENU')}
          route={selectedRoute}
          livery={activeLivery}
          gameMode={activeMode}
        />

        {/* 10. Route Completion / Game Over Modal */}
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
        />

        {/* 11. Exit Standby Confirmation Screen */}
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
                className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
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
