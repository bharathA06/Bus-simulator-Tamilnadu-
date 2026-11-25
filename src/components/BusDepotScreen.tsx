import { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bus,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplets,
  History,
  Lock,
  Play,
  ShieldCheck,
  Target,
  Wrench,
} from 'lucide-react';
import { BUS_LIVERIES, ROUTES, RouteDefinition, TimeOfDayId, WeatherId } from '../game/constants';
import { DailyMissionMetric, getMissionDef, syncDailyMissionsState } from '../game/dailyMissions';
import {
  ACHIEVEMENTS,
  BUS_SHOP_SPECS,
  PlayerProgress,
  getCareerLevel,
} from '../game/gameStore';
import { DailyMissionsPanel } from './DailyMissionsPanel';

interface BusDepotScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
  onRepairBus: () => void;
  onWashBus: () => void;
  onLaunchScheduledRoute: (
    route: RouteDefinition,
    timeOfDay: TimeOfDayId,
    weather: WeatherId
  ) => void;
  onOpenGarage: () => void;
  onClaimDailyMission: (missionId: DailyMissionMetric) => void;
  onClaimDailySweep: () => void;
}

export function BusDepotScreen({
  progress,
  onBack,
  onRepairBus,
  onWashBus,
  onLaunchScheduledRoute,
  onOpenGarage,
  onClaimDailyMission,
  onClaimDailySweep,
}: BusDepotScreenProps) {
  const [tab, setTab] = useState<'dispatch' | 'missions' | 'fleet' | 'logs' | 'awards'>('dispatch');
  const [dispatchPage, setDispatchPage] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const [awardsPage, setAwardsPage] = useState(0);

  const syncedDaily = syncDailyMissionsState(progress.dailyMissions);
  const completedMissionsCount = syncedDaily.missions.filter(
    (m) => m.progress >= getMissionDef(m.id).target
  ).length;
  const levelInfo = getCareerLevel(progress.xp);
  const activeBus =
    BUS_LIVERIES.find((b) => b.id === progress.selectedBusId) || BUS_LIVERIES[0];
  const activeSpec =
    BUS_SHOP_SPECS.find((s) => s.liveryId === activeBus.id) || BUS_SHOP_SPECS[0];

  const scheduleShifts: Array<{ shift: string; tod: TimeOfDayId; weather: WeatherId }> = [
    { shift: '06:15 AM Express', tod: 'day', weather: 'sunny' },
    { shift: '09:30 AM Ghat', tod: 'day', weather: 'cloudy' },
    { shift: '04:45 PM Misty', tod: 'sunset', weather: 'fog' },
    { shift: '07:10 PM Monsoon', tod: 'night', weather: 'rain' },
    { shift: '08:30 PM Hill', tod: 'sunset', weather: 'cloudy' },
    { shift: '10:15 PM SETC', tod: 'night', weather: 'sunny' },
    { shift: '11:00 PM Coast', tod: 'night', weather: 'cloudy' },
  ];

  const DISPATCH_PER_PAGE = 3;
  const totalDispatchPages = Math.max(1, Math.ceil(ROUTES.length / DISPATCH_PER_PAGE));
  const safeDispatchPage = Math.min(dispatchPage, totalDispatchPages - 1);
  const visibleRoutes = ROUTES.slice(
    safeDispatchPage * DISPATCH_PER_PAGE,
    safeDispatchPage * DISPATCH_PER_PAGE + DISPATCH_PER_PAGE
  );

  const LOGS_PER_PAGE = 4;
  const totalLogsPages = Math.max(1, Math.ceil(progress.tripLogs.length / LOGS_PER_PAGE));
  const safeLogsPage = Math.min(logsPage, totalLogsPages - 1);
  const visibleLogs = progress.tripLogs.slice(
    safeLogsPage * LOGS_PER_PAGE,
    safeLogsPage * LOGS_PER_PAGE + LOGS_PER_PAGE
  );

  const AWARDS_PER_PAGE = 3;
  const totalAwardsPages = Math.max(1, Math.ceil(ACHIEVEMENTS.length / AWARDS_PER_PAGE));
  const safeAwardsPage = Math.min(awardsPage, totalAwardsPages - 1);
  const visibleAwards = ACHIEVEMENTS.slice(
    safeAwardsPage * AWARDS_PER_PAGE,
    safeAwardsPage * AWARDS_PER_PAGE + AWARDS_PER_PAGE
  );

  const showPager =
    tab === 'dispatch' || (tab === 'logs' && progress.tripLogs.length > 0) || tab === 'awards';
  const currentPage =
    tab === 'dispatch' ? safeDispatchPage : tab === 'logs' ? safeLogsPage : safeAwardsPage;
  const totalPages =
    tab === 'dispatch' ? totalDispatchPages : tab === 'logs' ? totalLogsPages : totalAwardsPages;

  const handlePageDelta = (delta: number) => {
    if (tab === 'dispatch') {
      setDispatchPage((p) => Math.max(0, Math.min(totalDispatchPages - 1, p + delta)));
    } else if (tab === 'logs') {
      setLogsPage((p) => Math.max(0, Math.min(totalLogsPages - 1, p + delta)));
    } else if (tab === 'awards') {
      setAwardsPage((p) => Math.max(0, Math.min(totalAwardsPages - 1, p + delta)));
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b border-white/10 bg-neutral-900 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Menu
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black truncate">
              Tamil Nadu Transport Bus Depot
            </h1>
            <p className="hidden sm:block text-[11px] text-neutral-400 truncate">
              {progress.driverName} · Lvl {levelInfo.level} {levelInfo.rank}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs font-mono font-black text-emerald-400 tabular-nums">
            ₹{progress.money.toLocaleString('en-IN')}
          </div>
          <button
            onClick={onOpenGarage}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Garage</span>
          </button>
        </div>
      </header>

      {/* Compact Career Stats Strip */}
      <div className="px-3 sm:px-5 pt-2 grid grid-cols-4 gap-2 shrink-0">
        <div className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] text-neutral-400 truncate">Trips</span>
          <span className="text-xs sm:text-sm font-black font-mono tabular-nums text-white">
            {progress.completedRoutesCount}
          </span>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] text-neutral-400 truncate">Distance</span>
          <span className="text-xs sm:text-sm font-black font-mono tabular-nums text-emerald-400">
            {progress.totalKmDriven.toFixed(1)} km
          </span>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] text-neutral-400 truncate">Fuel/Toll</span>
          <span className="text-xs sm:text-sm font-black font-mono tabular-nums text-amber-300">
            ₹{(progress.totalFuelSpent + progress.totalTollsPaid).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-[11px] text-neutral-400 truncate">Coach</span>
          <span className="text-xs sm:text-sm font-black font-mono tabular-nums text-sky-300">
            {Math.round(progress.vehicleHealthPct)}%
          </span>
        </div>
      </div>

      {/* Category Tabs + Pager (Zero Horizontal Scroll) */}
      <div className="px-3 sm:px-5 pt-2 flex items-center justify-between gap-2 shrink-0">
        <div className="grid grid-cols-5 gap-1.5 flex-1 max-w-3xl">
          {(
            [
              { id: 'dispatch', label: 'Dispatch', icon: CalendarClock },
              {
                id: 'missions',
                label: `Missions (${completedMissionsCount}/${syncedDaily.missions.length})`,
                icon: Target,
              },
              { id: 'fleet', label: 'Care', icon: Bus },
              { id: 'logs', label: `Logs (${progress.tripLogs.length})`, icon: History },
              {
                id: 'awards',
                label: `Badges (${progress.unlockedAchievements.length}/${ACHIEVEMENTS.length})`,
                icon: Award,
              },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`min-h-[36px] inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded-xl text-[10px] sm:text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap truncate ${
                  active
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {showPager && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              disabled={currentPage === 0}
              onClick={() => handlePageDelta(-1)}
              className="min-h-[34px] min-w-[34px] rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-neutral-300 tabular-nums px-1">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages - 1}
              onClick={() => handlePageDelta(1)}
              className="min-h-[34px] min-w-[34px] rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Non-Scrolling Body */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-5 flex items-center">
        {tab === 'dispatch' && (
          <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-4">
            {visibleRoutes.map((route, idx) => {
              const globalIdx = safeDispatchPage * DISPATCH_PER_PAGE + idx;
              const locked = route.unlockLevel > levelInfo.level;
              const slot = scheduleShifts[globalIdx % scheduleShifts.length];
              return (
                <div
                  key={route.id}
                  className="rounded-2xl bg-neutral-900 border border-white/10 p-3 sm:p-4 flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs mb-1">
                      <span className="font-mono font-black text-amber-400">
                        BAY {globalIdx + 1} · {route.code}
                      </span>
                      <span className="text-neutral-400 font-mono truncate">{slot.shift}</span>
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-white leading-snug line-clamp-1">
                      {route.titleEn}
                    </h3>
                    <p className="text-[11px] text-emerald-400 mt-0.5 truncate">{route.titleTa}</p>
                    <p className="hidden sm:block text-xs text-neutral-400 mt-1.5 line-clamp-2">
                      {route.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-mono tabular-nums">
                      <span className="text-emerald-400 font-bold">₹{route.baseReward}</span>
                      <span className="text-neutral-500"> · {route.stops.length} stops</span>
                    </div>
                    {locked ? (
                      <div className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-neutral-800 text-neutral-400 text-[11px] font-bold">
                        <Lock className="w-3 h-3 text-amber-400" />
                        Lvl {route.unlockLevel}
                      </div>
                    ) : (
                      <button
                        onClick={() => onLaunchScheduledRoute(route, slot.tod, slot.weather)}
                        className="min-h-[34px] inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Dispatch
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'missions' && (
          <div className="w-full max-w-5xl mx-auto">
            <DailyMissionsPanel
              dailyMissions={progress.dailyMissions}
              onClaimMission={onClaimDailyMission}
              onClaimSweepBonus={onClaimDailySweep}
              variant="full"
            />
          </div>
        )}

        {tab === 'fleet' && (
          <div className="w-full max-w-4xl mx-auto rounded-2xl bg-neutral-900 border border-white/10 p-3.5 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                  Active Depot Bay
                </div>
                <h2 className="text-sm sm:text-lg font-black text-white truncate">{activeBus.name}</h2>
                <p className="text-[11px] text-neutral-400 truncate">
                  {activeSpec.chassisModel} · {(activeSpec.weightKg / 1000).toFixed(1)}T ·{' '}
                  {activeSpec.lengthMeters}m · {activeSpec.seats} Seats
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-neutral-950 font-mono font-black text-xs shrink-0">
                {activeBus.defaultReg}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 sm:p-4 rounded-xl bg-neutral-950 border border-white/10 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Mechanical Health</span>
                  <span className="font-mono font-black text-emerald-400 tabular-nums">
                    {Math.round(progress.vehicleHealthPct)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full ${progress.vehicleHealthPct < 45 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.max(0, Math.min(100, progress.vehicleHealthPct))}%` }}
                  />
                </div>
                <button
                  disabled={progress.vehicleHealthPct >= 99 || progress.money < 150}
                  onClick={onRepairBus}
                  className="w-full min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wrench className="w-4 h-4" />
                  Depot Overhaul (-₹150)
                </button>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-neutral-950 border border-white/10 space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">Highway Mud &amp; Dust</span>
                  <span className="font-mono font-black text-amber-300 tabular-nums">
                    {Math.round(progress.dirtinessPct)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${Math.max(0, Math.min(100, progress.dirtinessPct))}%` }}
                  />
                </div>
                <button
                  disabled={progress.dirtinessPct <= 2 || progress.money < 80}
                  onClick={onWashBus}
                  className="w-full min-h-[38px] rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Droplets className="w-4 h-4" />
                  High-Pressure Wash (-₹80)
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="w-full max-w-5xl mx-auto">
            {progress.tripLogs.length === 0 ? (
              <div className="p-6 rounded-2xl bg-neutral-900 border border-white/10 text-center text-xs sm:text-sm text-neutral-400">
                No completed trips recorded yet. Dispatch a route to build your TNSTC duty logbook.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {visibleLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 sm:p-4 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-mono text-amber-400 truncate">
                        {log.routeCode} · {log.busName}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-white truncate">
                        {log.routeTitle}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5 tabular-nums">
                        {log.kmDriven.toFixed(2)} km · {log.satisfaction}% Happy
                      </div>
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-mono font-black shrink-0 tabular-nums ${
                        log.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {log.netProfit >= 0 ? `+₹${log.netProfit}` : `-₹${Math.abs(log.netProfit)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="w-full max-w-5xl mx-auto grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {visibleAwards.map((ach) => {
              const unlocked = progress.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`p-3 sm:p-4 rounded-2xl border flex flex-col justify-between gap-2 ${
                    unlocked
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-neutral-900 border-white/10 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-white">
                      {unlocked ? (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-neutral-500 shrink-0" />
                      )}
                      <span className="truncate">{ach.title}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-neutral-400 leading-snug line-clamp-2">
                      {ach.desc}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className={unlocked ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                      {unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                    <span className="font-black text-amber-400 tabular-nums">+₹{ach.reward}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
