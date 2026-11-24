import { ArrowLeft, Camera, Settings, Sliders, Volume2 } from 'lucide-react';
import { CAMERA_MODES } from '../game/constants';
import {
  ControlScheme,
  DEFAULT_SETTINGS,
  GameSettings,
  GraphicsQuality,
  SpeedUnit,
} from '../game/gameStore';

interface SettingsScreenProps {
  settings: GameSettings;
  onUpdateSettings: (nextSettings: GameSettings) => void;
  onBack: () => void;
}

export function SettingsScreen({
  settings,
  onUpdateSettings,
  onBack,
}: SettingsScreenProps) {
  const patch = (partial: Partial<GameSettings>) => {
    onUpdateSettings({
      ...settings,
      ...partial,
    });
  };

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
              <Settings className="w-5 h-5 text-neutral-300" />
              Simulator Settings
            </h1>
            <p className="text-[11px] text-neutral-400">
              Graphics, target FPS, engine/music audio, 6 camera presets, gearbox &amp; steering sensitivity
            </p>
          </div>
        </div>

        <button
          onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
          className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-neutral-200 cursor-pointer"
        >
          Reset Defaults
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Graphics & Performance */}
        <section className="p-5 rounded-2xl bg-neutral-900/90 border border-white/10 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Graphics &amp; Performance
          </h2>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">
              Render Quality Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => patch({ graphicsQuality: q })}
                  className={`py-2.5 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
                    settings.graphicsQuality === q
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">
              Target Frame Rate Cap
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: 30, label: '30 FPS' },
                { val: 60, label: '60 FPS' },
                { val: 0, label: 'Auto (Uncapped)' },
              ] as const).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => patch({ targetFps: opt.val })}
                  className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    settings.targetFps === opt.val
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">
              Speedometer Units
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: 'kmh', label: 'KM/H (Tamil Nadu Standard)' },
                { id: 'mph', label: 'MPH' },
              ] as { id: SpeedUnit; label: string }[]).map((u) => (
                <button
                  key={u.id}
                  onClick={() => patch({ speedUnit: u.id })}
                  className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                    settings.speedUnit === u.id
                      ? 'bg-amber-500 text-neutral-950 border-amber-300'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Audio & Camera */}
        <section className="p-5 rounded-2xl bg-neutral-900/90 border border-white/10 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Audio &amp; Camera Angle
          </h2>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-neutral-300">Master Engine &amp; Traffic Volume</span>
              <span className="font-mono text-emerald-400">{settings.masterVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.masterVolume}
              onChange={(e) => patch({ masterVolume: Number(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-neutral-300">Ambient Tamil Radio / Highway Synth</span>
              <span className="font-mono text-sky-400">{settings.musicVolume}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.musicVolume}
              onChange={(e) => patch({ musicVolume: Number(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-300 mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Default Spawn Camera View
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CAMERA_MODES.map((cam) => (
                <button
                  key={cam.id}
                  onClick={() => patch({ defaultCamera: cam.id as GameSettings['defaultCamera'] })}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.defaultCamera === cam.id
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold">{cam.name}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{cam.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Controls & Transmission */}
        <section className="p-5 rounded-2xl bg-neutral-900/90 border border-white/10 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400">
            Driving Controls &amp; Transmission
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-neutral-300">Steering Sensitivity</span>
                  <span className="font-mono text-amber-400">
                    {settings.steeringSensitivity.toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={1.8}
                  step={0.05}
                  value={settings.steeringSensitivity}
                  onChange={(e) => patch({ steeringSensitivity: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  Keyboard Mapping
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'both', label: 'WASD + Arrows' },
                    { id: 'wasd', label: 'WASD Only' },
                    { id: 'arrows', label: 'Arrows Only' },
                  ] as { id: ControlScheme; label: string }[]).map((cs) => (
                    <button
                      key={cs.id}
                      onClick={() => patch({ controlScheme: cs.id })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        settings.controlScheme === cs.id
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {cs.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">Manual 6-Speed Gearbox (1–6, N, R) &amp; Clutch</div>
                  <div className="text-[11px] text-neutral-400">
                    Shift gears manually with [G] Up / [F] Down and hold [Shift] Clutch
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.manualGearbox}
                  onChange={(e) => patch({ manualGearbox: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">80 KM/H Highway Speed Governor</div>
                  <div className="text-[11px] text-neutral-400">
                    Enforce TNSTC / SETC electronic top speed limit of 80 km/h on all routes
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.speedLimiter80 ?? true}
                  onChange={(e) => patch({ speedLimiter80: e.target.checked })}
                  className="w-5 h-5 accent-sky-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">Auto-Reverse on Full Stop Brake</div>
                  <div className="text-[11px] text-neutral-400">
                    Hold [S] / Down Arrow while stopped to engage Reverse (R) automatically
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoReverse}
                  onChange={(e) => patch({ autoReverse: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
