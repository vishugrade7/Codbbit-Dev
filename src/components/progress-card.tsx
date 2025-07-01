
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

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

export function ProgressCard({
  totalSolved,
  totalAvailable,
  easySolved,
  easyTotal,
  mediumSolved,
  mediumTotal,
  hardSolved,
  hardTotal
}: ProgressCardProps) {
  const overallPercentage = totalAvailable > 0 ? (totalSolved / totalAvailable) * 100 : 0;
  // Use a fixed orange color for the main radial bar to match the user's image
  const chartData = [{ name: 'Overall', value: overallPercentage, fill: '#f97316' }]; 

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col md:flex-row items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="80%"
              outerRadius="100%"
              data={chartData}
              startAngle={90}
              endAngle={-270}
              barSize={10}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                background={{ fill: 'hsl(var(--muted))' }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold">{totalSolved}</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-green-500">Easy</span>
              <span className="text-muted-foreground">{easySolved} / {easyTotal}</span>
            </div>
            <Progress value={(easyTotal > 0 ? (easySolved / easyTotal) * 100 : 0)} className="h-2 bg-muted [&>div]:bg-green-500" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-orange-500">Medium</span>
              <span className="text-muted-foreground">{mediumSolved} / {mediumTotal}</span>
            </div>
            <Progress value={(mediumTotal > 0 ? (mediumSolved / mediumTotal) * 100 : 0)} className="h-2 bg-muted [&>div]:bg-orange-500" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-red-500">Hard</span>
              <span className="text-muted-foreground">{hardSolved} / {hardTotal}</span>
            </div>
            <Progress value={(hardTotal > 0 ? (hardSolved / hardTotal) * 100 : 0)} className="h-2 bg-muted [&>div]:bg-red-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
