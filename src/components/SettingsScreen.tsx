import { ArrowLeft, Camera, Car, Settings, Sliders, Smartphone, Volume2 } from 'lucide-react';
import { CAMERA_MODES } from '../game/constants';
import {
  ControlScheme,
  DEFAULT_SETTINGS,
  GameSettings,
  GraphicsQuality,
  OrientationPreference,
  SpeedUnit,
  SteeringControlMode,
  TrafficDensity,
  TrafficSpeedMode,
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
    <div className="fixed inset-0 z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/10 bg-neutral-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Main Menu
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-black flex items-center gap-2">
              <Settings className="w-5 h-5 text-neutral-300" />
              Simulator &amp; Mobile Settings
            </h1>
            <p className="text-[11px] text-neutral-400">
              Graphics, target FPS, touch steering wheel/tilt, 7 cameras, HUD opacity &amp; voice GPS
            </p>
          </div>
        </div>

        <button
          onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-neutral-200 cursor-pointer"
        >
          Reset Defaults
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto ets-scroll p-4 sm:p-5 max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Graphics & Performance */}
        <section className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Graphics &amp; Performance
          </h2>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-2">
              Render Quality Preset
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => patch({ graphicsQuality: q })}
                  className={`min-h-[44px] py-2 rounded-xl text-xs font-bold uppercase border cursor-pointer ${
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
                { val: 0, label: 'Auto' },
              ] as const).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => patch({ targetFps: opt.val })}
                  className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border cursor-pointer ${
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
                { id: 'kmh', label: 'KM/H (Tamil Nadu)' },
                { id: 'mph', label: 'MPH' },
              ] as { id: SpeedUnit; label: string }[]).map((u) => (
                <button
                  key={u.id}
                  onClick={() => patch({ speedUnit: u.id })}
                  className={`min-h-[44px] py-2 rounded-xl text-xs font-bold border cursor-pointer ${
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

          {/* User-Adjustable AI Traffic */}
          <div className="pt-2 border-t border-white/10 space-y-3">
            <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-amber-400" />
              User Traffic Density &amp; Flow
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {([
                { id: 'off', label: 'Off', count: '0' },
                { id: 'light', label: 'Light', count: '16' },
                { id: 'normal', label: 'Normal', count: '33' },
                { id: 'heavy', label: 'Heavy', count: '50' },
                { id: 'rush', label: 'Rush', count: '66' },
              ] as { id: TrafficDensity; label: string; count: string }[]).map((td) => (
                <button
                  key={td.id}
                  onClick={() => patch({ trafficDensity: td.id })}
                  className={`min-h-[48px] py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center cursor-pointer ${
                    (settings.trafficDensity ?? 'normal') === td.id
                      ? 'bg-amber-500 text-neutral-950 border-amber-300'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[11px] font-black">{td.label}</span>
                  <span className="text-[10px] font-mono tabular-nums opacity-80">{td.count}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 mb-1.5">
                AI Traffic Speed
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'calm', label: 'Calm (0.7×)' },
                  { id: 'normal', label: 'Realistic (1.0×)' },
                  { id: 'fast', label: 'Fast (1.3×)' },
                ] as { id: TrafficSpeedMode; label: string }[]).map((sp) => (
                  <button
                    key={sp.id}
                    onClick={() => patch({ trafficSpeed: sp.id })}
                    className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                      (settings.trafficSpeed ?? 'normal') === sp.id
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Audio & Camera */}
        <section className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-sky-400 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Audio &amp; 7 Camera Views
          </h2>

          <div>
            <div className="flex justify-between text-xs font-bold mb-1.5">
              <span className="text-neutral-300">Master Engine &amp; Traffic Volume</span>
              <span className="font-mono text-emerald-400 tabular-nums">{settings.masterVolume}%</span>
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
              <span className="text-neutral-300">Ambient Tamil Radio &amp; Music</span>
              <span className="font-mono text-sky-400 tabular-nums">{settings.musicVolume}%</span>
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
                  className={`min-h-[44px] p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    settings.defaultCamera === cam.id
                      ? 'bg-sky-500/20 border-sky-400 text-white'
                      : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{cam.name}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{cam.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile Touch Controls & HUD */}
        <section className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-white/10 space-y-4 lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Mobile Controls, Orientation &amp; Transmission
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  Touch Steering Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'wheel', label: 'Steering Wheel' },
                    { id: 'arrows', label: 'Left / Right' },
                    { id: 'tilt', label: 'Gyro Tilt' },
                  ] as { id: SteeringControlMode; label: string }[]).map((sm) => (
                    <button
                      key={sm.id}
                      onClick={() => patch({ steeringMode: sm.id })}
                      className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
                        settings.steeringMode === sm.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-300'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {sm.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  Screen Orientation Preference
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['landscape', 'auto', 'portrait'] as OrientationPreference[]).map((ori) => (
                    <button
                      key={ori}
                      onClick={() => patch({ orientationPreference: ori })}
                      className={`min-h-[44px] py-2 rounded-xl text-xs font-bold capitalize border cursor-pointer ${
                        settings.orientationPreference === ori
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      {ori}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-neutral-300">Steering Sensitivity</span>
                  <span className="font-mono text-amber-400 tabular-nums">
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
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-neutral-300">Touch Camera Look Sensitivity</span>
                  <span className="font-mono text-sky-400 tabular-nums">
                    {(settings.cameraSensitivity ?? 1.0).toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={settings.cameraSensitivity ?? 1.0}
                  onChange={(e) => patch({ cameraSensitivity: Number(e.target.value) })}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-neutral-300">HUD Control Opacity</span>
                  <span className="font-mono text-emerald-400 tabular-nums">
                    {Math.round((settings.hudOpacity ?? 0.92) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.0}
                  step={0.05}
                  value={settings.hudOpacity ?? 0.92}
                  onChange={(e) => patch({ hudOpacity: Number(e.target.value) })}
                  className="w-full accent-emerald-500 cursor-pointer"
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
                      className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold border cursor-pointer ${
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
                  <div className="text-xs font-bold text-white">Manual 6-Speed Gearbox &amp; Clutch</div>
                  <div className="text-[11px] text-neutral-400">
                    Shift gears manually with [G]/[F] or Gear +/- and hold Clutch
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
                    Enforce TNSTC / SETC electronic top speed limit of 80 km/h
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
                    Hold brake while stopped to engage Reverse (R) automatically
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoReverse}
                  onChange={(e) => patch({ autoReverse: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">GPS Spoken Turn-by-Turn Voice</div>
                  <div className="text-[11px] text-neutral-400">
                    Spoken instructions ahead of highway turns &amp; mountain hairpins
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.voiceNavigation ?? true}
                  onChange={(e) => patch({ voiceNavigation: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">Touch Haptic Vibration Feedback</div>
                  <div className="text-[11px] text-neutral-400">
                    Subtle device vibration on horn, gear shifts, and handbrake taps
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.vibrationEnabled ?? true}
                  onChange={(e) => patch({ vibrationEnabled: e.target.checked })}
                  className="w-5 h-5 accent-amber-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
