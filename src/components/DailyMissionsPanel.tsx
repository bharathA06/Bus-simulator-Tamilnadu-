import { useEffect, useState } from 'react';
import { Award, Check, Clock, Target } from 'lucide-react';
import {
  DAILY_SWEEP_BONUS,
  DailyMissionMetric,
  DailyMissionsState,
  getMissionDef,
  getTimeUntilMidnightLabel,
  syncDailyMissionsState,
} from '../game/dailyMissions';

interface DailyMissionsPanelProps {
  dailyMissions: DailyMissionsState;
  onClaimMission: (missionId: DailyMissionMetric) => void;
  onClaimSweepBonus: () => void;
  variant?: 'compact' | 'full';
}

export function DailyMissionsPanel({
  dailyMissions,
  onClaimMission,
  onClaimSweepBonus,
  variant = 'full',
}: DailyMissionsPanelProps) {
  const [resetLabel, setResetLabel] = useState(() => getTimeUntilMidnightLabel());
  const synced = syncDailyMissionsState(dailyMissions);

  useEffect(() => {
    const id = window.setInterval(() => {
      setResetLabel(getTimeUntilMidnightLabel());
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const completedCount = synced.missions.filter((m) => {
    const def = getMissionDef(m.id);
    return m.progress >= def.target;
  }).length;
  const allCompleted = completedCount === synced.missions.length && synced.missions.length > 0;
  const claimableCount = synced.missions.filter((m) => {
    const def = getMissionDef(m.id);
    return m.progress >= def.target && !m.claimed;
  }).length;

  return (
    <section
      className={`rounded-2xl bg-neutral-900/94 border border-white/10 shadow-xl ${
        variant === 'compact' ? 'p-3.5 space-y-2.5' : 'p-5 space-y-4'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400 shrink-0" />
            <h2
              className={`font-black text-white tracking-tight truncate ${
                variant === 'compact' ? 'text-sm' : 'text-base sm:text-lg'
              }`}
            >
              Daily Driver Missions
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5 font-mono tabular-nums">
            <span>
              {completedCount}/{synced.missions.length} Completed
            </span>
            {claimableCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-bold">{claimableCount} Ready to Claim</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono tabular-nums shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{resetLabel}</span>
        </div>
      </div>

      {/* Mission Rows */}
      <div className={variant === 'compact' ? 'space-y-2' : 'grid grid-cols-1 lg:grid-cols-3 gap-3'}>
        {synced.missions.map((entry) => {
          const def = getMissionDef(entry.id);
          const pct = Math.min(100, Math.round((entry.progress / def.target) * 100));
          const isComplete = entry.progress >= def.target;
          const progressDisplay =
            def.unit === 'km' ? entry.progress.toFixed(1) : String(Math.floor(entry.progress));

          return (
            <div
              key={entry.id}
              className={`rounded-xl border transition-colors ${
                variant === 'compact' ? 'p-2.5' : 'p-4 flex flex-col justify-between gap-3'
              } ${
                entry.claimed
                  ? 'bg-neutral-950/60 border-white/5 opacity-75'
                  : isComplete
                    ? 'bg-emerald-950/35 border-emerald-500/40'
                    : 'bg-neutral-950 border-white/10'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className={`font-bold text-white leading-snug ${
                        variant === 'compact' ? 'text-xs' : 'text-sm'
                      }`}
                    >
                      {def.title}
                    </div>
                    {variant === 'full' && (
                      <>
                        <div className="text-xs text-emerald-400 mt-0.5">{def.titleTa}</div>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                          {def.description}
                        </p>
                      </>
                    )}
                  </div>

                  {entry.claimed ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      Claimed
                    </span>
                  ) : isComplete ? (
                    <button
                      onClick={() => onClaimMission(entry.id)}
                      className="min-h-[36px] sm:min-h-[40px] px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Claim
                    </button>
                  ) : null}
                </div>

                {/* Progress Bar & Clean Inline Metadata */}
                <div className="space-y-1">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isComplete ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-neutral-400">
                    <span>
                      {progressDisplay} / {def.target} {def.unit}
                    </span>
                    <span className="text-amber-300 font-bold">
                      +₹{def.rewardCash} · +{def.rewardXp} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Daily Shift Sweep Bonus Bar */}
      <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-neutral-300">
            All 3 Shift Bonus:{' '}
            <strong className="text-amber-300 font-mono tabular-nums">
              +₹{DAILY_SWEEP_BONUS.cash} · +{DAILY_SWEEP_BONUS.xp} XP
            </strong>
          </span>
        </div>

        {synced.sweepBonusClaimed ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
            <Check className="w-4 h-4" />
            Shift Bonus Claimed
          </span>
        ) : (
          <button
            disabled={!allCompleted}
            onClick={onClaimSweepBonus}
            className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-xs font-black transition-colors cursor-pointer whitespace-nowrap"
          >
            {allCompleted ? 'Claim Shift Bonus' : `${completedCount}/3 Done`}
          </button>
        )}
      </div>
    </section>
  );
}
