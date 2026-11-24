import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bus, Compass, MapPin, Shield, ChevronRight } from 'lucide-react';

const LOADING_STAGES = [
  'Initializing Tamil Nadu 4×4 State Highway Grid...',
  'Sculpting Nilgiri Ghat Hills & Cauvery River Basin...',
  'Spawning 17 Bus Terminals (Chennai CMBT to Kanyakumari)...',
  'Calibrating 5-Speed Gearbox, Clutch & Air Brakes...',
  'Deploying TNSTC / SETC Fleet, FASTag Tolls & AI Traffic...',
  'Ready for Departure — Have a Safe Journey!',
];

const DRIVER_TIPS = [
  'Always follow Left-Hand Traffic (LHT). Stay in your left kerb lane on highways and hills.',
  'Use [G] and [F] to shift 5-speed gears with [Shift] Clutch when Manual Gearbox is active.',
  'Engage Parking Brake [N] before opening doors [E] at passenger stops.',
  'Refuel Diesel [T] at Bharat Petroleum or IndianOil bunks before crossing to Kanyakumari.',
  'Respect dynamic speed zones: 45 km/h in Nilgiri Hills, 60 km/h in cities, 85 km/h on NH highways.',
  'Toggle High Beam [J] on dark ghat climbs and press [K] to test Sunny, Cloudy, Fog, or Rain weather.',
];

export function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col items-center justify-center overflow-hidden select-none">
      {/* Subtle Tamil Nadu Sunset / Ghats Atmospheric Glow */}
      <div
        className="absolute inset-0 opacity-45 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 38%, rgba(217, 119, 6, 0.28), rgba(16, 185, 129, 0.14) 42%, rgba(9, 9, 11, 0.98) 76%)',
        }}
      />

      {/* Horizontal Highway Speed Lines */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.85, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-3xl"
      >
        {/* Official TN Registration Emblem */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-neutral-950 font-mono font-black text-sm tracking-widest shadow-lg border-2 border-neutral-900">
            TN
          </div>
          <div className="h-5 w-px bg-white/20" />
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-amber-300/90 font-semibold">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Southern Highway Edition</span>
          </div>
        </motion.div>

        {/* Hero Bus Badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-amber-500/15 to-neutral-900 border border-amber-400/40 flex items-center justify-center mb-6 shadow-2xl"
        >
          <Bus className="w-12 h-12 text-amber-400" />
        </motion.div>

        {/* Main Brand Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          className="text-4xl sm:text-6xl font-black tracking-tight text-white uppercase leading-none"
        >
          Tamil Nadu
          <span className="block mt-1.5 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-400">
            Bus Simulator
          </span>
        </motion.h1>

        {/* Tamil Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.7 }}
          className="mt-4 text-sm sm:text-base text-neutral-300 font-medium tracking-wide"
        >
          தமிழ்நாடு பேருந்து சிமுலேட்டர் · Chennai to Kanyakumari
        </motion.p>

        {/* Corridor Showcase Chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.6 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-xs text-neutral-300"
        >
          {['Coimbatore', 'Chennai CMBT', 'Ooty Ghats', 'Madurai', 'Rameswaram', 'Kanyakumari'].map(
            (hub) => (
              <span
                key={hub}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10"
              >
                <MapPin className="w-3 h-3 text-emerald-400" />
                {hub}
              </span>
            )
          )}
        </motion.div>
      </motion.div>

      {/* Bottom Progress Sweep & Skip */}
      <div className="absolute bottom-10 inset-x-0 px-8 max-w-xl mx-auto flex items-center justify-between gap-4 z-10">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1.5">
            <span>STARTING SIMULATION ENGINE</span>
            <span className="tabular-nums text-amber-400">{countdown}s</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-300"
            />
          </div>
        </div>
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors cursor-pointer"
        >
          Skip
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function LoadingScreen({ onLoaded }: { onLoaded: () => void }) {
  const [percent, setPercent] = useState(0);
  const [tipIndex] = useState(() => Math.floor(Math.random() * DRIVER_TIPS.length));

  useEffect(() => {
    const start = performance.now();
    const duration = 2200;
    let raf = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setPercent(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(step);
      } else {
        window.setTimeout(onLoaded, 180);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onLoaded]);

  const stageIdx = Math.min(
    LOADING_STAGES.length - 1,
    Math.floor((percent / 100) * LOADING_STAGES.length)
  );

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col justify-between p-8 sm:p-12 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded bg-amber-400 text-neutral-950 font-mono font-black text-xs tracking-wider">
            TN
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">Tamil Nadu Bus Simulator</h2>
            <p className="text-xs text-neutral-400">Heavy Commercial Highway &amp; Ghat Simulation</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-lg">
          <Shield className="w-3.5 h-3.5" />
          <span>REAL-TIME PHYSICS &amp; GPS</span>
        </div>
      </div>

      {/* Center Status Visual */}
      <div className="my-auto max-w-2xl mx-auto w-full space-y-6">
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
              Driver Briefing
            </span>
            <span className="text-xs font-mono text-neutral-400">TIP #{tipIndex + 1}</span>
          </div>
          <p className="text-base sm:text-lg text-neutral-100 font-medium leading-relaxed">
            {DRIVER_TIPS[tipIndex]}
          </p>
        </div>

        {/* Staged Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-neutral-300 font-medium">{LOADING_STAGES[stageIdx]}</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums text-sm">
              {percent}%
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-neutral-900 border border-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-300 transition-all duration-75"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-white/10 pt-4">
        <span>Left-Hand Traffic (India) · 17 Regional Bus Terminals</span>
        <span className="font-mono">TNSTC · SETC · PRIVATE COACHES</span>
      </div>
    </div>
  );
}
