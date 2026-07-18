const TABLE_ROWS = 5;
const CARD_ROWS = 3;

// Placeholder shapes mirroring the table (desktop) and cards (mobile);
// the same media query that swaps the real views swaps these.
function SkeletonList() {
  return (
    <div aria-hidden="true">
      <div className="skeleton-list-table">
        {Array.from({ length: TABLE_ROWS }, (_, i) => (
          <div className="skeleton-row" key={i}>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ))}
      </div>
      <div className="skeleton-list-cards">
        {Array.from({ length: CARD_ROWS }, (_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SkeletonList;
