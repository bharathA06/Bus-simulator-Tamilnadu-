import { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bus,
  CalendarClock,
  Check,
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
    { shift: '06:15 AM Morning Express', tod: 'day', weather: 'sunny' },
    { shift: '09:30 AM Ghat Climb', tod: 'day', weather: 'cloudy' },
    { shift: '04:45 PM Misty Evening', tod: 'sunset', weather: 'fog' },
    { shift: '07:10 PM Monsoon Night', tod: 'night', weather: 'rain' },
    { shift: '08:30 PM Hill Corridor', tod: 'sunset', weather: 'cloudy' },
    { shift: '10:15 PM SETC Overnight', tod: 'night', weather: 'sunny' },
    { shift: '11:00 PM Coastal Express', tod: 'night', weather: 'cloudy' },
  ];

  return (
    <div className="fixed inset-0 z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-neutral-900">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Main Menu
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-black truncate">
              Tamil Nadu Transport Bus Depot
            </h1>
            <p className="text-[11px] text-neutral-400 truncate">
              {progress.driverName} · Lvl {levelInfo.level} {levelInfo.rank}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs font-mono font-black text-emerald-400 tabular-nums">
            ₹{progress.money.toLocaleString('en-IN')}
          </div>
          <button
            onClick={onOpenGarage}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span className="hidden sm:inline">Garage</span>
          </button>
        </div>
      </header>

      {/* Driver Career Stats Strip */}
      <div className="px-4 sm:px-6 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
          <div className="text-[11px] text-neutral-400">Trips Completed</div>
          <div className="text-lg font-black font-mono tabular-nums text-white">
            {progress.completedRoutesCount}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
          <div className="text-[11px] text-neutral-400">Cumulative Distance</div>
          <div className="text-lg font-black font-mono tabular-nums text-emerald-400">
            {progress.totalKmDriven.toFixed(1)} km
          </div>
        </div>
        <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
          <div className="text-[11px] text-neutral-400">Fuel &amp; Tolls Paid</div>
          <div className="text-lg font-black font-mono tabular-nums text-amber-300">
            ₹{(progress.totalFuelSpent + progress.totalTollsPaid).toLocaleString('en-IN')}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-neutral-900 border border-white/10">
          <div className="text-[11px] text-neutral-400">Fleet Health / Clean</div>
          <div className="text-lg font-black font-mono tabular-nums text-sky-300">
            {Math.round(progress.vehicleHealthPct)}% · {Math.round(100 - progress.dirtinessPct)}%
          </div>
        </div>
      </div>

      {/* Category Navigation Tabs */}
      <div className="px-4 sm:px-6 pt-3 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'dispatch', label: 'Dispatch Board', icon: CalendarClock },
            {
              id: 'missions',
              label: `Daily Missions (${completedMissionsCount}/${syncedDaily.missions.length})`,
              icon: Target,
            },
            { id: 'fleet', label: 'Fleet Maintenance', icon: Bus },
            { id: 'logs', label: `Trip Logs (${progress.tripLogs.length})`, icon: History },
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
              className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto ets-scroll p-4 sm:p-6">
        {tab === 'dispatch' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {ROUTES.map((route, idx) => {
              const locked = route.unlockLevel > levelInfo.level;
              const slot = scheduleShifts[idx % scheduleShifts.length];
              return (
                <div
                  key={route.id}
                  className="rounded-2xl bg-neutral-900 border border-white/10 p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="font-mono font-black text-amber-400">
                        BAY {idx + 1} · {route.code}
                      </span>
                      <span className="text-neutral-400 font-mono">{slot.shift}</span>
                    </div>
                    <h3 className="text-sm font-black text-white leading-snug">{route.titleEn}</h3>
                    <p className="text-xs text-emerald-400 mt-1">{route.titleTa}</p>
                    <p className="text-xs text-neutral-400 mt-2">{route.description}</p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                    <div className="text-xs font-mono tabular-nums">
                      <span className="text-emerald-400 font-bold">₹{route.baseReward}</span>
                      <span className="text-neutral-500"> · {route.stops.length} stops</span>
                    </div>
                    {locked ? (
                      <div className="min-h-[44px] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 text-neutral-400 text-xs font-bold">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        Lvl {route.unlockLevel}
                      </div>
                    ) : (
                      <button
                        onClick={() => onLaunchScheduledRoute(route, slot.tod, slot.weather)}
                        className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
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
          <div className="max-w-5xl mx-auto">
            <DailyMissionsPanel
              dailyMissions={progress.dailyMissions}
              onClaimMission={onClaimDailyMission}
              onClaimSweepBonus={onClaimDailySweep}
              variant="full"
            />
          </div>
        )}

        {tab === 'fleet' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="rounded-2xl bg-neutral-900 border border-white/10 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-amber-400">
                    Active Depot Bay
                  </div>
                  <h2 className="text-lg font-black text-white">{activeBus.name}</h2>
                  <p className="text-xs text-neutral-400">
                    {activeSpec.chassisModel} · {(activeSpec.weightKg / 1000).toFixed(1)}T Gross ·{' '}
                    {activeSpec.lengthMeters}m · {activeSpec.seats} Seats
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-mono font-black text-xs">
                  {activeBus.defaultReg}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-neutral-950 border border-white/10 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Mechanical &amp; Brake Health</span>
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
                    className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Wrench className="w-4 h-4" />
                    Depot Overhaul &amp; Brake Check (-₹150)
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-neutral-950 border border-white/10 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Exterior Highway Mud &amp; Dust</span>
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
                    className="w-full min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Droplets className="w-4 h-4" />
                    High-Pressure Depot Wash (-₹80)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="max-w-4xl mx-auto space-y-2.5">
            {progress.tripLogs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-neutral-900 border border-white/10 text-center text-sm text-neutral-400">
                No completed trips recorded yet. Dispatch a route to build your TNSTC duty logbook.
              </div>
            ) : (
              progress.tripLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-neutral-900 border border-white/10 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-mono text-amber-400">
                      {log.routeCode} · {log.busName}
                    </div>
                    <div className="text-sm font-bold text-white">{log.routeTitle}</div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
                    <span className="text-neutral-400">{log.kmDriven.toFixed(2)} km</span>
                    <span className="text-sky-300">{log.satisfaction}% Happy</span>
                    <span
                      className={`font-black ${log.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                    >
                      {log.netProfit >= 0 ? `+₹${log.netProfit}` : `-₹${Math.abs(log.netProfit)}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'awards' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {ACHIEVEMENTS.map((ach) => {
              const unlocked = progress.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                    unlocked
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-neutral-900 border-white/10 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-black text-white">
                      {unlocked ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-neutral-500" />
                      )}
                      {ach.title}
                    </div>
                    <p className="text-xs text-neutral-400">{ach.desc}</p>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-400 shrink-0 tabular-nums">
                    +₹{ach.reward}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
