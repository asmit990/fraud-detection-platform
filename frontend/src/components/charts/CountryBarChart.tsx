import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CountryStat } from "@/lib/api";

export function CountryBarChart({ data }: { data: CountryStat[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="code"
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          cursor={{ fill: "color-mix(in oklab, var(--color-brand) 8%, transparent)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            background: "color-mix(in oklab, var(--surface) 80%, transparent)",
            backdropFilter: "blur(8px)",
            boxShadow: "var(--shadow-pop)",
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="count"
          fill="var(--color-brand)"
          radius={[8, 8, 4, 4]}
          animationDuration={800}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
