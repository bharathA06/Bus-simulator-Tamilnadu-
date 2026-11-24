import { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Camera,
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
  Megaphone,
  Moon,
  Navigation,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
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
  FM_RADIO_STATIONS,
  HORN_OPTIONS,
  ROAD_NETWORK,
  TimeOfDayId,
  WEATHER_PRESETS,
  WeatherId,
} from '../game/constants';
import { GameTelemetry } from '../game/gameEngine';

interface GameHUDProps {
  telemetry: GameTelemetry;
  onAirHorn: () => void;
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
  onMobileInput: (th: number, st: number, br: boolean, rev: boolean) => void;
}

export function GameHUD({
  telemetry,
  onAirHorn,
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
        return <CornerUpLeft className="w-6 h-6 text-emerald-400" />;
      case 'right':
        return <CornerUpRight className="w-6 h-6 text-amber-400" />;
      case 'uturn':
        return <RotateCcw className="w-6 h-6 text-sky-400" />;
      case 'arrive':
        return <Navigation className="w-6 h-6 text-emerald-400" />;
      default:
        return <ArrowUp className="w-6 h-6 text-white" />;
    }
  };

  // Dedicated Trip Replay HUD Overlay
  if (telemetry.isReplaying) {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 select-none text-white">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-neutral-900/90 backdrop-blur-md border border-sky-400/40 rounded-2xl px-4 py-2.5 shadow-xl">
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
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-sky-300" />
              {activeCamera.name} [C]
            </button>
            <button
              onClick={onExitReplay}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black cursor-pointer"
            >
              Exit Replay
            </button>
          </div>
        </div>

        <div className="pointer-events-auto max-w-2xl w-full mx-auto bg-neutral-900/92 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-2xl flex items-center gap-3">
          <button
            onClick={onToggleReplayPause}
            className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 flex items-center justify-center shrink-0 cursor-pointer"
            title="Play / Pause [Space]"
          >
            {telemetry.replayPaused ? (
              <Play className="w-4 h-4 fill-current" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => onSetReplaySpeed(telemetry.replaySpeedMult === 1 ? 2 : 1)}
            className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono font-black shrink-0 cursor-pointer"
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
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none text-white">
      {/* TOP HUD ROW */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: GPS Navigator Radar + Next Stop */}
        <div className="pointer-events-auto flex flex-col gap-2 w-60 sm:w-68">
          <div className="bg-neutral-900/90 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                {renderManeuverIcon()}
                <div className="min-w-0">
                  <div className="text-xs font-black text-white font-mono tabular-nums">
                    {telemetry.maneuverDistance}m · {telemetry.nextManeuver.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-neutral-300 truncate">
                    {telemetry.nextRoadName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsMapZoomed((v) => !v)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-bold cursor-pointer shrink-0"
              >
                {isMapZoomed ? 'State Map' : 'Radar'}
              </button>
            </div>

            {/* SVG Minimap */}
            <div className="w-full h-32 rounded-xl bg-neutral-950 border border-white/10 overflow-hidden relative">
              <svg
                viewBox={
                  isMapZoomed
                    ? '-355 -395 710 790'
                    : `${telemetry.busX - 65} ${telemetry.busZ - 65} 130 130`
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
                      y1={-380}
                      x2={vx}
                      y2={380}
                      stroke="#334155"
                      strokeWidth={isMapZoomed ? 10 : 12}
                    />
                  ))}
                  {ROAD_NETWORK.horizontalZ.map((hz) => (
                    <line
                      key={`mh_${hz}`}
                      x1={-340}
                      y1={hz}
                      x2={340}
                      y2={hz}
                      stroke="#334155"
                      strokeWidth={isMapZoomed ? 10 : 12}
                    />
                  ))}

                  {polylineStr && (
                    <polyline
                      points={polylineStr}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth={isMapZoomed ? 6 : 3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {telemetry.trafficDots.map((dot, idx) => (
                    <circle
                      key={idx}
                      cx={dot.x}
                      cy={dot.z}
                      r={isMapZoomed ? 4.5 : 2.2}
                      fill="#f59e0b"
                    />
                  ))}

                  {BUS_STOPS.map((st) => (
                    <circle
                      key={st.id}
                      cx={st.x}
                      cy={st.z}
                      r={isMapZoomed ? 6 : 3}
                      fill={
                        Math.hypot(st.x - telemetry.nextStopX, st.z - telemetry.nextStopZ) < 2
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
                      points={isMapZoomed ? '0,-14 10,10 0,5 -10,10' : '0,-6 4.5,5 0,2.5 -4.5,5'}
                      fill="#facc15"
                      stroke="#09090b"
                      strokeWidth={isMapZoomed ? 2 : 1}
                    />
                  </g>
                </g>
              </svg>
            </div>

            {/* Active Stop Summary */}
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <div className="font-bold text-emerald-400 truncate">{telemetry.currentStopName}</div>
                <div className="text-[10px] text-neutral-400 truncate">
                  {telemetry.passengerGroup} · ETA {etaMin}m {etaSec}s
                </div>
              </div>
              <span className="font-mono font-bold text-white shrink-0 tabular-nums">
                {telemetry.nextStopDistanceMeters}m
              </span>
            </div>
          </div>
        </div>

        {/* Top-Center: Dynamic Zone Speed Limit, Traffic Signal, Weather, Alerts & Facility Prompts */}
        <div className="flex flex-col items-center gap-2 max-w-md">
          <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md border border-white/15 rounded-2xl px-3 py-2 shadow-xl">
            {/* Circular Tamil Nadu Speed Limit Sign */}
            <div
              className={`w-10 h-10 rounded-full border-4 flex flex-col items-center justify-center font-mono font-black leading-none ${
                telemetry.isSpeeding
                  ? 'border-red-500 bg-red-950 text-red-200'
                  : 'border-red-500 bg-white text-neutral-950'
              }`}
              title={`Zone Limit: ${displayLimit} ${speedUnitLabel}`}
            >
              <span className="text-xs tabular-nums">{displayLimit}</span>
            </div>

            {/* Upcoming Traffic Signal Indicator */}
            {telemetry.upcomingSignal && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-950 border border-white/10">
                <span
                  className={`w-3 h-3 rounded-full ${
                    telemetry.upcomingSignal === 'red'
                      ? 'bg-red-500'
                      : telemetry.upcomingSignal === 'amber'
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                  }`}
                />
                <span className="text-[11px] font-mono font-bold tabular-nums">
                  {telemetry.upcomingSignal.toUpperCase()} {telemetry.upcomingSignalDistance}m
                </span>
              </div>
            )}

            {/* Quick Weather Cycle Pill */}
            <button
              onClick={onCycleWeather}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer"
              title="Cycle Weather [K]"
            >
              {renderWeatherIcon(telemetry.weather)}
              <span>{weatherMeta.name}</span>
              <span className="text-neutral-400 font-mono tabular-nums">
                {Math.round(telemetry.gripFactor * 100)}%
              </span>
            </button>
          </div>

          {/* Ignition Key Start Prompt when Engine is OFF */}
          {!telemetry.engineRunning && (
            <button
              onClick={onToggleIgnition}
              className="pointer-events-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 border border-amber-200 text-xs font-black flex items-center gap-2 shadow-xl cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              Engine OFF — Click or Press [I] to Turn Ignition Key
            </button>
          )}

          {/* Stand / Next Stop Spoken Announcement Banner */}
          {telemetry.announcementText && (
            <div className="px-4 py-1.5 rounded-xl bg-sky-950/90 border border-sky-400/60 text-sky-200 text-xs font-bold flex items-center gap-2 shadow-lg">
              <Megaphone className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{telemetry.announcementText}</span>
            </div>
          )}

          {/* Wrong-Way Warning */}
          {telemetry.isWrongWay && (
            <div className="px-4 py-1.5 rounded-xl bg-red-600 border border-red-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg">
              <AlertTriangle className="w-4 h-4" />
              Wrong-Way Lane! Keep Left (LHT)
            </div>
          )}

          {/* Speeding Warning */}
          {telemetry.isSpeeding && !telemetry.isWrongWay && (
            <div className="px-3.5 py-1 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black uppercase tracking-wider shadow-lg">
              Overspeeding! Limit {displayLimit} {speedUnitLabel}
            </div>
          )}

          {/* Rule / Fine / Toll Event Alert */}
          {telemetry.ruleAlert && (
            <div
              className={`px-4 py-1.5 rounded-xl border text-xs font-black shadow-lg ${
                telemetry.ruleAlert.isFine
                  ? 'bg-red-950/90 border-red-500 text-red-200'
                  : 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
              }`}
            >
              {telemetry.ruleAlert.text}
            </div>
          )}

          {/* Highway Facility Prompt (Petrol Bunk / Rest Stop / Police Check / Construction / Rail / Toll) */}
          {telemetry.nearFacilityPrompt && (
            <div className="pointer-events-auto px-4 py-2 rounded-xl bg-neutral-900/95 border border-amber-400/60 shadow-xl flex items-center gap-3">
              {telemetry.nearFacilityPrompt.type === 'police_check' ? (
                <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
              ) : telemetry.nearFacilityPrompt.type === 'rest_stop' ? (
                <Coffee className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : telemetry.nearFacilityPrompt.type === 'construction' ? (
                <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
              ) : (
                <Fuel className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div className="text-xs">
                <div className="font-bold text-white">{telemetry.nearFacilityPrompt.name}</div>
                {telemetry.nearFacilityPrompt.type === 'police_check' && (
                  <div className="text-[10px] text-sky-300">Keep speed ≤ 65 km/h &amp; headlights ON at night</div>
                )}
                {telemetry.nearFacilityPrompt.type === 'construction' && (
                  <div className="text-[10px] text-orange-300">Active Diversion — Speed Limit 40 KM/H</div>
                )}
              </div>
              {telemetry.nearFacilityPrompt.type === 'petrol' && (
                <button
                  onClick={onRefuel}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black cursor-pointer shrink-0"
                >
                  Refuel Diesel [T] (-₹120)
                </button>
              )}
              {telemetry.nearFacilityPrompt.type === 'rest_stop' && (
                <button
                  onClick={onRestBreak}
                  className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black cursor-pointer shrink-0"
                >
                  Tea Break [U] (-₹40)
                </button>
              )}
            </div>
          )}

          {/* Low Fuel Emergency Refuel Banner */}
          {telemetry.fuelPct <= 20 && !telemetry.nearFacilityPrompt && (
            <button
              onClick={onRefuel}
              className="pointer-events-auto px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 border border-red-300 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Fuel className="w-4 h-4" />
              Low Diesel ({telemetry.fuelPct}%) — Emergency Refuel [T] (-₹180)
            </button>
          )}

          {/* Driver Fatigue / Breakdown / Mud Quick Roadside Actions */}
          {telemetry.fatiguePct >= 55 && telemetry.nearFacilityPrompt?.type !== 'rest_stop' && (
            <button
              onClick={onRestBreak}
              className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 border border-amber-300 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Coffee className="w-4 h-4" />
              Driver Fatigue ({telemetry.fatiguePct}%) — Roadside Tea Break [U] (-₹40)
            </button>
          )}

          {telemetry.healthPct < 70 && (
            <button
              onClick={onRepairRoadside}
              className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 border border-red-300 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Wrench className="w-4 h-4" />
              {telemetry.healthPct < 35
                ? `Engine Limp Mode (${telemetry.healthPct}%) — Repair Now (-₹150)`
                : `Coach Damaged (${telemetry.healthPct}%) — Roadside Mechanic (-₹150)`}
            </button>
          )}

          {telemetry.dirtinessPct > 60 && (
            <button
              onClick={onWashRoadside}
              className="pointer-events-auto px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 border border-sky-300 text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Droplets className="w-4 h-4" />
              Muddy Coach ({telemetry.dirtinessPct}%) — Pressure Wash (-₹80)
            </button>
          )}

          {/* Bus Stop Boarding Prompt */}
          {telemetry.isAtStop && (
            <button
              onClick={onToggleDoors}
              className="pointer-events-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-300 text-xs font-black flex items-center gap-2 shadow-xl cursor-pointer"
            >
              <DoorOpen className="w-4 h-4" />
              {telemetry.doorsOpen
                ? `Boarding ${telemetry.passengerGroup}... Click or [B] Whistle`
                : telemetry.canOpenDoors
                  ? 'Stopped at Terminal — Press [E] to Open Doors'
                  : 'Slow down below 4 km/h to open doors'}
            </button>
          )}
        </div>

        {/* Top-Right: Earnings, Tolls, Tickets, Passengers, Timer & Pause */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <div className="bg-neutral-900/90 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2 flex items-center gap-3.5 shadow-xl text-xs">
              <div>
                <div className="text-[10px] text-neutral-400">Fares</div>
                <div className="font-mono font-black text-emerald-400 tabular-nums">
                  ₹{telemetry.totalEarnings}
                </div>
              </div>
              {telemetry.tollsPaidTrip > 0 && (
                <div>
                  <div className="text-[10px] text-neutral-400">Tolls</div>
                  <div className="font-mono font-bold text-amber-300 tabular-nums">
                    -₹{telemetry.tollsPaidTrip}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Ticket className="w-3 h-3" /> Tix
                </div>
                <div className="font-mono font-bold text-sky-300 tabular-nums">
                  {telemetry.ticketsIssued}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Pax
                </div>
                <div className="font-mono font-bold tabular-nums">
                  {telemetry.passengersBoarded}/{telemetry.totalPassengers}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Happy</div>
                <div className="font-mono font-bold text-amber-300 tabular-nums">
                  {telemetry.passengerSatisfaction}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">
                  {telemetry.gameMode === 'free' ? 'Mode' : 'Schedule'}
                </div>
                <div className="font-mono font-bold text-sky-300 tabular-nums">
                  {telemetry.gameMode === 'free'
                    ? 'FREE'
                    : `${timerMin}:${timerSec.toString().padStart(2, '0')}`}
                </div>
              </div>
            </div>

            <button
              onClick={onToggleMute}
              className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 cursor-pointer shadow-lg"
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
              className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/15 cursor-pointer shadow-lg"
              title="Pause [Esc]"
            >
              <Pause className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM CONSOLE: Dashboard Cluster + Switchbank + Touch Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-3">
        {/* Left/Center Compact Digital Cluster */}
        <div className="pointer-events-auto bg-neutral-900/92 backdrop-blur-md border border-white/15 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center gap-4">
          {/* Speed & Gear */}
          <div className="flex items-center gap-3 pr-3 border-r border-white/10">
            <div className="text-center min-w-[66px]">
              <div className="text-3xl font-black font-mono tabular-nums leading-none text-white">
                {displaySpeed}
              </div>
              <div className="text-[10px] font-mono text-neutral-400 mt-1">{speedUnitLabel}</div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className={`px-3 py-1 rounded-lg font-mono font-black text-base border ${
                  telemetry.gear === 'R'
                    ? 'bg-red-500/20 border-red-400 text-red-300'
                    : telemetry.gear === 'P'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                }`}
              >
                {telemetry.gear}
              </div>
              {telemetry.manualGearbox && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={onShiftGearDown}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold cursor-pointer"
                    title="Gear Down [F]"
                  >
                    F-
                  </button>
                  <button
                    onClick={onShiftGearUp}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono font-bold cursor-pointer"
                    title="Gear Up [G]"
                  >
                    G+
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RPM, Air PSI, Fuel %, Temp + Condition Readouts */}
          <div className="space-y-2 min-w-[235px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <div className="flex justify-between text-neutral-400">
                  <span>RPM</span>
                  <span className="font-mono text-white tabular-nums">{telemetry.rpm}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${Math.min(100, (telemetry.rpm / 3000) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400">
                  <span>Fuel</span>
                  <span
                    className={`font-mono tabular-nums ${
                      telemetry.fuelPct <= 20 ? 'text-red-400 font-bold' : 'text-emerald-400'
                    }`}
                  >
                    {telemetry.fuelPct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div
                    className={`h-full ${telemetry.fuelPct <= 20 ? 'bg-red-500' : 'bg-emerald-400'}`}
                    style={{ width: `${telemetry.fuelPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400">
                  <span>Air PSI</span>
                  <span className="font-mono text-sky-300 tabular-nums">{telemetry.airPressure}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${Math.min(100, (telemetry.airPressure / 120) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-400">
                  <span>Temp</span>
                  <span className="font-mono text-amber-300 tabular-nums">
                    {telemetry.engineTempC}°C
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.min(100, ((telemetry.engineTempC - 40) / 70) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-white/10 tabular-nums">
              <span>
                Health{' '}
                <strong className={telemetry.healthPct < 45 ? 'text-red-400' : 'text-emerald-400'}>
                  {telemetry.healthPct}%
                </strong>
              </span>
              <span>
                Fatigue{' '}
                <strong className={telemetry.fatiguePct > 60 ? 'text-amber-400' : 'text-sky-300'}>
                  {telemetry.fatiguePct}%
                </strong>
              </span>
              <span>
                Mud{' '}
                <strong className={telemetry.dirtinessPct > 55 ? 'text-amber-400' : 'text-neutral-200'}>
                  {telemetry.dirtinessPct}%
                </strong>
              </span>
            </div>
          </div>

          {/* Cockpit & Exterior Quick Switches */}
          <div className="flex flex-wrap items-center gap-1.5 relative">
            <button
              onClick={onToggleIgnition}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border flex items-center gap-1 cursor-pointer ${
                telemetry.engineRunning
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200'
                  : 'bg-amber-500 text-neutral-950 border-amber-300'
              }`}
              title="Ignition Key ON/OFF [I]"
            >
              <KeyRound className="w-3.5 h-3.5" />I
            </button>

            <button
              onClick={onToggleParkingBrake}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border cursor-pointer ${
                telemetry.parkingBrake
                  ? 'bg-red-600 border-red-400 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Parking Brake [N]"
            >
              (P) N
            </button>

            <button
              onClick={onToggleDoors}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                telemetry.doorsOpen
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Doors [E]"
            >
              <DoorOpen className="w-3.5 h-3.5" />E
            </button>

            <button
              onClick={onToggleReverse}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                telemetry.gear === 'R'
                  ? 'bg-red-500/25 border-red-400 text-red-200'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Reverse [R]"
            >
              REV [R]
            </button>

            <button
              onClick={onToggleLeftIndicator}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                telemetry.leftIndicator || telemetry.hazardLights
                  ? 'bg-amber-500 border-amber-300 text-neutral-950'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Left Indicator [Q]"
            >
              ◀ Q
            </button>

            <button
              onClick={onToggleHazardLights}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                telemetry.hazardLights
                  ? 'bg-red-500 border-red-300 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Hazards [X]"
            >
              ▲ X
            </button>

            <button
              onClick={onToggleRightIndicator}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                telemetry.rightIndicator || telemetry.hazardLights
                  ? 'bg-amber-500 border-amber-300 text-neutral-950'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Right Indicator [Z]"
            >
              Z ▶
            </button>

            <button
              onClick={onToggleHeadlights}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                telemetry.headlightsOn
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Headlights [L]"
            >
              <Lightbulb className="w-3.5 h-3.5" />L
            </button>

            <button
              onClick={onToggleHighBeam}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                telemetry.highBeam
                  ? 'bg-sky-500 border-sky-300 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="High Beam [J]"
            >
              <Zap className="w-3.5 h-3.5" />J
            </button>

            <button
              onClick={onToggleWipers}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                telemetry.wipersOn
                  ? 'bg-sky-600 border-sky-400 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Wipers [P]"
            >
              <Wind className="w-3.5 h-3.5" />P
            </button>

            <button
              onClick={onToggleCruiseControl}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                telemetry.cruiseSpeed !== null
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
              }`}
              title="Cruise Control [V]"
            >
              {telemetry.cruiseSpeed !== null ? `CC ${telemetry.cruiseSpeed}` : 'CC [V]'}
            </button>

            <button
              onClick={onAirHorn}
              onContextMenu={(e) => {
                e.preventDefault();
                setShowHornMenu((v) => !v);
              }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 flex items-center gap-1 cursor-pointer"
              title="Air Horn [H]"
            >
              <Bell className="w-3.5 h-3.5" />H
            </button>

            <button
              onClick={() => setShowHornMenu((v) => !v)}
              className="px-1.5 py-1.5 rounded-lg text-[10px] font-mono bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 cursor-pointer"
              title="Select Horn Melody"
            >
              ♪{telemetry.activeHornId + 1}
            </button>

            <button
              onClick={onConductorWhistle}
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 cursor-pointer"
              title="Conductor Whistle [B]"
            >
              Whistle [B]
            </button>

            <button
              onClick={onAnnounceStop}
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 flex items-center gap-1 cursor-pointer"
              title="Announce Next Stop [O]"
            >
              <Megaphone className="w-3.5 h-3.5" />O
            </button>

            {/* Tamil FM Radio Picker */}
            <div className="flex items-center gap-1">
              <button
                onClick={onCycleRadio}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                  telemetry.radioStationId > 0
                    ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                    : 'bg-white/5 border-white/10 text-neutral-300'
                }`}
                title="Cycle Tamil FM Radio [M]"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{activeStation.freq === '---' ? 'FM' : activeStation.freq} [M]</span>
              </button>
              <button
                onClick={() => setShowRadioMenu((v) => !v)}
                className="px-1.5 py-1.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/15 border border-white/10 cursor-pointer"
                title="Select Tamil FM Station"
              >
                ▾
              </button>
            </div>

            {/* Seat & Mirror Adjustment */}
            <button
              onClick={() => setShowCabMenu((v) => !v)}
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-200 flex items-center gap-1 cursor-pointer"
              title="Seat Height & Mirror Angle [Y]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Cab [Y]
            </button>

            {/* Camera Picker */}
            <div className="flex items-center gap-1">
              <button
                onClick={onCycleCamera}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 flex items-center gap-1 cursor-pointer"
                title="Cycle Camera [C]"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{activeCamera.name} [C]</span>
              </button>
              <button
                onClick={() => setShowCameraMenu((v) => !v)}
                className="px-1.5 py-1.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/15 border border-white/10 cursor-pointer"
                title="Choose Camera Angle"
              >
                ▾
              </button>
            </div>

            {/* Horn Selector Popup */}
            {showHornMenu && (
              <div className="absolute bottom-12 right-36 w-56 p-2 rounded-xl bg-neutral-950 border border-white/15 shadow-2xl space-y-1 z-30">
                {HORN_OPTIONS.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      onSelectHorn(h.id);
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

            {/* FM Radio Station Popup */}
            {showRadioMenu && (
              <div className="absolute bottom-12 right-24 w-60 p-2 rounded-xl bg-neutral-950 border border-white/15 shadow-2xl space-y-1 z-30">
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
                    <div className="text-[10px] opacity-75">{st.genre}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Seat & Mirror Cab Adjustment Popup */}
            {showCabMenu && (
              <div className="absolute bottom-12 right-12 w-56 p-2.5 rounded-xl bg-neutral-950 border border-white/15 shadow-2xl space-y-2 z-30 text-xs">
                <div className="font-bold text-neutral-300">Driver Seat &amp; Mirror</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-400">Seat Height</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onAdjustSeat(-0.04)}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 font-mono cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono w-10 text-center tabular-nums">
                      {telemetry.seatOffsetY >= 0 ? `+${telemetry.seatOffsetY.toFixed(2)}` : telemetry.seatOffsetY.toFixed(2)}
                    </span>
                    <button
                      onClick={() => onAdjustSeat(0.04)}
                      className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 font-mono cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={onToggleMirror}
                  className={`w-full py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                    telemetry.mirrorWide
                      ? 'bg-sky-600 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-neutral-200'
                  }`}
                >
                  Mirror FOV [Y]: {telemetry.mirrorWide ? 'Wide (76°)' : 'Standard (68°)'}
                </button>
              </div>
            )}

            {/* 6 Camera Angles Popup */}
            {showCameraMenu && (
              <div className="absolute bottom-12 right-0 w-56 p-2 rounded-xl bg-neutral-950 border border-white/15 shadow-2xl space-y-1 z-30">
                {CAMERA_MODES.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => {
                      onSetCameraMode(cam.id);
                      setShowCameraMenu(false);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs cursor-pointer ${
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

        {/* Right Console: Environment Switchers & Mobile Touch Controls */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {/* Quick Weather + Time Bar */}
          <div className="hidden sm:flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-md border border-white/15 rounded-xl p-1.5 shadow-xl">
            {(['day', 'sunset', 'night'] as TimeOfDayId[]).map((tid) => (
              <button
                key={tid}
                onClick={() => onSetTimeOfDay(tid)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  telemetry.timeOfDay === tid
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title={`Time: ${tid}`}
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
            <div className="w-px h-4 bg-white/15" />
            {(['sunny', 'cloudy', 'fog', 'rain'] as WeatherId[]).map((wid) => (
              <button
                key={wid}
                onClick={() => onSetWeather(wid)}
                className={`p-1.5 rounded-lg cursor-pointer ${
                  telemetry.weather === wid
                    ? 'bg-sky-500/25 border border-sky-400/40'
                    : 'opacity-65 hover:opacity-100'
                }`}
                title={`Weather: ${wid}`}
              >
                {renderWeatherIcon(wid)}
              </button>
            ))}
          </div>

          {/* Touch Controls for Tablets & Phones */}
          <div className="flex lg:hidden items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2">
              <button
                onPointerDown={() => onMobileInput(0, 1, false, false)}
                onPointerUp={() => onMobileInput(0, 0, false, false)}
                onPointerLeave={() => onMobileInput(0, 0, false, false)}
                className="w-12 h-12 rounded-xl bg-neutral-900/90 border border-white/20 flex items-center justify-center active:bg-emerald-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onPointerDown={() => onMobileInput(0, -1, false, false)}
                onPointerUp={() => onMobileInput(0, 0, false, false)}
                onPointerLeave={() => onMobileInput(0, 0, false, false)}
                className="w-12 h-12 rounded-xl bg-neutral-900/90 border border-white/20 flex items-center justify-center active:bg-emerald-600"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onPointerDown={() => onMobileInput(0, 0, true, false)}
                onPointerUp={() => onMobileInput(0, 0, false, false)}
                onPointerLeave={() => onMobileInput(0, 0, false, false)}
                className="px-4 h-12 rounded-xl bg-red-600/80 border border-red-400 font-black text-xs"
              >
                BRAKE
              </button>
              <button
                onPointerDown={() => onMobileInput(1, 0, false, false)}
                onPointerUp={() => onMobileInput(0, 0, false, false)}
                onPointerLeave={() => onMobileInput(0, 0, false, false)}
                className="px-4 h-12 rounded-xl bg-emerald-600/80 border border-emerald-400 font-black text-xs"
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
