
'use client';

import ActivityCalendar, { type Activity } from 'react-activity-calendar';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';
import React, { useMemo } from 'react';
import { format } from 'date-fns';

type HeatmapProps = {
  data: { [date: string]: number };
  currentStreak?: number;
  maxStreak?: number;
};

// Helper to generate a date string in YYYY-MM-DD format
const getISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function ContributionHeatmap({ data, currentStreak = 0, maxStreak = 0 }: HeatmapProps) {
  const { theme } = useTheme();

  const activityData: Activity[] = useMemo(() => {
    const today = new Date();
    const yearAgo = new Date();
    yearAgo.setFullYear(today.getFullYear() - 1);
    yearAgo.setDate(yearAgo.getDate() + 1); // Start from exactly one year ago
    
    const dates: Activity[] = [];
    let currentDate = new Date(yearAgo);

    // Create an entry for every day in the last year
    while (currentDate <= today) {
        const dateString = getISODateString(currentDate);
        const count = data[dateString] || 0;
        let level = 0;
        if (count > 0 && count <= 2) level = 1;
        if (count > 2 && count <= 5) level = 2;
        if (count > 5 && count <= 8) level = 3;
        if (count > 8) level = 4;
        
        dates.push({
            date: dateString,
            count: count,
            level: level,
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }, [data]);

  const totalSubmissions = React.useMemo(() => {
    return Object.values(data).reduce((sum, count) => sum + count, 0);
  }, [data]);
  
  return (
    <div className="text-foreground">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <div className="flex-1">
          <h3 className="font-semibold">
            {totalSubmissions.toLocaleString()} submissions in the last year
          </h3>
        </div>
         <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
             <div className="flex items-center gap-1.5 font-medium">
                <Flame className="h-4 w-4 text-orange-500" /> Max Streak: <span className="text-foreground">{maxStreak}</span>
             </div>
             <div className="flex items-center gap-1.5 font-medium">
                <Flame className="h-4 w-4 text-amber-500" /> Current Streak: <span className="text-foreground">{currentStreak}</span>
             </div>
          </div>
      </div>

      <ActivityCalendar
        data={activityData}
        theme={{
          light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
          dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
        }}
        colorScheme={theme === 'dark' ? 'dark' : 'light'}
        blockSize={12}
        blockMargin={3}
        blockRadius={2}
        fontSize={12}
        showWeekdayLabels
        renderBlock={(block, activity) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>{block}</TooltipTrigger>
              <TooltipContent>
                <p className="text-sm font-medium">
                  {activity.count} submissions on {format(new Date(activity.date), 'PPP')}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      />
    </div>
  );
}
