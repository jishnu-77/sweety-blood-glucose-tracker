function formatValue(value) {
  return value === null || value === undefined ? '–' : value;
}

export default function StatGrid({ report }) {
  const stats = [
    ['Highest', report.highest],
    ['Lowest', report.lowest],
    ['Average', report.average],
  ];

  return (
    <dl className="stat-grid">
      {stats.map(([label, value]) => (
        <div key={label} className="stat">
          <dt>{label}</dt>
          <dd>
            {formatValue(value)}
            <span className="unit">mg/dl</span>
          </dd>
        </div>
      ))}
      <div className="stat">
        <dt>Readings</dt>
        <dd>{report.count}</dd>
      </div>
    </dl>
  );
}
