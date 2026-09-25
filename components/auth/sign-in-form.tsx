"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signInWithPassword } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignInForm({ nextPath }: { nextPath?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError("");
        start(async () => {
          const result = await signInWithPassword(
            { email: data.get("email"), password: data.get("password") },
            nextPath,
          );
          if (result && !result.ok) {
            setError(result.error);
            toast.error(result.error);
          }
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 rounded-xl" disabled={pending}>
        Sign in
      </Button>
    </form>
  );
}
