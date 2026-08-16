export default function NewsLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">正在加载已发布内容…</span>
      <section className="border-b-4 border-signal-amber bg-dock-navy py-16 md:py-24" aria-hidden="true">
        <div className="container grid animate-pulse gap-8 lg:grid-cols-[0.65fr_1.35fr]">
          <div className="h-4 w-36 bg-paper-white/20" />
          <div>
            <div className="h-14 max-w-2xl bg-paper-white/20" />
            <div className="mt-5 h-5 max-w-xl bg-paper-white/15" />
          </div>
        </div>
      </section>
      <section className="py-14 md:py-20" aria-hidden="true">
        <div className="container animate-pulse border-t-2 border-dock-navy">
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid gap-6 border-b py-8 md:grid-cols-[11rem_1fr]">
              <div className="h-4 w-28 bg-concrete" />
              <div>
                <div className="h-7 max-w-2xl bg-concrete" />
                <div className="mt-4 h-4 max-w-3xl bg-concrete" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
