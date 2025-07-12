
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
    color: "hsl(142.1 76.2% 41%)", // green-500
  },
  medium: {
    label: "Medium",
    color: "hsl(48 96% 51%)", // yellow-500
  },
  hard: {
    label: "Hard",
    color: "hsl(var(--destructive))",
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
  const chartData = [
    {
      name: "progress",
      easy: easyTotal > 0 ? (easySolved / easyTotal) * 100 : 0,
      medium: mediumTotal > 0 ? (mediumSolved / mediumTotal) * 100 : 0,
      hard: hardTotal > 0 ? (hardSolved / hardTotal) * 100 : 0,
    },
  ];

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
              barSize={8}
              innerRadius="30%"
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background
                dataKey="hard"
                fill="var(--color-hard)"
                cornerRadius={5}
                innerRadius="40%"
                outerRadius="55%"
              />
              <RadialBar
                background
                dataKey="medium"
                fill="var(--color-medium)"
                cornerRadius={5}
                innerRadius="65%"
                outerRadius="80%"
              />
               <RadialBar
                background
                dataKey="easy"
                fill="var(--color-easy)"
                cornerRadius={5}
                innerRadius="90%"
                outerRadius="105%"
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{totalSolved}</span>
            <span className="text-sm text-muted-foreground">Solved</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-2" style={{
            '--color-easy': 'hsl(142.1 76.2% 41%)',
            '--color-medium': 'hsl(48 96% 51%)',
            '--color-hard': 'hsl(var(--destructive))',
        } as React.CSSProperties}>
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--color-easy)' }} />
                    <span className="font-medium text-muted-foreground">Easy</span>
                </div>
                <span className="font-semibold">{easySolved} / {easyTotal}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--color-medium)' }} />
                    <span className="font-medium text-muted-foreground">Medium</span>
                </div>
                <span className="font-semibold">{mediumSolved} / {mediumTotal}</span>
            </div>
             <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--color-hard)' }} />
                    <span className="font-medium text-muted-foreground">Hard</span>
                </div>
                <span className="font-semibold">{hardSolved} / {hardTotal}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
