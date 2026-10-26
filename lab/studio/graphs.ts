/**
 * studio/graphs.ts — 오후 ① 시연 그래프를 LangGraph Studio 에서 보기 (강사 시연용)
 *
 *   pnpm studio   → Studio 서버(localhost:2024)를 켜고 브라우저로 Studio 를 연다 (LangSmith 로그인 필요)
 *   그래프 네 개: simple (L2) · chain (L4) · router (L5) · agent (L6). 코드는 demo/ 노트북과 같다
 *   입력: simple 은 { "text": "Dear Mr. Kim, ..." }, 나머지는 { "question": "ubiquitous 뜻을 사전에서 찾아 줘" }
 */
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js";

// ── L2 · 가장 간단한 그래프: 규칙으로 고르는 조건부 엣지 ──
const SimpleState = Annotation.Root({
  text: Annotation<string>(),
  log: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
});
const decide = (state: typeof SimpleState.State) =>
  /^(dear|hi|hello)\b/i.test(state.text.trim()) ? "analyze_email" : "analyze_ielts";

export const simple = new StateGraph(SimpleState)
  .addNode("classify", () => ({ log: ["classify"] }))
  .addNode("analyze_email", () => ({ log: ["analyze_email"] }))
  .addNode("analyze_ielts", () => ({ log: ["analyze_ielts"] }))
  .addEdge(START, "classify")
  .addConditionalEdges("classify", decide, ["analyze_email", "analyze_ielts"])
  .addEdge("analyze_email", END)
  .addEdge("analyze_ielts", END)
  .compile();

// ── L4 ~ L6 · 영어 튜터: 모델 호출 · 도구 하나 ──
async function chat(messages: object[], tools?: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0 }),
  });
  const { role, content, tool_calls } = (await res.json()).choices[0].message;
  return { role, content: content?.trim() ?? null, tool_calls };
}

const DICT: Record<string, { 뜻: string; 쉬운말: string }> = {
  ubiquitous: { 뜻: "어디에나 있는", 쉬운말: "everywhere" },
  mitigate: { 뜻: "완화하다, 줄이다", 쉬운말: "reduce" },
  meticulous: { 뜻: "꼼꼼한", 쉬운말: "careful" },
  detrimental: { 뜻: "해로운", 쉬운말: "harmful" },
};
const tools = [{
  type: "function",
  function: {
    name: "lookup_word",
    description: "영어 단어 하나의 뜻과, 바꿔 쓸 쉬운 말을 사전에서 찾는다",
    parameters: { type: "object", properties: { word: { type: "string", description: "찾을 영어 단어 하나" } }, required: ["word"] },
  },
}];
const lookupWord = (word: string) => {
  const w = word.toLowerCase().trim();
  return DICT[w] ? { word: w, ...DICT[w] } : { word: w, error: "사전에 없는 단어" };
};

// Studio 에서는 question 한 줄만 넣으면 되게: 첫 호출이면 대화를 연다
const TutorState = Annotation.Root({
  question: Annotation<string>(),
  messages: Annotation<any[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
});
const SYSTEM = { role: "system", content: "너는 IELTS 쓰기를 돕는 영어 튜터다. 단어 뜻은 추측하지 말고 lookup_word 로 확인한다. 한국어로 짧게 답한다." };

async function tutor(state: typeof TutorState.State) {
  const opening = state.messages.length ? [] : [SYSTEM, { role: "user", content: state.question }];
  const reply = await chat([...state.messages, ...opening], tools);
  return { messages: [...opening, reply] };
}
function toolsNode(state: typeof TutorState.State) {
  const calls = state.messages.at(-1).tool_calls;
  return { messages: calls.map((c: any) => ({ role: "tool", tool_call_id: c.id, content: JSON.stringify(lookupWord(JSON.parse(c.function.arguments).word)) })) };
}
const route = (state: typeof TutorState.State) => (state.messages.at(-1).tool_calls?.length ? "tools" : END);

export const chain = new StateGraph(TutorState)
  .addNode("tutor", tutor)
  .addEdge(START, "tutor")
  .addEdge("tutor", END)
  .compile();

export const router = new StateGraph(TutorState)
  .addNode("tutor", tutor)
  .addNode("tools", toolsNode)
  .addEdge(START, "tutor")
  .addConditionalEdges("tutor", route, ["tools", END])
  .addEdge("tools", END)
  .compile();

export const agent = new StateGraph(TutorState)
  .addNode("tutor", tutor)
  .addNode("tools", toolsNode)
  .addEdge(START, "tutor")
  .addConditionalEdges("tutor", route, ["tools", END])
  .addEdge("tools", "tutor") // ← router 와 다른 곳은 여기 하나
  .compile();
