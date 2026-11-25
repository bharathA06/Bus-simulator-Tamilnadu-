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
    ['Drag', 'Look Around Viewport'],
    ['L / J', 'Lights / High Beam'],
    ['Q / Z / X', 'Indicators / Hazard'],
    ['H / P / V / K', 'Horn/Wipe/CC/Weather'],
  ];

  return (
    <div className="fixed inset-0 z-40 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl overflow-hidden text-white my-auto">
        <div className="px-5 py-4 bg-neutral-950 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              Tamil Nadu Bus Simulator · {gameMode === 'career' ? 'Career Trip' : 'Free Roam'}
            </span>
            <h2 className="text-lg sm:text-xl font-black mt-0.5">Simulation Paused</h2>
          </div>
          <button
            onClick={() => {
              setConfirmExit(false);
              onResume();
            }}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-emerald-400">
                Route {route.code}: {route.titleEn}
              </div>
              <div className="text-[11px] text-neutral-400">{livery.name}</div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/10 text-neutral-200">
              {livery.defaultReg}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Live Road Traffic Control
              </span>
              <div className="flex items-center gap-1">
                {(['calm', 'normal', 'fast'] as TrafficSpeedMode[]).map((sp) => (
                  <button
                    key={sp}
                    onClick={() => onChangeTraffic(trafficDensity, sp)}
                    className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold capitalize border cursor-pointer ${
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
                  className={`min-h-[38px] rounded-lg text-xs font-bold border cursor-pointer ${
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

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Controls Quick Reference
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
              {keyBindings.map(([key, action]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-white/10"
                >
                  <span className="font-mono font-bold text-amber-300">{key}</span>
                  <span className="text-neutral-300 truncate">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {confirmExit ? (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-red-100">
                Exit current trip and return to Main Menu? Unfinished fares will not be saved.
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setConfirmExit(false)}
                  className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmExit(false);
                    onExitToMenu();
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-black cursor-pointer"
                >
                  Confirm Exit
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <button
                onClick={onResume}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>
              <button
                onClick={onRestart}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Restart
              </button>
              <button
                onClick={onOpenMap}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Map className="w-4 h-4" />
                GPS Map
              </button>
              <button
                onClick={() => setConfirmExit(true)}
                className="min-h-[44px] py-2.5 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Main Menu
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
    <div className="fixed inset-0 z-40 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl overflow-hidden text-white my-auto">
        <div
          className={`px-6 py-5 border-b border-white/10 flex items-center gap-3.5 ${
            isVictory ? 'bg-emerald-950/60' : 'bg-red-950/50'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isVictory ? 'bg-emerald-500 text-neutral-950' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isVictory ? <Trophy className="w-6 h-6" /> : <Compass className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-300">
              Tamil Nadu Bus Simulator · {route.code}
            </div>
            <h2 className="text-xl font-black">
              {isVictory ? 'Terminal Reached — Trip Settled!' : 'Schedule Time Expired'}
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-xs text-neutral-300">{route.titleEn}</div>

          {/* Trip Settlement Breakdown */}
          <div className="rounded-xl bg-neutral-950 border border-white/10 p-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400">Gross Fares &amp; Completion Bonus</span>
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
            <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-black">
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

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-neutral-400">Passenger Rating</div>
              <div className="text-base font-black text-amber-400 font-mono tabular-nums mt-0.5">
                {satisfaction}%
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-neutral-400">XP Gained</div>
              <div className="text-base font-black text-sky-400 font-mono tabular-nums mt-0.5">
                +{xpEarned} XP
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="text-[10px] text-neutral-400">Mode</div>
              <div className="text-xs font-black text-white uppercase mt-1">{gameMode}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Current Rank: <strong className="text-white">{newRank}</strong>
            </span>
          </div>

          {dailyMissions && onClaimDailyMission && onClaimDailySweep && (
            <DailyMissionsPanel
              dailyMissions={dailyMissions}
              onClaimMission={onClaimDailyMission}
              onClaimSweepBonus={onClaimDailySweep}
              variant="compact"
            />
          )}

          {hasReplay && onWatchReplay && (
            <button
              onClick={onWatchReplay}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 border border-sky-400/50 text-sky-200 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Film className="w-4 h-4" />
              Watch Trip Replay
            </button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {isVictory && (
              <button
                onClick={onNextRoute}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Next Route
              </button>
            )}
            <button
              onClick={onRetry}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Drive Again
            </button>
            <button
              onClick={onOpenMap}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Map className="w-4 h-4" />
              GPS Map
            </button>
            <button
              onClick={onExitToMenu}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Menu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
