'use client';

type MinimalHeroProps = {
  stats: {
    claimCountText: string;
    freeClaimsText: string;
    reserveText: string;
  };
};

export function MinimalHero({ stats }: MinimalHeroProps) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center space-y-8">
        <h1 className="text-4xl font-bold text-slate-100">
          DEMO Airdrop
        </h1>
        
        <div className="flex justify-center gap-12 text-sm">
          <div>
            <div className="text-slate-500 mb-1">Claims</div>
            <div className="font-medium text-slate-100">{stats.claimCountText}</div>
          </div>
          <div className="border-l border-slate-800" />
          <div>
            <div className="text-slate-500 mb-1">Open Claims</div>
            <div className="font-medium text-emerald-400">{stats.freeClaimsText.split(' ')[0]}</div>
          </div>
          <div className="border-l border-slate-800" />
          <div>
            <div className="text-slate-500 mb-1">Liquidity</div>
            <div className="font-medium text-slate-100">{stats.reserveText.split(':')[1]?.trim()}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
