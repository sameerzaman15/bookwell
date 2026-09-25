import Link from "next/link";
import { PractitionerForm } from "@/components/admin/practitioner-form";
import { getAdminCatalog } from "@/lib/catalog-view";

export const metadata = { title: "Practitioners" };

export default async function PractitionersPage() {
  const catalog = await getAdminCatalog();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-2xl font-semibold">Practitioners</h1>
        <ul className="mt-4 grid gap-3">
          {catalog.practitionerRows.map((person) => (
            <li key={person.id} className="rounded-xl border border-border p-4">
              <Link href={`/admin/practitioners/${person.id}`} className="flex items-center gap-2 font-medium">
                <span className="size-2.5 rounded-full" style={{ background: person.color }} />
                {person.name}
              </Link>
              <p className="text-sm text-muted-foreground">{person.title} · {person.active ? "Active" : "Inactive"}</p>
            </li>
          ))}
        </ul>
      </div>
      <PractitionerForm />
    </div>
  );
}
