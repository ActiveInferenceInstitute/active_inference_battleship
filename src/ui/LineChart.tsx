export function LineChart({
  title,
  values,
  labels,
  xTitle,
  unit,
  color,
  ariaLabel,
  format = "number",
  className = "history-chart",
  showData = true,
}: {
  readonly title: string;
  readonly values: readonly number[];
  readonly labels: readonly string[];
  readonly xTitle: string;
  readonly unit: string;
  readonly color: string;
  readonly ariaLabel: string;
  readonly format?: "number" | "percent";
  readonly className?: string;
  readonly showData?: boolean;
}) {
  const maximum = Math.max(format === "percent" ? 0.01 : 1, ...values);
  const display = (value: number) =>
    format === "percent" ? `${(value * 100).toFixed(1)}%` : value.toFixed(1);
  const points = values.map((value, index) => ({
    x: (index / Math.max(1, values.length - 1)) * 360,
    y: 120 - (value / maximum) * 120,
    label: labels[index] ?? String(index + 1),
  }));
  const ticks = points.filter(
    (_, index) =>
      index === 0 || index === Math.floor((points.length - 1) / 2) || index === points.length - 1,
  );
  return (
    <figure className={`line-chart ${className}`}>
      <figcaption>
        <strong>{title}</strong>
        <span className="mono muted">{unit}</span>
      </figcaption>
      {values.length > 0 && (
        <p className="chart-latest small">
          Latest <strong className="mono">{display(values.at(-1) ?? 0)}</strong> {unit}
          <span className="muted"> · {values.length} observations</span>
        </p>
      )}
      {values.length === 0 ? (
        <div className="chart-empty">History appears after the first shot.</div>
      ) : (
        <>
          <div className="chart-plot">
            <div className="chart-y-labels" aria-hidden="true">
              {[1, 0.5, 0].map((fraction) => (
                <span
                  className="chart-label chart-y-label"
                  key={fraction}
                  style={{ top: `${((4 + 120 * (1 - fraction)) / 128) * 100}%` }}
                >
                  {display(maximum * fraction)}
                </span>
              ))}
            </div>
            <svg viewBox="-4 -4 368 128" role="img" aria-label={ariaLabel}>
              {[0, 60, 120].map((y) => (
                <line className="chart-rule" key={y} x1="0" x2="360" y1={y} y2={y} />
              ))}
              <polyline
                className="chart-trace"
                pathLength="1"
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              />
              {points.map((point, index) => (
                <circle
                  key={point.label}
                  cx={point.x}
                  cy={point.y}
                  r={index === points.length - 1 ? "4" : "2.5"}
                  fill={color}
                  stroke={index === points.length - 1 ? "var(--text)" : "none"}
                  strokeWidth="1"
                />
              ))}
            </svg>
            <div className="chart-x-labels" aria-hidden="true">
              {ticks.map((point) => (
                <span
                  className="chart-label chart-x-tick"
                  key={point.label}
                  style={{ left: `${((4 + point.x) / 368) * 100}%` }}
                >
                  {point.label}
                </span>
              ))}
            </div>
            <div className="chart-x-title chart-label">{xTitle}</div>
          </div>
          {showData && (
            <details className="lab-disclosure">
              <summary>Chart values</summary>
              <div className="table-scroll">
                <table>
                  <caption className="sr-only">
                    {title} by {xTitle.toLowerCase()}
                  </caption>
                  <thead>
                    <tr>
                      <th>{xTitle}</th>
                      <th>{unit}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {points.map((point, index) => (
                      <tr key={point.label}>
                        <td data-label={xTitle}>{point.label}</td>
                        <td data-label={unit}>{values[index]?.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </figure>
  );
}
