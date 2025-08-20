
'use client';

import { useEffect, useState } from 'react';
import ReactConfetti from 'react-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Achievement, User } from '@/types';
import { icons } from 'lucide-react';
import { Award } from 'lucide-react';
import { useWindowSize } from 'react-use';
import { cn } from '@/lib/utils';

const DynamicLucideIcon = ({ name, ...props }: { name: string } & React.ComponentProps<typeof Award>) => {
    const LucideIcon = icons[name as keyof typeof icons] || Award;
    return <LucideIcon {...props} />;
};

type BadgeUnlockedModalProps = {
    badge: Omit<Achievement, 'date'> | null;
    user: User | null;
    onOpenChange: (open: boolean) => void;
};

export default function BadgeUnlockedModal({ badge, user, onOpenChange }: BadgeUnlockedModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { width, height } = useWindowSize();

    useEffect(() => {
        setIsOpen(!!badge);
    }, [badge]);

    if (!badge || !user) return null;

    const congratsMessage = badge.description.replace(/Solve problems (\d+ days) in a row/, `You just completed a $1 streak`);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-0">
                {isOpen && <ReactConfetti width={width} height={height} recycle={false} numberOfPieces={600} />}
                <div className="p-8 text-center flex flex-col items-center">
                    <h2 className="text-2xl font-bold font-headline mb-2">New badge unlocked</h2>
                    <p className="text-muted-foreground mb-6">
                        Congrats, {user.name}! {badge.description}.
                    </p>

                    <div
                        className={cn(
                            'relative w-32 h-32 rounded-full flex items-center justify-center animate-badge-glow'
                        )}
                        style={{ '--glow-color': badge.color || '#fbbf24' } as React.CSSProperties}
                    >
                         <div
                            className="hexagon-clip w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: badge.color ? `${badge.color}20` : '#fbbf2420' }}
                          >
                            <DynamicLucideIcon name={badge.icon || 'Award'} className="h-16 w-16" style={{ color: badge.color || '#fbbf24' }} />
                        </div>
                    </div>

                    <p className="text-xl font-bold mt-4">{badge.name}</p>

                    <Button className="mt-8" onClick={() => onOpenChange(false)}>
                        Continue Learning
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

