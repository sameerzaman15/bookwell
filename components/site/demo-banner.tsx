export function DemoBanner() {
  return (
    <div className="sticky top-0 z-40 border-b border-[#d7e3dc] bg-[#e7efea] px-4 py-2 text-center text-sm text-[#1f2a26] dark:border-[#2a3832] dark:bg-[#24312c] dark:text-[#e7efea]">
      <p>
        Shared demo. Cedar Physio is fictional and data resets every night. Don&apos;t enter real
        personal or health information.{" "}
        <a
          href="https://sameer-zaman.vercel.app"
          className="font-semibold underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sameer Zaman
        </a>
      </p>
    </div>
  );
}
