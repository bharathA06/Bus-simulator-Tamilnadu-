import { useState } from 'react';
import {
  Award,
  Check,
  Compass,
  Film,
  Home,
  Map,
  Play,
  RefreshCw,
  Trophy,
  X,
} from 'lucide-react';
import { BusLivery, RouteDefinition } from '../game/constants';
import { DailyMissionMetric, DailyMissionsState } from '../game/dailyMissions';
import { GameMode, TrafficDensity, TrafficSpeedMode } from '../game/gameStore';
import { DailyMissionsPanel } from './DailyMissionsPanel';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenMap: () => void;
  onExitToMenu: () => void;
  route: RouteDefinition;
  livery: BusLivery;
  gameMode: GameMode;
  trafficDensity: TrafficDensity;
  trafficSpeed: TrafficSpeedMode;
  onChangeTraffic: (density: TrafficDensity, speed: TrafficSpeedMode) => void;
}

export function PauseModal({
  isOpen,
  onResume,
  onRestart,
  onOpenMap,
  onExitToMenu,
  route,
  livery,
  gameMode,
  trafficDensity,
  trafficSpeed,
  onChangeTraffic,
}: PauseModalProps) {
  const [confirmExit, setConfirmExit] = useState(false);
  const [tab, setTab] = useState<'session' | 'keys'>('session');

  if (!isOpen) return null;

  const keyBindings = [
    ['I', 'Ignition Key ON/OFF'],
    ['W / S', 'Throttle / Brake'],
    ['A / D', 'Steer Left / Right'],
    ['Space', 'Service Air Brake'],
    ['Shift', 'Clutch Pedal'],
    ['G / F', '6-Speed Gear Up/Down'],
    ['N / R', 'Handbrake / Reverse'],
    ['E / B', 'Doors / Whistle'],
    ['T / U', 'Refuel / Tea Break'],
    ['M / O', 'FM Radio / Announce'],
    ['Y / C', 'Mirror / 7 Cameras'],
    ['L / J / H', 'Lights / Beam / Horn'],
  ];

  return (
    <div className="fixed inset-0 h-[100dvh] z-40 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-hidden select-none">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl overflow-hidden text-white">
        <div className="px-4 py-2.5 bg-neutral-950 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block truncate">
              Tamil Nadu Bus Simulator · {gameMode === 'career' ? 'Career Trip' : 'Free Roam'}
            </span>
            <h2 className="text-sm sm:text-lg font-black leading-tight">Simulation Paused</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-neutral-900 border border-white/10">
              <button
                onClick={() => setTab('session')}
                className={`min-h-[30px] px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                  tab === 'session' ? 'bg-emerald-600 text-white' : 'text-neutral-300 hover:bg-white/5'
                }`}
              >
                Session
              </button>
              <button
                onClick={() => setTab('keys')}
                className={`min-h-[30px] px-2.5 rounded-md text-[11px] font-bold cursor-pointer ${
                  tab === 'keys' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-300 hover:bg-white/5'
                }`}
              >
                Controls
              </button>
            </div>
            <button
              onClick={() => {
                setConfirmExit(false);
                onResume();
              }}
              className="min-h-[36px] min-w-[36px] p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {tab === 'session' ? (
            <>
              <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-400 truncate">
                    Route {route.code}: {route.titleEn}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">{livery.name}</div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-200 shrink-0">
                  {livery.defaultReg}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
                    Live Road Traffic Control
                  </span>
                  <div className="flex items-center gap-1">
                    {(['calm', 'normal', 'fast'] as TrafficSpeedMode[]).map((sp) => (
                      <button
                        key={sp}
                        onClick={() => onChangeTraffic(trafficDensity, sp)}
                        className={`min-h-[28px] px-2.5 rounded-lg text-[10px] font-bold capitalize border cursor-pointer ${
                          trafficSpeed === sp
                            ? 'bg-emerald-600 border-emerald-400 text-white'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {([
                    { id: 'off', label: 'Off (0)' },
                    { id: 'light', label: 'Light' },
                    { id: 'normal', label: 'Normal' },
                    { id: 'heavy', label: 'Heavy' },
                    { id: 'rush', label: 'Rush' },
                  ] as { id: TrafficDensity; label: string }[]).map((td) => (
                    <button
                      key={td.id}
                      onClick={() => onChangeTraffic(td.id, trafficSpeed)}
                      className={`min-h-[34px] rounded-lg text-[11px] font-bold border cursor-pointer ${
                        trafficDensity === td.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-300'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {td.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              {keyBindings.map(([key, action]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-white/10"
                >
                  <span className="font-mono font-bold text-amber-300 shrink-0">{key}</span>
                  <span className="text-neutral-300 truncate">{action}</span>
                </div>
              ))}
            </div>
          )}

          {confirmExit ? (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-red-100">
                Exit trip and return to Main Menu? Unfinished fares will not be saved.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setConfirmExit(false)}
                  className="min-h-[36px] px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmExit(false);
                    onExitToMenu();
                  }}
                  className="min-h-[36px] px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black cursor-pointer"
                >
                  Exit
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2 pt-0.5">
              <button
                onClick={onResume}
                className="min-h-[40px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>
              <button
                onClick={onRestart}
                className="min-h-[40px] py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Restart
              </button>
              <button
                onClick={onOpenMap}
                className="min-h-[40px] py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Map className="w-4 h-4" />
                GPS Map
              </button>
              <button
                onClick={() => setConfirmExit(true)}
                className="min-h-[40px] py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Menu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface GameOverModalProps {
  isOpen: boolean;
  isVictory: boolean;
  earnings: number;
  fuelSpent: number;
  tollsPaid: number;
  xpEarned: number;
  satisfaction: number;
  newRank: string;
  gameMode: GameMode;
  route: RouteDefinition;
  hasReplay?: boolean;
  onWatchReplay?: () => void;
  onNextRoute: () => void;
  onRetry: () => void;
  onOpenMap: () => void;
  onExitToMenu: () => void;
  dailyMissions?: DailyMissionsState;
  onClaimDailyMission?: (missionId: DailyMissionMetric) => void;
  onClaimDailySweep?: () => void;
}

