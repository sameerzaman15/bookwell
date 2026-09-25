import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Create account" };

export default async function SignUpPage({
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
        <h1 className="mt-3 text-3xl font-semibold">Create a client account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Accounts created here are clients. Admin access is not available from signup.
        </p>
        <div className="mt-6">
          <SignUpForm nextPath={params.next} />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline">
            Sign in
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
