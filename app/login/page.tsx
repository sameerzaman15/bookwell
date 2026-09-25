import Link from "next/link";
import { DemoLoginButtons } from "@/components/site/demo-login-buttons";
import { SiteFooter } from "@/components/site/site-footer";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Link href="/" className="text-sm font-medium text-primary">
          Cedar Physio
        </Link>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use your account, or step into the shared demo.</p>
        <div className="mt-6">
          <DemoLoginButtons stacked />
        </div>
        <div className="my-6 h-px bg-border" />
        <SignInForm nextPath={params.next} />
        <p className="mt-4 text-sm text-muted-foreground">
          New here?{" "}
          <Link href={`/signup${params.next ? `?next=${encodeURIComponent(params.next)}` : ""}`} className="font-medium text-foreground underline">
            Create a client account
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
