import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { SieveResult } from "../App";

interface Props {
  results: SieveResult[];
}

export default function PerformanceChart({ results }: Props) {
  const data = results.map((r) => ({
    name: r.algorithm === "serial" ? "Serial" : `OpenMP (${r.num_threads} threads)`,
    time_ms: Number(r.execution_time_ms.toFixed(2)),
    primes: r.prime_count,
  }));

  return (
    <div className="metric-card execution">
      <div className="metric-heading">
        <div className="metric-heading-main"><span className="metric-icon" aria-hidden="true">&#9889;</span><h3 className="metric-title">Execution Time</h3></div>
        <span className="metric-badge" aria-hidden="true">ms</span>
      </div>
      <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <defs><linearGradient id="serialGradient" x1="0" x2="1"><stop stopColor="#22d3ee" /><stop offset="1" stopColor="#2563eb" /></linearGradient><linearGradient id="openmpGradient" x1="0" x2="1"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#d946ef" /></linearGradient></defs>
          <CartesianGrid stroke="rgba(148,163,184,.22)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "ms", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
          <Tooltip formatter={(v: number) => `${v} ms`} contentStyle={{ background: "#020617", border: "1px solid rgba(56,189,248,.42)", borderRadius: 8 }} />
          <Bar dataKey="time_ms" name="Time (ms)" radius={[6, 6, 0, 0]}>{data.map((item) => <Cell key={item.name} fill={item.name === "Serial" ? "url(#serialGradient)" : "url(#openmpGradient)"} />)}<LabelList dataKey="time_ms" position="top" fill="#e0f2fe" fontSize={11} formatter={(value: number) => `${value} ms`} /></Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
