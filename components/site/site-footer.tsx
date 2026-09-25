export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`border-t border-border px-4 py-4 text-sm text-muted-foreground ${className}`}>
      <div className="mx-auto flex max-w-6xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p>Concept demo. Cedar Physio is fictional.</p>
        <p>
          Built by{" "}
          <a
            href="https://sameer-zaman.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-2"
          >
            Sameer Zaman
          </a>
        </p>
      </div>
    </footer>
  );
}
