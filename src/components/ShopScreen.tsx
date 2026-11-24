import { useState } from 'react';
import {
  ArrowLeft,
  Bus,
  Check,
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
  const levelInfo = getCareerLevel(progress.xp);

  return (
    <div className="fixed inset-0 z-30 bg-neutral-950/95 backdrop-blur-xl text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-neutral-900/90">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Main Menu
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              Tamil Nadu Fleet Dealership &amp; Parts Shop
            </h1>
            <p className="text-[11px] text-neutral-400">
              Purchase TNSTC, SETC &amp; Private Luxury buses or fit performance upgrades (Driver Lvl{' '}
              {levelInfo.level})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-4 py-2 rounded-xl bg-neutral-950 border border-emerald-500/30 text-sm font-mono font-black text-emerald-400 tabular-nums">
            ₹{progress.money.toLocaleString('en-IN')}
          </div>
          <button
            onClick={onOpenGarage}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            Open Garage
          </button>
        </div>
      </header>

      {/* Category Switcher */}
      <div className="px-5 pt-4 flex items-center gap-2">
        <button
          onClick={() => setTab('buses')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            tab === 'buses'
              ? 'bg-amber-500 text-neutral-950 border-amber-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
          }`}
        >
          <Bus className="w-4 h-4" />
          Buses &amp; Coaches ({BUS_LIVERIES.length})
        </button>
        <button
          onClick={() => setTab('upgrades')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            tab === 'upgrades'
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Workshop Upgrades ({UPGRADE_CATALOG.length})
        </button>
      </div>

      {/* Catalog Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {tab === 'buses' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {BUS_LIVERIES.map((bus) => {
              const spec = BUS_SHOP_SPECS.find((s) => s.liveryId === bus.id) || BUS_SHOP_SPECS[0];
              const owned = progress.ownedBusIds.includes(bus.id);
              const locked = levelInfo.level < spec.unlockLevel;
              const canAfford = progress.money >= spec.price;

              return (
                <div
                  key={bus.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                    owned
                      ? 'bg-emerald-950/25 border-emerald-500/40'
                      : 'bg-neutral-900/90 border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/20 shrink-0"
                        style={{ backgroundColor: bus.primaryColor }}
                      >
                        <Bus className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-neutral-200">
                          {bus.busClass}
                        </span>
                        <div className="text-[10px] font-mono text-amber-300 mt-1">
                          {bus.defaultReg}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-sm font-black text-white">{bus.name}</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{spec.chassisModel}</p>
                    <p className="text-[11px] text-amber-300/90 mt-1">{bus.tagline}</p>

                    <div className="grid grid-cols-2 gap-2 my-3.5 text-[11px]">
                      <div className="p-2 rounded-lg bg-white/5 flex justify-between">
                        <span className="text-neutral-400">Power</span>
                        <span className="font-mono font-bold">{spec.engineHp} HP</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 flex justify-between">
                        <span className="text-neutral-400">Speed</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {spec.topSpeedKmh} km/h
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 flex justify-between">
                        <span className="text-neutral-400">Seats</span>
                        <span className="font-mono font-bold">{spec.seats}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 flex justify-between">
                        <span className="text-neutral-400">Braking</span>
                        <span className="font-mono font-bold">{spec.brakingScore}%</span>
                      </div>
                    </div>
                  </div>

                  {owned ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" />
                      Owned in Fleet
                    </div>
                  ) : locked ? (
                    <div className="w-full py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-neutral-400 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      Unlocks at Driver Level {spec.unlockLevel}
                    </div>
                  ) : (
                    <button
                      disabled={!canAfford}
                      onClick={() => onBuyBus(bus.id, spec.price)}
                      className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer shadow'
                          : 'bg-white/5 border border-white/10 text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      {canAfford
                        ? `Purchase Coach — ₹${spec.price.toLocaleString('en-IN')}`
                        : `Need ₹${spec.price.toLocaleString('en-IN')}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {UPGRADE_CATALOG.map((u) => {
              const owned = progress.ownedUpgrades.includes(u.id);
              const canAfford = progress.money >= u.price;
              return (
                <div
                  key={u.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between ${
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
                    <h3 className="text-base font-black text-white">{u.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                      {u.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10">
                    {owned ? (
                      <div className="w-full py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" />
                        Installed &amp; Ready
                      </div>
                    ) : (
                      <button
                        disabled={!canAfford}
                        onClick={() => onBuyUpgrade(u.id, u.price)}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${
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
