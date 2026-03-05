'use client';

export function GridBackground() {
  // Monochrome motion-blur inspired masonry grid
  const gridItems = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    span: Math.random() > 0.5 ? 2 : 1,
    opacity: 0.3 + Math.random() * 0.4,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden opacity-30 md:opacity-40">
      <div className="grid grid-cols-2 md:grid-cols-10 gap-2 p-4 h-full auto-rows-[80px]">
        {gridItems.map((item) => (
          <div
            key={item.id}
            className={`
              rounded-lg overflow-hidden
              ${item.span === 2 ? 'md:col-span-2 md:row-span-2' : 'col-span-1'}
            `}
            style={{
              background: `linear-gradient(${Math.random() * 360}deg,
                rgba(255,255,255,${item.opacity * 0.1}) 0%,
                rgba(255,255,255,${item.opacity * 0.05}) 100%)`,
              backdropFilter: 'blur(1px)',
            }}
          >
            <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}
