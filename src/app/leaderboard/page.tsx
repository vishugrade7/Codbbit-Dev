import Header from "@/components/header";
import Footer from "@/components/footer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const leaderboardData = [
  { rank: 1, name: 'Alice', username: 'alice_dev', avatar: '/avatars/01.png', points: 10240, country: 'USA', company: 'Google' },
  { rank: 2, name: 'Bob', username: 'bob_codes', avatar: '/avatars/02.png', points: 9870, country: 'Germany', company: 'Salesforce' },
  { rank: 3, name: 'Charlie', username: 'charlie_sf', avatar: '/avatars/03.png', points: 9500, country: 'India', company: 'Microsoft' },
  { rank: 4, name: 'Diana', username: 'diana_apex', avatar: '/avatars/04.png', points: 8800, country: 'Canada', company: 'Amazon' },
  { rank: 5, name: 'Eve', username: 'eve_debug', avatar: '/avatars/05.png', points: 8550, country: 'UK', company: 'Meta' },
  { rank: 6, name: 'Frank', username: 'frank_lwc', avatar: '/avatars/06.png', points: 8120, country: 'Australia', company: 'Accenture' },
  { rank: 7, name: 'Grace', username: 'grace_flow', avatar: '/avatars/07.png', points: 7900, country: 'Japan', company: 'Deloitte' },
  { rank: 8, name: 'Heidi', username: 'heidi_soql', avatar: '/avatars/08.png', points: 7650, country: 'Brazil', company: 'IBM' },
  { rank: 9, name: 'Ivan', username: 'ivan_trigger', avatar: '/avatars/09.png', points: 7300, country: 'South Africa', company: 'Capgemini' },
  { rank: 10, name: 'Judy', username: 'judy_test', avatar: '/avatars/10.png', points: 7100, country: 'France', company: 'Cognizant' },
];

const getMedal = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export default function Leaderboard() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                See how you rank against the best Salesforce developers in the world. Keep solving problems to climb up the ranks!
            </p>
        </div>
        
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px] text-center">Rank</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="hidden md:table-cell">Company</TableHead>
                        <TableHead className="hidden md:table-cell text-center">Country</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leaderboardData.map((user) => (
                        <TableRow key={user.username}>
                            <TableCell className="font-bold text-center text-lg">{getMedal(user.rank)}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={`https://placehold.co/40x40.png?text=${user.name.charAt(0)}`} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{user.company}</TableCell>
                            <TableCell className="hidden md:table-cell text-center">{user.country}</TableCell>
                            <TableCell className="text-right font-mono font-semibold">{user.points.toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>

      </main>
      <Footer />
    </div>
  );
}
