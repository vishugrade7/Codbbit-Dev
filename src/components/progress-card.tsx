
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
  progress: {
    label: "Progress",
    color: "hsl(var(--primary))",
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
  const progressPercentage = totalAvailable > 0 ? (totalSolved / totalAvailable) * 100 : 0;

  const chartData = [{ name: "progress", value: progressPercentage, fill: "var(--color-progress)" }];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col items-center gap-6">
        <div className="relative h-40 w-40">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-full"
          >
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={-270}
              innerRadius="70%"
              outerRadius="100%"
              barSize={12}
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
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{Math.round(progressPercentage)}%</span>
            <span className="text-sm text-muted-foreground">Solved</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-2 text-sm">
            <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground">Total Solved</span>
                <span className="font-semibold text-right">{totalSolved} / {totalAvailable}</span>
            </div>
            <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground">Easy</span>
                <span className="font-semibold text-right">{easySolved} / {easyTotal}</span>
            </div>
             <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground">Medium</span>
                <span className="font-semibold text-right">{mediumSolved} / {mediumTotal}</span>
            </div>
             <div className="grid grid-cols-2 justify-between">
                <span className="text-muted-foreground">Hard</span>
                <span className="font-semibold text-right">{hardSolved} / {hardTotal}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
