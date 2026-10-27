/**
 * lib/env.ts — .env 읽기 (2일차 저장소와 같은 이름)
 *
 *   LLM_BASE_URL · LLM_API_KEY · LLM_MODEL   어디로, 무슨 키로, 어떤 모델에게 보낼지
 *   LLM_MODE=mock                            키 없이 연습할 때. fetch 를 가짜 서버로 바꿔 끼운다 (실습 코드는 그대로)
 */
import "dotenv/config";
import { mockChat, mockStream } from "./mock.js";

export const BASE_URL = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";
export const API_KEY = process.env.LLM_API_KEY ?? "";
export const MODEL = process.env.LLM_MODEL ?? "qwen/qwen3-32b";
export const MOCK = (process.env.LLM_MODE ?? "mock") === "mock";
export const modelName = () => (MOCK ? "mock (키 없이 정해진 답)" : MODEL);

// mock: /chat/completions 로 가는 fetch 만 가짜 서버가 받아서, OpenAI 와 같은 모양으로 답한다
if (MOCK) {
  globalThis.fetch = async (_url, init) => {
    const { messages, tools, stream } = JSON.parse(String(init?.body));
    const message = mockChat(messages, tools);
    if (stream) return new Response(mockStream(message), { headers: { "Content-Type": "text/event-stream" } }); // stream: true 면 SSE 로
    const usage = { prompt_tokens: Math.round(String(init?.body).length / 3), completion_tokens: 0 }; // 대략
    return new Response(JSON.stringify({ choices: [{ message, finish_reason: message.tool_calls ? "tool_calls" : "stop" }], usage }));
  };
}
