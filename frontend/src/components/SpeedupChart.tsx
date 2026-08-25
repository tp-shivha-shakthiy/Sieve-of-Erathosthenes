import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SieveResult } from "../App";

interface Props {
  results: SieveResult[];
}

const COLORS = ["#3366cc", "#22aa44", "#cc6600", "#cc3366"];

export default function SpeedupChart({ results }: Props) {
  if (results.length < 2) return null;

  const data = results.map((r) => ({
    name: r.algorithm === "serial" ? "Serial" : `OpenMP (${r.num_threads}t)`,
    speedup: r.speedup ?? 1,
  }));

  return (
    <div style={{ padding: 16, background: "white", borderRadius: 8, border: "1px solid #e0e0e0" }}>
      <h3 style={{ margin: "0 0 12px" }}>Speedup Factor</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: "x", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(v: number) => `${v}x`} />
          <Bar dataKey="speedup" name="Speedup" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
