import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bus, Compass, MapPin, Shield, ChevronRight } from 'lucide-react';

const LOADING_STAGES = [
  'Initializing Tamil Nadu 5×5 State Highway & Mountain Grid...',
  'Sculpting Nilgiri, Valparai & Kodaikanal Ghat Hairpins...',
  'Spawning 23 Bus Terminals (Chennai CMBT to Kanyakumari)...',
  'Calibrating 6-Speed Gearbox, Clutch, Passenger Load & Air Brakes...',
  'Deploying TNSTC / SETC Fleet, FASTag Tolls & AI Traffic...',
  'Ready for Departure — Have a Safe Journey!',
];

const DRIVER_TIPS = [
  'Always follow Left-Hand Traffic (LHT). Stay in your left kerb lane on highways and hairpin bends.',
  'Use [G] and [F] (or on-screen Gear +/-) with Clutch to climb steep Ooty, Valparai, and Kodaikanal ghats.',
  'Engage Parking Brake before opening doors at passenger stops to board riders and issue tickets.',
  'Refuel Diesel at Bharat Petroleum or IndianOil highway bunks before crossing to Kanyakumari.',
  'Drag anywhere on the driving viewport to look around, and pick from 7 cameras including Cockpit & Dashboard View.',
  'Test Sunny, Cloudy, Hill Fog, and Monsoon Rain anytime to experience real wet-grip physics.',
];

export function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const startMs = performance.now();
    const interval = window.setInterval(() => {
      const elapsedSec = (performance.now() - startMs) / 1000;
      const rem = Math.max(0, Math.ceil(5 - elapsedSec));
      setCountdown(rem);
      if (elapsedSec >= 5) {
        window.clearInterval(interval);
        onComplete();
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 h-[100dvh] z-50 bg-neutral-950 text-white flex flex-col items-center justify-between overflow-hidden py-3 sm:py-6 px-4 sm:px-8 select-none">
      <div
        className="fixed inset-0 opacity-45 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 38%, rgba(217, 119, 6, 0.28), rgba(16, 185, 129, 0.14) 42%, rgba(9, 9, 11, 0.98) 76%)',
        }}
      />

      <div className="flex-1 flex items-center justify-center w-full min-h-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="flex flex-col items-center text-center max-w-3xl"
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex items-center gap-3 mb-2 sm:mb-5"
          >
            <div className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg bg-amber-400 text-neutral-950 font-mono font-black text-xs sm:text-sm tracking-widest border-2 border-neutral-900">
              TN
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2 text-[11px] sm:text-xs uppercase tracking-[0.2em] text-amber-300 font-semibold">
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Kovai Mass City Drive</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0.84, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-amber-500/15 to-neutral-900 border border-amber-400/40 flex items-center justify-center mb-2 sm:mb-5 shadow-2xl"
          >
            <Bus className="w-7 h-7 sm:w-10 sm:h-10 text-amber-400" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.65 }}
            className="text-2xl sm:text-5xl md:text-6xl font-black tracking-tight text-white uppercase leading-none"
          >
            Tamil Nadu
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-emerald-400">
              Bus Simulator
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-2 sm:mt-3 text-xs sm:text-base text-neutral-300 font-medium tracking-wide"
          >
            தமிழ்நாடு பேருந்து சிமுலேட்டர் · Highways, Ghats &amp; Coast
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="mt-3 sm:mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-neutral-300"
          >
            {['Coimbatore', 'Chennai CMBT', 'Ooty Ghats', 'Valparai', 'Kodaikanal', 'Madurai', 'Kanyakumari'].map(
              (hub, idx) => (
                <span key={hub} className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>{hub}</span>
                  {idx < 6 && <span className="text-neutral-600 ml-1 hidden sm:inline">·</span>}
                </span>
              )
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom 5s Progress Sweep & Skip */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-between gap-4 z-10 pt-2 shrink-0">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
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
          className="min-h-[44px] inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
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
    <div className="fixed inset-0 h-[100dvh] z-50 bg-neutral-950 text-white flex flex-col justify-between p-4 sm:p-8 overflow-hidden select-none">
      {/* Subtle Scenic Ghat Horizon Graphic */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background:
            'linear-gradient(180deg, rgba(2,132,199,0.22) 0%, rgba(16,185,129,0.14) 55%, rgba(9,9,11,0.95) 100%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded bg-amber-400 text-neutral-950 font-mono font-black text-xs tracking-wider">
            TN
          </div>
          <div>
            <h2 className="text-sm sm:text-lg font-bold tracking-tight text-white">
              Tamil Nadu Bus Simulator
            </h2>
            <p className="text-[11px] sm:text-xs text-neutral-400">Open-World Highway &amp; Western Ghats Sim</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-emerald-400">
          <Shield className="w-3.5 h-3.5" />
          <span>REAL-TIME 3D PHYSICS &amp; GPS</span>
        </div>
      </div>

      <div className="relative z-10 my-auto max-w-2xl mx-auto w-full space-y-3 sm:space-y-5 py-2">
        <div className="p-4 sm:p-6 rounded-2xl bg-neutral-900/90 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2.5">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
              Driver Briefing
            </span>
            <span className="text-xs font-mono text-neutral-400">TIP #{tipIndex + 1}</span>
          </div>
          <p className="text-xs sm:text-lg text-neutral-100 font-medium leading-relaxed">
            {DRIVER_TIPS[tipIndex]}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5 gap-3">
            <span className="text-neutral-300 font-medium truncate">{LOADING_STAGES[stageIdx]}</span>
            <span className="font-mono font-bold text-amber-400 tabular-nums text-sm shrink-0">
              {percent}%
            </span>
          </div>
          <div className="h-2.5 sm:h-3 w-full rounded-full bg-neutral-900 border border-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-300 transition-all duration-75"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2 text-[11px] sm:text-xs text-neutral-500 border-t border-white/10 pt-2.5 shrink-0">
        <span>Left-Hand Traffic (India) · 23 Regional Terminals</span>
        <span className="font-mono">TNSTC · SETC · PRIVATE COACHES</span>
      </div>
    </div>
  );
}
