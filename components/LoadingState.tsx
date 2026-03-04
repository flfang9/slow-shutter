'use client';

import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Processing...</p>
    </div>
  );
}
