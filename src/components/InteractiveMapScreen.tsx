import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  Clock,
  Cloud,
  CloudFog,
  CloudRain,
  Compass,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Fuel,
  LocateFixed,
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
} from 'lucide-react';
import {
  BUS_STOPS,
  CURVED_ROADS,
  HIGHWAY_FACILITIES,
  ROAD_NETWORK,
  ROUTES,
  RouteDefinition,
  TIME_OF_DAY_PRESETS,
  TimeOfDayId,
  WEATHER_PRESETS,
  WeatherId,
} from '../game/constants';
import { GameMode, TrafficDensity } from '../game/gameStore';
import { navigationGraph } from '../game/navigationSystem';

interface InteractiveMapScreenProps {
  mode: GameMode;
  careerLevel: number;
  initialFocus?: 'map' | 'route';
  initialTimeOfDay: TimeOfDayId;
  initialWeather: WeatherId;
  initialTrafficDensity: TrafficDensity;
  onBack: () => void;
  onLaunchDrive: (
    route: RouteDefinition,
    timeOfDay: TimeOfDayId,
    weather: WeatherId,
    trafficDensity: TrafficDensity
  ) => void;
}

export function InteractiveMapScreen({
  mode,
  careerLevel,
  initialFocus = 'route',
  initialTimeOfDay,
  initialWeather,
  initialTrafficDensity,
  onBack,
  onLaunchDrive,
}: InteractiveMapScreenProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(ROUTES[0].id);
  const [useCustomTrip, setUseCustomTrip] = useState<boolean>(initialFocus === 'map');
  const [originId, setOriginId] = useState<string>(BUS_STOPS[0].id);
  const [viaId, setViaId] = useState<string>('');
  const [destId, setDestId] = useState<string>(BUS_STOPS[8].id);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayId>(initialTimeOfDay);
  const [weather, setWeather] = useState<WeatherId>(initialWeather);
  const [trafficDensity, setTrafficDensity] = useState<TrafficDensity>(initialTrafficDensity);

  // Pan, zoom, & compass rotation state
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; z: number }>({ x: 0, z: 0 });
  const [rotated, setRotated] = useState<boolean>(false);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const activePreset = useMemo(
    () => ROUTES.find((r) => r.id === selectedPresetId) || ROUTES[0],
    [selectedPresetId]
  );

  const activeStopIds = useMemo(() => {
    if (!useCustomTrip) return activePreset.stops;
    const seq = [originId];
    if (viaId && viaId !== originId && viaId !== destId) seq.push(viaId);
    if (destId !== originId) seq.push(destId);
    return seq;
  }, [useCustomTrip, activePreset, originId, viaId, destId]);

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
      id: `custom_${orig.id}_${viaId || 'direct'}_${dest.id}`,
      code: mode === 'free' ? 'FREE' : 'CHARTER',
      titleEn: `${orig.city} ➔ ${dest.city}`,
      titleTa: `${orig.nameTa} ➔ ${dest.nameTa}`,
      description: `Custom Tamil Nadu corridor from ${orig.nameEn} to ${dest.nameEn}.`,
      stops: activeStopIds,
      targetSeconds: Math.max(110, Math.round(routePlan.estimatedSeconds * 1.45)),
      baseReward: Math.max(280, Math.round(routePlan.totalDistanceMeters * 0.72)),
      color: '#10b981',
      unlockLevel: 1,
    };
  }, [useCustomTrip, activePreset, originId, viaId, destId, activeStopIds, routePlan, mode]);

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

  const baseW = 1360 / mapZoom;
  const baseH = 1440 / mapZoom;
  const viewBoxStr = `${pan.x - baseW / 2} ${pan.z - baseH / 2} ${baseW} ${baseH}`;
  const polylinePoints = routePlan.waypoints.map((p) => `${p.x},${p.z}`).join(' ');

  const renderWeatherIcon = (wId: WeatherId) => {
    if (wId === 'sunny') return <Sun className="w-4 h-4 text-amber-400" />;
    if (wId === 'cloudy') return <Cloud className="w-4 h-4 text-sky-300" />;
    if (wId === 'fog') return <CloudFog className="w-4 h-4 text-slate-300" />;
    return <CloudRain className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="fixed inset-0 z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 border-b border-white/10 bg-neutral-900">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Menu
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black tracking-tight flex items-center gap-2 truncate">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
              Tamil Nadu Map &amp; Route Planner
            </h1>
            <p className="text-[11px] text-neutral-400 truncate">
              {mode === 'career'
                ? `Career Mode (Lvl ${careerLevel}) — Drag map to pan, tap terminals to chart`
                : 'Free Mode — All 23 Tamil Nadu hubs & 3 mountain ghats unlocked'}
            </p>
          </div>
        </div>

        {/* Route Preset Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
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
                className={`min-h-[38px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
            className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              useCustomTrip
                ? 'bg-amber-500 border-amber-300 text-neutral-950'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
            }`}
          >
            Custom Map
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Left: Interactive Pan/Zoom/Rotate Tamil Nadu Corridor Map */}
        <div
          className="lg:col-span-7 xl:col-span-8 relative bg-neutral-950 flex flex-col min-h-[280px] sm:min-h-[360px] border-b lg:border-b-0 lg:border-r border-white/10 touch-none"
          onPointerDown={(e) => {
            dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
          }}
          onPointerMove={(e) => {
            if (!dragRef.current.active) return;
            const dx = e.clientX - dragRef.current.lastX;
            const dy = e.clientY - dragRef.current.lastY;
            dragRef.current.lastX = e.clientX;
            dragRef.current.lastY = e.clientY;
            const scale = 1.8 / mapZoom;
            setPan((prev) => ({
              x: Math.max(-500, Math.min(500, prev.x - dx * scale)),
              z: Math.max(-520, Math.min(520, prev.z - dy * scale)),
            }));
          }}
          onPointerUp={() => {
            dragRef.current.active = false;
          }}
          onPointerCancel={() => {
            dragRef.current.active = false;
          }}
        >
          {/* Map Legend & Zoom/Rotate Controls */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
            <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-neutral-900/92 border border-white/10 text-[11px] text-neutral-300 items-center gap-3 pointer-events-auto">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Route
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Hairpin Ghats
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" /> Coast
              </span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto ml-auto">
              <button
                onClick={() => setMapZoom((z) => Math.min(2.6, Number((z + 0.3).toFixed(2))))}
                className="min-h-[40px] min-w-[40px] p-2 rounded-lg bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-white flex items-center justify-center cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMapZoom((z) => Math.max(0.85, Number((z - 0.3).toFixed(2))))}
                className="min-h-[40px] min-w-[40px] p-2 rounded-lg bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-white flex items-center justify-center cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotated((r) => !r)}
                className={`min-h-[40px] min-w-[40px] p-2 rounded-lg border flex items-center justify-center cursor-pointer ${
                  rotated
                    ? 'bg-sky-600 border-sky-400 text-white'
                    : 'bg-neutral-900/92 hover:bg-neutral-800 border-white/10 text-white'
                }`}
                title="Tilt / Rotate Map Perspective"
              >
                <Compass className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setPan({ x: 0, z: 0 });
                  setMapZoom(1);
                  setRotated(false);
                }}
                className="min-h-[40px] min-w-[40px] p-2 rounded-lg bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-white flex items-center justify-center cursor-pointer"
                title="Reset Map View"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
            </div>
          </div>

          <svg viewBox={viewBoxStr} className="w-full h-full flex-1">
            <g transform={rotated ? 'rotate(-14 0 0)' : undefined}>
              <rect x={-900} y={-900} width={1800} height={1800} fill="#0c1218" />

              {/* Hill Plateaus */}
              <ellipse cx={-420} cy={-420} rx={195} ry={165} fill="#143025" opacity={0.8} />
              <text x={-495} y={-555} fill="#34d399" fontSize="14" fontWeight="700" opacity={0.85}>
                NILGIRI GHATS (OOTY)
              </text>

              <ellipse cx={-520} cy={410} rx={120} ry={130} fill="#143025" opacity={0.75} />
              <text x={-575} y={565} fill="#34d399" fontSize="13" fontWeight="700" opacity={0.85}>
                VALPARAI 40-HAIRPIN
              </text>

              <ellipse cx={-115} cy={305} rx={85} ry={65} fill="#143025" opacity={0.7} />

              {/* Bay of Bengal & Indian Ocean Coastline */}
              <rect x={575} y={-800} width={350} height={1600} fill="#0c2d48" opacity={0.9} />
              <rect x={-800} y={605} width={1700} height={350} fill="#0c2d48" opacity={0.9} />
              <text x={595} y={-140} fill="#38bdf8" fontSize="15" fontWeight="700" opacity={0.85}>
                BAY OF BENGAL
              </text>
              <text x={55} y={645} fill="#38bdf8" fontSize="15" fontWeight="700" opacity={0.85}>
                INDIAN OCEAN · TRIVENI SANGAM
              </text>

              {/* Cauvery River */}
              <path
                d="M -640 -40 Q -210 -5, 40 20 T 580 -15"
                fill="none"
                stroke="#0284c7"
                strokeWidth="16"
                opacity={0.45}
              />

              {/* 5x5 Divided Tamil Nadu Trunk Highway Grid */}
              {ROAD_NETWORK.verticalX.map((vx) => (
                <g key={`v_${vx}`}>
                  <line
                    x1={vx}
                    y1={ROAD_NETWORK.minZ}
                    x2={vx}
                    y2={ROAD_NETWORK.maxZ}
                    stroke="#334155"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  <line
                    x1={vx}
                    y1={ROAD_NETWORK.minZ}
                    x2={vx}
                    y2={ROAD_NETWORK.maxZ}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeDasharray="8 8"
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
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  <line
                    x1={ROAD_NETWORK.minX}
                    y1={hz}
                    x2={ROAD_NETWORK.maxX}
                    y2={hz}
                    stroke="#64748b"
                    strokeWidth="1.5"
                    strokeDasharray="8 8"
                  />
                </g>
              ))}

              {/* Curved Mountain Hairpin Roads */}
              {CURVED_ROADS.map((seg) => (
                <polyline
                  key={seg.id}
                  points={seg.points.map((p) => `${p.x},${p.z}`).join(' ')}
                  fill="none"
                  stroke="#f59e0b"
                  strokeOpacity={0.55}
                  strokeWidth={seg.width}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {/* Planned Active GPS Polyline */}
              {polylinePoints && (
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Highway Facilities */}
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
                    <rect x={-9} y={-9} width={18} height={18} rx={4} fill={col} stroke="#0f172a" strokeWidth={2} />
                    <text x={0} y={4.5} textAnchor="middle" fill="#09090b" fontSize="11" fontWeight="900">
                      {tag}
                    </text>
                  </g>
                );
              })}

              {/* All 23 Tamil Nadu Bus Terminals */}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStopClick(stop.id, stop.unlockLevel);
                    }}
                    className={locked ? 'cursor-not-allowed' : 'cursor-pointer'}
                  >
                    <circle
                      r={isOnRoute ? 15 : 11}
                      fill={fill}
                      stroke={isOnRoute ? '#ffffff' : '#94a3b8'}
                      strokeWidth={isOnRoute ? 3.5 : 2}
                    />
                    {isOnRoute && (
                      <text
                        x={0}
                        y={4.5}
                        textAnchor="middle"
                        fill="#09090b"
                        fontSize="12"
                        fontWeight="900"
                      >
                        {idxInRoute + 1}
                      </text>
                    )}
                    <text
                      x={0}
                      y={-18}
                      textAnchor="middle"
                      fill={locked ? '#64748b' : isOnRoute ? '#ffffff' : '#cbd5e1'}
                      fontSize="14"
                      fontWeight={isOnRoute ? '800' : '600'}
                    >
                      {stop.city}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Right: Route Configuration, Stats & Directions */}
        <div className="lg:col-span-5 xl:col-span-4 bg-neutral-900 flex flex-col min-h-0 lg:overflow-y-auto ets-scroll p-4 space-y-3.5">
          {/* Origin / Via / Destination */}
          <div className="p-4 rounded-2xl bg-neutral-950/75 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {useCustomTrip ? 'Custom Corridor Selection' : `Schedule ${effectiveRoute.code}`}
              </span>
              {(isRouteLocked || isCustomLocked) && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                  <Lock className="w-3 h-3" /> Unlocks Lvl{' '}
                  {useCustomTrip
                    ? Math.max(originStop.unlockLevel, destStop.unlockLevel)
                    : activePreset.unlockLevel}
                </span>
              )}
            </div>

            {!useCustomTrip ? (
              <div>
                <h2 className="text-sm sm:text-base font-black text-white">{effectiveRoute.titleEn}</h2>
                <p className="text-xs text-emerald-300 mt-0.5">{effectiveRoute.titleTa}</p>
                <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                  {effectiveRoute.description}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                      Starting Location
                    </label>
                    <select
                      value={originId}
                      onChange={(e) => setOriginId(e.target.value)}
                      className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/15 text-xs text-white"
                    >
                      {BUS_STOPS.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={mode === 'career' && s.unlockLevel > careerLevel}
                        >
                          {s.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                      Destination
                    </label>
                    <select
                      value={destId}
                      onChange={(e) => setDestId(e.target.value)}
                      className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/15 text-xs text-white"
                    >
                      {BUS_STOPS.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          disabled={mode === 'career' && s.unlockLevel > careerLevel}
                        >
                          {s.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                    Via Intermediate Stop (Optional)
                  </label>
                  <select
                    value={viaId}
                    onChange={(e) => setViaId(e.target.value)}
                    className="w-full min-h-[40px] px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/15 text-xs text-white"
                  >
                    <option value="">Direct Shortest Highway Route</option>
                    {BUS_STOPS.filter((s) => s.id !== originId && s.id !== destId).map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={mode === 'career' && s.unlockLevel > careerLevel}
                      >
                        Via {s.nameEn}
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
                <div className="text-xs sm:text-sm font-black font-mono tabular-nums mt-0.5">
                  {(routePlan.totalDistanceMeters / 1000).toFixed(2)} km
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> ETA
                </div>
                <div className="text-xs sm:text-sm font-black font-mono tabular-nums mt-0.5">
                  {Math.floor(routePlan.estimatedSeconds / 60)}m {routePlan.estimatedSeconds % 60}s
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <div className="text-[10px] text-neutral-400 flex items-center justify-center gap-1">
                  <Flag className="w-3 h-3 text-sky-400" /> Payout
                </div>
                <div className="text-xs sm:text-sm font-black font-mono text-emerald-400 tabular-nums mt-0.5">
                  {mode === 'career' ? `₹${effectiveRoute.baseReward}` : 'Free Roam'}
                </div>
              </div>
            </div>
          </div>

          {/* Environment: Time of Day & Weather */}
          <div className="p-4 rounded-2xl bg-neutral-950/75 border border-white/10 space-y-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Departure Time
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIME_OF_DAY_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTimeOfDay(t.id)}
                    className={`min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Tamil Nadu Weather
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WEATHER_PRESETS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setWeather(w.id)}
                    className={`min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
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

            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Road Traffic Density
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {([
                  { id: 'off', label: 'Off' },
                  { id: 'light', label: 'Light' },
                  { id: 'normal', label: 'Normal' },
                  { id: 'heavy', label: 'Heavy' },
                  { id: 'rush', label: 'Rush' },
                ] as { id: TrafficDensity; label: string }[]).map((td) => (
                  <button
                    key={td.id}
                    onClick={() => setTrafficDensity(td.id)}
                    className={`min-h-[40px] py-1.5 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      trafficDensity === td.id
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    {td.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Turn-by-Turn GPS Steps Preview */}
          <div className="p-4 rounded-2xl bg-neutral-950/75 border border-white/10 flex-1 min-h-[120px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                GPS Turn-by-Turn Guidance
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                {routePlan.steps.length} Steps
              </span>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto ets-scroll pr-1">
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
            onClick={() => onLaunchDrive(effectiveRoute, timeOfDay, weather, trafficDensity)}
            className={`w-full min-h-[48px] py-3.5 px-5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition-all ${
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

          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-500 pb-1">
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
            <span>FASTag Tolls &amp; Diesel Refuel Bunks active along highways</span>
          </div>
        </div>
      </div>
    </div>
  );
}
