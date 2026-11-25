import { useState } from 'react';
import {
  ArrowLeft,
  Bus,
  Check,
  Disc,
  Lock,
  Palette,
  ShoppingBag,
  Sparkles,
  Wrench,
} from 'lucide-react';
import {
  BUS_LIVERIES,
  PAINT_PALETTE,
  UPHOLSTERY_STYLES,
  WHEEL_STYLES,
} from '../game/constants';
import {
  BUS_SHOP_SPECS,
  BusCustomization,
  PlayerProgress,
  UPGRADE_CATALOG,
  getEffectiveBusCustomization,
} from '../game/gameStore';

interface GarageScreenProps {
  progress: PlayerProgress;
  onBack: () => void;
  onSelectBus: (busId: string) => void;
  onToggleUpgrade: (upgradeId: string) => void;
  onUpdateCustomization: (busId: string, custom: BusCustomization) => void;
  onRepairBus: () => void;
  onWashBus: () => void;
  onOpenShop: () => void;
}

export function GarageScreen({
  progress,
  onBack,
  onSelectBus,
  onToggleUpgrade,
  onUpdateCustomization,
  onRepairBus,
  onWashBus,
  onOpenShop,
}: GarageScreenProps) {
  const [rightTab, setRightTab] = useState<'customize' | 'upgrades'>('customize');
  const selectedLivery =
    BUS_LIVERIES.find((b) => b.id === progress.selectedBusId) || BUS_LIVERIES[0];
  const selectedSpec =
    BUS_SHOP_SPECS.find((s) => s.liveryId === selectedLivery.id) || BUS_SHOP_SPECS[0];
  const currentCustom = getEffectiveBusCustomization(progress, selectedLivery.id);

  const patchCustom = (partial: Partial<BusCustomization>) => {
    onUpdateCustomization(selectedLivery.id, {
      ...currentCustom,
      ...partial,
    });
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none select-none">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Main Menu
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-sky-400" />
              Depot Garage &amp; Coach Customization
            </h1>
            <p className="text-[11px] text-neutral-400">
              Select active Tamil Nadu bus, customize paint, number plate, interior, wheels &amp; tuning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 tabular-nums">
            ₹{progress.money.toLocaleString('en-IN')}
          </div>
          <button
            onClick={onOpenShop}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Visit Dealership
          </button>
        </div>
      </header>

      {/* Center Open for Live 3D Rotating Bus Showcase */}
      <div className="flex-1 flex flex-col lg:flex-row items-stretch justify-between gap-4 my-4 min-h-0">
        {/* Left Sidebar: Owned & Locked Fleet */}
        <aside className="w-full lg:w-72 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 pointer-events-auto flex flex-col max-h-[34vh] lg:max-h-full overflow-hidden shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1 mb-2.5">
            Fleet Bays ({progress.ownedBusIds.length}/{BUS_LIVERIES.length} Owned)
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {BUS_LIVERIES.map((bus) => {
              const owned = progress.ownedBusIds.includes(bus.id);
              const active = progress.selectedBusId === bus.id;
              return (
                <button
                  key={bus.id}
                  disabled={!owned}
                  onClick={() => owned && onSelectBus(bus.id)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    active
                      ? 'bg-emerald-600/25 border-emerald-400 text-white'
                      : owned
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-200 cursor-pointer'
                        : 'bg-neutral-950/60 border-white/5 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/20"
                    style={{ backgroundColor: bus.primaryColor }}
                  >
                    {owned ? <Bus className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-white/70" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate">{bus.name}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{bus.busClass}</div>
                  </div>
                  {active && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Sidebar: Live Customization & Upgrades */}
        <aside className="w-full lg:w-88 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 pointer-events-auto flex flex-col max-h-[45vh] lg:max-h-full overflow-hidden shadow-xl">
          {/* Active Coach Stats */}
          <div className="pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-white">{selectedLivery.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400 text-neutral-950 font-black">
                {currentCustom.registrationNumber}
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              {selectedSpec.chassisModel} · {(selectedSpec.weightKg / 1000).toFixed(1)}T · {selectedSpec.lengthMeters}m
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5 text-[11px]">
              <div className="bg-white/5 rounded-lg p-1.5 text-center">
                <span className="text-neutral-400 block text-[10px]">Engine</span>
                <span className="font-mono font-bold text-white">{selectedSpec.engineHp} HP</span>
              </div>
              <div className="bg-white/5 rounded-lg p-1.5 text-center">
                <span className="text-neutral-400 block text-[10px]">Top Speed</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedSpec.topSpeedKmh} km/h
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-1.5 text-center">
                <span className="text-neutral-400 block text-[10px]">Seats</span>
                <span className="font-mono font-bold text-amber-300">{selectedSpec.seats}</span>
              </div>
            </div>

            {/* Coach Condition & Depot Wash / Repair */}
            <div className="mt-2.5 p-2.5 rounded-xl bg-neutral-950/90 border border-white/10 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Coach Health</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        progress.vehicleHealthPct < 45 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {Math.round(progress.vehicleHealthPct)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full ${progress.vehicleHealthPct < 45 ? 'bg-red-500' : 'bg-emerald-400'}`}
                      style={{ width: `${Math.max(0, Math.min(100, progress.vehicleHealthPct))}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-neutral-400 mb-1">
                    <span>Body Mud/Dust</span>
                    <span
                      className={`font-mono font-bold tabular-nums ${
                        progress.dirtinessPct > 55 ? 'text-amber-400' : 'text-sky-300'
                      }`}
                    >
                      {Math.round(progress.dirtinessPct)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${Math.max(0, Math.min(100, progress.dirtinessPct))}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={progress.vehicleHealthPct >= 99 || progress.money < 150}
                  onClick={onRepairBus}
                  className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-400/40 text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Repair (-₹150)
                </button>
                <button
                  disabled={progress.dirtinessPct <= 2 || progress.money < 80}
                  onClick={onWashBus}
                  className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-sky-600/25 hover:bg-sky-600/40 border border-sky-400/40 text-sky-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Bus Wash (-₹80)
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel Tabs */}
          <div className="grid grid-cols-2 gap-1.5 my-3">
            <button
              onClick={() => setRightTab('customize')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                rightTab === 'customize'
                  ? 'bg-sky-500 text-white'
                  : 'bg-white/5 text-neutral-300 hover:bg-white/10'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Paint &amp; Interior
            </button>
            <button
              onClick={() => setRightTab('upgrades')}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                rightTab === 'upgrades'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/5 text-neutral-300 hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Parts ({progress.equippedUpgrades.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            {rightTab === 'customize' ? (
              <>
                {/* Body Color Palette */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Coach Paint &amp; Stripe Livery
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PAINT_PALETTE.map((p) => {
                      const active = currentCustom.bodyColorHex === p.bodyHex;
                      return (
                        <button
                          key={p.id}
                          title={p.name}
                          onClick={() =>
                            patchCustom({
                              bodyColorHex: p.bodyHex,
                              stripeColorHex: p.stripeHex,
                            })
                          }
                          className={`h-9 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-transform ${
                            active ? 'border-white scale-105' : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: p.hex }}
                        >
                          {active && <Check className="w-4 h-4 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Registration Plate Input */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Tamil Nadu Registration Plate
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={currentCustom.registrationNumber}
                    onChange={(e) =>
                      patchCustom({ registrationNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 font-mono font-bold text-xs tracking-wider focus:outline-none focus:border-amber-300"
                    placeholder="TN 38 N 1402"
                  />
                </div>

                {/* Seat Upholstery */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Cabin Interior &amp; Seats
                  </label>
                  <div className="space-y-1.5">
                    {UPHOLSTERY_STYLES.map((u) => {
                      const active = currentCustom.upholsteryId === u.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => patchCustom({ upholsteryId: u.id })}
                          className={`w-full px-3 py-2 rounded-xl border text-left text-xs font-semibold flex items-center justify-between cursor-pointer ${
                            active
                              ? 'bg-sky-500/20 border-sky-400 text-white'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-white/30"
                              style={{ backgroundColor: u.accent }}
                            />
                            {u.name}
                          </span>
                          {active && <Check className="w-3.5 h-3.5 text-sky-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wheel Rim Style */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Wheel Alloy &amp; Hubcaps
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {WHEEL_STYLES.map((w) => {
                      const active = currentCustom.wheelStyleId === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => patchCustom({ wheelStyleId: w.id })}
                          className={`p-2 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer ${
                            active
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          <Disc className="w-4 h-4" />
                          <span>{w.id.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                {UPGRADE_CATALOG.map((u) => {
                  const owned = progress.ownedUpgrades.includes(u.id);
                  const equipped = progress.equippedUpgrades.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-xl border ${
                        equipped
                          ? 'bg-emerald-500/15 border-emerald-400/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{u.name}</span>
                        <span className="text-[10px] font-mono text-amber-300">{u.statBoost}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">{u.description}</p>
                      <div className="mt-2">
                        {owned ? (
                          <button
                            onClick={() => onToggleUpgrade(u.id)}
                            className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                              equipped
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-neutral-200'
                            }`}
                          >
                            {equipped ? 'Equipped (Click to Unequip)' : 'Equip Upgrade'}
                          </button>
                        ) : (
                          <button
                            onClick={onOpenShop}
                            className="w-full py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-bold cursor-pointer"
                          >
                            Available in Shop (₹{u.price})
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Bottom Caption */}
      <footer className="text-center pointer-events-none">
        <span className="inline-block px-4 py-1.5 rounded-xl bg-neutral-900/80 border border-white/10 text-[11px] text-neutral-300">
          Live 3D Showcase · Changes apply immediately to your coach
        </span>
      </footer>
    </div>
  );
}
