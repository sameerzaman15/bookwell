"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        This page could not be loaded. If you are running the demo locally, check that the database is set up.
      </p>
      <Button type="button" className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
