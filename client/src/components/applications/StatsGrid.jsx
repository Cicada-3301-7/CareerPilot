function StatsGrid({ stats }) {
  return (
    <section className="stats-grid" aria-label="Application statistics">
      {Object.entries(stats).map(([label, count]) => (
        <article className={`stat-card stat-${label.toLowerCase()}`} key={label}>
          <span>{label}</span>
          <strong>{count}</strong>
        </article>
      ))}
    </section>
  );
}

export default StatsGrid;
