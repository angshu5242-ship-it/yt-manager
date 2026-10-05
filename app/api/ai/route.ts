import { NextRequest } from "next/server";
import { streamAI, ModelId } from "@/lib/ai/router";
import { SKILLS } from "@/lib/ai/skills";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { prompt, model, skill, context } = await req.json();

  if (!prompt) {
    return new Response("Missing prompt", { status: 400 });
  }

  const modelId = (model || "gemini-1.5-flash") as ModelId;
  const systemPrompt = SKILLS[skill] || "You are a helpful YouTube channel management assistant.";
  const fullPrompt = context ? `Context:\n${context}\n\nRequest:\n${prompt}` : prompt;

  try {
    const stream = await streamAI(modelId, systemPrompt, fullPrompt);

    return new Response(
      new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(encoder.encode(value));
            }
          } finally {
            reader.releaseLock();
            controller.close();
          }
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
