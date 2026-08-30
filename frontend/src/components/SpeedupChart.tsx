import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { SieveResult } from "../App";

interface Props {
  results: SieveResult[];
}

const COLORS = ["#38bdf8", "#35e58a", "#d946ef", "#7c3aed"];

export default function SpeedupChart({ results }: Props) {
  if (results.length < 2) return null;

  const data = results.map((r) => ({
    name: r.algorithm === "serial" ? "Serial" : `OpenMP (${r.num_threads} threads)`,
    speedup: r.speedup ?? 1,
  }));

  return (
    <div className="metric-card speedup">
      <div className="metric-heading">
        <div className="metric-heading-main"><span className="metric-icon" aria-hidden="true">&#128640;</span><h3 className="metric-title">Speedup Factor</h3></div>
        <span className="metric-badge" aria-hidden="true">x</span>
      </div>
      <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke="rgba(148,163,184,.22)" strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "x", angle: -90, position: "insideLeft", fill: "#94a3b8" }} />
          <Tooltip formatter={(v: number) => `${v}x`} contentStyle={{ background: "#020617", border: "1px solid rgba(52,211,153,.42)", borderRadius: 8 }} />
          <Bar dataKey="speedup" name="Speedup" radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            <LabelList dataKey="speedup" position="top" fill="#d1fae5" fontSize={11} formatter={(value: number) => `${Number(value).toFixed(2)}x`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
