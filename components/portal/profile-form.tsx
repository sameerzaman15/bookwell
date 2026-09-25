"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { changePassword, updateProfile } from "@/lib/actions";
import { passwordChangeSchema, profileSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  name,
  email,
  phone,
  demo,
}: {
  name: string;
  email: string;
  phone: string;
  demo: boolean;
}) {
  const [pending, start] = useTransition();
  const profile = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, phone },
  });
  const password = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const [message, setMessage] = useState("");

  return (
    <div className="grid gap-8">
      <form
        className="grid gap-4"
        onSubmit={profile.handleSubmit((values) => {
          start(async () => {
            const result = await updateProfile(values);
            if (!result.ok) toast.error(result.error);
            else toast.success("Profile saved.");
          });
        })}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" {...profile.register("name")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} readOnly disabled />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" {...profile.register("phone")} autoComplete="tel" />
        </div>
        <Button type="submit" disabled={pending} className="w-fit">
          Save profile
        </Button>
      </form>
      <form
        className="grid gap-4"
        onSubmit={password.handleSubmit((values) => {
          setMessage("");
          start(async () => {
            const result = await changePassword(values);
            if (!result.ok) {
              setMessage(result.error);
              toast.error(result.error);
            } else toast.success("Password updated.");
          });
        })}
      >
        <h2 className="text-lg font-semibold">Password</h2>
        {demo && (
          <p className="text-sm text-muted-foreground">
            This shared demo account cannot change its email or password.
          </p>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" type="password" disabled={demo} {...password.register("currentPassword")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" disabled={demo} {...password.register("newPassword")} />
          <p className="text-xs text-muted-foreground">Use at least 8 characters with a letter and a number.</p>
        </div>
        {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
        <Button type="submit" disabled={pending || demo} className="w-fit">
          Update password
        </Button>
      </form>
    </div>
  );
}
