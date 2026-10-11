import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — NexusIQ" },
      { name: "description", content: "Choose a new password for your NexusIQ account." },
      { property: "og:title", content: "Set a new password — NexusIQ" },
      { property: "og:description", content: "Choose a new password for your NexusIQ account." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.error("At least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    navigate({ to: "/app" });
  }
  return (
    <AuthLayout title="Set a new password" subtitle="Use the link from your email to reach this page.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
        <Button className="w-full" disabled={busy}>Update password</Button>
      </form>
    </AuthLayout>
  );
}
