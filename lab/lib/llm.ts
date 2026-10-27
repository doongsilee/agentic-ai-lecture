/**
 * lib/llm.ts — OpenAI 형식 메시지 · 도구의 모양, 그리고 stream 응답 읽기. LLM 호출(fetch) 자체는 실습 파일마다 직접 한다
 */
export type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
export type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string };
export type Tool = { type: "function"; function: { name: string; description?: string; parameters?: object } };

/**
 * stream: true 로 부른 응답(SSE)을 읽어 메시지 하나로 모은다. 글자(토큰)는 받는 대로 onToken 에 넘긴다
 *   const res = await fetch(`${BASE_URL}/chat/completions`, { ..., body: JSON.stringify({ model, messages, tools, stream: true }) });
 *   const message = await readStream(res, (token) => config.writer?.(token));
 * 돌려주는 모양은 chat() 과 같다: { role, content, tool_calls }
 */
export async function readStream(res: Response, onToken: (token: string) => void = () => {}): Promise<Msg> {
  if (!res.ok) throw new Error(`LLM 호출 실패 ${res.status}: ${await res.text()}`);
  let content = "",
    rest = "";
  const calls: ToolCall[] = [];
  for await (const bytes of res.body!.pipeThrough(new TextDecoderStream())) {
    const lines = (rest + bytes).split("\n");
    rest = lines.pop()!; // 덜 온 줄은 다음 덩어리와 합친다
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue; // 빈 줄 · 주석 줄 · 끝 표시
      const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta ?? {};
      // 글자(토큰): 이어 붙이고 받는 대로 넘긴다 (맨 앞에 붙는 빈 줄은 뺀다)
      const piece = content ? delta.content : delta.content?.trimStart();
      if (piece) {
        content += piece;
        onToken(piece);
      }
      // 도구 요청도 나눠서 온다. index 별로 id · name · arguments 를 이어 붙인다
      for (const t of delta.tool_calls ?? []) {
        const c = (calls[t.index] ??= { id: "", type: "function", function: { name: "", arguments: "" } });
        c.id += t.id ?? "";
        c.function.name += t.function?.name ?? "";
        c.function.arguments += t.function?.arguments ?? "";
      }
    }
  }
  return { role: "assistant", content: content.trim() || null, tool_calls: calls.length ? calls : undefined };
}
