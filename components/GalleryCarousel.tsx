'use client';

import { useState, useEffect } from 'react';

const GALLERY_IMAGES = [
  {
    src: '/demo-images/gallery-party.jpg',
    caption: 'Motion blur at a party',
  },
  {
    src: '/demo-images/gallery-street.jpg',
    caption: 'Street photography with drift',
  },
  {
    src: '/demo-images/gallery-metro.jpg',
    caption: 'Metro platform cinematic blur',
  },
  {
    src: '/demo-images/gallery-bulls.jpg',
    caption: 'Bulls game with zoom pull',
  },
  {
    src: '/demo-images/gallery-market.jpg',
    caption: 'Market scene with motion',
  },
];

export function GalleryCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate every 3.5 seconds
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % GALLERY_IMAGES.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const getCardPosition = (index: number) => {
    const diff = (index - currentIndex + GALLERY_IMAGES.length) % GALLERY_IMAGES.length;
    return diff;
  };

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Label */}
      <div className="flex justify-between items-center mb-4 px-1">
        <span className="text-xs font-medium uppercase tracking-wider text-white/40">
          Made with Slow Shutter
        </span>
        <div className="flex gap-1.5">
          {GALLERY_IMAGES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-4' : 'bg-white/30'
              }`}
              aria-label={`Go to image ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Cards Container */}
      <div className="relative h-[280px] md:h-[320px]">
        {GALLERY_IMAGES.map((image, index) => {
          const position = getCardPosition(index);
          const isActive = position === 0;
          const isPrev = position === GALLERY_IMAGES.length - 1;
          const isNext = position === 1;

          return (
            <div
              key={index}
              className={`
                absolute inset-0 transition-all duration-700 ease-out
                ${isActive ? 'z-30' : isPrev || isNext ? 'z-20' : 'z-10'}
              `}
              style={{
                transform: isActive
                  ? 'translateX(0%) scale(1) rotateY(0deg)'
                  : isPrev
                    ? 'translateX(-60%) scale(0.85) rotateY(15deg)'
                    : isNext
                      ? 'translateX(60%) scale(0.85) rotateY(-15deg)'
                      : position < GALLERY_IMAGES.length / 2
                        ? 'translateX(120%) scale(0.7) rotateY(-20deg)'
                        : 'translateX(-120%) scale(0.7) rotateY(20deg)',
                opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              {/* Card */}
              <div
                className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-black/20"
                style={{
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
              >
                <img
                  src={image.src}
                  alt={image.caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Caption */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-sm text-white/80 font-light">
                      {image.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Swipe Hint */}
      <div className="md:hidden mt-3 flex justify-center">
        <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
          Auto-rotating • Tap dots to navigate
        </span>
      </div>

      {/* Desktop Hover Hint */}
      <div className="hidden md:flex mt-3 justify-center">
        <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
          {isPaused ? 'Paused' : 'Auto-rotating • Hover to pause'}
        </span>
      </div>
    </div>
  );
}
