import type { SieveResponse } from "../App";

interface Props {
  response: SieveResponse;
}

export default function SummaryMetrics({ response }: Props) {
  const serial = response.results.find((result) => result.algorithm === "serial");
  const openmp = response.results.find((result) => result.algorithm === "openmp");
  const primary = serial ?? openmp;
  const speedup = openmp?.speedup;
  const speedupContext = speedup === undefined
    ? "Comparison unavailable"
    : speedup > 1.01
      ? "OpenMP is faster"
      : speedup < 0.99
        ? "Serial is faster"
        : "Similar performance";

  const metrics = [
    { label: "Input Size (N)", value: primary?.limit.toLocaleString() ?? "-", detail: primary ? `Range: [2, ${primary.limit.toLocaleString()}]` : "Awaiting a run", icon: "#", tone: "blue" },
    { label: "Threads", value: openmp?.num_threads?.toString() ?? "-", detail: openmp ? "OpenMP Threads" : "Not used in serial mode", icon: "▣", tone: "purple" },
    { label: "Primes Found", value: primary?.prime_count.toLocaleString() ?? "-", detail: primary ? "Total Prime Numbers" : "Awaiting a run", icon: "✓", tone: "green" },
    { label: "Speedup (OpenMP)", value: speedup === undefined ? "-" : `${speedup.toFixed(2)}x`, detail: speedupContext, icon: "↗", tone: speedup !== undefined && speedup > 1 ? "green" : "amber" },
  ];

  return (
    <section className="summary-metrics" aria-label="Benchmark summary">
      {metrics.map((metric) => (
        <article className="summary-card" key={metric.label}>
          <div>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.detail}</span>
          </div>
          <span className={`summary-icon ${metric.tone}`} aria-hidden="true">{metric.icon}</span>
        </article>
      ))}
    </section>
  );
}
