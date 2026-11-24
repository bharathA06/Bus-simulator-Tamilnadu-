import {
  Award,
  Bus,
  Compass,
  Map,
  Power,
  Settings,
  ShoppingBag,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { BUS_LIVERIES } from '../game/constants';
import { GameMode, PlayerProgress, getCareerLevel } from '../game/gameStore';

interface MainMenuProps {
  progress: PlayerProgress;
  isMuted: boolean;
  onToggleMute: () => void;
  onSelectMode: (mode: GameMode) => void;
  onOpenGarage: () => void;
  onOpenShop: () => void;
  onOpenSettings: () => void;
  onExitApp: () => void;
}

export function MainMenu({
  progress,
  isMuted,
  onToggleMute,
  onSelectMode,
  onOpenGarage,
  onOpenShop,
  onOpenSettings,
  onExitApp,
}: MainMenuProps) {
  const activeLivery =
    BUS_LIVERIES.find((b) => b.id === progress.selectedBusId) || BUS_LIVERIES[0];
  const levelInfo = getCareerLevel(progress.xp);
  const xpPct = Math.min(100, Math.round((levelInfo.currentLevelXp / levelInfo.nextLevelXp) * 100));

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 pointer-events-none select-none bg-gradient-to-r from-neutral-950/90 via-neutral-950/45 to-neutral-950/25">
      {/* Top ETS2-Style Command Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3.5 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-lg">
          <div className="px-2.5 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-mono font-black text-sm tracking-wider">
            TN
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
              Tamil Nadu Bus Simulator
            </h1>
            <p className="text-[11px] text-amber-300/90 font-medium">
              தமிழ்நாடு பேருந்து சிமுலேட்டர் · {progress.companyName}
            </p>
          </div>
        </div>

        {/* Driver Stats & Bank Balance */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                Lvl {levelInfo.level} · {levelInfo.rank}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-white">{progress.driverName}</span>
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/90 backdrop-blur-md border border-emerald-500/30 rounded-xl px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
              Bank Balance
            </div>
            <div className="text-base font-black text-white font-mono tabular-nums">
              ₹{progress.money.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 hidden md:block">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
              Fleet Owned
            </div>
            <div className="text-base font-black text-white font-mono tabular-nums">
              {progress.ownedBusIds.length} / {BUS_LIVERIES.length}
            </div>
          </div>

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Content Area: Left Navigation Dock + Bottom Right Active Coach Card */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 my-auto py-4">
        {/* Left Navigation Panel */}
        <nav className="w-full max-w-md space-y-2.5 pointer-events-auto">
          <button
            onClick={() => onSelectMode('career')}
            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-400/40 text-left text-white shadow-xl transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="text-base font-black tracking-tight">Career Mode</div>
                <div className="text-xs text-emerald-100">
                  Run TNSTC &amp; SETC schedules, collect fares, earn XP &amp; unlock terminals
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => onSelectMode('free')}
            className="w-full group flex items-center justify-between p-4 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800/95 backdrop-blur-md border border-white/15 text-left text-white shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                <Compass className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight">Free Mode</div>
                <div className="text-xs text-neutral-300">
                  Roam all 17 Tamil Nadu hubs, ghats &amp; coastal highways with zero timers
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={onOpenGarage}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="text-sm font-bold">Garage</div>
                <div className="text-[11px] text-neutral-400">Paint, Plates &amp; Parts</div>
              </div>
            </button>

            <button
              onClick={onOpenShop}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-bold">Shop</div>
                <div className="text-[11px] text-neutral-400">Buy Coaches &amp; Tuning</div>
              </div>
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-700/40 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5 text-neutral-300" />
              </div>
              <div>
                <div className="text-sm font-bold">Settings</div>
                <div className="text-[11px] text-neutral-400">FPS, Audio &amp; Gearbox</div>
              </div>
            </button>

            <button
              onClick={onExitApp}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-900/90 hover:bg-red-950/70 border border-white/10 hover:border-red-500/40 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <Power className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-sm font-bold">Exit</div>
                <div className="text-[11px] text-neutral-400">End Driving Session</div>
              </div>
            </button>
          </div>
        </nav>

        {/* Bottom-Right Active Coach Summary Card */}
        <div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 max-w-sm w-full pointer-events-auto shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
              Active Fleet Coach
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-neutral-200 font-semibold">
              {activeLivery.busClass}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
              style={{ backgroundColor: activeLivery.primaryColor }}
            >
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">{activeLivery.name}</div>
              <div className="text-xs text-neutral-400 truncate">{activeLivery.ledEnglish}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-[10px] text-neutral-400">Trips Done</div>
              <div className="text-sm font-bold text-white font-mono tabular-nums">
                {progress.completedRoutesCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">Distance</div>
              <div className="text-sm font-bold text-white font-mono tabular-nums">
                {progress.totalKmDriven.toFixed(1)} km
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">Upgrades</div>
              <div className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                {progress.equippedUpgrades.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Hint */}
      <footer className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400 pointer-events-none">
        <div className="flex items-center gap-2">
          <Map className="w-3.5 h-3.5 text-emerald-400" />
          <span>Coimbatore · Chennai · Madurai · Ooty · Trichy · Rameswaram · Kanyakumari</span>
        </div>
        <span className="font-mono text-[11px] text-neutral-500">
          Select Career or Free Mode to open the Interactive Tamil Nadu GPS Planner
        </span>
      </footer>
    </div>
  );
}
