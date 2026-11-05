import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, safeValidateUIMessages, type UIMessage } from "ai";
import type { Database, Json } from "@/integrations/supabase/types";
import { createResponsesCall } from "@/lib/ai-gateway/responses";

const model = "openai/gpt-6-astra";

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: async ({ request }) => {
    try {
      const auth = request.headers.get("authorization");
      const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!token || token.split(".").length !== 3) return Response.json({ error: "Please sign in to use Nexus AI." }, { status: 401 });
      const url = process.env["SUPABASE_URL"];
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!url || !key) return Response.json({ error: "Workspace authentication is not configured." }, { status: 500 });
      if (!apiKey) return Response.json({ error: "Nexus AI is not configured for this workspace." }, { status: 503 });
      const db = createClient<Database>(url, key, {
        global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => {
          const headers = new Headers(typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined);
          if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
          if ((key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        } },
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data: claims, error: claimError } = await db.auth.getClaims(token);
      if (claimError || !claims?.claims?.sub) return Response.json({ error: "Your sign-in has expired. Please sign in again." }, { status: 401 });
      const userId = claims.claims.sub;
      const body: unknown = await request.json();
      if (!body || typeof body !== "object") return Response.json({ error: "Invalid chat request." }, { status: 400 });
      const { threadId, messages } = body as { threadId?: unknown; messages?: unknown };
      if (typeof threadId !== "string" || threadId.length > 64) return Response.json({ error: "Choose a valid conversation." }, { status: 400 });
      const { data: thread, error: threadError } = await db.from("chat_threads").select("id, company_id, title").eq("id", threadId).eq("user_id", userId).maybeSingle();
      if (threadError || !thread) return Response.json({ error: "That conversation is unavailable." }, { status: 404 });
      const validated = await safeValidateUIMessages({ messages });
      if (!validated.success || !validated.data.length || validated.data.at(-1)?.role !== "user") return Response.json({ error: "The latest message is invalid." }, { status: 400 });
      const uiMessages = validated.data as UIMessage[];
      const latestUserMessage = uiMessages.at(-1);
      if (!latestUserMessage) return Response.json({ error: "The latest message is missing." }, { status: 400 });
      const { error: userSaveError } = await db.from("chat_messages").upsert({
        thread_id: thread.id, company_id: thread.company_id, user_id: userId, client_message_id: latestUserMessage.id,
        role: "user", parts: latestUserMessage.parts as unknown as Json,
      }, { onConflict: "thread_id,client_message_id" });
      if (userSaveError) return Response.json({ error: "Your message could not be saved. Please try again." }, { status: 500 });
      const text = latestUserMessage.parts.filter((part) => part.type === "text").map((part) => part.text).join(" ").trim();
      const { error: titleError } = await db.from("chat_threads").update({
        title: thread.title === "New conversation" && text ? text.slice(0, 72) : thread.title,
        updated_at: new Date().toISOString(),
      }).eq("id", thread.id).eq("user_id", userId);
      if (titleError) console.error("Unable to update chat title", titleError.message);
      const [products, suppliers, inventory, orders] = await Promise.all([
        db.from("products").select("sku,name,category,unit,unit_cost,reorder_point,supplier_id").eq("company_id", thread.company_id).limit(250),
        db.from("suppliers").select("id,name,country,lead_time_days,payment_terms").eq("company_id", thread.company_id).limit(150),
        db.from("inventory").select("product_id,warehouse_id,quantity,warehouses(name)").eq("company_id", thread.company_id).limit(1000),
        db.from("purchase_orders").select("po_number,status,order_date,expected_date,supplier_id").eq("company_id", thread.company_id).order("created_at", { ascending: false }).limit(100),
      ]);
      for (const result of [products, suppliers, inventory, orders]) {
        if (result.error) return Response.json({ error: "Workspace data could not be loaded for Nexus AI." }, { status: 500 });
      }
      const systemContext = [
        "You are Nexus AI, the supply-chain assistant inside NexusIQ. Answer from the workspace snapshot below, use BDT (৳) for amounts, and be explicit when data is missing. Do not invent facts, promise actions, or claim to change records. Keep recommendations practical and identify assumptions.",
        `Workspace products: ${JSON.stringify(products.data ?? [])}`,
        `Workspace suppliers: ${JSON.stringify(suppliers.data ?? [])}`,
        `Workspace inventory: ${JSON.stringify(inventory.data ?? [])}`,
        `Recent purchase orders: ${JSON.stringify(orders.data ?? [])}`,
      ].join("\n\n");
      const modelMessages = await convertToModelMessages(uiMessages);
      const call = createResponsesCall(request, { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model }, modelMessages, systemContext);
      return call.response(uiMessages, async ({ responseMessage, isAborted, isCancelled }) => {
        if (isAborted || isCancelled || responseMessage.role !== "assistant") return;
        const { error } = await db.from("chat_messages").upsert({
          thread_id: thread.id, company_id: thread.company_id, user_id: userId, client_message_id: responseMessage.id,
          role: "assistant", parts: responseMessage.parts as unknown as Json,
        }, { onConflict: "thread_id,client_message_id" });
        if (error) console.error("Unable to save Nexus AI response", error.message);
        const { error: updateError } = await db.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", thread.id).eq("user_id", userId);
        if (updateError) console.error("Unable to update chat activity", updateError.message);
      });
    } catch (error) {
      console.error("Nexus AI request failed", error);
      if (request.signal.aborted) return new Response("Request stopped", { status: 499 });
      return Response.json({ error: error instanceof Error ? error.message : "Nexus AI could not complete this request." }, { status: 500 });
    }
  } } },
});