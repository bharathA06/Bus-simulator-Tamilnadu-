import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Cloud,
  CloudFog,
  CloudRain,
  Compass,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Fuel,
  Lock,
  MapPin,
  Moon,
  Navigation,
  Play,
  RotateCcw,
  Sun,
  Sunset,
  ZoomIn,
  ZoomOut,
  ArrowUp,
} from 'lucide-react';
import {
  BUS_STOPS,
  HIGHWAY_FACILITIES,
  ROAD_NETWORK,
  ROUTES,
  RouteDefinition,
  TIME_OF_DAY_PRESETS,
  TimeOfDayId,
  WEATHER_PRESETS,
  WeatherId,
} from '../game/constants';
import { GameMode } from '../game/gameStore';
import { navigationGraph } from '../game/navigationSystem';

interface InteractiveMapScreenProps {
  mode: GameMode;
  careerLevel: number;
  initialTimeOfDay: TimeOfDayId;
  initialWeather: WeatherId;
  onBack: () => void;
  onLaunchDrive: (route: RouteDefinition, timeOfDay: TimeOfDayId, weather: WeatherId) => void;
}

export function InteractiveMapScreen({
  mode,
  careerLevel,
  initialTimeOfDay,
  initialWeather,
  onBack,
  onLaunchDrive,
}: InteractiveMapScreenProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(ROUTES[0].id);
  const [useCustomTrip, setUseCustomTrip] = useState<boolean>(false);
  const [originId, setOriginId] = useState<string>(BUS_STOPS[0].id);
  const [destId, setDestId] = useState<string>(BUS_STOPS[7].id); // Tiruppur default custom target
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayId>(initialTimeOfDay);
  const [weather, setWeather] = useState<WeatherId>(initialWeather);
  const [mapZoom, setMapZoom] = useState<number>(1);

  const activePreset = useMemo(
    () => ROUTES.find((r) => r.id === selectedPresetId) || ROUTES[0],
    [selectedPresetId]
  );

  const activeStopIds = useMemo(() => {
    if (!useCustomTrip) return activePreset.stops;
    if (originId === destId) return [originId];
    return [originId, destId];
  }, [useCustomTrip, activePreset, originId, destId]);

  const stopSequence = useMemo(
    () =>
      activeStopIds
        .map((id) => BUS_STOPS.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [activeStopIds]
  );

  const routePlan = useMemo(
    () => navigationGraph.computeMultiStopPlan(stopSequence),
    [stopSequence]
  );

  const effectiveRoute: RouteDefinition = useMemo(() => {
    if (!useCustomTrip) return activePreset;
    const orig = BUS_STOPS.find((s) => s.id === originId) || BUS_STOPS[0];
    const dest = BUS_STOPS.find((s) => s.id === destId) || BUS_STOPS[1];
    return {
      id: `custom_${orig.id}_${dest.id}`,
      code: mode === 'free' ? 'FREE' : 'CHARTER',
      titleEn: `${orig.city} ➔ ${dest.city}`,
      titleTa: `${orig.nameTa} ➔ ${dest.nameTa}`,
      description: `Custom corridor route from ${orig.nameEn} to ${dest.nameEn}.`,
      stops: activeStopIds,
      targetSeconds: Math.max(90, Math.round(routePlan.estimatedSeconds * 1.45)),
      baseReward: Math.max(250, Math.round(routePlan.totalDistanceMeters * 0.72)),
      color: '#10b981',
      unlockLevel: 1,
    };
  }, [useCustomTrip, activePreset, originId, destId, activeStopIds, routePlan, mode]);

  const isRouteLocked = mode === 'career' && !useCustomTrip && activePreset.unlockLevel > careerLevel;
  const originStop = BUS_STOPS.find((s) => s.id === originId) || BUS_STOPS[0];
  const destStop = BUS_STOPS.find((s) => s.id === destId) || BUS_STOPS[0];
  const isCustomLocked =
    mode === 'career' &&
    useCustomTrip &&
    (originStop.unlockLevel > careerLevel || destStop.unlockLevel > careerLevel);

  const handleStopClick = (stopId: string, unlockLevel: number) => {
    if (mode === 'career' && unlockLevel > careerLevel) return;
    setUseCustomTrip(true);
    if (originId === stopId) return;
    if (destId === stopId) {
      setDestId(originId);
      setOriginId(stopId);
      return;
    }
    setDestId(stopId);
  };

  const baseW = 740 / mapZoom;
  const baseH = 820 / mapZoom;
  const viewBoxStr = `${-baseW / 2} ${-baseH / 2} ${baseW} ${baseH}`;

  const polylinePoints = routePlan.waypoints.map((p) => `${p.x},${p.z}`).join(' ');

  const renderWeatherIcon = (wId: WeatherId) => {
    if (wId === 'sunny') return <Sun className="w-4 h-4 text-amber-400" />;
    if (wId === 'cloudy') return <Cloud className="w-4 h-4 text-sky-300" />;
    if (wId === 'fog') return <CloudFog className="w-4 h-4 text-slate-300" />;
    return <CloudRain className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="fixed inset-0 z-30 bg-neutral-950/95 backdrop-blur-xl text-white flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 bg-neutral-900/90">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Main Menu
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              Tamil Nadu Route &amp; GPS Planner
            </h1>
            <p className="text-[11px] text-neutral-400">
              {mode === 'career'
                ? `Career Mode (Driver Level ${careerLevel}) — Select scheduled corridor or custom charter`
                : 'Free Roam Mode — All 17 Tamil Nadu terminals unlocked'}
            </p>
          </div>
        </div>

        {/* Route Preset Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {ROUTES.map((r) => {
            const locked = mode === 'career' && r.unlockLevel > careerLevel;
            const isSelected = !useCustomTrip && selectedPresetId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => {
                  setUseCustomTrip(false);
                  setSelectedPresetId(r.id);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
                }`}
              >
                {locked && <Lock className="w-3 h-3 text-amber-400" />}
                <span>{r.code}</span>
              </button>
            );
          })}
          <button
            onClick={() => setUseCustomTrip(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              useCustomTrip
                ? 'bg-amber-500 border-amber-300 text-neutral-950'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
            }`}
          >
            Custom GPS
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left: Interactive Tamil Nadu Corridor Map */}
        <div className="lg:col-span-7 xl:col-span-8 relative bg-neutral-950 flex flex-col min-h-[320px] border-b lg:border-b-0 lg:border-r border-white/10">
          {/* Map Legend & Zoom Controls */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-white/10 text-[11px] text-neutral-300 flex flex-wrap items-center gap-3 pointer-events-auto">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Active Route
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Tolls &amp; Fuel
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Bay of Bengal Coast
              </span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              <button
                onClick={() => setMapZoom((z) => Math.min(2, Number((z + 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMapZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))))}
                className="p-2 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <svg viewBox={viewBoxStr} className="w-full h-full flex-1">
            {/* Base Landmass */}
            <rect x={-500} y={-500} width={1000} height={1000} fill="#0c1218" />

            {/* Nilgiri Hills Plateau (NW: Ooty / Coonoor) */}
            <ellipse cx={-235} cy={-215} rx={135} ry={115} fill="#143025" opacity={0.75} />
            <text x={-285} y={-305} fill="#34d399" fontSize="11" fontWeight="700" opacity={0.8}>
              NILGIRI GHATS (45 KM/H)
            </text>

            {/* Bay of Bengal & Indian Ocean Coastline (East & South) */}
            <rect x={295} y={-450} width={220} height={900} fill="#0c2d48" opacity={0.85} />
            <rect x={-450} y={325} width={960} height={220} fill="#0c2d48" opacity={0.85} />
            <text x={305} y={-120} fill="#38bdf8" fontSize="12" fontWeight="700" opacity={0.8}>
              BAY OF BENGAL
            </text>
            <text x={45} y={360} fill="#38bdf8" fontSize="12" fontWeight="700" opacity={0.8}>
              INDIAN OCEAN · TRIVENI SANGAM
            </text>

            {/* Cauvery River across Central Tamil Nadu */}
            <path
              d="M -360 -45 Q -120 -5, 40 20 T 300 -10"
              fill="none"
              stroke="#0284c7"
              strokeWidth="12"
              opacity={0.45}
            />
            <text x={115} y={28} fill="#7dd3fc" fontSize="10" fontWeight="600" opacity={0.75}>
              CAUVERY RIVER
            </text>

            {/* 4x4 Divided Tamil Nadu Highway Grid */}
            {ROAD_NETWORK.verticalX.map((vx) => (
              <g key={`v_${vx}`}>
                <line
                  x1={vx}
                  y1={ROAD_NETWORK.minZ}
                  x2={vx}
                  y2={ROAD_NETWORK.maxZ}
                  stroke="#334155"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <line
                  x1={vx}
                  y1={ROAD_NETWORK.minZ}
                  x2={vx}
                  y2={ROAD_NETWORK.maxZ}
                  stroke="#64748b"
                  strokeWidth="1.2"
                  strokeDasharray="6 6"
                />
              </g>
            ))}
            {ROAD_NETWORK.horizontalZ.map((hz) => (
              <g key={`h_${hz}`}>
                <line
                  x1={ROAD_NETWORK.minX}
                  y1={hz}
                  x2={ROAD_NETWORK.maxX}
                  y2={hz}
                  stroke="#334155"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <line
                  x1={ROAD_NETWORK.minX}
                  y1={hz}
                  x2={ROAD_NETWORK.maxX}
                  y2={hz}
                  stroke="#64748b"
                  strokeWidth="1.2"
                  strokeDasharray="6 6"
                />
              </g>
            ))}

            {/* Planned Active GPS Polyline */}
            {polylinePoints && (
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#10b981"
                strokeWidth="5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Highway Facilities (Tolls, Petrol Bunks, Rail Crossings, Bridges) */}
            {HIGHWAY_FACILITIES.map((fac) => {
              const col =
                fac.type === 'petrol'
                  ? '#f59e0b'
                  : fac.type === 'toll'
                    ? '#38bdf8'
                    : fac.type === 'rail_crossing'
                      ? '#ef4444'
                      : '#a78bfa';
              const tag =
                fac.type === 'petrol'
                  ? 'F'
                  : fac.type === 'toll'
                    ? 'T'
                    : fac.type === 'rail_crossing'
                      ? 'R'
                      : 'B';
              return (
                <g key={fac.id} transform={`translate(${fac.x}, ${fac.z})`}>
                  <rect x={-6} y={-6} width={12} height={12} rx={3} fill={col} stroke="#0f172a" strokeWidth={1.5} />
                  <text
                    x={0}
                    y={3.5}
                    textAnchor="middle"
                    fill="#09090b"
                    fontSize="8"
                    fontWeight="900"
                  >
                    {tag}
                  </text>
                </g>
              );
            })}

            {/* All 17 Tamil Nadu Bus Terminals */}
            {BUS_STOPS.map((stop) => {
              const idxInRoute = activeStopIds.indexOf(stop.id);
              const isStart = idxInRoute === 0;
              const isEnd = idxInRoute === activeStopIds.length - 1 && activeStopIds.length > 1;
              const isOnRoute = idxInRoute >= 0;
              const locked = mode === 'career' && stop.unlockLevel > careerLevel;

              const fill = locked
                ? '#475569'
                : isStart
                  ? '#10b981'
                  : isEnd
                    ? '#f59e0b'
                    : isOnRoute
                      ? '#38bdf8'
                      : '#1e293b';

              return (
                <g
                  key={stop.id}
                  transform={`translate(${stop.x}, ${stop.z})`}
                  onClick={() => handleStopClick(stop.id, stop.unlockLevel)}
                  className={locked ? 'cursor-not-allowed' : 'cursor-pointer'}
                >
                  <circle
                    r={isOnRoute ? 10 : 7.5}
                    fill={fill}
                    stroke={isOnRoute ? '#ffffff' : '#94a3b8'}
                    strokeWidth={isOnRoute ? 2.5 : 1.5}
                  />
                  {isOnRoute && (
                    <text
                      x={0}
                      y={3.5}
                      textAnchor="middle"
                      fill="#09090b"
                      fontSize="9"
                      fontWeight="900"
                    >
                      {idxInRoute + 1}
                    </text>
                  )}
                  <text
                    x={0}
                    y={-13}
                    textAnchor="middle"
                    fill={locked ? '#64748b' : isOnRoute ? '#ffffff' : '#cbd5e1'}
                    fontSize="9.5"
                    fontWeight={isOnRoute ? '800' : '600'}
                  >
                    {stop.city === stop.nameEn.split(' ')[0] ? stop.city : stop.nameEn.replace('Coimbatore — ', 'Kovai ').replace('Madurai — ', 'MDU ').replace('Chennai — ', 'CHN ')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Route Configuration, Stats & Directions */}
        <div className="lg:col-span-5 xl:col-span-4 bg-neutral-900/95 flex flex-col min-h-0 overflow-y-auto p-5 space-y-4">
          {/* Custom Origin / Destination Selectors */}
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {useCustomTrip ? 'Custom Corridor Selection' : `Schedule ${effectiveRoute.code}`}
              </span>
              {(isRouteLocked || isCustomLocked) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded">
                  <Lock className="w-3 h-3" /> Unlocks Lvl{' '}
                  {useCustomTrip
                    ? Math.max(originStop.unlockLevel, destStop.unlockLevel)
                    : activePreset.unlockLevel}
                </span>
              )}
            </div>

            {!useCustomTrip ? (
              <div>
                <h2 className="text-base font-black text-white">{effectiveRoute.titleEn}</h2>
                <p className="text-xs text-emerald-300 mt-0.5">{effectiveRoute.titleTa}</p>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  {effectiveRoute.description}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                    Origin Terminal
                  </label>
                  <select
                    value={originId}
                    onChange={(e) => setOriginId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-neutral-900 border border-white/15 text-xs text-white"
                  >
                    {BUS_STOPS.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={mode === 'career' && s.unlockLevel > careerLevel}
                      >
                        {s.nameEn}
                        {mode === 'career' && s.unlockLevel > careerLevel ? ` (Lvl ${s.unlockLevel})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                    Destination Terminal
                  </label>
                  <select
                    value={destId}
                    onChange={(e) => setDestId(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-neutral-900 border border-white/15 text-xs text-white"
                  >
                    {BUS_STOPS.map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={mode === 'career' && s.unlockLevel > careerLevel}
                      >
                        {s.nameEn}
                        {mode === 'career' && s.unlockLevel > careerLevel ? ` (Lvl ${s.unlockLevel})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Trip Telemetry Preview */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                  <Navigation className="w-3 h-3 text-emerald-400" /> Distance
                </div>
                <div className="text-sm font-black font-mono tabular-nums mt-0.5">
                  {(routePlan.totalDistanceMeters / 1000).toFixed(2)} km
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> ETA
                </div>
                <div className="text-sm font-black font-mono tabular-nums mt-0.5">
                  {Math.floor(routePlan.estimatedSeconds / 60)}m {routePlan.estimatedSeconds % 60}s
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                  <Flag className="w-3 h-3 text-sky-400" /> Est. Payout
                </div>
                <div className="text-sm font-black font-mono text-emerald-400 tabular-nums mt-0.5">
                  {mode === 'career' ? `₹${effectiveRoute.baseReward}` : 'Free Roam'}
                </div>
              </div>
            </div>
          </div>

          {/* Environment: Time of Day & 4 Weather Conditions */}
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/10 space-y-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Departure Time
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OF_DAY_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTimeOfDay(t.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      timeOfDay === t.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    {t.id === 'day' ? (
                      <Sun className="w-3.5 h-3.5" />
                    ) : t.id === 'sunset' ? (
                      <Sunset className="w-3.5 h-3.5" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" />
                    )}
                    <span className="capitalize">{t.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Tamil Nadu Weather
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WEATHER_PRESETS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setWeather(w.id)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      weather === w.id
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    {renderWeatherIcon(w.id)}
                    <span>{w.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Turn-by-Turn GPS Steps Preview */}
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/10 flex-1 min-h-[150px]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                GPS Turn-by-Turn Guidance
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                {routePlan.steps.length} Maneuvers
              </span>
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {routePlan.steps.map((step, i) => (
                <div
                  key={`${step.roadName}_${i}`}
                  className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {step.maneuver === 'left' ? (
                      <CornerUpLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : step.maneuver === 'right' ? (
                      <CornerUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : step.maneuver === 'uturn' ? (
                      <RotateCcw className="w-4 h-4 text-sky-400 shrink-0" />
                    ) : step.maneuver === 'arrive' ? (
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-neutral-300 shrink-0" />
                    )}
                    <span className="text-neutral-200 truncate">{step.instruction}</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 shrink-0 tabular-nums">
                    {step.distanceMeters}m
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Launch Drive Button */}
          <button
            disabled={isRouteLocked || isCustomLocked}
            onClick={() => onLaunchDrive(effectiveRoute, timeOfDay, weather)}
            className={`w-full py-3.5 px-5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all ${
              isRouteLocked || isCustomLocked
                ? 'bg-neutral-800 text-neutral-500 border border-white/10 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white border border-emerald-300/40 cursor-pointer'
            }`}
          >
            {isRouteLocked || isCustomLocked ? (
              <>
                <Lock className="w-4 h-4" />
                Increase Driver Level to Unlock
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Start Engine &amp; Drive Route
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <span>FASTag Tolls &amp; Diesel Refuel Bunks active along highways</span>
          </div>
        </div>
      </div>
    </div>
  );
}
