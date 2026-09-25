"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { signUpClient } from "@/lib/actions";
import { signUpSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Values = { name: string; email: string; password: string };

export function SignUpForm({ nextPath }: { nextPath?: string }) {
  const [pending, start] = useTransition();
  const [formError, setFormError] = useState("");
  const form = useForm<Values>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const password = form.watch("password");
  const checks = [
    { ok: password.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Za-z]/.test(password), label: "One letter" },
    { ok: /[0-9]/.test(password), label: "One number" },
  ];

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => {
        setFormError("");
        start(async () => {
          const result = await signUpClient(values, nextPath);
          if (result && !result.ok) {
            setFormError(result.error);
            toast.error(result.error);
          }
        });
      })}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register("name")} />
        {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        <ul className="text-xs text-muted-foreground">
          {checks.map((check) => (
            <li key={check.label} className={check.ok ? "text-primary" : undefined}>
              {check.ok ? "Ready" : "Need"}: {check.label}
            </li>
          ))}
        </ul>
      </div>
      {formError && <p className="text-sm text-destructive" role="alert">{formError}</p>}
      <Button type="submit" className="h-11 rounded-xl" disabled={pending}>
        Create account
      </Button>
    </form>
  );
}
