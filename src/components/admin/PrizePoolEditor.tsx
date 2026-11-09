import React from 'react';
import { Plus, Trash2, Award, Trophy, CheckSquare, Square } from 'lucide-react';
import { RankedPrize, CompetitionEvent } from '../../types';

interface PrizePoolEditorProps {
  prizes?: CompetitionEvent['prizes'];
  onChange: (updatedPrizes: CompetitionEvent['prizes']) => void;
}

export const PrizePoolEditor: React.FC<PrizePoolEditorProps> = ({
  prizes,
  onChange
}) => {
  // Ensure we have a working ranked_prizes array initialized with 1st, 2nd, 3rd
  const rankedPrizes: RankedPrize[] = React.useMemo(() => {
    if (prizes?.ranked_prizes && prizes.ranked_prizes.length > 0) {
      return prizes.ranked_prizes;
    }
    return [
      {
        rank: 1,
        label: '1st Place Winner',
        amount: prizes?.first_place || '₹2,000 Cash Prize',
        description: 'Official Gold Certificate of Excellence',
        enabled: true
      },
      {
        rank: 2,
        label: '2nd Place',
        amount: prizes?.second_place || '₹1,000 Cash Prize',
        description: 'Silver Certificate of Distinction',
        enabled: Boolean(prizes?.second_place)
      },
      {
        rank: 3,
        label: '3rd Place',
        amount: prizes?.third_place || '₹500 Cash Prize',
        description: 'Bronze Certificate of Merit',
        enabled: Boolean(prizes?.third_place)
      }
    ];
  }, [prizes]);

  const updatePrize = (index: number, updates: Partial<RankedPrize>) => {
    const next = rankedPrizes.map((p, i) => (i === index ? { ...p, ...updates } : p));
    emitUpdate(next);
  };

  const addRankedPrize = () => {
    const nextRank = rankedPrizes.length + 1;
    const suffix = nextRank === 1 ? 'st' : nextRank === 2 ? 'nd' : nextRank === 3 ? 'rd' : 'th';
    const next: RankedPrize[] = [
      ...rankedPrizes,
      {
        rank: nextRank,
        label: `${nextRank}${suffix} Place`,
        amount: 'Cash Prize / Award',
        description: 'Certificate of Achievement',
        enabled: true
      }
    ];
    emitUpdate(next);
  };

  const removeRankedPrize = (index: number) => {
    const filtered = rankedPrizes.filter((_, i) => i !== index);
    // Re-index ranks
    const reindexed = filtered.map((p, i) => {
      const r = i + 1;
      const s = r === 1 ? 'st' : r === 2 ? 'nd' : r === 3 ? 'rd' : 'th';
      return {
        ...p,
        rank: r,
        label: p.label.match(/\d+(st|nd|rd|th) Place/i) ? `${r}${s} Place` : p.label
      };
    });
    emitUpdate(reindexed);
  };

  const emitUpdate = (newList: RankedPrize[]) => {
    const r1 = newList.find((p) => p.rank === 1);
    const r2 = newList.find((p) => p.rank === 2);
    const r3 = newList.find((p) => p.rank === 3);

    onChange({
      first_place: r1 && r1.enabled ? r1.amount : '',
      second_place: r2 && r2.enabled ? r2.amount : '',
      third_place: r3 && r3.enabled ? r3.amount : '',
      special_rewards: prizes?.special_rewards || 'Verified Certificate of Participation',
      ranked_prizes: newList
    });
  };

  return (
    <div className="space-y-3 p-4 bg-[#08080D] border border-violet-500/30 rounded-xl">
      <div className="flex items-center justify-between pb-2 border-b border-violet-500/20">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Prize Pools (Positions 1, 2, 3, 4, 5+)
          </span>
        </div>
        <button
          type="button"
          onClick={addRankedPrize}
          className="px-2.5 py-1 text-[11px] font-mono font-semibold text-violet-300 bg-violet-950/70 hover:bg-violet-900/80 border border-violet-500/30 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Add Position ({rankedPrizes.length + 1}th Place)</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {rankedPrizes.map((prize, idx) => {
          const isCore = prize.rank <= 3;
          return (
            <div
              key={prize.rank}
              className={`p-3 rounded-lg border transition-colors ${
                prize.enabled
                  ? 'bg-violet-950/20 border-violet-500/30'
                  : 'bg-black/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => updatePrize(idx, { enabled: !prize.enabled })}
                  className="flex items-center gap-2 text-xs font-mono text-left cursor-pointer group"
                >
                  {prize.enabled ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  <span className={`font-semibold ${prize.enabled ? 'text-white' : 'text-slate-400'}`}>
                    {prize.label}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    ({prize.enabled ? 'Enabled & Public' : 'Disabled / Hidden'})
                  </span>
                </button>

                {!isCore && (
                  <button
                    type="button"
                    onClick={() => removeRankedPrize(idx)}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/40 text-[10px] font-mono flex items-center gap-1"
                    title="Remove position"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {prize.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Award / Cash Prize Amount
                    </label>
                    <input
                      type="text"
                      value={prize.amount}
                      placeholder="e.g. ₹2,000 Cash Prize or Gold Medal"
                      onChange={(e) => updatePrize(idx, { amount: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-[#11101B] border border-violet-500/25 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-violet-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Recognition / Certificate Description
                    </label>
                    <input
                      type="text"
                      value={prize.description || ''}
                      placeholder="e.g. Gold Certificate of Excellence"
                      onChange={(e) => updatePrize(idx, { description: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-[#11101B] border border-violet-500/25 rounded-lg text-white text-xs focus:outline-none focus:border-violet-400"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Participation Reward */}
      <div className="pt-2 border-t border-violet-500/20">
        <label className="block text-[10px] font-mono text-slate-400 mb-1 flex items-center gap-1">
          <Award className="w-3 h-3 text-violet-400" />
          <span>All Participants / Special Recognition</span>
        </label>
        <input
          type="text"
          value={prizes?.special_rewards || 'Verified Certificate of Participation'}
          placeholder="e.g. Verified Certificate of Participation + Networking"
          onChange={(e) =>
            onChange({
              ...prizes,
              first_place: prizes?.first_place || '',
              special_rewards: e.target.value
            })
          }
          className="w-full px-2.5 py-1.5 bg-[#11101B] border border-violet-500/25 rounded-lg text-white text-xs font-mono focus:outline-none focus:border-violet-400"
        />
      </div>
    </div>
  );
};
