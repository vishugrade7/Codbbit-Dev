
import { Check, Code2, Settings } from "lucide-react";

const stats = [
    {
        value: "15%",
        label: "Skill Improvement",
        icon: <Check className="h-5 w-5" />
    },
    {
        value: "70%",
        label: "Faster Time-to-Solution",
        icon: <Settings className="h-5 w-5" />
    },
    {
        value: "2X",
        label: "Higher Completion Rates",
        icon: <Code2 className="h-5 w-5" />
    }
]

const StatCard = ({ value, label, icon }: { value: string, label: string, icon: React.ReactNode }) => (
    <div className="flex items-center gap-4">
        <div className="bg-white text-black rounded-full flex items-center justify-center w-40 h-20 shrink-0">
            <span className="text-4xl font-bold">{value}</span>
        </div>
        <div className="flex-1 flex items-center justify-between border border-white/20 rounded-full h-20 px-8">
             <span className="text-lg font-medium">{label}</span>
             {icon}
        </div>
    </div>
)

export default function StatsSection() {
    return (
        <section className="w-full py-12 md:py-24 lg:py-32 bg-black text-white">
            <div className="container px-4 md:px-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {stats.map(stat => (
                        <StatCard key={stat.label} {...stat} />
                    ))}
                </div>
            </div>
        </section>
    );
}
