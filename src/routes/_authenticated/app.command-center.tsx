import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/lib/workspace";

export const Route = createFileRoute("/_authenticated/app/command-center")({
  head: () => ({ meta: [
    { title: "AI Command Center — NexusIQ" }, { name: "description", content: "Ask Nexus AI about your workspace supply chain." },
    { property: "og:title", content: "AI Command Center — NexusIQ" }, { property: "og:description", content: "Ask Nexus AI about your workspace supply chain." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CommandCenter,
});

function CommandCenter() {
  const { company } = useWorkspace();
  const navigate = useNavigate();
  const started = useRef(false);
  useEffect(() => {
    if (!company || started.current) return;
    started.current = true;
    const openChat = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("Sign in to open Nexus AI.");
        const { data, error } = await supabase.from("chat_threads").select("id").eq("company_id", company.id).eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        let threadId = data?.id;
        if (!threadId) {
          const { data: created, error: createError } = await supabase.from("chat_threads").insert({ company_id: company.id, user_id: user.id, title: "New conversation" }).select("id").single();
          if (createError) throw createError;
          threadId = created.id;
        }
        navigate({ to: "/app/chat/$threadId", params: { threadId }, replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Nexus AI could not be opened.");
        started.current = false;
      }
    };
    void openChat();
  }, [company, navigate]);
  return <div className="py-14 text-center text-sm text-muted-foreground">Opening Nexus AI…</div>;
}