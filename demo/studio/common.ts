/**
 * studio/common.ts — Studio 그래프들이 같이 쓰는 영어 튜터 부품 (모델 부르기 · 사전 도구 · tutor / tools 노드)
 *
 *   시연 노트북의 부품과 같다. 다만 Studio 에서는 question 한 줄만 넣으면 되게, 첫 호출이면 tutor 가 대화를 연다
 *   접속 정보: 노트북과 같이 lab/.env 를 읽는다 (OpenRouter · qwen/qwen3-32b). LangSmith 설정은 langgraph.json 의 env (demo/.env)
 */
import { config } from "dotenv";
import { Annotation, END } from "@langchain/langgraph";

config({ path: new URL("../../lab/.env", import.meta.url).pathname });
const BASE_URL = process.env.LLM_BASE_URL ?? "https://openrouter.ai/api/v1";
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "qwen/qwen3-32b";

export const request = (messages: object[], tools?: object[], stream = false) =>
  fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0, stream }),
  });

export async function chat(messages: object[], tools?: object[]) {
  const { role, content, tool_calls } = (await (await request(messages, tools)).json()).choices[0].message;
  return { role, content: content?.trim() ?? null, tool_calls };
}

// stream: true 로 불러 글자(토큰)를 받는 대로 onToken 에 넘긴다. 돌려주는 모양은 chat() 과 같다 (lab/lib/llm.ts 의 readStream 과 같은 코드)
export async function chatStream(messages: object[], tools: object[] | undefined, onToken: (token: string) => void) {
  const res = await request(messages, tools, true);
  let content = "",
    rest = "";
  const calls: any[] = [];
  for await (const bytes of res.body!.pipeThrough(new TextDecoderStream())) {
    const lines = (rest + bytes).split("\n");
    rest = lines.pop()!; // 덜 온 줄은 다음 덩어리와 합친다
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta ?? {};
      const piece = content ? delta.content : delta.content?.trimStart();
      if (piece) {
        content += piece;
        onToken(piece);
      }
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

const DICT: Record<string, { 뜻: string; 쉬운말: string }> = {
  ubiquitous: { 뜻: "어디에나 있는", 쉬운말: "everywhere" },
  mitigate: { 뜻: "완화하다, 줄이다", 쉬운말: "reduce" },
  meticulous: { 뜻: "꼼꼼한", 쉬운말: "careful" },
  detrimental: { 뜻: "해로운", 쉬운말: "harmful" },
};
export const tools = [{
  type: "function",
  function: {
    name: "lookup_word",
    description: "영어 단어 하나의 뜻과, 바꿔 쓸 쉬운 말을 사전에서 찾는다",
    parameters: { type: "object", properties: { word: { type: "string", description: "찾을 영어 단어 하나" } }, required: ["word"] },
  },
}];
export const lookupWord = (word: string) => {
  const w = word.toLowerCase().trim();
  return DICT[w] ? { word: w, ...DICT[w] } : { word: w, error: "사전에 없는 단어" };
};

// Studio 에서는 question 한 줄만 넣으면 되게: 첫 호출이면 대화를 연다
export const TutorState = Annotation.Root({
  question: Annotation<string>(),
  messages: Annotation<any[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
});
const SYSTEM = { role: "system", content: "너는 IELTS 쓰기를 돕는 영어 튜터다. 단어 뜻은 추측하지 말고 lookup_word 로 확인한다. 한국어로 짧게 답한다." };
export const opening = (state: typeof TutorState.State) =>
  state.messages.length ? [] : [SYSTEM, { role: "user", content: state.question }];

export async function tutor(state: typeof TutorState.State) {
  const first = opening(state);
  const reply = await chat([...state.messages, ...first], tools);
  return { messages: [...first, reply] };
}
export function toolsNode(state: typeof TutorState.State) {
  const calls = state.messages.at(-1).tool_calls;
  return { messages: calls.map((c: any) => ({ role: "tool", tool_call_id: c.id, content: JSON.stringify(lookupWord(JSON.parse(c.function.arguments).word)) })) };
}
export const route = (state: typeof TutorState.State) => (state.messages.at(-1).tool_calls?.length ? "tools" : END);
