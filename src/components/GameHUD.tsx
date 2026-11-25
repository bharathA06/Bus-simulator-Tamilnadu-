import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Camera,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudFog,
  CloudRain,
  Coffee,
  CornerUpLeft,
  CornerUpRight,
  DoorOpen,
  Droplets,
  Film,
  Fuel,
  KeyRound,
  Lightbulb,
  Maximize2,
  Megaphone,
  Minimize2,
  Moon,
  Navigation,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Sun,
  Sunset,
  Ticket,
  Users,
  Volume2,
  VolumeX,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  BUS_STOPS,
  CAMERA_MODES,
  CURVED_ROADS,
  FM_RADIO_STATIONS,
  HORN_OPTIONS,
  ROAD_NETWORK,
  TimeOfDayId,
  WEATHER_PRESETS,
  WeatherId,
} from '../game/constants';
import { GameTelemetry } from '../game/gameEngine';
import { SteeringControlMode } from '../game/gameStore';

interface GameHUDProps {
  telemetry: GameTelemetry;
  dailyMissionBanner?: string | null;
  steeringMode: SteeringControlMode;
  hudOpacity: number;
  vibrationEnabled: boolean;
  onAirHorn: () => void;
  onStartAirHorn: () => void;
  onStopAirHorn: () => void;
  onConductorWhistle: () => void;
  onToggleDoors: () => void;
  onToggleReverse: () => void;
  onToggleParkingBrake: () => void;
  onShiftGearUp: () => void;
  onShiftGearDown: () => void;
  onRefuel: () => void;
  onToggleIgnition: () => void;
  onCycleRadio: () => void;
  onSelectRadio: (id: number) => void;
  onRestBreak: () => void;
  onRepairRoadside: () => void;
  onWashRoadside: () => void;
  onAdjustSeat: (deltaY: number) => void;
  onToggleMirror: () => void;
  onAnnounceStop: () => void;
  onToggleReplayPause: () => void;
  onScrubReplay: (pct: number) => void;
  onSetReplaySpeed: (mult: 1 | 2) => void;
  onExitReplay: () => void;
  onCycleCamera: () => void;
  onSetCameraMode: (mode: number) => void;
  onCameraLookDelta: (dxNorm: number, dyNorm: number) => void;
  onResetCameraLook: () => void;
  onSetTimeOfDay: (t: TimeOfDayId) => void;
  onSetWeather: (w: WeatherId) => void;
  onCycleWeather: () => void;
  onToggleHeadlights: () => void;
  onToggleHighBeam: () => void;
  onToggleLeftIndicator: () => void;
  onToggleRightIndicator: () => void;
  onToggleHazardLights: () => void;
  onToggleCruiseControl: () => void;
  onToggleWipers: () => void;
  onSelectHorn: (id: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onMobileInput: (
    th: number,
    st: number,
    br: boolean | number,
    rev: boolean,
    clutch?: boolean,
    handbrake?: boolean
  ) => void;
}

interface TouchInputState {
  throttle: number;
  steer: number;
  brake: number;
  reverse: boolean;
  clutch: boolean;
  handbrake: boolean;
}

export function GameHUD({
  telemetry,
  dailyMissionBanner,
  steeringMode,
  hudOpacity,
  vibrationEnabled,
  onAirHorn,
  onStartAirHorn,
  onStopAirHorn,
  onConductorWhistle,
  onToggleDoors,
  onToggleReverse,
  onToggleParkingBrake,
  onShiftGearUp,
  onShiftGearDown,
  onRefuel,
  onToggleIgnition,
  onCycleRadio,
  onSelectRadio,
  onRestBreak,
  onRepairRoadside,
  onWashRoadside,
  onAdjustSeat,
  onToggleMirror,
  onAnnounceStop,
  onToggleReplayPause,
  onScrubReplay,
  onSetReplaySpeed,
  onExitReplay,
  onCycleCamera,
  onSetCameraMode,
  onCameraLookDelta,
  onResetCameraLook,
  onSetTimeOfDay,
  onSetWeather,
  onCycleWeather,
  onToggleHeadlights,
  onToggleHighBeam,
  onToggleLeftIndicator,
  onToggleRightIndicator,
  onToggleHazardLights,
  onToggleCruiseControl,
  onToggleWipers,
  onSelectHorn,
  isMuted,
  onToggleMute,
  onPause,
  onMobileInput,
}: GameHUDProps) {
  const [isMapZoomed, setIsMapZoomed] = useState(false);
  const [showHornMenu, setShowHornMenu] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showRadioMenu, setShowRadioMenu] = useState(false);
  const [showCabMenu, setShowCabMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );
  const [wheelSteerVisual, setWheelSteerVisual] = useState(0);
  const [pedalPressed, setPedalPressed] = useState<{ gas: boolean; brake: boolean; clutch: boolean; horn: boolean }>({
    gas: false,
    brake: false,
    clutch: false,
    horn: false,
  });
  const [tiltPermitted, setTiltPermitted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const doe = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    return !doe?.requestPermission;
  });

  // Combined multi-touch control state so simultaneous inputs never cancel each other
  const controlsRef = useRef<TouchInputState>({
    throttle: 0,
    steer: 0,
    brake: 0,
    reverse: false,
    clutch: false,
    handbrake: false,
  });

  const wheelPointerIdRef = useRef<number | null>(null);
  const wheelStartAngleRef = useRef<number>(0);
  const wheelStartValueRef = useRef<number>(0);
  const lookPointerRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastLookTapRef = useRef<number>(0);
  const hornHoldTimerRef = useRef<number | null>(null);

  const haptic = useCallback(
    (ms = 12) => {
      if (vibrationEnabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(ms);
        } catch {
          // Ignore unsupported vibrate errors
        }
      }
    },
    [vibrationEnabled]
  );

  const pushTouchInputs = useCallback(() => {
    const c = controlsRef.current;
    onMobileInput(c.throttle, c.steer, c.brake, c.reverse, c.clutch, c.handbrake);
  }, [onMobileInput]);

  const updateTouchField = useCallback(
    (patch: Partial<TouchInputState>) => {
      controlsRef.current = { ...controlsRef.current, ...patch };
      pushTouchInputs();
    },
    [pushTouchInputs]
  );

  // Sync fullscreen status listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    haptic(14);
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore browser fullscreen restriction
    }
  };

  // Device orientation listener for 'tilt' steering mode
  useEffect(() => {
    if (steeringMode !== 'tilt' || !tiltPermitted) return;
    const handleOrient = (ev: DeviceOrientationEvent) => {
      const isLandscape = window.innerWidth >= window.innerHeight;
      const rawTilt = isLandscape ? ev.beta ?? 0 : ev.gamma ?? 0;
      // Deadzone 4 deg, full lock at 32 deg; positive beta/gamma tilts right -> steer = -1 (right turn in BusPhysics)
      const absTilt = Math.abs(rawTilt);
      if (absTilt < 4) {
        controlsRef.current.steer = 0;
        setWheelSteerVisual(0);
      } else {
        const norm = Math.max(-1, Math.min(1, ((absTilt - 4) / 28) * Math.sign(rawTilt)));
        const steerVal = -norm;
        controlsRef.current.steer = steerVal;
        setWheelSteerVisual(steerVal);
      }
      pushTouchInputs();
    };
    window.addEventListener('deviceorientation', handleOrient);
    return () => {
      window.removeEventListener('deviceorientation', handleOrient);
      controlsRef.current.steer = 0;
      setWheelSteerVisual(0);
      pushTouchInputs();
    };
  }, [steeringMode, tiltPermitted, pushTouchInputs]);

  const requestTiltPermission = async () => {
    const doe = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (doe?.requestPermission) {
      try {
        const res = await doe.requestPermission();
        setTiltPermitted(res === 'granted');
      } catch {
        setTiltPermitted(false);
      }
    } else {
      setTiltPermitted(true);
    }
  };

  // Clear stuck inputs on blur/visibility change
  useEffect(() => {
    const clearAll = () => {
      controlsRef.current = { throttle: 0, steer: 0, brake: 0, reverse: false, clutch: false, handbrake: false };
      setWheelSteerVisual(0);
      setPedalPressed({ gas: false, brake: false, clutch: false, horn: false });
      onStopAirHorn();
      pushTouchInputs();
    };
    window.addEventListener('blur', clearAll);
    return () => window.removeEventListener('blur', clearAll);
  }, [onStopAirHorn, pushTouchInputs]);

  // Interactive Virtual Steering Wheel pointer handlers
  const getWheelAngleDeg = (el: HTMLElement, clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  };

  const handleWheelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    wheelPointerIdRef.current = e.pointerId;
    wheelStartAngleRef.current = getWheelAngleDeg(e.currentTarget, e.clientX, e.clientY);
    wheelStartValueRef.current = controlsRef.current.steer;
    haptic(8);
  };

  const handleWheelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (wheelPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    const currAngle = getWheelAngleDeg(e.currentTarget, e.clientX, e.clientY);
    let delta = currAngle - wheelStartAngleRef.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    // Clockwise (+delta) = steer right (-steer in physics); Counter-clockwise (-delta) = steer left (+steer)
    const nextSteer = Math.max(-1, Math.min(1, wheelStartValueRef.current - delta / 110));
    setWheelSteerVisual(nextSteer);
    updateTouchField({ steer: nextSteer });
  };

  const handleWheelPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (wheelPointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    wheelPointerIdRef.current = null;
    setWheelSteerVisual(0);
    updateTouchField({ steer: 0 });
  };

  // Background Gesture Layer for 3D Camera Rotation (swipe anywhere outside HUD buttons)
  const handleLookDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current !== null) return;
    const now = performance.now();
    if (now - lastLookTapRef.current < 280) {
      onResetCameraLook();
      haptic(10);
    }
    lastLookTapRef.current = now;
    lookPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const handleLookMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!lookPointerRef.current || lookPointerRef.current.id !== e.pointerId) return;
    const dx = e.clientX - lookPointerRef.current.x;
    const dy = e.clientY - lookPointerRef.current.y;
    lookPointerRef.current.x = e.clientX;
    lookPointerRef.current.y = e.clientY;
    onCameraLookDelta(dx / Math.max(320, window.innerWidth), dy / Math.max(320, window.innerHeight));
  };

  const handleLookUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lookPointerRef.current?.id === e.pointerId) {
      lookPointerRef.current = null;
    }
  };

  const handleHornDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setPedalPressed((p) => ({ ...p, horn: true }));
    haptic(15);
    onStartAirHorn();
    if (hornHoldTimerRef.current) window.clearTimeout(hornHoldTimerRef.current);
    hornHoldTimerRef.current = window.setTimeout(() => {
      // Fallback single melodic pulse if short tap
    }, 80);
  };

  const handleHornUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setPedalPressed((p) => ({ ...p, horn: false }));
    onStopAirHorn();
  };

  const displaySpeed =
    telemetry.speedUnit === 'mph'
      ? Math.round(telemetry.speedKmh * 0.621371)
      : telemetry.speedKmh;
  const displayLimit =
    telemetry.speedUnit === 'mph'
      ? Math.round(telemetry.zoneSpeedLimitKmh * 0.621371)
      : telemetry.zoneSpeedLimitKmh;
  const speedUnitLabel = telemetry.speedUnit === 'mph' ? 'MPH' : 'KM/H';

  const polylineStr = telemetry.routePolyline.map((p) => `${p.x},${p.z}`).join(' ');
  const activeCamera = CAMERA_MODES[telemetry.cameraMode] || CAMERA_MODES[0];
  const activeStation =
    FM_RADIO_STATIONS.find((st) => st.id === telemetry.radioStationId) || FM_RADIO_STATIONS[0];
  const weatherMeta = WEATHER_PRESETS.find((w) => w.id === telemetry.weather) || WEATHER_PRESETS[0];

  const etaMin = Math.floor(telemetry.estimatedArrivalSec / 60);
  const etaSec = telemetry.estimatedArrivalSec % 60;
  const timerMin = Math.floor(telemetry.timeRemaining / 60);
  const timerSec = Math.floor(telemetry.timeRemaining % 60);

  const renderWeatherIcon = (id: WeatherId, size = 'w-3.5 h-3.5') => {
    if (id === 'sunny') return <Sun className={`${size} text-amber-400`} />;
    if (id === 'cloudy') return <Cloud className={`${size} text-sky-300`} />;
    if (id === 'fog') return <CloudFog className={`${size} text-slate-300`} />;
    return <CloudRain className={`${size} text-blue-400`} />;
  };

  const renderManeuverIcon = () => {
    switch (telemetry.nextManeuver) {
      case 'left':
        return <CornerUpLeft className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />;
      case 'right':
        return <CornerUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />;
      case 'uturn':
        return <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />;
      case 'arrive':
        return <Navigation className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />;
      default:
        return <ArrowUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />;
    }
  };

  // Dedicated Trip Replay HUD Overlay
  if (telemetry.isReplaying) {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-4 safe-area-hud select-none text-white">
        <div className="pointer-events-auto hud-panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Film className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-black uppercase tracking-wider text-sky-300">
              Trip Replay · {telemetry.activeRoute.code}
            </span>
            <span className="text-xs font-mono text-neutral-300 tabular-nums">
              {displaySpeed} {speedUnitLabel} · Gear {telemetry.gear}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCycleCamera}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-sky-300" />
              {activeCamera.name}
            </button>
            <button
              onClick={onExitReplay}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black cursor-pointer"
            >
              Exit Replay
            </button>
          </div>
        </div>

        <div className="pointer-events-auto hud-panel max-w-2xl w-full mx-auto rounded-2xl p-3.5 flex items-center gap-3">
          <button
            onClick={onToggleReplayPause}
            className="w-11 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 flex items-center justify-center shrink-0 cursor-pointer"
            title="Play / Pause [Space]"
          >
            {telemetry.replayPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onSetReplaySpeed(telemetry.replaySpeedMult === 1 ? 2 : 1)}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-black shrink-0 cursor-pointer"
          >
            {telemetry.replaySpeedMult}x
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={telemetry.replayProgressPct}
            onChange={(e) => onScrubReplay(Number(e.target.value))}
            className="flex-1 accent-sky-400 cursor-pointer"
          />

          <span className="text-xs font-mono font-bold text-neutral-300 w-10 text-right tabular-nums">
            {telemetry.replayProgressPct}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none text-white">
      {/* Full-Viewport Camera Swipe Look Surface (underneath HUD buttons) */}
      <div
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        className="absolute inset-0 z-0 pointer-events-auto touch-none"
        aria-label="Drag screen to look around camera"
      />

      <div
        className="relative z-10 w-full h-full flex flex-col justify-between p-2 sm:p-3 safe-area-hud pointer-events-none"
        style={{ opacity: hudOpacity }}
      >
        {/* TOP HUD ROW */}
        <div className="flex items-start justify-between gap-2">
          {/* Top-Left: GPS Navigator Radar + Next Stop */}
          <div className="pointer-events-auto flex flex-col gap-1.5 w-44 sm:w-64">
            <div className="hud-panel rounded-2xl p-2 sm:p-2.5">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderManeuverIcon()}
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-black text-white font-mono tabular-nums truncate">
                      {telemetry.maneuverDistance}m · {telemetry.nextManeuver.toUpperCase()}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-neutral-300 truncate">
                      {telemetry.nextRoadName}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMapZoomed((v) => !v)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[9px] sm:text-[10px] font-bold cursor-pointer shrink-0"
                >
                  {isMapZoomed ? 'State' : 'Radar'}
                </button>
              </div>

              {/* SVG Minimap (5x5 Tamil Nadu Grid + Curved Ghats + Convoy Peers) */}
              <div className="w-full h-20 sm:h-28 rounded-xl bg-neutral-950 border border-white/10 overflow-hidden relative">
                <svg
                  viewBox={
                    isMapZoomed
                      ? '-600 -640 1200 1280'
                      : `${telemetry.busX - 85} ${telemetry.busZ - 85} 170 170`
                  }
                  className="w-full h-full"
                >
                  <g
                    transform={
                      isMapZoomed
                        ? undefined
                        : `rotate(${(telemetry.busHeading * 180) / Math.PI}, ${telemetry.busX}, ${telemetry.busZ})`
                    }
                  >
                    {ROAD_NETWORK.verticalX.map((vx) => (
                      <line
                        key={`mv_${vx}`}
                        x1={vx}
                        y1={-560}
                        x2={vx}
                        y2={560}
                        stroke="#334155"
                        strokeWidth={isMapZoomed ? 16 : 14}
                      />
                    ))}
                    {ROAD_NETWORK.horizontalZ.map((hz) => (
                      <line
                        key={`mh_${hz}`}
                        x1={-520}
                        y1={hz}
                        x2={520}
                        y2={hz}
                        stroke="#334155"
                        strokeWidth={isMapZoomed ? 16 : 14}
                      />
                    ))}
                    {CURVED_ROADS.map((cr) => (
                      <polyline
                        key={cr.id}
                        points={cr.points.map((pt) => `${pt.x},${pt.z}`).join(' ')}
                        fill="none"
                        stroke="#78350f"
                        strokeWidth={isMapZoomed ? 12 : 10}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}

                    {polylineStr && (
                      <polyline
                        points={polylineStr}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={isMapZoomed ? 10 : 4.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {telemetry.trafficDots.map((dot, idx) => (
                      <circle
                        key={`td_${idx}`}
                        cx={dot.x}
                        cy={dot.z}
                        r={isMapZoomed ? 8 : 3}
                        fill="#f59e0b"
                      />
                    ))}

                    {telemetry.convoyPeers.map((peer) => (
                      <circle
                        key={peer.peerId}
                        cx={peer.x}
                        cy={peer.z}
                        r={isMapZoomed ? 12 : 4.5}
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                      />
                    ))}

                    {BUS_STOPS.map((st) => (
                      <circle
                        key={st.id}
                        cx={st.x}
                        cy={st.z}
                        r={isMapZoomed ? 11 : 4}
                        fill={
                          Math.hypot(st.x - telemetry.nextStopX, st.z - telemetry.nextStopZ) < 3
                            ? '#10b981'
                            : '#64748b'
                        }
                      />
                    ))}

                    {/* Bus Arrow Marker */}
                    <g
                      transform={`translate(${telemetry.busX}, ${telemetry.busZ}) rotate(${
                        (-telemetry.busHeading * 180) / Math.PI
                      })`}
                    >
                      <polygon
                        points={isMapZoomed ? '0,-24 16,16 0,8 -16,16' : '0,-8 6,6 0,3 -6,6'}
                        fill="#facc15"
                        stroke="#09090b"
                        strokeWidth={isMapZoomed ? 3 : 1.2}
                      />
                    </g>
                  </g>
                </svg>
              </div>

              {/* Active Stop & Weight/Load Summary */}
              <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                <div className="min-w-0">
                  <div className="font-bold text-emerald-400 truncate">{telemetry.currentStopName}</div>
                  <div className="text-[9px] text-neutral-400 truncate">
                    {telemetry.passengersOnboard} pax · {(telemetry.totalMassKg / 1000).toFixed(1)}t · ETA{' '}
                    {etaMin}m{etaSec}s
                  </div>
                </div>
                <span className="font-mono font-bold text-white shrink-0 tabular-nums">
                  {telemetry.nextStopDistanceMeters}m
                </span>
              </div>
            </div>
          </div>

          {/* Top-Center: Speed Limit, Signal, Weather & Dynamic Action Prompts */}
          <div className="flex flex-col items-center gap-1.5 max-w-xs sm:max-w-md">
            <div className="pointer-events-auto hud-panel flex items-center gap-1.5 sm:gap-2 rounded-2xl px-2.5 py-1.5">
              {/* Speed Limit Sign */}
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-3 sm:border-4 flex flex-col items-center justify-center font-mono font-black leading-none ${
                  telemetry.isSpeeding
                    ? 'border-red-500 bg-red-950 text-red-200'
                    : 'border-red-500 bg-white text-neutral-950'
                }`}
                title={`Zone Limit: ${displayLimit} ${speedUnitLabel}`}
              >
                <span className="text-[11px] sm:text-xs tabular-nums">{displayLimit}</span>
              </div>

              {/* Upcoming Signal */}
              {telemetry.upcomingSignal && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-neutral-950 border border-white/10">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      telemetry.upcomingSignal === 'red'
                        ? 'bg-red-500'
                        : telemetry.upcomingSignal === 'amber'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                    }`}
                  />
                  <span className="text-[10px] font-mono font-bold tabular-nums">
                    {telemetry.upcomingSignalDistance}m
                  </span>
                </div>
              )}

              {/* Weather Cycle Button */}
              <button
                onClick={onCycleWeather}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] sm:text-[11px] font-bold cursor-pointer"
                title="Cycle Weather [K]"
              >
                {renderWeatherIcon(telemetry.weather)}
                <span className="hidden sm:inline">{weatherMeta.name}</span>
                <span className="text-neutral-300 font-mono tabular-nums">
                  {Math.round(telemetry.gripFactor * 100)}%
                </span>
              </button>
            </div>

            {!telemetry.engineRunning && (
              <button
                onClick={() => {
                  haptic(15);
                  onToggleIgnition();
                }}
                className="pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 border border-amber-200 text-[11px] font-black flex items-center gap-1.5 shadow-xl cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Tap to Start Engine [I]
              </button>
            )}

            {telemetry.announcementText && (
              <div className="px-3 py-1 rounded-xl bg-sky-950/95 border border-sky-400/60 text-sky-200 text-[11px] font-bold flex items-center gap-1.5 shadow-lg">
                <Megaphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate max-w-[230px] sm:max-w-sm">{telemetry.announcementText}</span>
              </div>
            )}

            {telemetry.isWrongWay && (
              <div className="px-3 py-1 rounded-xl bg-red-600 border border-red-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                Wrong-Way! Keep Left
              </div>
            )}

            {telemetry.isSpeeding && !telemetry.isWrongWay && (
              <div className="px-3 py-1 rounded-xl bg-amber-500 text-neutral-950 text-[11px] font-black uppercase tracking-wider shadow-lg">
                Overspeed! Limit {displayLimit}
              </div>
            )}

            {telemetry.ruleAlert && (
              <div
                className={`px-3 py-1 rounded-xl border text-[11px] font-black shadow-lg ${
                  telemetry.ruleAlert.isFine
                    ? 'bg-red-950/95 border-red-500 text-red-200'
                    : 'bg-emerald-950/95 border-emerald-400 text-emerald-200'
                }`}
              >
                {telemetry.ruleAlert.text}
              </div>
            )}

            {dailyMissionBanner && (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-600 border border-emerald-300 text-white text-[11px] font-black shadow-xl">
                {dailyMissionBanner}
              </div>
            )}

            {telemetry.nearFacilityPrompt && (
              <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-neutral-900/95 border border-amber-400/60 shadow-xl flex items-center gap-2">
                {telemetry.nearFacilityPrompt.type === 'police_check' ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                ) : telemetry.nearFacilityPrompt.type === 'rest_stop' ? (
                  <Coffee className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : telemetry.nearFacilityPrompt.type === 'construction' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                ) : (
                  <Fuel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <div className="text-[11px]">
                  <div className="font-bold text-white leading-tight">{telemetry.nearFacilityPrompt.name}</div>
                </div>
                {telemetry.nearFacilityPrompt.type === 'petrol' && (
                  <button
                    onClick={onRefuel}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[11px] font-black cursor-pointer shrink-0"
                  >
                    Refuel ₹120
                  </button>
                )}
                {telemetry.nearFacilityPrompt.type === 'rest_stop' && (
                  <button
                    onClick={onRestBreak}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-[11px] font-black cursor-pointer shrink-0"
                  >
                    Tea ₹40
                  </button>
                )}
              </div>
            )}

            {telemetry.fuelPct <= 20 && !telemetry.nearFacilityPrompt && (
              <button
                onClick={onRefuel}
                className="pointer-events-auto px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 border border-red-300 text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Fuel className="w-3.5 h-3.5" />
                Low Diesel ({telemetry.fuelPct}%) · ₹180
              </button>
            )}

            {telemetry.fatiguePct >= 55 && telemetry.nearFacilityPrompt?.type !== 'rest_stop' && (
              <button
                onClick={onRestBreak}
                className="pointer-events-auto px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-300 text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Coffee className="w-3.5 h-3.5" />
                Fatigue {telemetry.fatiguePct}% · Tea ₹40
              </button>
            )}

            {telemetry.healthPct < 70 && (
              <button
                onClick={onRepairRoadside}
                className="pointer-events-auto px-3 py-1 rounded-xl bg-red-700 hover:bg-red-600 border border-red-300 text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Wrench className="w-3.5 h-3.5" />
                Repair ({telemetry.healthPct}%) · ₹150
              </button>
            )}

            {telemetry.dirtinessPct > 60 && (
              <button
                onClick={onWashRoadside}
                className="pointer-events-auto px-3 py-1 rounded-xl bg-sky-700 hover:bg-sky-600 border border-sky-300 text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Droplets className="w-3.5 h-3.5" />
                Wash ({telemetry.dirtinessPct}%) · ₹80
              </button>
            )}

            {telemetry.isAtStop && (
              <button
                onClick={() => {
                  haptic(14);
                  onToggleDoors();
                }}
                className="pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-xl cursor-pointer"
              >
                <DoorOpen className="w-4 h-4" />
                {telemetry.doorsOpen
                  ? `Boarding... Tap [B] Whistle`
                  : telemetry.canOpenDoors
                    ? 'Open Doors [E]'
                    : 'Slow < 4 km/h for Doors'}
              </button>
            )}
          </div>

          {/* Top-Right: Compact Stats + Camera + Fullscreen + Mute + Pause */}
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 relative">
            <div className="flex items-center gap-1.5">
              <div className="hud-panel rounded-2xl px-2.5 sm:px-3.5 py-1.5 flex items-center gap-2 sm:gap-3 text-[11px]">
                <div>
                  <div className="text-[9px] text-neutral-400">Fares</div>
                  <div className="font-mono font-black text-emerald-400 tabular-nums">
                    ₹{telemetry.totalEarnings}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-[9px] text-neutral-400 flex items-center gap-0.5">
                    <Ticket className="w-2.5 h-2.5" /> Tix
                  </div>
                  <div className="font-mono font-bold text-sky-300 tabular-nums">
                    {telemetry.ticketsIssued}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-neutral-400 flex items-center gap-0.5">
                    <Users className="w-2.5 h-2.5" /> Pax
                  </div>
                  <div className="font-mono font-bold tabular-nums">
                    {telemetry.passengersBoarded}/{telemetry.totalPassengers}
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="text-[9px] text-neutral-400">Happy</div>
                  <div className="font-mono font-bold text-amber-300 tabular-nums">
                    {telemetry.passengerSatisfaction}%
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-neutral-400">
                    {telemetry.gameMode === 'free' ? 'Mode' : 'Time'}
                  </div>
                  <div className="font-mono font-bold text-sky-300 tabular-nums">
                    {telemetry.gameMode === 'free'
                      ? 'FREE'
                      : `${timerMin}:${timerSec.toString().padStart(2, '0')}`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCameraMenu((v) => !v)}
                className="min-w-[40px] min-h-[40px] px-2.5 rounded-xl bg-sky-600/90 hover:bg-sky-500 border border-sky-300/40 cursor-pointer shadow-lg flex items-center gap-1 text-[11px] font-bold"
                title="Switch Camera Angle [C]"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden md:inline">{activeCamera.name.split(' ')[0]}</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl hud-panel hover:bg-neutral-800 cursor-pointer flex items-center justify-center"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Gameplay'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-sky-300" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-neutral-200" />
                )}
              </button>

              <button
                onClick={onToggleMute}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl hud-panel hover:bg-neutral-800 cursor-pointer flex items-center justify-center"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              <button
                onClick={onPause}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl hud-panel hover:bg-neutral-800 cursor-pointer flex items-center justify-center"
                title="Pause [Esc]"
              >
                <Pause className="w-4 h-4 text-white" />
              </button>
            </div>

            <button
              onClick={onResetCameraLook}
              className="px-2.5 py-1 rounded-lg bg-neutral-900/80 border border-white/10 text-[10px] text-neutral-300 hover:text-white cursor-pointer"
            >
              Reset View · Swipe sky to look
            </button>

            {/* 7 Camera Angles Dropdown */}
            {showCameraMenu && (
              <div className="absolute top-12 right-0 w-60 p-2 rounded-2xl bg-neutral-950 border border-white/15 shadow-2xl space-y-1 z-40">
                <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                  <span>Camera Views (7 Angles)</span>
                  <button
                    onClick={() => {
                      onCycleCamera();
                      setShowCameraMenu(false);
                    }}
                    className="text-sky-400 cursor-pointer"
                  >
                    Cycle [C]
                  </button>
                </div>
                {CAMERA_MODES.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      haptic(10);
                      onSetCameraMode(cam.id);
                      setShowCameraMenu(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-left text-xs cursor-pointer ${
                      telemetry.cameraMode === cam.id
                        ? 'bg-sky-500 text-white font-bold'
                        : 'hover:bg-white/10 text-neutral-200'
                    }`}
                  >
                    <div className="font-bold">{cam.name}</div>
                    <div className="text-[10px] opacity-75">{cam.hint}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM MOBILE-FIRST DRIVING INTERFACE */}
        <div className="flex items-end justify-between gap-2 w-full">
          {/* LEFT SIDE: Steering Control + Indicators + Hazard */}
          <div className="pointer-events-auto flex flex-col items-start gap-2">
            {/* Indicator & Hazard Row */}
            <div className="flex items-center gap-1.5 hud-panel rounded-xl p-1">
              <button
                onClick={() => {
                  haptic(10);
                  onToggleLeftIndicator();
                }}
                className={`min-w-[44px] min-h-[40px] px-2.5 rounded-lg text-xs font-black border cursor-pointer ${
                  telemetry.leftIndicator || telemetry.hazardLights
                    ? 'bg-amber-500 border-amber-300 text-neutral-950'
                    : 'bg-white/5 border-white/10 text-neutral-300'
                }`}
                title="Left Indicator [Q]"
              >
                ◀ L
              </button>
              <button
                onClick={() => {
                  haptic(10);
                  onToggleHazardLights();
                }}
                className={`min-w-[44px] min-h-[40px] px-2.5 rounded-lg text-xs font-black border cursor-pointer ${
                  telemetry.hazardLights
                    ? 'bg-red-500 border-red-300 text-white'
                    : 'bg-white/5 border-white/10 text-neutral-300'
                }`}
                title="Hazard Lights [X]"
              >
                ▲
              </button>
              <button
                onClick={() => {
                  haptic(10);
                  onToggleRightIndicator();
                }}
                className={`min-w-[44px] min-h-[40px] px-2.5 rounded-lg text-xs font-black border cursor-pointer ${
                  telemetry.rightIndicator || telemetry.hazardLights
                    ? 'bg-amber-500 border-amber-300 text-neutral-950'
                    : 'bg-white/5 border-white/10 text-neutral-300'
                }`}
                title="Right Indicator [Z]"
              >
                R ▶
              </button>
            </div>

            {/* Steering Modes: Virtual Wheel / Touch Arrows / Gyro Tilt */}
            {steeringMode === 'wheel' && (
              <div
                onPointerDown={handleWheelPointerDown}
                onPointerMove={handleWheelPointerMove}
                onPointerUp={handleWheelPointerUp}
                onPointerCancel={handleWheelPointerUp}
                className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-neutral-950/75 border-2 border-white/20 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing shadow-2xl"
                aria-label="Virtual Steering Wheel"
              >
                <svg
                  viewBox="0 0 120 120"
                  className="w-28 h-28 sm:w-32 sm:h-32 pointer-events-none transition-transform duration-75"
                  style={{ transform: `rotate(${-wheelSteerVisual * 210}deg)` }}
                >
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#1e293b" strokeWidth="14" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="18 282" strokeDashoffset="76" />
                  {/* Top Center Amber Marker */}
                  <rect x="56" y="6" width="8" height="12" rx="2" fill="#f59e0b" />
                  {/* 3 Spokes */}
                  <path d="M16 58 L46 58 L46 66 L16 66 Z" fill="#334155" />
                  <path d="M74 58 L104 58 L104 66 L74 66 Z" fill="#334155" />
                  <path d="M55 72 L65 72 L65 104 L55 104 Z" fill="#334155" />
                  {/* Center Horn Pad */}
                  <circle cx="60" cy="60" r="16" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                  <text x="60" y="63" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">
                    TNSTC
                  </text>
                </svg>
              </div>
            )}

            {steeringMode === 'arrows' && (
              <div className="flex items-center gap-2.5">
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    haptic(10);
                    updateTouchField({ steer: 1 });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    updateTouchField({ steer: 0 });
                  }}
                  onPointerCancel={() => updateTouchField({ steer: 0 })}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl hud-panel border-2 border-white/25 flex items-center justify-center active:bg-emerald-600 touch-none cursor-pointer"
                  aria-label="Steer Left"
                >
                  <ArrowLeft className="w-7 h-7" />
                </button>
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    haptic(10);
                    updateTouchField({ steer: -1 });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    updateTouchField({ steer: 0 });
                  }}
                  onPointerCancel={() => updateTouchField({ steer: 0 })}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl hud-panel border-2 border-white/25 flex items-center justify-center active:bg-emerald-600 touch-none cursor-pointer"
                  aria-label="Steer Right"
                >
                  <ArrowRight className="w-7 h-7" />
                </button>
              </div>
            )}

            {steeringMode === 'tilt' && (
              <div className="flex flex-col gap-1.5">
                {!tiltPermitted ? (
                  <button
                    onClick={requestTiltPermission}
                    className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-500 text-neutral-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4" />
                    Enable Gyro Tilt
                  </button>
                ) : (
                  <div className="px-3 py-1.5 rounded-xl hud-panel text-[10px] font-mono text-emerald-300 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Tilt Steer: {Math.round(-wheelSteerVisual * 100)}%
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      updateTouchField({ steer: 1 });
                    }}
                    onPointerUp={() => updateTouchField({ steer: 0 })}
                    className="w-12 h-12 rounded-xl hud-panel border border-white/20 flex items-center justify-center active:bg-emerald-600 touch-none"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      updateTouchField({ steer: -1 });
                    }}
                    onPointerUp={() => updateTouchField({ steer: 0 })}
                    className="w-12 h-12 rounded-xl hud-panel border border-white/20 flex items-center justify-center active:bg-emerald-600 touch-none"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CENTER-BOTTOM: Compact Digital Dashboard Cluster + Cab Utility Drawer */}
          <div className="pointer-events-auto relative flex flex-col items-center gap-1.5 max-w-md sm:max-w-xl">
            {/* Collapsible Cab & Lights Popover Drawer */}
            {showMobileDrawer && (
              <div className="hud-panel rounded-2xl p-2.5 w-[90vw] sm:w-[460px] mb-1 space-y-2 relative z-30">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={onToggleIgnition}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-black border flex items-center gap-1 cursor-pointer ${
                      telemetry.engineRunning
                        ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                        : 'bg-amber-500 text-neutral-950 border-amber-300'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Engine [I]
                  </button>
                  <button
                    onClick={onToggleDoors}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                      telemetry.doorsOpen
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300'
                    }`}
                  >
                    <DoorOpen className="w-3.5 h-3.5" />
                    Doors [E]
                  </button>
                  <button
                    onClick={onToggleHeadlights}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                      telemetry.headlightsOn
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-white/5 border-white/10 text-neutral-300'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    Lights [L]
                  </button>
                  <button
                    onClick={onToggleHighBeam}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                      telemetry.highBeam
                        ? 'bg-sky-500 border-sky-300 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Beam [J]
                  </button>
                  <button
                    onClick={onToggleWipers}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                      telemetry.wipersOn
                        ? 'bg-sky-600 border-sky-400 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300'
                    }`}
                  >
                    <Wind className="w-3.5 h-3.5" />
                    Wipers [P]
                  </button>
                  <button
                    onClick={onToggleCruiseControl}
                    className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      telemetry.cruiseSpeed !== null
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300'
                    }`}
                  >
                    {telemetry.cruiseSpeed !== null ? `CC ${telemetry.cruiseSpeed}` : 'CC [V]'}
                  </button>
                  <button
                    onClick={onConductorWhistle}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 border border-white/10 text-neutral-200 cursor-pointer"
                  >
                    Whistle [B]
                  </button>
                  <button
                    onClick={onAnnounceStop}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold bg-sky-500/20 border border-sky-400/40 text-sky-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    Stop [O]
                  </button>
                  <button
                    onClick={() => setShowHornMenu((v) => !v)}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-mono bg-amber-500/20 border border-amber-400/40 text-amber-200 cursor-pointer"
                  >
                    Horn ♪{telemetry.activeHornId + 1}
                  </button>
                  <button
                    onClick={() => setShowRadioMenu((v) => !v)}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 border border-white/10 text-neutral-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    {activeStation.freq === '---' ? 'FM' : activeStation.freq}
                  </button>
                  <button
                    onClick={() => setShowCabMenu((v) => !v)}
                    className="min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/5 border border-white/10 text-neutral-200 flex items-center gap-1 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Seat
                  </button>
                </div>

                {/* Time & Weather Switchers */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/10">
                  <div className="flex items-center gap-1">
                    {(['day', 'sunset', 'night'] as TimeOfDayId[]).map((tid) => (
                      <button
                        key={tid}
                        onClick={() => onSetTimeOfDay(tid)}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          telemetry.timeOfDay === tid
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {tid === 'day' ? (
                          <Sun className="w-3.5 h-3.5" />
                        ) : tid === 'sunset' ? (
                          <Sunset className="w-3.5 h-3.5" />
                        ) : (
                          <Moon className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {(['sunny', 'cloudy', 'fog', 'rain'] as WeatherId[]).map((wid) => (
                      <button
                        key={wid}
                        onClick={() => onSetWeather(wid)}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          telemetry.weather === wid
                            ? 'bg-sky-500/25 border border-sky-400/40'
                            : 'opacity-65 hover:opacity-100'
                        }`}
                      >
                        {renderWeatherIcon(wid)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Horn Selector Popup */}
            {showHornMenu && (
              <div className="w-56 p-2 rounded-xl bg-neutral-950 border border-white/15 shadow-2xl space-y-1 z-40">
                {HORN_OPTIONS.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      onSelectHorn(h.id);
                      onAirHorn();
                      setShowHornMenu(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs flex justify-between cursor-pointer ${
                      telemetry.activeHornId === h.id
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'hover:bg-white/10 text-neutral-200'
                    }`}
                  >
                    <span>{h.name}</span>
                    <span className="font-mono">[{h.shortcut}]</span>
                  </button>
                ))}
              </div>
            )}

            {/* FM Radio Popup */}
            {showRadioMenu && (
              <div className="w-60 p-2 rounded-xl bg-neutral-950 border border-white/15 shadow-2xl space-y-1 z-40">
                {FM_RADIO_STATIONS.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      onSelectRadio(st.id);
                      setShowRadioMenu(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer ${
                      telemetry.radioStationId === st.id
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'hover:bg-white/10 text-neutral-200'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span>{st.name}</span>
                      <span className="font-mono">{st.freq}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Seat & Mirror Popup */}
            {showCabMenu && (
              <div className="w-56 p-2.5 rounded-xl bg-neutral-950 border border-white/15 shadow-2xl space-y-2 z-40 text-xs">
                <div className="font-bold text-neutral-300">Driver Seat &amp; Mirror</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">Seat Height</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAdjustSeat(-0.04)}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 font-mono cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono w-10 text-center tabular-nums">
                      {telemetry.seatOffsetY >= 0
                        ? `+${telemetry.seatOffsetY.toFixed(2)}`
                        : telemetry.seatOffsetY.toFixed(2)}
                    </span>
                    <button
                      onClick={() => onAdjustSeat(0.04)}
                      className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 font-mono cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={onToggleMirror}
                  className={`w-full py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    telemetry.mirrorWide ? 'bg-sky-600 text-white' : 'bg-white/10 text-neutral-200'
                  }`}
                >
                  Mirror FOV: {telemetry.mirrorWide ? 'Wide (76°)' : 'Standard (68°)'}
                </button>
              </div>
            )}

            {/* Compact Digital Gauge Bar */}
            <div className="hud-panel rounded-2xl px-3 py-2 flex items-center gap-3">
              <div className="text-center min-w-[46px]">
                <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none text-white">
                  {displaySpeed}
                </div>
                <div className="text-[9px] font-mono text-neutral-400 mt-0.5">{speedUnitLabel}</div>
              </div>

              <div
                className={`px-2.5 py-1 rounded-lg font-mono font-black text-sm border ${
                  telemetry.gear === 'R'
                    ? 'bg-red-500/20 border-red-400 text-red-300'
                    : telemetry.gear === 'P'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                }`}
              >
                {telemetry.gear}
              </div>

              <div className="hidden sm:grid grid-cols-4 gap-2.5 text-[10px] min-w-[200px]">
                <div>
                  <div className="text-neutral-400">RPM</div>
                  <div className="font-mono text-white tabular-nums">{telemetry.rpm}</div>
                </div>
                <div>
                  <div className="text-neutral-400">Fuel</div>
                  <div className={`font-mono tabular-nums ${telemetry.fuelPct <= 20 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {telemetry.fuelPct}%
                  </div>
                </div>
                <div>
                  <div className="text-neutral-400">Air</div>
                  <div className="font-mono text-sky-300 tabular-nums">{telemetry.airPressure}</div>
                </div>
                <div>
                  <div className="text-neutral-400">Temp</div>
                  <div className="font-mono text-amber-300 tabular-nums">{telemetry.engineTempC}°</div>
                </div>
              </div>

              <button
                onClick={() => {
                  haptic(8);
                  setShowMobileDrawer((v) => !v);
                }}
                className={`min-h-[38px] px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                  showMobileDrawer
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-white/10 border-white/15 text-neutral-200'
                }`}
              >
                <span>Cab</span>
                {showMobileDrawer ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* RIGHT SIDE: Handbrake, Air Horn, Gearbox + Clutch/Brake/Gas Pedals */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            {/* Upper Utility Row: Handbrake, Air Horn, Reverse, Manual Gears */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  haptic(14);
                  onToggleParkingBrake();
                }}
                className={`min-w-[44px] min-h-[42px] px-2.5 rounded-xl text-xs font-black border cursor-pointer ${
                  telemetry.parkingBrake
                    ? 'bg-red-600 border-red-300 text-white'
                    : 'hud-panel text-neutral-200'
                }`}
                title="Handbrake [N]"
              >
                (P)
              </button>

              <button
                onPointerDown={handleHornDown}
                onPointerUp={handleHornUp}
                onPointerCancel={handleHornUp}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowHornMenu((v) => !v);
                }}
                className={`min-w-[48px] min-h-[42px] px-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1 touch-none cursor-pointer ${
                  pedalPressed.horn
                    ? 'bg-amber-400 border-white text-neutral-950'
                    : 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                }`}
                title="Hold Air Horn [H]"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">HORN</span>
              </button>

              <button
                onClick={() => {
                  haptic(12);
                  onToggleReverse();
                }}
                className={`min-w-[44px] min-h-[42px] px-2.5 rounded-xl text-xs font-black border cursor-pointer ${
                  telemetry.gear === 'R'
                    ? 'bg-red-500/35 border-red-400 text-red-200'
                    : 'hud-panel text-neutral-200'
                }`}
                title="Reverse Gear [R]"
              >
                R
              </button>

              {telemetry.manualGearbox && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      haptic(10);
                      onShiftGearDown();
                    }}
                    className="w-10 h-[42px] rounded-xl hud-panel font-mono font-black text-sm hover:bg-white/15 cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    onClick={() => {
                      haptic(10);
                      onShiftGearUp();
                    }}
                    className="w-10 h-[42px] rounded-xl hud-panel font-mono font-black text-sm hover:bg-white/15 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}
            </div>

            {/* Pedal Bank: Clutch (when manual), Service Brake, Accelerator */}
            <div className="flex items-end gap-2">
              {telemetry.manualGearbox && (
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    haptic(10);
                    setPedalPressed((p) => ({ ...p, clutch: true }));
                    updateTouchField({ clutch: true });
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    setPedalPressed((p) => ({ ...p, clutch: false }));
                    updateTouchField({ clutch: false });
                  }}
                  onPointerCancel={() => {
                    setPedalPressed((p) => ({ ...p, clutch: false }));
                    updateTouchField({ clutch: false });
                  }}
                  className={`w-12 h-20 sm:h-24 rounded-2xl border-2 font-black text-[10px] tracking-wider flex flex-col items-center justify-end pb-2 touch-none cursor-pointer ${
                    pedalPressed.clutch
                      ? 'bg-sky-600 border-sky-200 text-white'
                      : 'hud-panel border-sky-400/40 text-sky-200'
                  }`}
                >
                  CLUTCH
                </button>
              )}

              {/* Service Brake Pedal */}
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  haptic(14);
                  setPedalPressed((p) => ({ ...p, brake: true }));
                  updateTouchField({ brake: 1 });
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  setPedalPressed((p) => ({ ...p, brake: false }));
                  updateTouchField({ brake: 0 });
                }}
                onPointerCancel={() => {
                  setPedalPressed((p) => ({ ...p, brake: false }));
                  updateTouchField({ brake: 0 });
                }}
                className={`w-14 sm:w-16 h-20 sm:h-24 rounded-2xl border-2 font-black text-xs tracking-wider flex flex-col items-center justify-end pb-2.5 touch-none cursor-pointer shadow-xl transition-transform ${
                  pedalPressed.brake
                    ? 'bg-red-600 border-red-200 text-white scale-95'
                    : 'bg-red-950/90 border-red-500/70 text-red-200'
                }`}
              >
                BRAKE
              </button>

              {/* Accelerator Pedal */}
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  haptic(10);
                  setPedalPressed((p) => ({ ...p, gas: true }));
                  updateTouchField({ throttle: 1 });
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  setPedalPressed((p) => ({ ...p, gas: false }));
                  updateTouchField({ throttle: 0 });
                }}
                onPointerCancel={() => {
                  setPedalPressed((p) => ({ ...p, gas: false }));
                  updateTouchField({ throttle: 0 });
                }}
                className={`w-16 sm:w-18 h-28 sm:h-32 rounded-2xl border-2 font-black text-xs tracking-wider flex flex-col items-center justify-end pb-3 touch-none cursor-pointer shadow-xl transition-transform ${
                  pedalPressed.gas
                    ? 'bg-emerald-500 border-emerald-200 text-neutral-950 scale-95'
                    : 'bg-emerald-950/90 border-emerald-400/70 text-emerald-300'
                }`}
              >
                GAS
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
