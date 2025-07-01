
'use client';

import ActivityCalendar, { type Activity } from 'react-activity-calendar';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import React from 'react';

type HeatmapProps = {
  data: { [date: string]: number };
};

export default function ContributionHeatmap({ data }: HeatmapProps) {
  const { theme } = useTheme();

  const activityData: Activity[] = Object.entries(data).map(([date, count]) => {
    let level = 0;
    if (count > 0 && count <= 2) level = 1;
    if (count > 2 && count <= 5) level = 2;
    if (count > 5 && count <= 8) level = 3;
    if (count > 8) level = 4;
    
    return {
      date,
      count,
      level,
    };
  });

  const totalSubmissions = React.useMemo(() => {
    // The library shows the last year, so we sum up everything passed.
    return Object.values(data).reduce((sum, count) => sum + count, 0);
  }, [data]);
  
  return (
    <div className="text-foreground">
        <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xl font-semibold">
                {totalSubmissions.toLocaleString()} submissions in the last year
            </h3>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Total code submissions over the past 12 months.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
      <ActivityCalendar
        data={activityData}
        theme={{
          light: ['hsl(0 0% 96%)', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
          dark: ['hsl(240 4% 15%)', '#0e4429', '#006d32', '#26a641', '#39d353'],
        }}
        colorScheme={theme === 'dark' ? 'dark' : 'light'}
        blockSize={14}
        blockMargin={4}
        fontSize={14}
        hideTotalCount
        hideColorLegend
        showWeekdayLabels
        renderBlock={(block, activity) => (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>{block}</TooltipTrigger>
              <TooltipContent>
                <p><strong>{activity.count} submissions</strong> on {new Date(activity.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      />
    </div>
  );
}
