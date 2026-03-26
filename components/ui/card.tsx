export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="card fade-in">
      {title ? <h2 className="mb-3 text-lg font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}
