"use client";

import type { CoachingNarrative }  from "@/lib/memory/coachingNarrative";
import type { IdentityModel }      from "@/lib/memory/identityModel";
import type { SimilarSituation }   from "@/lib/memory/situationMemory";

interface Props {
  narrative: CoachingNarrative | undefined;
  identity:  IdentityModel | undefined;
  similar:   SimilarSituation[] | undefined;
}

export function SituationMemoryCard({ narrative, identity, similar }: Props) {
  const hasContent = narrative?.hasMemory || identity?.dataReady || (similar && similar.length > 0);
  if (!hasContent) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Coaching Memory</h3>
        {identity?.dataDepthDays ? (
          <span className="text-[10px] text-white/30">{identity.dataDepthDays} sessions</span>
        ) : null}
      </div>

      {narrative && (
        <p className="text-[12px] text-white/55 leading-relaxed">{narrative.headline}</p>
      )}

      {/* History-grounded coaching lines */}
      {narrative?.lines && narrative.lines.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/8">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">From your history</div>
          {narrative.lines.map((line, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-violet-400 text-[9px] mt-0.5">»</span>
              <span className="text-[11px] text-white/55 leading-relaxed italic">{line}</span>
            </div>
          ))}
        </div>
      )}

      {/* Similar past situations */}
      {similar && similar.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/8">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">Similar past days</div>
          {similar.slice(0, 3).map((s) => {
            const delta = s.entry.outcome?.readinessDelta;
            return (
              <div key={s.entry.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-semibold text-white/60">{s.entry.context.cyclePhase}</div>
                  <div className="text-[9px] text-white/30">{s.daysAgo}d ago · {s.similarity}% similar</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-white/40 capitalize">{s.entry.decision.recommendationType}</div>
                  {delta !== undefined && (
                    <div className={`text-xs font-semibold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {delta >= 0 ? "+" : ""}{delta} pts
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Long-term identity */}
      {identity?.dataReady && identity.traits.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/8">
          <div className="text-[10px] text-white/25 uppercase tracking-widest">Your training identity</div>
          <p className="text-[11px] text-white/45 leading-relaxed">{identity.successSummary}</p>
          {identity.traits.slice(0, 3).map((t, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-sky-400 text-[9px] mt-0.5">◆</span>
              <span className="text-[11px] text-white/50">{t.trait}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
