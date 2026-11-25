import { useState } from 'react';
import {
  ArrowLeft,
  Bus,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  ShoppingBag,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { BUS_LIVERIES } from '../game/constants';
import {
  BUS_SHOP_SPECS,
  PlayerProgress,
  UPGRADE_CATALOG,
  getCareerLevel,
} from '../game/gameStore';

interface ShopScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
  onOpenGarage: () => void;
  onBuyBus: (busId: string, price: number) => void;
  onBuyUpgrade: (upgradeId: string, price: number) => void;
}

export function ShopScreen({
  progress,
  onBack,
  onOpenGarage,
  onBuyBus,
  onBuyUpgrade,
}: ShopScreenProps) {
  const [tab, setTab] = useState<'buses' | 'upgrades'>('buses');
  const [busPage, setBusPage] = useState(0);
  const [upgradePage, setUpgradePage] = useState(0);
  const levelInfo = getCareerLevel(progress.xp);

  const BUSES_PER_PAGE = 4;
  const totalBusPages = Math.max(1, Math.ceil(BUS_LIVERIES.length / BUSES_PER_PAGE));
  const safeBusPage = Math.min(busPage, totalBusPages - 1);
  const visibleBuses = BUS_LIVERIES.slice(
    safeBusPage * BUSES_PER_PAGE,
    safeBusPage * BUSES_PER_PAGE + BUSES_PER_PAGE
  );

  const UPGRADES_PER_PAGE = 3;
  const totalUpgradePages = Math.max(1, Math.ceil(UPGRADE_CATALOG.length / UPGRADES_PER_PAGE));
  const safeUpgradePage = Math.min(upgradePage, totalUpgradePages - 1);
  const visibleUpgrades = UPGRADE_CATALOG.slice(
    safeUpgradePage * UPGRADES_PER_PAGE,
    safeUpgradePage * UPGRADES_PER_PAGE + UPGRADES_PER_PAGE
  );

  return (
    <div className="fixed inset-0 h-[100dvh] z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2.5 border-b border-white/10 bg-neutral-900 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Menu
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black flex items-center gap-1.5 truncate">
              <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
              Tamil Nadu Fleet Dealership &amp; Parts Shop
            </h1>
            <p className="hidden sm:block text-[11px] text-neutral-400 truncate">
              TNSTC, SETC &amp; Private Luxury buses &amp; upgrades · Driver Lvl {levelInfo.level}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs sm:text-sm font-mono font-black text-emerald-400 tabular-nums">
            ₹{progress.money.toLocaleString('en-IN')}
          </div>
          <button
            onClick={onOpenGarage}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Wrench className="w-4 h-4" />
            Garage
          </button>
        </div>
      </header>

      {/* Category Switcher & Pagination Bar */}
      <div className="px-3 sm:px-5 pt-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('buses')}
            className={`min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer whitespace-nowrap ${
              tab === 'buses'
                ? 'bg-amber-500 text-neutral-950 border-amber-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
            }`}
          >
            <Bus className="w-3.5 h-3.5" />
            Buses ({BUS_LIVERIES.length})
          </button>
          <button
            onClick={() => setTab('upgrades')}
            className={`min-h-[36px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer whitespace-nowrap ${
              tab === 'upgrades'
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrades ({UPGRADE_CATALOG.length})
          </button>
        </div>

        {/* Page Controls */}
        <div className="flex items-center gap-1.5">
          <button
            disabled={(tab === 'buses' ? safeBusPage : safeUpgradePage) === 0}
            onClick={() =>
              tab === 'buses'
                ? setBusPage((p) => Math.max(0, p - 1))
                : setUpgradePage((p) => Math.max(0, p - 1))
            }
            className="min-h-[34px] px-2.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>
          <span className="text-xs font-mono text-neutral-300 tabular-nums px-1.5">
            {tab === 'buses'
              ? `${safeBusPage + 1} / ${totalBusPages}`
              : `${safeUpgradePage + 1} / ${totalUpgradePages}`}
          </span>
          <button
            disabled={
              tab === 'buses'
                ? safeBusPage >= totalBusPages - 1
                : safeUpgradePage >= totalUpgradePages - 1
            }
            onClick={() =>
              tab === 'buses'
                ? setBusPage((p) => Math.min(totalBusPages - 1, p + 1))
                : setUpgradePage((p) => Math.min(totalUpgradePages - 1, p + 1))
            }
            className="min-h-[34px] px-2.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-35 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Non-Scrolling Catalog Grid */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-5 flex items-center">
        {tab === 'buses' ? (
          <div className="w-full grid grid-cols-4 gap-2.5 sm:gap-4">
            {visibleBuses.map((bus) => {
              const spec = BUS_SHOP_SPECS.find((s) => s.liveryId === bus.id) || BUS_SHOP_SPECS[0];
              const owned = progress.ownedBusIds.includes(bus.id);
              const locked = levelInfo.level < spec.unlockLevel;
              const canAfford = progress.money >= spec.price;

              return (
                <div
                  key={bus.id}
                  className={`rounded-2xl border p-2.5 sm:p-4 flex flex-col justify-between transition-all ${
                    owned
                      ? 'bg-emerald-950/25 border-emerald-500/40'
                      : 'bg-neutral-900/90 border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
                        style={{ backgroundColor: bus.primaryColor }}
                      >
                        <Bus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="text-right min-w-0">
                        <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-neutral-200 truncate max-w-full">
                          {bus.busClass}
                        </span>
                        <div className="hidden sm:block text-[10px] font-mono text-amber-300 mt-0.5">
                          {bus.defaultReg}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xs sm:text-sm font-black text-white truncate">{bus.name}</h3>
                    <p className="text-[10px] sm:text-[11px] text-neutral-400 mt-0.5 truncate">
                      {spec.chassisModel} · {(spec.weightKg / 1000).toFixed(1)}T
                    </p>

                    <div className="grid grid-cols-2 gap-1.5 my-2 sm:my-3 text-[10px] sm:text-[11px]">
                      <div className="p-1.5 rounded-lg bg-white/5 flex justify-between">
                        <span className="text-neutral-400">HP</span>
                        <span className="font-mono font-bold">{spec.engineHp}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/5 flex justify-between">
                        <span className="text-neutral-400">Max</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {spec.topSpeedKmh}
                        </span>
                      </div>
                      <div className="hidden sm:flex p-1.5 rounded-lg bg-white/5 justify-between">
                        <span className="text-neutral-400">Seats</span>
                        <span className="font-mono font-bold">{spec.seats}</span>
                      </div>
                      <div className="hidden sm:flex p-1.5 rounded-lg bg-white/5 justify-between">
                        <span className="text-neutral-400">Brake</span>
                        <span className="font-mono font-bold">{spec.brakingScore}%</span>
                      </div>
                    </div>
                  </div>

                  {owned ? (
                    <div className="w-full py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Owned
                    </div>
                  ) : locked ? (
                    <div className="w-full py-2 rounded-xl bg-neutral-800 border border-white/10 text-neutral-400 text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Lvl {spec.unlockLevel}
                    </div>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => onBuyBus(bus.id, spec.price)}
                      className={`w-full py-2 rounded-xl text-[11px] font-black transition-all ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer shadow'
                          : 'bg-white/5 border border-white/10 text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford
                        ? `Buy ₹${spec.price.toLocaleString('en-IN')}`
                        : `₹${spec.price.toLocaleString('en-IN')}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full grid grid-cols-3 gap-3 sm:gap-4 max-w-5xl mx-auto">
            {visibleUpgrades.map((u) => {
              const owned = progress.ownedUpgrades.includes(u.id);
              const canAfford = progress.money >= u.price;
              return (
                <div
                  key={u.id}
                  className={`rounded-2xl border p-3.5 sm:p-5 flex flex-col justify-between ${
                    owned
                      ? 'bg-emerald-950/25 border-emerald-500/40'
                      : 'bg-neutral-900/90 border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                        {u.category}
                      </span>
                      <span className="text-xs font-bold text-amber-400">{u.statBoost}</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-white">{u.name}</h3>
                    <p className="text-[11px] sm:text-xs text-neutral-400 mt-1.5 leading-snug line-clamp-3">
                      {u.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    {owned ? (
                      <div className="w-full py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" />
                        Installed
                      </div>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => onBuyUpgrade(u.id, u.price)}
                        className={`w-full py-2 rounded-xl text-xs font-black transition-all ${
                          canAfford
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 cursor-pointer'
                            : 'bg-white/5 border border-white/10 text-neutral-500 cursor-not-allowed'
                        }`}
                      >
                        Buy Part — ₹{u.price.toLocaleString('en-IN')}
                      </button>
                    )}
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
