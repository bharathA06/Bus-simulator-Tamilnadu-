import { useState } from 'react';
import {
  ArrowLeft,
  Bus,
  Check,
  ChevronLeft,
  ChevronRight,
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
  const [rightTab, setRightTab] = useState<'paint' | 'interior' | 'upgrades'>('paint');
  const [fleetPage, setFleetPage] = useState(0);
  const [partsPage, setPartsPage] = useState(0);

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

  const FLEET_PER_PAGE = 4;
  const totalFleetPages = Math.max(1, Math.ceil(BUS_LIVERIES.length / FLEET_PER_PAGE));
  const safeFleetPage = Math.min(fleetPage, totalFleetPages - 1);
  const visibleFleet = BUS_LIVERIES.slice(
    safeFleetPage * FLEET_PER_PAGE,
    safeFleetPage * FLEET_PER_PAGE + FLEET_PER_PAGE
  );

  const PARTS_PER_PAGE = 2;
  const totalPartsPages = Math.max(1, Math.ceil(UPGRADE_CATALOG.length / PARTS_PER_PAGE));
  const safePartsPage = Math.min(partsPage, totalPartsPages - 1);
  const visibleParts = UPGRADE_CATALOG.slice(
    safePartsPage * PARTS_PER_PAGE,
    safePartsPage * PARTS_PER_PAGE + PARTS_PER_PAGE
  );

  return (
    <div className="fixed inset-0 h-[100dvh] z-20 flex flex-col justify-between p-2.5 sm:p-4 overflow-hidden pointer-events-none select-none">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-2 pointer-events-auto bg-neutral-900/92 border border-white/10 rounded-xl sm:rounded-2xl px-3 py-2 shadow-xl shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBack}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Menu
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-black text-white flex items-center gap-1.5 truncate">
              <Wrench className="w-4 h-4 text-sky-400 shrink-0" />
              Depot Garage &amp; Customization
            </h1>
            <p className="hidden sm:block text-[11px] text-neutral-400 truncate">
              {selectedLivery.name} · {selectedSpec.chassisModel} · {selectedSpec.engineHp} HP · {selectedSpec.topSpeedKmh} km/h
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400 tabular-nums">
            ₹{progress.money.toLocaleString('en-IN')}
          </div>
          <button
            onClick={onOpenShop}
            className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-colors cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            Shop
          </button>
        </div>
      </header>

      {/* Horizontal Split with Open Center for Live 3D Bus */}
      <div className="flex-1 flex flex-row items-stretch justify-between gap-3 my-2 min-h-0 overflow-hidden">
        {/* Left Sidebar: Paginated Fleet Bays */}
        <aside className="w-52 sm:w-64 bg-neutral-900/92 border border-white/10 rounded-2xl p-2.5 sm:p-3 pointer-events-auto flex flex-col justify-between overflow-hidden shadow-xl shrink-0">
          <div className="flex items-center justify-between gap-1 px-1 mb-1.5 shrink-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 truncate">
              Fleet ({progress.ownedBusIds.length}/{BUS_LIVERIES.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={safeFleetPage === 0}
                onClick={() => setFleetPage((p) => Math.max(0, p - 1))}
                className="min-h-[26px] min-w-[26px] rounded bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-neutral-400 tabular-nums">
                {safeFleetPage + 1}/{totalFleetPages}
              </span>
              <button
                disabled={safeFleetPage >= totalFleetPages - 1}
                onClick={() => setFleetPage((p) => Math.min(totalFleetPages - 1, p + 1))}
                className="min-h-[26px] min-w-[26px] rounded bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 flex-1 min-h-0 flex flex-col justify-center">
            {visibleFleet.map((bus) => {
              const owned = progress.ownedBusIds.includes(bus.id);
              const active = progress.selectedBusId === bus.id;
              return (
                <button
                  key={bus.id}
                  disabled={!owned}
                  onClick={() => owned && onSelectBus(bus.id)}
                  className={`w-full p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                    active
                      ? 'bg-emerald-600/25 border-emerald-400 text-white'
                      : owned
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-neutral-200 cursor-pointer'
                        : 'bg-neutral-950/60 border-white/5 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/20"
                    style={{ backgroundColor: bus.primaryColor }}
                  >
                    {owned ? <Bus className="w-3.5 h-3.5 text-white" /> : <Lock className="w-3.5 h-3.5 text-white/70" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] sm:text-xs font-bold truncate">{bus.name}</div>
                    <div className="text-[9px] sm:text-[10px] text-neutral-400 truncate">{bus.busClass}</div>
                  </div>
                  {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Sidebar: Tabbed Live Customization & Upgrades (ZERO Scrolling) */}
        <aside className="w-68 sm:w-84 bg-neutral-900/92 border border-white/10 rounded-2xl p-2.5 sm:p-3.5 pointer-events-auto flex flex-col justify-between overflow-hidden shadow-xl shrink-0">
          {/* Active Coach Compact Summary */}
          <div className="pb-2 border-b border-white/10 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-black text-white truncate">{selectedLivery.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 font-black shrink-0">
                {currentCustom.registrationNumber}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5 text-[10px] font-mono tabular-nums text-center">
              <div className="bg-white/5 rounded-lg py-1">
                <span className="text-neutral-400">HP </span>
                <span className="font-bold text-white">{selectedSpec.engineHp}</span>
              </div>
              <div className="bg-white/5 rounded-lg py-1">
                <span className="text-neutral-400">Max </span>
                <span className="font-bold text-emerald-400">{selectedSpec.topSpeedKmh}</span>
              </div>
              <div className="bg-white/5 rounded-lg py-1">
                <span className="text-neutral-400">Seats </span>
                <span className="font-bold text-amber-300">{selectedSpec.seats}</span>
              </div>
            </div>
          </div>

          {/* 3 Compact Sub-Tabs */}
          <div className="grid grid-cols-3 gap-1 my-2 p-1 rounded-xl bg-neutral-950 border border-white/10 shrink-0">
            <button
              onClick={() => setRightTab('paint')}
              className={`min-h-[30px] rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                rightTab === 'paint' ? 'bg-sky-500 text-white' : 'text-neutral-300 hover:bg-white/5'
              }`}
            >
              <Palette className="w-3 h-3" />
              Paint
            </button>
            <button
              onClick={() => setRightTab('interior')}
              className={`min-h-[30px] rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                rightTab === 'interior' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-300 hover:bg-white/5'
              }`}
            >
              <Disc className="w-3 h-3" />
              Cabin/Care
            </button>
            <button
              onClick={() => setRightTab('upgrades')}
              className={`min-h-[30px] rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                rightTab === 'upgrades' ? 'bg-emerald-600 text-white' : 'text-neutral-300 hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              Parts ({progress.equippedUpgrades.length})
            </button>
          </div>

          {/* Tab Body (Zero Scroll) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center">
            {rightTab === 'paint' && (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Coach Paint &amp; Stripe Livery
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
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
                          className={`h-8 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-transform ${
                            active ? 'border-white scale-105' : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: p.hex }}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Tamil Nadu Registration Plate
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={currentCustom.registrationNumber}
                    onChange={(e) =>
                      patchCustom({ registrationNumber: e.target.value.toUpperCase() })
                    }
                    className="w-full min-h-[34px] px-2.5 py-1 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 font-mono font-bold text-xs tracking-wider focus:outline-none focus:border-amber-300"
                    placeholder="TN 38 N 1402"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Wheel Alloy Style
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {WHEEL_STYLES.map((w) => {
                      const active = currentCustom.wheelStyleId === w.id;
                      return (
                        <button
                          key={w.id}
                          onClick={() => patchCustom({ wheelStyleId: w.id })}
                          className={`py-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                            active
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          <Disc className="w-3.5 h-3.5" />
                          <span>{w.id.toUpperCase()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'interior' && (
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Cabin Upholstery
                  </label>
                  <div className="space-y-1">
                    {UPHOLSTERY_STYLES.map((u) => {
                      const active = currentCustom.upholsteryId === u.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => patchCustom({ upholsteryId: u.id })}
                          className={`w-full px-2.5 py-1.5 rounded-xl border text-left text-[11px] font-semibold flex items-center justify-between cursor-pointer ${
                            active
                              ? 'bg-sky-500/20 border-sky-400 text-white'
                              : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
                              style={{ backgroundColor: u.accent }}
                            />
                            <span className="truncate">{u.name}</span>
                          </span>
                          {active && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Condition & Repair/Wash */}
                <div className="p-2 rounded-xl bg-neutral-950/90 border border-white/10 space-y-1.5">
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono tabular-nums">
                    <div>
                      <div className="flex justify-between text-neutral-400 mb-0.5">
                        <span>Health</span>
                        <span className={progress.vehicleHealthPct < 45 ? 'text-red-400' : 'text-emerald-400'}>
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
                      <div className="flex justify-between text-neutral-400 mb-0.5">
                        <span>Dust</span>
                        <span className={progress.dirtinessPct > 55 ? 'text-amber-400' : 'text-sky-300'}>
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
                      className="min-h-[30px] py-1 px-2 rounded-lg text-[10px] font-bold bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-400/40 text-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Repair (-₹150)
                    </button>
                    <button
                      disabled={progress.dirtinessPct <= 2 || progress.money < 80}
                      onClick={onWashBus}
                      className="min-h-[30px] py-1 px-2 rounded-lg text-[10px] font-bold bg-sky-600/25 hover:bg-sky-600/40 border border-sky-400/40 text-sky-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Wash (-₹80)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'upgrades' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Workshop Parts
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={safePartsPage === 0}
                      onClick={() => setPartsPage((p) => Math.max(0, p - 1))}
                      className="min-h-[26px] min-w-[26px] rounded bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-neutral-400 tabular-nums">
                      {safePartsPage + 1}/{totalPartsPages}
                    </span>
                    <button
                      disabled={safePartsPage >= totalPartsPages - 1}
                      onClick={() => setPartsPage((p) => Math.min(totalPartsPages - 1, p + 1))}
                      className="min-h-[26px] min-w-[26px] rounded bg-white/10 hover:bg-white/20 disabled:opacity-35 flex items-center justify-center cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {visibleParts.map((u) => {
                  const owned = progress.ownedUpgrades.includes(u.id);
                  const equipped = progress.equippedUpgrades.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className={`p-2.5 rounded-xl border ${
                        equipped ? 'bg-emerald-500/15 border-emerald-400/50' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{u.name}</span>
                        <span className="text-[10px] font-mono text-amber-300 shrink-0">{u.statBoost}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{u.description}</p>
                      <div className="mt-1.5">
                        {owned ? (
                          <button
                            onClick={() => onToggleUpgrade(u.id)}
                            className={`w-full min-h-[28px] py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              equipped
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white/10 hover:bg-white/20 text-neutral-200'
                            }`}
                          >
                            {equipped ? 'Equipped (Click to Remove)' : 'Equip Part'}
                          </button>
                        ) : (
                          <button
                            onClick={onOpenShop}
                            className="w-full min-h-[28px] py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-[11px] font-bold cursor-pointer"
                          >
                            Buy in Shop (₹{u.price})
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
      <footer className="text-center pointer-events-none shrink-0">
        <span className="inline-block px-3 py-1 rounded-xl bg-neutral-900/80 border border-white/10 text-[10px] sm:text-[11px] text-neutral-300">
          Live 3D Showcase · Changes apply immediately to your coach
        </span>
      </footer>
    </div>
  );
}
