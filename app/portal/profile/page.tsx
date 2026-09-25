import { ProfileForm } from "@/components/portal/profile-form";
import { demoEmails } from "@/lib/env";
import { isDemoAccount } from "@/lib/authz";
import { requirePageRole } from "@/lib/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requirePageRole("client");
  return (
    <div className="max-w-lg">
      <h1 className="text-3xl font-semibold">Profile</h1>
      <div className="mt-6">
        <ProfileForm
          name={user.name}
          email={user.email}
          phone={user.phone ?? ""}
          demo={isDemoAccount(user.email, demoEmails())}
        />
      </div>
    </div>
  );
}
