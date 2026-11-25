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
        variant === 'compact' ? 'p-2.5 sm:p-3 space-y-1.5 sm:space-y-2' : 'p-3.5 sm:p-4 space-y-3'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <h2
              className={`font-black text-white tracking-tight truncate leading-tight ${
                variant === 'compact' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
              }`}
            >
              Daily Driver Missions
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-neutral-400 font-mono tabular-nums leading-tight">
              <span>
                {completedCount}/{synced.missions.length} Completed
              </span>
              {claimableCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-bold">{claimableCount} Ready</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-neutral-400 font-mono tabular-nums shrink-0">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>{resetLabel}</span>
        </div>
      </div>

      {/* Mission Rows */}
      <div className={variant === 'compact' ? 'space-y-1.5' : 'grid grid-cols-3 gap-2.5'}>
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
                variant === 'compact' ? 'px-2.5 py-1.5' : 'p-3 flex flex-col justify-between gap-2'
              } ${
                entry.claimed
                  ? 'bg-neutral-950/60 border-white/5 opacity-75'
                  : isComplete
                    ? 'bg-emerald-950/35 border-emerald-500/40'
                    : 'bg-neutral-950 border-white/10'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className={`font-bold text-white leading-tight truncate ${
                        variant === 'compact' ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
                      }`}
                    >
                      {def.title}
                    </div>
                    {variant === 'full' && (
                      <>
                        <div className="text-[11px] text-emerald-400 mt-0.5 truncate">{def.titleTa}</div>
                        <p className="hidden sm:block text-[11px] text-neutral-400 mt-1 leading-snug line-clamp-2">
                          {def.description}
                        </p>
                      </>
                    )}
                  </div>

                  {entry.claimed ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 shrink-0">
                      <Check className="w-3 h-3" />
                      Claimed
                    </span>
                  ) : isComplete ? (
                    <button
                      onClick={() => onClaimMission(entry.id)}
                      className="min-h-[28px] sm:min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Claim
                    </button>
                  ) : null}
                </div>

                {/* Progress Bar & Clean Inline Metadata */}
                <div className="space-y-0.5">
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isComplete ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-neutral-400">
                    <span>
                      {progressDisplay}/{def.target} {def.unit}
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
      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] min-w-0">
          <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-neutral-300 truncate">
            Shift Sweep:{' '}
            <strong className="text-amber-300 font-mono tabular-nums">
              +₹{DAILY_SWEEP_BONUS.cash} · +{DAILY_SWEEP_BONUS.xp} XP
            </strong>
          </span>
        </div>

        {synced.sweepBonusClaimed ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0">
            <Check className="w-3.5 h-3.5" />
            Claimed
          </span>
        ) : (
          <button
            disabled={!allCompleted}
            onClick={onClaimSweepBonus}
            className="min-h-[30px] sm:min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {allCompleted ? 'Claim Bonus' : `${completedCount}/3 Done`}
          </button>
        )}
      </div>
    </section>
  );
}
