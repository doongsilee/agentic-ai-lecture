/**
 * studio/pm3.ts — 오후 ③ 시연 그래프 (tutor-stream · tutor-breakpoints · tutor-edit-state 노트북)
 *
 *   입력은 모두 { "question": "ubiquitous 뜻을 사전에서 찾아 줘" }
 *   checkpointer 는 달지 않는다. Studio(LangGraph API)가 자기 저장소를 붙여 준다
 *   Studio 에서는 compile 에 적지 않아도 노드마다 "여기서 멈추기"(interrupt before / after)를 화면에서 걸 수 있다
 */
import { StateGraph, START, END, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { TutorState, tutor, toolsNode, route, chatStream, opening, tools } from "./common.js";

// ── L1 · 토큰 streaming: tutor 가 받은 글자를 config.writer 로 흘려보낸다 → streamMode "custom" ──
async function tutorStream(state: typeof TutorState.State, config: LangGraphRunnableConfig) {
  const first = opening(state);
  const reply = await chatStream([...state.messages, ...first], tools, (token) => config.writer?.(token));
  return { messages: [...first, reply] };
}
export const stream = new StateGraph(TutorState)
  .addNode("tutor", tutorStream)
  .addNode("tools", toolsNode)
  .addEdge(START, "tutor")
  .addConditionalEdges("tutor", route, ["tools", END])
  .addEdge("tools", "tutor")
  .compile();

// ── L2 · breakpoint: tools 앞에서 멈춘다. 계속(Continue)을 누르면 사전을 찾는다 ──
export const approve = new StateGraph(TutorState)
  .addNode("tutor", tutor)
  .addNode("tools", toolsNode)
  .addEdge(START, "tutor")
  .addConditionalEdges("tutor", route, ["tools", END])
  .addEdge("tools", "tutor")
  .compile({ interruptBefore: ["tools"] });

// ── L3 · 멈춘 동안 State 고치기: tutor 앞에서 멈춘다. 첫 멈춤에서 question 을 고치면 고친 질문으로 시작한다 ──
export const edit = new StateGraph(TutorState)
  .addNode("tutor", tutor)
  .addNode("tools", toolsNode)
  .addEdge(START, "tutor")
  .addConditionalEdges("tutor", route, ["tools", END])
  .addEdge("tools", "tutor")
  .compile({ interruptBefore: ["tutor"] });

// 사람 의견을 넣는 자리: 아무 일도 하지 않는 human_feedback 노드를 두고, 그 앞에서 멈춘다
export const feedback = new StateGraph(TutorState)
  .addNode("human_feedback", () => ({})) // 하는 일 없음. 사람이 이 노드인 셈 치고 State 를 고친다
  .addNode("tutor", tutor)
  .addNode("tools", toolsNode)
  .addEdge(START, "human_feedback")
  .addEdge("human_feedback", "tutor")
  .addConditionalEdges("tutor", route, ["tools", END])
  .addEdge("tools", "human_feedback")
  .compile({ interruptBefore: ["human_feedback"] });
