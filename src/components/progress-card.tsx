
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  solved: {
    label: "Solved",
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
  const overallPercentage = totalAvailable > 0 ? (totalSolved / totalAvailable) * 100 : 0;
  const chartData = [{ name: "Overall", value: overallPercentage, fill: "var(--color-solved)" }];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col md:flex-row items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-full"
          >
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={-270}
              innerRadius="80%"
              outerRadius="100%"
              barSize={10}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: "hsl(var(--muted))" }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{totalSolved}</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-green-500">Easy</span>
              <span className="text-muted-foreground">
                {easySolved} / {easyTotal}
              </span>
            </div>
            <Progress
              value={(easyTotal > 0 ? (easySolved / easyTotal) * 100 : 0)}
              className="h-2 bg-muted [&>div]:bg-green-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-orange-500">Medium</span>
              <span className="text-muted-foreground">
                {mediumSolved} / {mediumTotal}
              </span>
            </div>
            <Progress
              value={
                (mediumTotal > 0 ? (mediumSolved / mediumTotal) * 100 : 0)
              }
              className="h-2 bg-muted [&>div]:bg-orange-500"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-red-500">Hard</span>
              <span className="text-muted-foreground">
                {hardSolved} / {hardTotal}
              </span>
            </div>
            <Progress
              value={(hardTotal > 0 ? (hardSolved / hardTotal) * 100 : 0)}
              className="h-2 bg-muted [&>div]:bg-red-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
