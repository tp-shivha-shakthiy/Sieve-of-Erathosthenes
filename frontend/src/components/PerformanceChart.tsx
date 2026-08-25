import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SieveResult } from "../App";

interface Props {
  results: SieveResult[];
}

export default function PerformanceChart({ results }: Props) {
  const data = results.map((r) => ({
    name: r.algorithm === "serial" ? "Serial" : `OpenMP (${r.num_threads}t)`,
    time_ms: Number(r.execution_time_ms.toFixed(2)),
    primes: r.prime_count,
  }));

  return (
    <div style={{ padding: 16, background: "white", borderRadius: 8, border: "1px solid #e0e0e0" }}>
      <h3 style={{ margin: "0 0 12px" }}>Execution Time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: "ms", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(v: number) => `${v} ms`} />
          <Legend />
          <Bar dataKey="time_ms" name="Time (ms)" fill="#3366cc" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
