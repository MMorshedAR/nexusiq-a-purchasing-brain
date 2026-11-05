import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.ts";

export function createResponsesCall(request: Request, config: { baseURL: string; apiKey: string; model: string }, messages: ModelMessage[], instructions: string) {
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: `${config.baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`,
    apiKey: config.apiKey,
    headers: { "Lovable-API-Key": config.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(config.model),
    instructions,
    messages,
    abortSignal: request.signal,
    providerOptions: { openai: {
      forceReasoning: true,
      reasoningEffort: "low",
      reasoningSummary: "auto",
      store: false,
      include: ["reasoning.encrypted_content"],
    } },
  });
  return { result, response: (originalMessages: import("ai").UIMessage[], onFinish: Parameters<typeof result.toUIMessageStreamResponse>[0] extends infer T ? T extends { onFinish?: infer F } ? F : never : never) =>
    withLovableAiGatewayRunIdHeader(result.toUIMessageStreamResponse({ originalMessages, sendReasoning: true, onFinish }), runIdFetch) };
}