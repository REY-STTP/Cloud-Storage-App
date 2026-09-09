// components/admin/SignupsChart.tsx
// P1-1: bar chart "new users by month" yang sebelumnya di-bundle sinkron di
// /admin. Diekstrak agar bisa di-load via next/dynamic (ssr:false) — recharts
// (~300KB) tidak lagi memblokir First Paint halaman overview.
"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface SignupsDatum {
  month: string;
  users: number;
}

const signupsConfig = {
  users: { label: "New users", color: "var(--chart-1)" },
} satisfies ChartConfig;

export default function SignupsChart({ data }: { data: SignupsDatum[] }) {
  return (
    <ChartContainer config={signupsConfig} className="h-56 w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="users"
          fill="var(--color-users)"
          radius={[6, 6, 0, 0]}
          maxBarSize={48}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  );
}
