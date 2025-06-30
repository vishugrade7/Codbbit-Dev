
"use client";

import { useState, useMemo } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
    { rank: 11, name: 'Kevin', username: 'kevin_k', avatar: '/avatars/11.png', points: 6950, country: 'USA', company: 'Oracle' },
    { rank: 12, name: 'Linda', username: 'linda_light', avatar: '/avatars/12.png', points: 6800, country: 'Germany', company: 'SAP' },
    { rank: 13, name: 'Mike', username: 'mike_m', avatar: '/avatars/13.png', points: 6650, country: 'India', company: 'Infosys' },
    { rank: 14, name: 'Nancy', username: 'nancy_n', avatar: '/avatars/14.png', points: 6500, country: 'Canada', company: 'Shopify' },
    { rank: 15, name: 'Oscar', username: 'oscar_o', avatar: '/avatars/15.png', points: 6350, country: 'UK', company: 'Barclays' },
    { rank: 16, name: 'Patty', username: 'patty_p', avatar: '/avatars/16.png', points: 6200, country: 'Australia', company: 'Atlassian' },
    { rank: 17, name: 'Quincy', username: 'quincy_q', avatar: '/avatars/17.png', points: 6050, country: 'Japan', company: 'Sony' },
    { rank: 18, name: 'Rachel', username: 'rachel_r', avatar: '/avatars/18.png', points: 5900, country: 'Brazil', company: 'Nubank' },
    { rank: 19, name: 'Steve', username: 'steve_s', avatar: '/avatars/19.png', points: 5750, country: 'South Africa', company: 'Naspers' },
    { rank: 20, name: 'Tina', username: 'tina_t', avatar: '/avatars/20.png', points: 5600, country: 'France', company: 'Ubisoft' },
    { rank: 21, name: 'Uma', username: 'uma_u', avatar: '/avatars/21.png', points: 5450, country: 'USA', company: 'Netflix' },
    { rank: 22, name: 'Victor', username: 'victor_v', avatar: '/avatars/22.png', points: 5300, country: 'Germany', company: 'Siemens' },
    { rank: 23, name: 'Wendy', username: 'wendy_w', avatar: '/avatars/23.png', points: 5150, country: 'India', company: 'TCS' },
    { rank: 24, name: 'Xavier', username: 'xavier_x', avatar: '/avatars/24.png', points: 5000, country: 'Canada', company: 'CIBC' },
    { rank: 25, name: 'Yara', username: 'yara_y', avatar: '/avatars/25.png', points: 4850, country: 'UK', company: 'HSBC' },
    { rank: 26, name: 'Zack', username: 'zack_z', avatar: '/avatars/26.png', points: 4700, country: 'Australia', company: 'Canva' },
    { rank: 27, name: 'Amber', username: 'amber_a', avatar: '/avatars/27.png', points: 4550, country: 'Japan', company: 'Rakuten' },
    { rank: 28, name: 'Brian', username: 'brian_b', avatar: '/avatars/28.png', points: 4400, country: 'Brazil', company: 'Itau' },
    { rank: 29, name: 'Chloe', username: 'chloe_c', avatar: '/avatars/29.png', points: 4250, country: 'South Africa', company: 'MTN' },
    { rank: 30, name: 'David', username: 'david_d', avatar: '/avatars/30.png', points: 4100, country: 'France', company: 'BNP Paribas' },
    { rank: 31, name: 'Emily', username: 'emily_e', avatar: '/avatars/31.png', points: 3950, country: 'USA', company: 'Stripe' },
];

const getMedal = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

export default function Leaderboard() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(leaderboardData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return leaderboardData.slice(startIndex, endIndex);
  }, [currentPage]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

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
                    {paginatedData.map((user) => (
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

        {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-8">
                <Button onClick={handlePrevPage} disabled={currentPage === 1} variant="outline">
                    Previous
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                    Page {currentPage} of {totalPages}
                </span>
                <Button onClick={handleNextPage} disabled={currentPage === totalPages} variant="outline">
                    Next
                </Button>
            </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
