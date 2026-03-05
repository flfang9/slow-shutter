'use client';

interface CompareButtonProps {
  onCompareStart: () => void;
  onCompareEnd: () => void;
}

export function CompareButton({ onCompareStart, onCompareEnd }: CompareButtonProps) {
  return (
    <button
      onMouseDown={onCompareStart}
      onMouseUp={onCompareEnd}
      onMouseLeave={onCompareEnd}
      onTouchStart={onCompareStart}
      onTouchEnd={onCompareEnd}
      className="w-full px-4 py-3 text-sm font-medium bg-white/5 hover:bg-white/10
                 border border-white/10 rounded-lg backdrop-blur-xl
                 transition-all active:scale-95"
    >
      <span className="text-white/80">Hold to Compare</span>
    </button>
  );
}
