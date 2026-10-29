/**
 * studio/pm1.ts — 오후 ① 시연 그래프를 LangGraph Studio 에서 보기 (강사 시연용)
 *
 *   cd demo/studio && pnpm studio   → Studio 서버(localhost:2024)를 켜고 브라우저로 Studio 를 연다 (LangSmith 로그인 필요)
 *   그래프 네 개: simple (L2) · chain (L4) · router (L5) · agent (L6). 코드는 graph-basics · tutor-agent 노트북과 같다
 *   입력: simple 은 { "text": "Dear Mr. Kim, ..." }, 나머지는 { "question": "ubiquitous 뜻을 사전에서 찾아 줘" }
 */
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { TutorState, tutor, toolsNode, route } from "./common.js";

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
