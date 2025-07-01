
'use client';

import ActivityCalendar, { type Activity } from 'react-activity-calendar';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type HeatmapProps = {
  data: { [date: string]: number };
};

export default function ContributionHeatmap({ data }: HeatmapProps) {
  const { theme } = useTheme();

  const activityData: Activity[] = Object.entries(data).map(([date, count]) => {
    let level = 0;
    if (count > 0 && count <= 2) level = 1;
    if (count > 2 && count <= 4) level = 2;
    if (count > 4 && count <= 6) level = 3;
    if (count > 6) level = 4;
    
    return {
      date,
      count,
      level,
    };
  });
  
  return (
    <div className="text-xs text-muted-foreground">
      <ActivityCalendar
        data={activityData}
        theme={{
          light: ['hsl(0 0% 96%)', 'hsl(var(--primary) / 0.4)', 'hsl(var(--primary) / 0.6)', 'hsl(var(--primary) / 0.8)', 'hsl(var(--primary))'],
          dark: ['hsl(240 4% 15%)', 'hsl(var(--primary) / 0.4)', 'hsl(var(--primary) / 0.6)', 'hsl(var(--primary) / 0.8)', 'hsl(var(--primary))'],
        }}
        colorScheme={theme === 'dark' ? 'dark' : 'light'}
        blockSize={12}
        blockMargin={3}
        fontSize={14}
        hideTotalCount
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
