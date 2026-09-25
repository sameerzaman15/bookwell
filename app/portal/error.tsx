"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">The portal could not load</h1>
      <Button type="button" className="mt-4" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
