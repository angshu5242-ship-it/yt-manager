import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type ModelId =
  | "gemini-1.5-flash"
  | "gemini-1.5-pro"
  | "claude-sonnet-4-5"
  | "claude-haiku-3-5"
  | "mistral-7b"
  | "llama-3-8b"
  | "qwen-2-7b";

export interface ModelConfig {
  id: ModelId;
  name: string;
  provider: "google" | "anthropic" | "openrouter";
  free: boolean;
  description: string;
}

export const MODELS: ModelConfig[] = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    free: true,
    description: "Fast & free. Best for most tasks.",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    free: true,
    description: "More capable, still free tier.",
  },
  {
    id: "claude-sonnet-4-5",
    name: "Claude claude-sonnet-4-5",
    provider: "anthropic",
    free: false,
    description: "Anthropic's best. Needs API key.",
  },
  {
    id: "claude-haiku-3-5",
    name: "Claude Haiku",
    provider: "anthropic",
    free: false,
    description: "Fast Claude. Cheapest Anthropic.",
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B",
    provider: "openrouter",
    free: true,
    description: "Free via OpenRouter.",
  },
  {
    id: "llama-3-8b",
    name: "Llama 3 8B",
    provider: "openrouter",
    free: true,
    description: "Meta's open model. Free via OpenRouter.",
  },
  {
    id: "qwen-2-7b",
    name: "Qwen 2 7B",
    provider: "openrouter",
    free: true,
    description: "Alibaba's model. Free via OpenRouter.",
  },
];

const OPENROUTER_MODEL_MAP: Record<string, string> = {
  "mistral-7b": "mistralai/mistral-7b-instruct:free",
  "llama-3-8b": "meta-llama/llama-3-8b-instruct:free",
  "qwen-2-7b": "qwen/qwen-2-7b-instruct:free",
};

export async function streamAI(
  model: ModelId,
  systemPrompt: string,
  userMessage: string
): Promise<ReadableStream<string>> {
  const config = MODELS.find((m) => m.id === model);
  if (!config) throw new Error(`Unknown model: ${model}`);

  if (config.provider === "google") {
    return streamGoogle(model, systemPrompt, userMessage);
  } else if (config.provider === "anthropic") {
    return streamAnthropic(model, systemPrompt, userMessage);
  } else {
    return streamOpenRouter(model, systemPrompt, userMessage);
  }
}

async function streamGoogle(
  model: ModelId,
  systemPrompt: string,
  userMessage: string
): Promise<ReadableStream<string>> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const geminiModel = genAI.getGenerativeModel({
    model: model === "gemini-1.5-flash" ? "gemini-1.5-flash" : "gemini-1.5-pro",
    systemInstruction: systemPrompt,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        const result = await geminiModel.generateContentStream(userMessage);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) controller.enqueue(text);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function streamAnthropic(
  model: ModelId,
  systemPrompt: string,
  userMessage: string
): Promise<ReadableStream<string>> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const anthropicModel =
    model === "claude-haiku-3-5" ? "claude-haiku-3-5-20241022" : "claude-sonnet-4-5-20241022";

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: anthropicModel,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(chunk.delta.text);
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

async function streamOpenRouter(
  model: ModelId,
  systemPrompt: string,
  userMessage: string
): Promise<ReadableStream<string>> {
  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY!,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
      "X-Title": "YT Manager",
    },
  });

  const orModel = OPENROUTER_MODEL_MAP[model] ?? "mistralai/mistral-7b-instruct:free";

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await openai.chat.completions.create({
          model: orModel,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        });
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) controller.enqueue(text);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
