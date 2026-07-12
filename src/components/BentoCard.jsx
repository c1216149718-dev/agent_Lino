export function BentoCard({ children, className = '', icon: Icon, title }) {
  return (
    <section
      className={`doodle-card relative overflow-hidden rounded-[2rem] bg-white/[0.88] p-5 shadow-soft backdrop-blur ${className}`}
    >
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-hand text-xl font-semibold tracking-normal text-neutral-950">
            {title}
          </h2>
          {Icon ? (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl text-neutral-800">
              <Icon size={17} strokeWidth={2.1} />
            </span>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  )
}
