"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminDeletePractitioner, adminSavePractitioner } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PractitionerForm({
  initial,
}: {
  initial?: { id: string; name: string; title: string; bio: string; color: string; active: boolean };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        start(async () => {
          const result = await adminSavePractitioner({
            id: initial?.id,
            name: data.get("name"),
            title: data.get("title"),
            bio: data.get("bio"),
            color: data.get("color"),
            active: data.get("active") === "on",
          });
          if (!result.ok) toast.error(result.error);
          else {
            toast.success("Practitioner saved.");
            if (!initial?.id && result.data?.id) router.push(`/admin/practitioners/${result.data.id}`);
            else router.refresh();
          }
        });
      }}
    >
      <h2 className="font-semibold">{initial ? "Edit practitioner" : "New practitioner"}</h2>
      <div className="grid gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={initial?.name} required /></div>
      <div className="grid gap-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" defaultValue={initial?.title} required /></div>
      <div className="grid gap-1.5"><Label htmlFor="bio">Bio</Label><Textarea id="bio" name="bio" defaultValue={initial?.bio} /></div>
      <div className="grid gap-1.5"><Label htmlFor="color">Color</Label><Input id="color" name="color" defaultValue={initial?.color ?? "#3F6B5B"} /></div>
      <label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={initial?.active ?? true} /> Active</label>
      <Button type="submit" disabled={pending}>Save</Button>
      {initial && (
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this practitioner?")) return;
            start(async () => {
              const result = await adminDeletePractitioner(initial.id);
              if (result && !result.ok) toast.error(result.error);
            });
          }}
        >
          Delete
        </Button>
      )}
    </form>
  );
}
