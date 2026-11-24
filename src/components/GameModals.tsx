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
import { GameMode } from '../game/gameStore';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenMap: () => void;
  onExitToMenu: () => void;
  route: RouteDefinition;
  livery: BusLivery;
  gameMode: GameMode;
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
}: PauseModalProps) {
  if (!isOpen) return null;

  const keyBindings = [
    ['I', 'Ignition Key ON/OFF'],
    ['W / S', 'Throttle / Brake'],
    ['A / D', 'Steer Left / Right'],
    ['Space', 'Service Air Brake'],
    ['Shift', 'Clutch Pedal'],
    ['G / F', '6-Speed Gear Up/Down'],
    ['N', 'Parking Brake (P)'],
    ['R', 'Reverse Toggle'],
    ['E / B', 'Doors / Whistle'],
    ['T / U', 'Refuel / Tea Break'],
    ['M / O', 'FM Radio / Announce'],
    ['Y / C', 'Mirror / 6 Cameras'],
    ['L / J', 'Lights / High Beam'],
    ['Q / Z / X', 'Indicators / Hazard'],
    ['H / P / V / K', 'Horn/Wipe/CC/Weather'],
  ];

  return (
    <div className="fixed inset-0 z-40 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl overflow-hidden text-white">
        <div className="px-6 py-4 bg-neutral-950 border-b border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
              Tamil Nadu Bus Simulator · {gameMode === 'career' ? 'Career Trip' : 'Free Roam'}
            </span>
            <h2 className="text-xl font-black mt-0.5">Simulation Paused</h2>
          </div>
          <button
            onClick={onResume}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
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

          {/* Controls Quick Reference */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              Driver Controls Quick Reference
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
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

          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <button
              onClick={onResume}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              Resume
            </button>
            <button
              onClick={onRestart}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Restart
            </button>
            <button
              onClick={onOpenMap}
              className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Map className="w-4 h-4" />
              GPS Map
            </button>
            <button
              onClick={onExitToMenu}
              className="py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Main Menu
            </button>
          </div>
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
}: GameOverModalProps) {
  if (!isOpen) return null;

  const netProfit = earnings - fuelSpent - tollsPaid;

  return (
    <div className="fixed inset-0 z-40 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl overflow-hidden text-white">
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
