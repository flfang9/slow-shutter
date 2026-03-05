'use client';

import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-white/60 mb-3" />
      <p className="text-xs text-white/40 tracking-wider uppercase font-light">Processing</p>
    </div>
  );
}
