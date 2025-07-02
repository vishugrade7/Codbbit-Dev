import Image from "next/image";

// Create items with different aspect ratios
const items = [
  { src: "https://placehold.co/400x550.png", "data-ai-hint": "architecture design" },
  { src: "https://placehold.co/400x300.png", "data-ai-hint": "woman speaking" },
  { src: "https://placehold.co/400x300.png", "data-ai-hint": "girl at piano" },
  { src: "https://placehold.co/400x250.png", "data-ai-hint": "man stretching" },
  { src: "https://placehold.co/400x550.png", "data-ai-hint": "vintage letter" },
  { src: "https://placehold.co/400x400.png", "data-ai-hint": "dark room" },
  { src: "https://placehold.co/400x250.png", "data-ai-hint": "skater on stairs" },
  { src: "https://placehold.co/400x300.png", "data-ai-hint": "abstract texture" },
];

// Distribute items into three columns to create the staggered effect
const columns = [
  items.filter((_, i) => i % 3 === 0),
  items.filter((_, i) => i % 3 === 1),
  items.filter((_, i) => i % 3 === 2),
];

const MarqueeColumn = ({ items, keyOffset }: { items: (typeof items); keyOffset: number }) => (
  <div className="flex flex-col gap-4">
    {items.map((item, index) => (
      <div key={keyOffset + index} className="overflow-hidden rounded-lg shadow-lg bg-background">
        <Image
          src={item.src}
          alt={`Featured item ${keyOffset + index + 1}`}
          width={400}
          height={400}
          data-ai-hint={item['data-ai-hint']}
          className="h-auto w-full object-cover transition-transform duration-500 ease-in-out hover:scale-105"
        />
      </div>
    ))}
  </div>
);

const MarqueeContent = () => (
    <div className="flex shrink-0 gap-4 px-2">
        {columns.map((columnItems, i) => (
            <MarqueeColumn key={i} items={columnItems} keyOffset={i * columns.length} />
        ))}
    </div>
);

export default function FeaturedContent() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-card/20 overflow-x-hidden">
      <div className="container px-4 md:px-6 mb-8">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center">Featured by our community</h2>
        <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl text-center mt-4">
          Discover the latest and greatest work from our talented community of developers and designers.
        </p>
      </div>
      <div className="relative w-full [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]">
        <div className="flex animate-marquee hover:[animation-play-state:paused]">
          <MarqueeContent />
          <MarqueeContent />
        </div>
      </div>
    </section>
  );
}
