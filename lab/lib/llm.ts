/**
 * lib/llm.ts — OpenAI 형식 메시지 · 도구의 모양 (타입만). LLM 호출 자체는 실습 파일마다 fetch 로 직접 한다
 */
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
export type Tool = { type: "function"; function: { name: string; description?: string; parameters?: object } };
