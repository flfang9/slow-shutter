'use client';

const seedImages = [
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800", // Abstract Tokyo Blur
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=800", // City Lights Motion
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800", // Forest Streak
  "https://images.unsplash.com/photo-1502657877623-f66bf489d236?q=80&w=800", // Minimalist Drift
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800", // Cinematic Crowd
  "https://images.unsplash.com/photo-1533107862482-0e6974b06ec4?q=80&w=800"  // Night Street Swirl
];

export function GridBackground() {
  // Create masonry grid with seeded images
  const gridItems = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    image: seedImages[i % seedImages.length],
    span: Math.random() > 0.6 ? 2 : 1,
  }));

  return (
    <div
      className="absolute inset-0 overflow-hidden opacity-30 md:opacity-40 min-h-[100vh]"
      style={{ filter: 'grayscale(100%)' }}
    >
      <div className="grid grid-cols-2 md:grid-cols-10 gap-2 p-4 h-full min-h-[100vh] auto-rows-[100px]">
        {gridItems.map((item) => (
          <div
            key={item.id}
            className={`
              rounded-lg overflow-hidden bg-black
              ${item.span === 2 ? 'md:col-span-2 md:row-span-2' : 'col-span-1'}
            `}
          >
            <img
              src={item.image}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
