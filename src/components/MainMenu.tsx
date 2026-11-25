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

  const [rightTab, setRightTab] = useState<'missions' | 'coach'>('missions');

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

  const secondaryNav = [
    { label: 'Map', sub: '23 Hubs', icon: Map, color: 'text-emerald-400', bg: 'bg-emerald-500/15', onClick: () => onOpenMapPlanner('map') },
    { label: 'Routes', sub: '7 Lines', icon: Route, color: 'text-amber-400', bg: 'bg-amber-500/15', onClick: () => onOpenMapPlanner('route') },
    { label: 'Garage', sub: 'Tuning', icon: Wrench, color: 'text-sky-400', bg: 'bg-sky-500/15', onClick: onOpenGarage },
    { label: 'Shop', sub: 'Fleet', icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-500/15', onClick: onOpenShop },
    { label: 'Depot', sub: 'Dispatch', icon: Building2, color: 'text-emerald-400', bg: 'bg-emerald-500/15', onClick: onOpenDepot },
    { label: 'Convoy', sub: 'Sync', icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/15', onClick: onOpenMultiplayer },
    { label: 'Settings', sub: 'Controls', icon: Settings, color: 'text-neutral-300', bg: 'bg-neutral-700/40', onClick: onOpenSettings },
    { label: 'Exit Shift', sub: 'Standby', icon: Power, color: 'text-red-400', bg: 'bg-red-500/15', onClick: onExitApp, danger: true },
  ];

  return (
    <div className="fixed inset-0 h-[100dvh] z-20 flex flex-col justify-between p-2.5 sm:p-5 overflow-hidden pointer-events-auto select-none bg-gradient-to-r from-neutral-950/92 via-neutral-950/60 to-neutral-950/30">
      {/* Top ETS2-Style Command Bar */}
      <header className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 bg-neutral-900/92 border border-white/10 rounded-xl sm:rounded-2xl px-3 py-1.5 sm:py-2 shadow-lg min-w-0">
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-amber-400 text-neutral-950 font-mono font-black text-xs tracking-wider shrink-0">
            TN
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-black tracking-tight text-white leading-tight truncate">
              Tamil Nadu Bus Simulator
            </h1>
            <p className="hidden sm:block text-[11px] text-amber-300/90 font-medium truncate">
              தமிழ்நாடு பேருந்து சிமுலேட்டர் · Kovai Mass City Drive
            </p>
          </div>
        </div>

        {/* Driver Stats, Bank Balance, PWA Install & Fullscreen */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:flex bg-neutral-900/92 border border-white/10 rounded-xl px-3 py-1.5 items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-neutral-400 font-semibold leading-none">
                Lvl {levelInfo.level} · {levelInfo.rank}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-white leading-none">{progress.driverName}</span>
                <div className="w-14 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${xpPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900/92 border border-emerald-500/30 rounded-xl px-2.5 sm:px-3.5 py-1.5">
            <div className="text-[9px] sm:text-[10px] text-emerald-300 font-semibold leading-none">Balance</div>
            <div className="text-xs sm:text-sm font-black text-white font-mono tabular-nums mt-0.5">
              ₹{progress.money.toLocaleString('en-IN')}
            </div>
          </div>

          <PWAInstallButton />

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Gameplay'}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] p-2 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-300" /> : <Maximize2 className="w-4 h-4 text-neutral-200" />}
          </button>

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] p-2 rounded-xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Landscape Workspace: Left Nav Dock + Right Tabbed Missions/Coach Panel */}
      <div className="flex-1 min-h-0 grid grid-cols-12 items-center gap-2.5 sm:gap-5 py-1 sm:py-2">
        {/* Left Navigation Dock */}
        <nav className="col-span-7 flex flex-col gap-1.5 sm:gap-2.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectMode('career')}
              className="min-h-[48px] sm:min-h-[60px] group flex items-center justify-between p-2 sm:p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-400/40 text-left text-white shadow-xl transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-base font-black tracking-tight truncate">Career Mode</div>
                  <div className="text-[10px] sm:text-[11px] text-emerald-100 truncate">Scheduled trips &amp; XP</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
            </button>

            <button
              onClick={() => onSelectMode('free')}
              className="min-h-[48px] sm:min-h-[60px] group flex items-center justify-between p-2 sm:p-3.5 rounded-2xl bg-neutral-900/92 hover:bg-neutral-800 border border-white/15 text-left text-white shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-base font-bold tracking-tight truncate">Free Mode</div>
                  <div className="text-[10px] sm:text-[11px] text-neutral-300 truncate">Open-world 23 hubs</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`min-h-[44px] sm:min-h-[54px] flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-xl bg-neutral-900/92 border border-white/10 text-left text-white transition-colors cursor-pointer ${
                    item.danger ? 'hover:bg-red-950/70 hover:border-red-500/40' : 'hover:bg-neutral-800'
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-bold truncate whitespace-nowrap">{item.label}</div>
                    <div className="hidden sm:block text-[10px] text-neutral-400 truncate">{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right Column: Segmented Switcher for Daily Missions & Active Coach (zero overflow on all heights) */}
        <div className="col-span-5 flex flex-col gap-1.5 min-h-0">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-neutral-900/94 border border-white/10 shrink-0">
            <button
              onClick={() => setRightTab('missions')}
              className={`min-h-[30px] sm:min-h-[34px] px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                rightTab === 'missions'
                  ? 'bg-emerald-600 text-white'
                  : 'text-neutral-300 hover:bg-white/5'
              }`}
            >
              Daily Missions
            </button>
            <button
              onClick={() => setRightTab('coach')}
              className={`min-h-[30px] sm:min-h-[34px] px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                rightTab === 'coach'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'text-neutral-300 hover:bg-white/5'
              }`}
            >
              Active Coach
            </button>
          </div>

          {rightTab === 'missions' ? (
            <DailyMissionsPanel
              dailyMissions={progress.dailyMissions}
              onClaimMission={onClaimDailyMission}
              onClaimSweepBonus={onClaimDailySweep}
              variant="compact"
            />
          ) : (
            <div className="bg-neutral-900/92 border border-white/10 rounded-2xl p-3.5 sm:p-4 w-full shadow-xl space-y-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono uppercase tracking-wider text-amber-400">
                  Active Fleet Coach
                </span>
                <span className="text-neutral-300 font-semibold">{activeLivery.busClass}</span>
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
              <div className="pt-2.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
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
          )}
        </div>
      </div>

      {/* Footer Hint */}
      <footer className="flex items-center justify-between gap-2 text-[11px] sm:text-xs text-neutral-400 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Map className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">
            Active: <strong className="text-neutral-200">{activeLivery.name}</strong> · Coimbatore · Ooty · Chennai · Madurai · Kanyakumari
          </span>
        </div>
        <span className="hidden md:inline font-mono text-[11px] text-neutral-500 shrink-0">
          23 Terminals · 3 Mountain Ghats
        </span>
      </footer>
    </div>
  );
}
