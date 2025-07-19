
import { Check, Code2, Settings } from "lucide-react";

const stats = [
    {
        value: "15%",
        label: "Skill Improvement",
        icon: <Check className="h-5 w-5" />,
    },
    {
        value: "70%",
        label: "Faster Time-to-Solution",
        icon: <Settings className="h-5 w-5" />,
    },
    {
        value: "2X",
        label: "Higher Completion Rates",
        icon: <Code2 className="h-5 w-5" />,
    }
]

const StatCard = ({ value, label, icon }: { value: string, label: string, icon: React.ReactNode }) => (
    <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
        <div 
            className="col-span-1 bg-primary text-primary-foreground rounded-full flex items-center justify-center p-4 sm:p-6 h-full"
        >
            <span className="text-2xl sm:text-4xl font-bold">{value}</span>
        </div>
        <div className="col-span-2 flex items-center justify-between border border-border rounded-full p-4 sm:p-6 h-full">
             <span className="text-base sm:text-lg font-medium">{label}</span>
             {icon}
        </div>
    </div>
)

export default function StatsSection() {
    return (
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
            <div className="container px-4 md:px-6">
                <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                    {stats.map(stat => (
                        <StatCard key={stat.label} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
}
