import { useState } from 'react';
import { ArrowLeft, Camera, Car, Settings, Sliders, Smartphone, Volume2 } from 'lucide-react';
import { CAMERA_MODES } from '../game/constants';
import {
  ControlScheme,
  DEFAULT_SETTINGS,
  GameSettings,
  GraphicsQuality,
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
  const [tab, setTab] = useState<'graphics' | 'audio' | 'controls'>('graphics');

  const patch = (partial: Partial<GameSettings>) => {
    onUpdateSettings({
      ...settings,
      ...partial,
    });
  };

  return (
    <div className="fixed inset-0 h-[100dvh] z-30 bg-neutral-950/96 text-white flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-5 py-2 border-b border-white/10 bg-neutral-900 shrink-0">
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
              <Settings className="w-4 h-4 text-neutral-300 shrink-0" />
              Simulator &amp; Mobile Settings
            </h1>
            <p className="hidden sm:block text-[11px] text-neutral-400 truncate">
              Fixed-landscape calibration, traffic density, cameras, touch wheel &amp; driving assists
            </p>
          </div>
        </div>

        <button
          onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-neutral-200 cursor-pointer shrink-0"
        >
          Reset Defaults
        </button>
      </header>

      {/* Category Tabs */}
      <div className="px-3 sm:px-5 pt-2 max-w-5xl w-full mx-auto shrink-0">
        <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-neutral-900 border border-white/10">
          <button
            onClick={() => setTab('graphics')}
            className={`min-h-[36px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'graphics' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-300 hover:bg-white/5'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Graphics &amp; Traffic
          </button>
          <button
            onClick={() => setTab('audio')}
            className={`min-h-[36px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'audio' ? 'bg-sky-600 text-white' : 'text-neutral-300 hover:bg-white/5'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Audio &amp; Cameras
          </button>
          <button
            onClick={() => setTab('controls')}
            className={`min-h-[36px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'controls' ? 'bg-emerald-600 text-white' : 'text-neutral-300 hover:bg-white/5'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Controls &amp; Driving
          </button>
        </div>
      </div>

      {/* Non-Scrolling Settings Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-5 max-w-5xl w-full mx-auto flex items-center">
        {tab === 'graphics' && (
          <div className="w-full grid grid-cols-2 gap-3 sm:gap-5">
            <section className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-2.5 sm:space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1.5">
                  Render Quality Preset
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['low', 'medium', 'high', 'ultra'] as GraphicsQuality[]).map((q) => (
                    <button
                      key={q}
                      onClick={() => patch({ graphicsQuality: q })}
                      className={`min-h-[36px] py-1 rounded-xl text-[11px] font-bold uppercase border cursor-pointer ${
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
                <label className="block text-[11px] font-bold text-neutral-300 mb-1.5">
                  Target Frame Rate Cap
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { val: 30, label: '30 FPS' },
                    { val: 60, label: '60 FPS' },
                    { val: 0, label: 'Auto' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => patch({ targetFps: opt.val })}
                      className={`min-h-[36px] py-1 rounded-xl text-[11px] font-bold border cursor-pointer ${
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
                <label className="block text-[11px] font-bold text-neutral-300 mb-1.5">
                  Speedometer Units
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { id: 'kmh', label: 'KM/H (TN)' },
                    { id: 'mph', label: 'MPH' },
                  ] as { id: SpeedUnit; label: string }[]).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => patch({ speedUnit: u.id })}
                      className={`min-h-[36px] py-1 rounded-xl text-[11px] font-bold border cursor-pointer ${
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

            <section className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-2.5 sm:space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  User Traffic Density
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {([
                    { id: 'off', label: 'Off', count: '0' },
                    { id: 'light', label: 'Light', count: '16' },
                    { id: 'normal', label: 'Norm', count: '33' },
                    { id: 'heavy', label: 'Heavy', count: '50' },
                    { id: 'rush', label: 'Rush', count: '66' },
                  ] as { id: TrafficDensity; label: string; count: string }[]).map((td) => (
                    <button
                      key={td.id}
                      onClick={() => patch({ trafficDensity: td.id })}
                      className={`min-h-[42px] py-1 px-1 rounded-xl border flex flex-col items-center justify-center cursor-pointer ${
                        (settings.trafficDensity ?? 'normal') === td.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-300'
                          : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-[10px] font-black">{td.label}</span>
                      <span className="text-[9px] font-mono tabular-nums opacity-80">{td.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1.5">
                  AI Traffic Speed
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { id: 'calm', label: 'Calm 0.7×' },
                    { id: 'normal', label: 'Real 1.0×' },
                    { id: 'fast', label: 'Fast 1.3×' },
                  ] as { id: TrafficSpeedMode; label: string }[]).map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => patch({ trafficSpeed: sp.id })}
                      className={`min-h-[38px] py-1 px-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
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

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-white/10 text-[11px] text-neutral-300 flex items-center justify-between">
                <span>Screen Mode</span>
                <span className="font-mono font-bold text-emerald-400">Fixed Landscape (No Scroll)</span>
              </div>
            </section>
          </div>
        )}

        {tab === 'audio' && (
          <div className="w-full grid grid-cols-2 gap-3 sm:gap-5">
            <section className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-3 flex flex-col justify-center">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-neutral-300">Engine &amp; Traffic Volume</span>
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
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-neutral-300">Tamil FM Radio &amp; Music</span>
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
                <div className="flex justify-between text-xs font-bold mb-1">
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
            </section>

            <section className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-2">
              <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                Default Spawn Camera View
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CAMERA_MODES.map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => patch({ defaultCamera: cam.id as GameSettings['defaultCamera'] })}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.defaultCamera === cam.id
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate">{cam.name}</div>
                    <div className="hidden sm:block text-[9px] text-neutral-400 truncate">{cam.hint}</div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'controls' && (
          <div className="w-full grid grid-cols-2 gap-3 sm:gap-5">
            <section className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  Touch Steering Style
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { id: 'wheel', label: 'Wheel' },
                    { id: 'arrows', label: 'Arrows' },
                    { id: 'tilt', label: 'Gyro Tilt' },
                  ] as { id: SteeringControlMode; label: string }[]).map((sm) => (
                    <button
                      key={sm.id}
                      onClick={() => patch({ steeringMode: sm.id })}
                      className={`min-h-[36px] py-1 px-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
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
                <label className="block text-[11px] font-bold text-neutral-300 mb-1">
                  Keyboard Mapping
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { id: 'both', label: 'WASD + Arrows' },
                    { id: 'wasd', label: 'WASD' },
                    { id: 'arrows', label: 'Arrows' },
                  ] as { id: ControlScheme; label: string }[]).map((cs) => (
                    <button
                      key={cs.id}
                      onClick={() => patch({ controlScheme: cs.id })}
                      className={`min-h-[36px] py-1 px-1.5 rounded-xl text-[11px] font-bold border cursor-pointer ${
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

              <div>
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
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
                <div className="flex justify-between text-[11px] font-bold mb-0.5">
                  <span className="text-neutral-300">Camera Look Sensitivity</span>
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
            </section>

            <section className="p-3 sm:p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-1.5 flex flex-col justify-center">
              {(
                [
                  {
                    key: 'manualGearbox',
                    title: 'Manual 6-Speed & Clutch',
                    desc: 'Shift with [G]/[F] or Gear +/-',
                    checked: settings.manualGearbox,
                  },
                  {
                    key: 'speedLimiter80',
                    title: '80 KM/H Speed Governor',
                    desc: 'TNSTC / SETC highway limit',
                    checked: settings.speedLimiter80 ?? true,
                  },
                  {
                    key: 'autoReverse',
                    title: 'Auto-Reverse on Stop Brake',
                    desc: 'Hold brake when stopped',
                    checked: settings.autoReverse,
                  },
                  {
                    key: 'voiceNavigation',
                    title: 'GPS Spoken Voice Turns',
                    desc: 'Audio guidance ahead of turns',
                    checked: settings.voiceNavigation ?? true,
                  },
                  {
                    key: 'vibrationEnabled',
                    title: 'Touch Haptic Feedback',
                    desc: 'Vibration on horn & shifts',
                    checked: settings.vibrationEnabled ?? true,
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] sm:text-xs font-bold text-white truncate">{item.title}</div>
                    <div className="hidden sm:block text-[10px] text-neutral-400 truncate">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => patch({ [item.key]: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
