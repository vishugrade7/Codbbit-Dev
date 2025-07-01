
'use client';

import ActivityCalendar, { type Activity } from 'react-activity-calendar';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type HeatmapProps = {
  data: { [date: string]: number };
  currentStreak?: number;
  maxStreak?: number;
};

export default function ContributionHeatmap({ data, currentStreak = 0, maxStreak = 0 }: HeatmapProps) {
  const { theme } = useTheme();
  const [duration, setDuration] = useState('1y'); // '6m' or '1y'

  const activityData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (duration === '6m') {
      const sixMonthsAgo = new Date(now);
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      startDate = sixMonthsAgo;
    } else {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      startDate = oneYearAgo;
    }
    
    const filteredEntries = Object.entries(data).filter(([date]) => new Date(date) >= startDate);

    return filteredEntries.map(([date, count]) => {
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
  }, [data, duration]);

  const totalSubmissions = React.useMemo(() => {
    return activityData.reduce((sum, activity) => sum + activity.count, 0);
  }, [activityData]);
  
  return (
    <div className="text-foreground">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold">
            {totalSubmissions.toLocaleString()} submissions in {duration === '1y' ? 'the last year' : 'the last 6 months'}
          </h3>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
             <div className="flex items-center gap-1.5 font-medium">
                <Flame className="h-4 w-4 text-orange-500" /> Max Streak: <span className="text-foreground">{maxStreak}</span>
             </div>
             <div className="flex items-center gap-1.5 font-medium">
                <Flame className="h-4 w-4 text-amber-500" /> Current Streak: <span className="text-foreground">{currentStreak}</span>
             </div>
          </div>
        </div>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1y">Last Year</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
          </SelectContent>
        </Select>
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
        showWeekdayLabels
        renderBlock={(block, activity) => (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>{block}</TooltipTrigger>
              <TooltipContent>
                <p><strong>{activity.count} {activity.count === 1 ? 'submission' : 'submissions'}</strong> on {new Date(activity.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      />
    </div>
  );
}
