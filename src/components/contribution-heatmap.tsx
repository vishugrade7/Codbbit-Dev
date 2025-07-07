
'use client';

import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import 'react-calendar-heatmap/dist/styles.css';

type HeatmapProps = {
  data: { [date: string]: number };
  currentStreak?: number;
  maxStreak?: number;
};

// Use UTC dates to avoid timezone issues
const shiftDate = (date: Date, numDays: number): Date => {
  const newDate = new Date(date);
  newDate.setUTCDate(newDate.getUTCDate() + numDays);
  return newDate;
};

export default function ContributionHeatmap({ data, currentStreak = 0, maxStreak = 0 }: HeatmapProps) {
  const [duration, setDuration] = useState('1y'); // '6m' or '1y'
  
  const today = new Date();
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const startDate = useMemo(() => {
    return duration === '1y' ? shiftDate(endDate, -365) : shiftDate(endDate, -180);
  }, [duration, endDate]);

  const activityData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data).map(([dateString, count]) => {
      // Ensure date strings are parsed as UTC
      const parts = dateString.split('-').map(Number);
      return {
        date: new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])),
        count,
      };
    });
  }, [data]);

  const totalSubmissions = useMemo(() => {
    return activityData.reduce((sum, item) => {
      if (item.date >= startDate && item.date <= endDate) {
        return sum + item.count;
      }
      return sum;
    }, 0);
  }, [activityData, startDate, endDate]);

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

      <TooltipProvider>
        <div className="react-calendar-heatmap-container">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={activityData}
            classForValue={(value) => {
                if (!value || value.count === 0) {
                    return 'color-empty';
                }
                let level = 0;
                if (value.count > 0 && value.count <= 2) level = 1;
                else if (value.count > 2 && value.count <= 5) level = 2;
                else if (value.count > 5 && value.count <= 8) level = 3;
                else if (value.count > 8) level = 4;

                if (level > 0) {
                    return `color-github-${level}`;
                }
                return 'color-empty';
            }}
            transformDayElement={(element, value, index) => {
                if (!value || value.count < 1) {
                    // Just return the element for days with no submissions to avoid an empty tooltip
                    return React.cloneElement(element, { key: index });
                }
                return (
                    <Tooltip key={index}>
                        <TooltipTrigger asChild>{element}</TooltipTrigger>
                        <TooltipContent>
                            <p>
                                <strong>{value.count} {value.count === 1 ? 'submission' : 'submissions'}</strong>
                                {' on '}
                                {value.date.toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    timeZone: 'UTC',
                                })}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                );
            }}
            showWeekdayLabels={true}
          />
        </div>
      </TooltipProvider>
    </div>
  );
}
