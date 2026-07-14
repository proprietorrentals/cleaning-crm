export default function DemoLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="demo-skeleton h-5 w-36 rounded-full" />
        <div className="demo-skeleton mt-4 h-11 w-3/5 rounded-xl" />
        <div className="demo-skeleton mt-4 h-5 w-4/5 rounded-lg" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="demo-skeleton h-16 rounded-2xl" />
          <div className="demo-skeleton h-16 rounded-2xl" />
          <div className="demo-skeleton h-16 rounded-2xl" />
          <div className="demo-skeleton h-16 rounded-2xl" />
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="demo-skeleton h-7 w-3/4 rounded-lg" />
          <div className="demo-skeleton mt-4 h-4 w-full rounded-md" />
          <div className="demo-skeleton mt-2 h-4 w-5/6 rounded-md" />
          <div className="demo-skeleton mt-6 h-10 w-1/2 rounded-xl" />
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="demo-skeleton h-7 w-3/4 rounded-lg" />
          <div className="demo-skeleton mt-4 h-4 w-full rounded-md" />
          <div className="demo-skeleton mt-2 h-4 w-5/6 rounded-md" />
          <div className="demo-skeleton mt-6 h-10 w-1/2 rounded-xl" />
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="demo-skeleton h-7 w-3/4 rounded-lg" />
          <div className="demo-skeleton mt-4 h-4 w-full rounded-md" />
          <div className="demo-skeleton mt-2 h-4 w-5/6 rounded-md" />
          <div className="demo-skeleton mt-6 h-10 w-1/2 rounded-xl" />
        </article>
      </section>
    </div>
  );
}
