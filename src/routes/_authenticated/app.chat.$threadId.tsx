import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, MessageSquarePlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolPart } from "@/components/ai-elements/tool";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/chat/$threadId")({
  head: () => ({ meta: [
    { title: "Nexus AI Chat — NexusIQ" }, { name: "description", content: "Ask Nexus AI about purchasing, suppliers and inventory." },
    { property: "og:title", content: "Nexus AI Chat — NexusIQ" }, { property: "og:description", content: "Ask Nexus AI about your supply chain." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ChatPage,
});

type Thread = { id: string; title: string; updated_at: string };
type StoredMessage = { id: string; role: "user" | "assistant"; parts: UIMessage["parts"]; created_at: string };

function ChatPage() {
  const { threadId } = Route.useParams();
  const { company } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const threadsQuery = useQuery({
    queryKey: ["chat-threads", company?.id], enabled: !!company,
    queryFn: async () => {
      if (!company) throw new Error("No workspace is selected.");
      const { data, error } = await supabase.from("chat_threads").select("id,title,updated_at").eq("company_id", company.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Thread[];
    },
  });
  const threadQuery = useQuery({
    queryKey: ["chat-thread", threadId, company?.id], enabled: !!company,
    queryFn: async () => {
      if (!company) throw new Error("No workspace is selected.");
      const { data, error } = await supabase.from("chat_threads").select("id,title,updated_at").eq("id", threadId).eq("company_id", company.id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This conversation is unavailable.");
      return data as Thread;
    },
  });
  const historyQuery = useQuery({
    queryKey: ["chat-history", threadId, company?.id], enabled: !!company && !!threadQuery.data,
    queryFn: async () => {
      if (!company) throw new Error("No workspace is selected.");
      const { data, error } = await supabase.from("chat_messages").select("id,client_message_id,role,parts,created_at").eq("thread_id", threadId).eq("company_id", company.id).order("created_at");
      if (error) throw error;
      return (data ?? []).map((item) => ({ id: item.client_message_id ?? item.id, role: item.role as "user" | "assistant", parts: item.parts as UIMessage["parts"], created_at: item.created_at })) as StoredMessage[];
    },
  });

  const createThread = useCallback(async () => {
    if (!company) return;
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sign in to start a conversation.");
      const { data, error } = await supabase.from("chat_threads").insert({ company_id: company.id, user_id: authData.user.id, title: "New conversation" }).select("id").single();
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["chat-threads", company.id] });
      navigate({ to: "/app/chat/$threadId", params: { threadId: data.id } });
    } catch (error) { toast.error(error instanceof Error ? error.message : "A conversation could not be created."); }
  }, [company, navigate, queryClient]);

  const threads = threadsQuery.data ?? [];
  const thread = threadQuery.data;
  const initialMessages: UIMessage[] = (historyQuery.data ?? []).map(({ id, role, parts }) => ({ id, role, parts }));
  return <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] md:-m-8">
    <aside className="hidden w-64 shrink-0 border-r bg-muted/30 md:flex md:flex-col">
      <div className="flex items-center justify-between border-b px-4 py-4"><Link to="/app" aria-label="Back to overview"><ArrowLeft className="h-4 w-4 text-muted-foreground" /></Link><Button variant="outline" size="sm" onClick={createThread}><MessageSquarePlus /> New chat</Button></div>
      <div className="px-4 pb-2 pt-5 text-xs font-medium uppercase text-muted-foreground">Saved chats</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4" aria-label="Saved conversations">
        {threads.map((item) => <Link key={item.id} to="/app/chat/$threadId" params={{ threadId: item.id }} className={cn("block truncate rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent", item.id === threadId ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground")}>{item.title}</Link>)}
        {threadsQuery.isSuccess && threads.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">Your saved conversations will appear here.</p>}
      </nav>
      <div className="border-t p-4"><Logo className="text-sm text-foreground" /></div>
    </aside>
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b px-4 md:px-6"><div className="flex min-w-0 items-center gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></div><div className="min-w-0"><h1 className="truncate font-display text-base font-semibold">Nexus AI</h1><p className="truncate text-xs text-muted-foreground">{thread?.title ?? "Supply chain assistant"}</p></div></div><Button variant="ghost" size="icon" aria-label="New chat" title="New chat" onClick={createThread} className="md:hidden"><MessageSquarePlus /></Button></header>
      {threadQuery.isError || historyQuery.isError ? <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-destructive">{threadQuery.error?.message ?? "Chat history could not be loaded."}</div> : historyQuery.isSuccess ? <ChatSession key={threadId} threadId={threadId} thread={thread} threads={threads} initialMessages={initialMessages} companyId={company?.id} createThread={createThread} /> : <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Restoring this saved conversation…</div>}
    </section>
  </div>;
}

function ChatSession({ threadId, thread, threads, initialMessages, companyId, createThread }: {
  threadId: string; thread: Thread | undefined; threads: Thread[]; initialMessages: UIMessage[]; companyId: string | undefined; createThread: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chat = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { threadId },
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
      },
    }),
    onError: (error) => {
      const message = error.message || "Nexus AI could not complete this request.";
      if (message.includes("402")) toast.error(message);
      else if (message.includes("429")) toast.error("Nexus AI is busy. Please try again in a moment.");
      else toast.error(message);
    },
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ["chat-threads", companyId] });
      void queryClient.invalidateQueries({ queryKey: ["chat-history", threadId, companyId] });
      window.requestAnimationFrame(() => textareaRef.current?.focus());
    },
  });

  useEffect(() => { textareaRef.current?.focus(); }, [threadId]);
  const submit = async (message: { text: string }) => {
    const value = message.text.trim();
    if (!value || chat.status === "submitted" || chat.status === "streaming") return;
    setDraft("");
    try { await chat.sendMessage({ text: value }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Your message could not be sent."); }
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return <>
    <Conversation key={threadId} className="min-h-0">
      <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 md:px-8">
        {chat.messages.length === 0 ? <ConversationEmptyState title="Ask Nexus AI" description="Ask about your products, suppliers, inventory or purchasing." icon={<Bot className="h-8 w-8" />} /> : chat.messages.map((message) => <Message key={message.id} from={message.role} className="max-w-full">
          {message.parts.map((part, index) => {
            if (part.type === "text") return <MessageContent key={`${message.id}-text-${index}`} className={message.role === "user" ? "bg-primary text-primary-foreground" : "bg-transparent px-0 py-1"}><MessageResponse>{part.text}</MessageResponse></MessageContent>;
            if (part.type === "reasoning") return null;
            if (part.type === "dynamic-tool") {
              const tool = part as Extract<ToolPart, { type: "dynamic-tool" }>;
              return <Tool key={`${message.id}-tool-${index}`} defaultOpen={false}><ToolHeader type="dynamic-tool" toolName={tool.toolName} state={tool.state} /><ToolContent>{tool.input != null && <ToolInput input={tool.input} />}{(tool.state === "output-available" || tool.state === "output-error") && <ToolOutput output={tool.output} errorText={tool.errorText} />}</ToolContent></Tool>;
            }
            if (part.type.startsWith("tool-")) {
              const tool = part as Extract<ToolPart, { type: `tool-${string}` }>;
              return <Tool key={`${message.id}-tool-${index}`} defaultOpen={false}><ToolHeader type={tool.type} state={tool.state} /><ToolContent>{tool.input != null && <ToolInput input={tool.input} />}{(tool.state === "output-available" || tool.state === "output-error") && <ToolOutput output={tool.output} errorText={tool.errorText} />}</ToolContent></Tool>;
            }
            return null;
          })}
        </Message>)}
        {(chat.status === "submitted" || chat.status === "streaming") && <Message from="assistant" className="max-w-full"><div className="flex items-center gap-2 text-sm text-muted-foreground"><div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></div><Shimmer>Thinking…</Shimmer></div></Message>}
        {chat.status === "error" && <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{chat.error?.message ?? "Nexus AI could not complete this message."} Your message was saved; retry it when ready.</div>}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
    <div className="border-t bg-background px-4 py-4 md:px-8"><div className="mx-auto max-w-3xl">
      <PromptInput onSubmit={submit} className="rounded-lg bg-card shadow-sm" aria-label="Message Nexus AI">
        <PromptInputTextarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.currentTarget.value)} placeholder="Ask about stock, suppliers, or upcoming purchases…" autoFocus className="max-h-48 min-h-16 px-4" />
        <PromptInputFooter className="justify-end px-2 pb-2"><p className="mr-auto pl-2 text-xs text-muted-foreground">Workspace data only · Nexus AI won’t change records</p><PromptInputSubmit status={chat.status} disabled={!draft.trim() && chat.status !== "streaming" && chat.status !== "submitted"} onStop={() => chat.stop()} className="mr-1 mb-1" /></PromptInputFooter>
      </PromptInput>
    </div></div>
  </>;
}