export function GameOverModal({
  isOpen,
  isVictory,
  earnings,
  fuelSpent,
  tollsPaid,
  xpEarned,
  satisfaction,
  newRank,
  gameMode,
  route,
  hasReplay,
  onWatchReplay,
  onNextRoute,
  onRetry,
  onOpenMap,
  onExitToMenu,
  dailyMissions,
  onClaimDailyMission,
  onClaimDailySweep,
}: GameOverModalProps) {
  if (!isOpen) return null;

  const netProfit = earnings - fuelSpent - tollsPaid;

  return (
    <div className="fixed inset-0 h-[100dvh] z-40 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 overflow-hidden select-none">
      <div className="w-full max-w-4xl rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl overflow-hidden text-white">
        {/* Compact Header */}
        <div
          className={`px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-3 ${
            isVictory ? 'bg-emerald-950/60' : 'bg-red-950/50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isVictory ? 'bg-emerald-500 text-neutral-950' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {isVictory ? <Trophy className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 truncate">
                {route.code} · {route.titleEn}
              </div>
              <h2 className="text-sm sm:text-lg font-black leading-tight truncate">
                {isVictory ? 'Terminal Reached — Trip Settled!' : 'Schedule Time Expired'}
              </h2>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 shrink-0">
            <Award className="w-4 h-4 text-amber-400" />
            <span>
              Rank: <strong className="text-white">{newRank}</strong>
            </span>
          </div>
        </div>

        {/* Horizontal 2-Column Settlement Body */}
        <div className="p-3 sm:p-4 grid grid-cols-12 gap-3 sm:gap-4 items-center">
          {/* Left: Ledger & Metrics */}
          <div className="col-span-6 space-y-2">
            <div className="rounded-xl bg-neutral-950 border border-white/10 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Gross Fares &amp; Bonus</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  +₹{earnings.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Diesel Bunk Refueling</span>
                <span className="font-mono font-bold text-red-400 tabular-nums">
                  -₹{fuelSpent.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">FASTag Highway Tolls</span>
                <span className="font-mono font-bold text-red-400 tabular-nums">
                  -₹{tollsPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="pt-1.5 border-t border-white/10 flex justify-between text-xs sm:text-sm font-black">
                <span>Net Trip Settlement</span>
                <span
                  className={`font-mono tabular-nums ${
                    netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {netProfit >= 0 ? `+₹${netProfit}` : `-₹${Math.abs(netProfit)}`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-neutral-400">Rating</div>
                <div className="text-xs sm:text-sm font-black text-amber-400 font-mono tabular-nums">
                  {satisfaction}%
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-neutral-400">XP Gained</div>
                <div className="text-xs sm:text-sm font-black text-sky-400 font-mono tabular-nums">
                  +{xpEarned} XP
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-neutral-400">Mode</div>
                <div className="text-xs font-black text-white uppercase mt-0.5">{gameMode}</div>
              </div>
            </div>

            {hasReplay && onWatchReplay && (
              <button
                onClick={onWatchReplay}
                className="w-full min-h-[36px] py-1.5 px-3 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 border border-sky-400/50 text-sky-200 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Film className="w-4 h-4" />
                Watch Trip Replay
              </button>
            )}
          </div>

          {/* Right: Daily Missions + Action Buttons */}
          <div className="col-span-6 space-y-2.5">
            {dailyMissions && onClaimDailyMission && onClaimDailySweep && (
              <DailyMissionsPanel
                dailyMissions={dailyMissions}
                onClaimMission={onClaimDailyMission}
                onClaimSweepBonus={onClaimDailySweep}
                variant="compact"
              />
            )}

            <div className={`grid gap-2 ${isVictory ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {isVictory && (
                <button
                  onClick={onNextRoute}
                  className="min-h-[38px] py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Next
                </button>
              )}
              <button
                onClick={onRetry}
                className="min-h-[38px] py-2 px-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                onClick={onOpenMap}
                className="min-h-[38px] py-2 px-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Map className="w-3.5 h-3.5" />
                Map
              </button>
              <button
                onClick={onExitToMenu}
                className="min-h-[38px] py-2 px-2 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Menu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
