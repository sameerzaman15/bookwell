import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">That link does not match a page in this demo.</p>
      <Button asChild className="mt-6">
        <Link href="/">Back to Cedar Physio</Link>
      </Button>
    </div>
  );
}
