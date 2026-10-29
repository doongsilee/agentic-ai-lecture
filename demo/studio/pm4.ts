/**
 * studio/pm4.ts — 오후 ④ 시연 그래프 (tutor-interrupt · tutor-subgraph 노트북)
 *
 *   tutor-time-travel 노트북의 되돌리기 · fork 는 Studio 화면의 기록(checkpoint)에서 한다 → pm1 의 agent 로 본다
 */
import { Annotation, StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { TutorState, tutor, route, lookupWord } from "./common.js";

// ── L4 · 노드가 스스로 멈춘다: 사전에 없는 단어면 interrupt() 로 사람에게 묻는다 ──
// 입력 { "question": "serendipity 뜻을 사전에서 찾아 줘" } → 멈추면 Studio 에서 뜻을 넣어 이어 간다(Resume)
function toolsNode(state: typeof TutorState.State) {
  const calls = state.messages.at(-1).tool_calls;
  return { messages: calls.map((c: any) => {
    const word = JSON.parse(c.function.arguments).word.toLowerCase().trim();
    let result: any = lookupWord(word);
    if (result.error) {
      const meaning = interrupt({ question: "사전에 없는 단어입니다. 뜻을 알려 주세요", word });
      result = { word, meaning, source: "사람" };
    }
    return { role: "tool", tool_call_id: c.id, content: JSON.stringify(result) };
  }) };
}
export const interruptAgent = new StateGraph(TutorState)
  .addNode("tutor", tutor)
  .addNode("tools", toolsNode)
  .addEdge(START, "tutor")
  .addConditionalEdges("tutor", route, ["tools", END])
  .addEdge("tools", "tutor")
  .compile();

// ── 모듈 4 · L2 · subgraph: compile 한 그래프를 노드로 꽂는다 ──  입력 { "question": "ubiquitous 뜻이 뭐야?" }
const DICT: Record<string, string> = { ubiquitous: "어디에나 있는", meticulous: "꼼꼼한" };

// 자식 그래프: word → meaning. tries 는 자식 안에서만 쓴다
export const dictionary = new StateGraph(Annotation.Root({
  word: Annotation<string>(),
  meaning: Annotation<string>(),
  tries: Annotation<number>(),
}))
  .addNode("look", (s) => ({ tries: 1, meaning: DICT[s.word] ?? "사전에 없음" }))
  .addNode("check", (s) => ({ tries: s.tries + 1 }))
  .addEdge(START, "look")
  .addEdge("look", "check")
  .addEdge("check", END)
  .compile();

// 부모 그래프: question → word → (자식) → answer. Studio 에서 dictionary 노드를 열면 안의 look · check 가 보인다
export const subgraph = new StateGraph(Annotation.Root({
  question: Annotation<string>(),
  word: Annotation<string>(),
  meaning: Annotation<string>(),
  answer: Annotation<string>(),
}))
  .addNode("pick", (s) => ({ word: s.question.split(" ")[0] }))
  .addNode("dictionary", dictionary) // compile 한 그래프를 노드로 그대로
  .addNode("write", (s) => ({ answer: `${s.word} 는 "${s.meaning}" 이라는 뜻입니다` }))
  .addEdge(START, "pick")
  .addEdge("pick", "dictionary")
  .addEdge("dictionary", "write")
  .addEdge("write", END)
  .compile();
