// components/admin/StorageChart.tsx
// P1-1: bar chart vertikal "storage per user", dipisah dari /admin agar
// recharts hanya diunduh on-demand (next/dynamic, ssr:false).
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface StorageDatum {
  name: string;
  /** Megabytes, dibulatkan 1 desimal. */
  size: number;
  /** Label human-readable, mis. "12.4 MB". */
  formatted: string;
}

const storageConfig = {
  size: { label: "Storage used", color: "var(--chart-2)" },
} satisfies ChartConfig;

export default function StorageChart({ data }: { data: StorageDatum[] }) {
  return (
    <ChartContainer config={storageConfig} className="h-56 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v: number) => `${v} MB`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={90}
          tickFormatter={(v: string) => (v.length > 12 ? `${v.slice(0, 11)}…` : v)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(_v, _n, item) => item?.payload?.formatted} />
          }
        />
        <Bar
          dataKey="size"
          fill="var(--color-size)"
          radius={[0, 6, 6, 0]}
          maxBarSize={20}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
