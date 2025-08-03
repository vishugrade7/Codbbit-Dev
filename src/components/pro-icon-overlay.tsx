
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const ProIconOverlay = () => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 flex items-center justify-center">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="11" stroke="hsl(var(--primary))" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="8" fill="#FDB813"/>
                        <path d="M10.5 9.5L8 12L10.5 14.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.5 9.5L17 12L14.5 14.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>Pro User</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);
