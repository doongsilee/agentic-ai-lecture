/**
 * studio/pm2.ts — 오후 ② 시연 그래프 (state-reducers · long-chat 노트북)
 *
 *   모델을 부르지 않는 그래프는 노트북과 같다. 입력 칸은 Studio 가 State 를 보고 만들어 준다
 *   tutor-memory 노트북의 기억은 Studio 의 thread 가 대신한다 (같은 thread 에서 이어 묻기) → pm1 의 agent 로 본다
 *   zod schema 그래프(emailZod)는 뺐다. 그래프 모양은 pm2-email 과 같다
 */
import { Annotation, MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { RemoveMessage } from "@langchain/core/messages";
import { chat, request } from "./common.js";

// ── L1 · schema: State 에 어떤 필드가 있고, 필드마다 무엇이 들어가는지 ──  입력 { "text": "Dear Mr. Kim, ..." }
const EmailState = Annotation.Root({
  text: Annotation<string>(),
  kind: Annotation<"email" | "ielts">(),
  feedback: Annotation<string>(),
});
export const email = new StateGraph(EmailState)
  .addNode("classify", () => ({ kind: "email" as const }))
  .addNode("analyze_email", () => ({ feedback: "맺음말이 빠졌다" }))
  .addEdge(START, "classify").addEdge("classify", "analyze_email").addEdge("analyze_email", END)
  .compile();

// ── L2 · reducer 를 안 적으면 덮어쓴다 ──  입력 { "revision": 1 }
const Draft = Annotation.Root({ revision: Annotation<number>() });
export const revise = new StateGraph(Draft)
  .addNode("revise", (s) => ({ revision: s.revision + 1 }))
  .addEdge(START, "revise").addEdge("revise", END)
  .compile();

// 같은 단계에서 두 노드가 같은 필드에 쓰면? reducer 가 없으면 에러, 있으면 둘 다 남는다  입력 {}
const twoAnalyzers = (S: any) => new StateGraph(S)
  .addNode("grammar", () => ({ notes: ["문법: 3인칭 단수 -s 가 빠졌다"] }))
  .addNode("vocab", () => ({ notes: ["어휘: ubiquitous 는 너무 어렵다"] }))
  .addEdge(START, "grammar").addEdge(START, "vocab")
  .addEdge("grammar", END).addEdge("vocab", END)
  .compile();
export const twoAnalyzersError = twoAnalyzers(Annotation.Root({ notes: Annotation<string[]>() }));
export const twoAnalyzersReducer = twoAnalyzers(Annotation.Root({
  notes: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
}));

// 직접 만든 reducer: 단어장. 두 분석기가 같은 단어를 넣어도 한 번만 남긴다  입력 {}
const Words = Annotation.Root({
  words: Annotation<string[]>({ reducer: (prev, next) => [...new Set([...prev, ...next])], default: () => [] }),
});
export const wordbook = new StateGraph(Words)
  .addNode("grammar", () => ({ words: ["ubiquitous", "mitigate"] }))
  .addNode("vocab", () => ({ words: ["mitigate", "meticulous"] }))
  .addEdge(START, "grammar").addEdge(START, "vocab")
  .addEdge("grammar", END).addEdge("vocab", END)
  .compile();

// messages 전용 reducer: MessagesAnnotation. Studio 의 Chat 화면으로도 넣을 수 있다
export const messages = new StateGraph(MessagesAnnotation)
  .addNode("tutor", () => ({ messages: [{ role: "assistant", content: "어디에나 있는" }] }))
  .addEdge(START, "tutor").addEdge("tutor", END)
  .compile();

// ── L3 · private state: write 노드는 Private 의 필드(notes)만 받는다 ──  입력 { "text": "He go to school every day." }
// 주의: Studio 는 thread 에 남은 State 를 전부 보여 주므로, 노트북의 invoke 결과와 달리 notes 도 보인다 (아래 inputOutput 도 같다)
const Essay = Annotation.Root({ text: Annotation<string>(), feedback: Annotation<string>() });
const Private = Annotation.Root({ notes: Annotation<string[]>() });
export const privateState = new StateGraph(Essay)
  .addNode("analyze", () => ({ notes: ["3인칭 단수 -s"] }))
  .addNode("write", (s) => ({ feedback: `고칠 곳: ${s.notes.join(", ")}` }), { input: Private })
  .addEdge(START, "analyze").addEdge("analyze", "write").addEdge("write", END)
  .compile();

// 입구와 출구: Studio 의 입력 칸도 text 하나만 나온다. 출구(feedback 만)는 노트북의 invoke 로 보인다  입력 { "text": "Smartphone are ubiquitous." }
const Overall = Annotation.Root({
  text: Annotation<string>(),
  notes: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
  feedback: Annotation<string>(),
});
export const inputOutput = new StateGraph(Overall, {
  input: Annotation.Root({ text: Annotation<string>() }),
  output: Annotation.Root({ feedback: Annotation<string>() }),
})
  .addNode("grammar", () => ({ notes: ["3인칭 단수 -s"] }))
  .addNode("vocab", () => ({ notes: ["ubiquitous → everywhere"] }))
  .addNode("write", (s) => ({ feedback: `고칠 곳 ${s.notes.length}개: ${s.notes.join(", ")}` }))
  .addEdge(START, "grammar").addEdge(START, "vocab")
  .addEdge(["grammar", "vocab"], "write")
  .addEdge("write", END)
  .compile();

// 함정: State 에 없는 필드는 에러 없이 버려진다  입력 { "feedback": "처음 값" }
export const typo = new StateGraph(Annotation.Root({ feedback: Annotation<string>() }))
  .addNode("write", () => ({ feedbak: "오타 난 필드 이름" } as any))
  .addEdge(START, "write").addEdge("write", END)
  .compile();

// ── L4 · 긴 대화: 전부 보내기 vs 골라서 보내기 ──
// 같은 thread 에서 여러 번 물으면 messages 가 쌓인다. sent 필드에 보낸 개수와 입력 토큰 수를 남긴다
// 입력 { "messages": [{ "role": "user", "content": "내 이름은 지민이야. IELTS 7.0 이 목표야" }] }
const TUTOR = { role: "system", content: "너는 IELTS 쓰기를 돕는 영어 튜터다. 한국어로 두세 문장으로 짧게 답한다." };
const ChatLog = Annotation.Root({
  messages: Annotation<any[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
  sent: Annotation<string>(),
});
// 입력 토큰 수도 같이 돌려준다 (long-chat 노트북의 callModel 과 같다)
async function callWithTokens(messages: object[]) {
  const data = await (await request(messages)).json();
  return { reply: { role: "assistant", content: data.choices[0].message.content?.trim() ?? "" }, tokens: data.usage?.prompt_tokens };
}
const sendNode = (pick: (ms: any[]) => any[]) => async (s: typeof ChatLog.State) => {
  const picked = [TUTOR, ...pick(s.messages)];
  const { reply, tokens } = await callWithTokens(picked);
  return { messages: [reply], sent: `보낸 messages ${picked.length}개 · 입력 토큰 ${tokens} (State 에는 ${s.messages.length}개)` };
};
export const sendAll = new StateGraph(ChatLog)
  .addNode("tutor", sendNode((ms) => ms))
  .addEdge(START, "tutor").addEdge("tutor", END)
  .compile();
export const sendRecent = new StateGraph(ChatLog)
  .addNode("tutor", sendNode((ms) => ms.slice(-1))) // system + 최근 1개
  .addEdge(START, "tutor").addEdge("tutor", END)
  .compile();

// 요약하며 대화하기: messages 가 6개를 넘으면 요약을 쓰고 최근 2개만 남긴다. Studio 의 Chat 화면으로 이어 말하면 된다
const ChatState = Annotation.Root({ ...MessagesAnnotation.spec, summary: Annotation<string>() });
const ROLE: Record<string, string> = { human: "user", ai: "assistant", system: "system" };
const toApi = (m: any) => ({ role: ROLE[m.getType()], content: m.content });
const chatText = async (ms: object[]) => (await chat(ms)).content ?? "";

export const summary = new StateGraph(ChatState)
  .addNode("tutor", async (state) => {
    const system = state.summary ? `${TUTOR.content}\n\n지금까지 대화 요약: ${state.summary}` : TUTOR.content;
    return { messages: [{ role: "assistant", content: await chatText([{ role: "system", content: system }, ...state.messages.map(toApi)]) }] };
  })
  .addNode("summarize", async (state) => {
    const ask = state.summary ? `지금까지의 요약: ${state.summary}\n\n위 대화의 새 내용을 더해서 요약을 고쳐 써라.` : "위 대화를 요약하라.";
    const summary = await chatText([...state.messages.map(toApi), { role: "user", content: `${ask} 학생 이름, 시험, 목표, 물어본 것을 빠뜨리지 말고 한국어 세 문장 이내로.` }]);
    return { summary, messages: state.messages.slice(0, -2).map((m) => new RemoveMessage({ id: m.id! })) };
  })
  .addEdge(START, "tutor")
  .addConditionalEdges("tutor", (state) => (state.messages.length > 6 ? "summarize" : END), ["summarize", END])
  .addEdge("summarize", END)
  .compile();
