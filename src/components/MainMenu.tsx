import { useState } from 'react';
import {
  Award,
  Building2,
  Bus,
  ChevronRight,
  Compass,
  Map,
  Maximize2,
  Minimize2,
  Power,
  Route,
  Settings,
  ShoppingBag,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { BUS_LIVERIES } from '../game/constants';
import { DailyMissionMetric } from '../game/dailyMissions';
import { GameMode, PlayerProgress, getCareerLevel } from '../game/gameStore';
import { DailyMissionsPanel } from './DailyMissionsPanel';
import { PWAInstallButton } from './PWAInstallButton';

interface MainMenuProps {
  progress: PlayerProgress;
  isMuted: boolean;
  onToggleMute: () => void;
  onSelectMode: (mode: GameMode) => void;
  onOpenMapPlanner: (focus: 'map' | 'route') => void;
  onOpenGarage: () => void;
  onOpenShop: () => void;
  onOpenDepot: () => void;
  onOpenMultiplayer: () => void;
  onOpenSettings: () => void;
  onClaimDailyMission: (missionId: DailyMissionMetric) => void;
  onClaimDailySweep: () => void;
  onExitApp: () => void;
}

export function MainMenu({
  progress,
  isMuted,
  onToggleMute,
  onSelectMode,
  onOpenMapPlanner,
  onOpenGarage,
  onOpenShop,
  onOpenDepot,
  onOpenMultiplayer,
  onOpenSettings,
  onClaimDailyMission,
  onClaimDailySweep,
  onExitApp,
}: MainMenuProps) {
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' ? !!document.fullscreenElement : false
  );

  const activeLivery =
    BUS_LIVERIES.find((b) => b.id === progress.selectedBusId) || BUS_LIVERIES[0];
  const levelInfo = getCareerLevel(progress.xp);
  const xpPct = Math.min(100, Math.round((levelInfo.currentLevelXp / levelInfo.nextLevelXp) * 100));

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Ignore browser fullscreen restriction in iframe
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 overflow-y-auto ets-scroll pointer-events-auto select-none bg-gradient-to-r from-neutral-950/92 via-neutral-950/55 to-neutral-950/25">
      {/* Top ETS2-Style Command Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 bg-neutral-900/92 border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-lg">
          <div className="px-2.5 py-1 rounded-lg bg-amber-400 text-neutral-950 font-mono font-black text-xs sm:text-sm tracking-wider">
            TN
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tight text-white leading-tight">
              Tamil Nadu Bus Simulator
            </h1>
            <p className="text-[11px] text-amber-300/90 font-medium">
              தமிழ்நாடு பேருந்து சிமுலேட்டர் · Kovai Mass City Drive
            </p>
          </div>
        </div>

        {/* Driver Stats, Bank Balance, PWA Install & Fullscreen */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-neutral-900/92 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-neutral-400 font-semibold">
                Lvl {levelInfo.level} · {levelInfo.rank}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{progress.driverName}</span>
                <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/92 border border-emerald-500/30 rounded-xl px-3.5 py-2">
            <div className="text-[10px] text-emerald-300 font-semibold">Balance</div>
            <div className="text-sm sm:text-base font-black text-white font-mono tabular-nums">
              ₹{progress.money.toLocaleString('en-IN')}
            </div>
          </div>

          <PWAInstallButton />

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Gameplay'}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-300" /> : <Maximize2 className="w-4 h-4 text-neutral-200" />}
          </button>

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Content Area: Navigation Grid + Active Coach Card */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4 my-auto py-3">
        {/* Complete Mobile-Friendly Menu Dock */}
        <nav className="w-full max-w-xl space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => onSelectMode('career')}
              className="min-h-[56px] group flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-400/40 text-left text-white shadow-xl transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black tracking-tight">Career Mode</div>
                  <div className="text-[11px] text-emerald-100">Scheduled trips &amp; XP</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            <button
              onClick={() => onSelectMode('free')}
              className="min-h-[56px] group flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/15 text-left text-white shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Compass className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold tracking-tight">Free Mode</div>
                  <div className="text-[11px] text-neutral-300">Open-world 23 hubs</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => onOpenMapPlanner('map')}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Map className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Map Selection</div>
                <div className="text-[10px] text-neutral-400 truncate">Cities &amp; Ghats</div>
              </div>
            </button>

            <button
              onClick={() => onOpenMapPlanner('route')}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <Route className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Route Selection</div>
                <div className="text-[10px] text-neutral-400 truncate">7 Trunk Lines</div>
              </div>
            </button>

            <button
              onClick={onOpenGarage}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                <Wrench className="w-4 h-4 text-sky-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Garage</div>
                <div className="text-[10px] text-neutral-400 truncate">Paint &amp; Tuning</div>
              </div>
            </button>

            <button
              onClick={onOpenShop}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Shop</div>
                <div className="text-[10px] text-neutral-400 truncate">Coaches &amp; Parts</div>
              </div>
            </button>

            <button
              onClick={onOpenDepot}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Bus Depot</div>
                <div className="text-[10px] text-neutral-400 truncate">Dispatch &amp; Logs</div>
              </div>
            </button>

            <button
              onClick={onOpenMultiplayer}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Multiplayer</div>
                <div className="text-[10px] text-neutral-400 truncate">Convoy Sync</div>
              </div>
            </button>

            <button
              onClick={onOpenSettings}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-left text-white transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-700/40 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-neutral-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Settings</div>
                <div className="text-[10px] text-neutral-400 truncate">Mobile &amp; Graphics</div>
              </div>
            </button>

            <button
              onClick={onExitApp}
              className="min-h-[52px] flex items-center gap-2.5 p-3 rounded-xl bg-neutral-900/92 hover:bg-red-950/70 border border-white/10 hover:border-red-500/40 text-left text-white transition-colors cursor-pointer col-span-1 sm:col-span-2"
            >
              <div className="w-9 h-9 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                <Power className="w-4 h-4 text-red-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold truncate">Exit Shift</div>
                <div className="text-[10px] text-neutral-400 truncate">Save Progress &amp; Stand By</div>
              </div>
            </button>
          </div>
        </nav>

        {/* Right Column: Daily Missions Tracker + Active Coach Summary Card */}
        <div className="lg:w-96 w-full space-y-3 shrink-0">
          <DailyMissionsPanel
            dailyMissions={progress.dailyMissions}
            onClaimMission={onClaimDailyMission}
            onClaimSweepBonus={onClaimDailySweep}
            variant="compact"
          />

          <div className="bg-neutral-900/92 border border-white/10 rounded-2xl p-4 w-full shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400">
                Active Fleet Coach
              </span>
              <span className="text-[11px] text-neutral-300 font-semibold">
                {activeLivery.busClass}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
                style={{ backgroundColor: activeLivery.primaryColor }}
              >
                <Bus className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{activeLivery.name}</div>
                <div className="text-xs text-neutral-400 truncate">{activeLivery.ledEnglish}</div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-neutral-400">Trips</div>
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
                <div className="text-[10px] text-neutral-400">Fleet</div>
                <div className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                  {progress.ownedBusIds.length}/{BUS_LIVERIES.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Hint */}
      <footer className="hidden sm:flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400 pt-2">
        <div className="flex items-center gap-2">
          <Map className="w-3.5 h-3.5 text-emerald-400" />
          <span>Coimbatore · Ooty · Valparai · Kodaikanal · Chennai · Madurai · Rameswaram · Kanyakumari</span>
        </div>
        <span className="font-mono text-[11px] text-neutral-500">
          23 Tamil Nadu Terminals · 3 Mountain Ghat Hairpins
        </span>
      </footer>
    </div>
  );
}
