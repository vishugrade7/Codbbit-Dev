
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

type ProgressCardProps = {
  totalSolved: number;
  totalAvailable: number;
  easySolved: number;
  easyTotal: number;
  mediumSolved: number;
  mediumTotal: number;
  hardSolved: number;
  hardTotal: number;
};

const chartConfig = {
  easy: {
    label: "Easy",
    color: "hsl(var(--chart-2))",
  },
  medium: {
    label: "Medium",
    color: "hsl(var(--chart-3))",
  },
  hard: {
    label: "Hard",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function ProgressCard({
  totalSolved,
  totalAvailable,
  easySolved,
  easyTotal,
  mediumSolved,
  mediumTotal,
  hardSolved,
  hardTotal,
}: ProgressCardProps) {
  const easyPercentage = easyTotal > 0 ? (easySolved / easyTotal) * 100 : 0;
  const mediumPercentage = mediumTotal > 0 ? (mediumSolved / mediumTotal) * 100 : 0;
  const hardPercentage = hardTotal > 0 ? (hardSolved / hardTotal) * 100 : 0;

  const chartData = [
    { difficulty: "hard", value: hardPercentage, fill: "var(--color-hard)" },
    { difficulty: "medium", value: mediumPercentage, fill: "var(--color-medium)" },
    { difficulty: "easy", value: easyPercentage, fill: "var(--color-easy)" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-row items-center gap-6">
        <div className="relative h-40 w-40">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-full"
          >
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={450}
              innerRadius="20%"
              outerRadius="100%"
              barSize={12}
              barGap={2}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                dataKey="value"
                tick={false}
              />
              <RadialBar
                dataKey="value"
                background={{ fill: 'hsl(var(--muted))' }}
                cornerRadius={10}
                stackId="a"
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{totalSolved}</span>
            <span className="text-sm text-muted-foreground">Solved</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-2 text-sm">
            <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground">Total Solved</span>
                <span className="font-semibold text-right">{totalSolved} / {totalAvailable}</span>
            </div>
            <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-green-500" />Easy</span>
                <span className="font-semibold text-right">{easySolved} / {easyTotal}</span>
            </div>
             <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" />Medium</span>
                <span className="font-semibold text-right">{mediumSolved} / {mediumTotal}</span>
            </div>
             <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500" />Hard</span>
                <span className="font-semibold text-right">{hardSolved} / {hardTotal}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
