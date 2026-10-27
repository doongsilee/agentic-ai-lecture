/**
 * 1일차 오후 ② 실습 · 시작 파일 — 정비 부품 Agent (오후 ① 의 그래프 · steps 멈춤까지)
 *
 * 오후 ② 는 모두 이 파일에서 시작한다. "// 실습 10" ~ "// 실습 13" 자리에 코드를 넣는다
 *   돌리기   pnpm pm2
 *   문제     강의 장표 · lab/README.md
 *   막히면   GitHub 의 answers 브랜치 → lab/pm/answers/10.ts ~ 13.ts
 */
import { readFileSync } from "node:fs";
import { Annotation, StateGraph, START, END, MemorySaver } from "@langchain/langgraph"; // MemorySaver 는 실습 12 에서 쓴다
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js";

const MAX_STEPS = Number(process.env.MAX_STEPS ?? 8);

// ── 오전에 만든 것 그대로: 도구 세 개 · runTool · chat() ──
const tools = [
  {
    type: "function",
    function: {
      name: "get_maintenance_plan",
      description: "기체번호로 정기 정비 계획을 조회한다. 정비일과 필요한 부품번호 · 수량이 나온다.",
      parameters: { type: "object", properties: { tail_no: { type: "string", description: "기체번호. 예: TR-1023" } }, required: ["tail_no"] },
    },
  },
  {
    type: "function",
    function: {
      name: "check_stock",
      description: "부품번호로 지금 창고 재고 수량과 입고 예정일을 조회한다. 정비에 필요한 부품이 충분한지 확인할 때 쓴다. 부품마다 한 번씩 부른다.",
      parameters: { type: "object", properties: { part_no: { type: "string", description: "부품번호. 예: PN-4471" } }, required: ["part_no"] },
    },
  },
  {
    type: "function",
    function: {
      name: "find_substitute",
      description: "재고 조회에 실패한 부품번호의 대체품(바뀐 부품번호)을 찾는다. 대체품이 있으면 그 번호로 다시 재고를 확인한다.",
      parameters: { type: "object", properties: { part_no: { type: "string", description: "조회에 실패한 부품번호. 예: PN-7730" } }, required: ["part_no"] },
    },
  },
];

const plans = JSON.parse(readFileSync(new URL("../data/maintenance-plans.json", import.meta.url), "utf8"));
const stock = JSON.parse(readFileSync(new URL("../data/parts-stock.json", import.meta.url), "utf8"));
const substitutes = JSON.parse(readFileSync(new URL("../data/substitutes.json", import.meta.url), "utf8"));
function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan") return plans[args.tail_no] ? { tail_no: args.tail_no, ...plans[args.tail_no] } : { error: `'${args.tail_no}' 의 정비 계획이 없습니다` };
  if (name === "check_stock") return stock[args.part_no] ? { part_no: args.part_no, ...stock[args.part_no] } : { error: `'${args.part_no}' 는 재고 시스템에 없는 부품번호입니다 (재고 0 이 아니라 조회 실패)` };
  if (name === "find_substitute") return substitutes[args.part_no] ? { part_no: args.part_no, ...substitutes[args.part_no] } : { 결과: `'${args.part_no}' 의 대체품이 없습니다` };
  return { error: `모르는 도구: ${name}` };
}

async function chat(messages: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2 }),
  });
  const data = await res.json();
  console.log(`[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`);
  const { role, content, tool_calls } = data.choices[0].message;
  return { role, content, tool_calls };
}

const input = {
  messages: [
    { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 오늘은 2026-10-29 이다. 기체번호를 받으면 정비 계획을 보고, 필요한 부품마다 재고를 확인하라. 도구로 확인한 사실만 짧게 답하고, 부족한 부품은 정비일까지 확보되는지 말하라." },
    { role: "user", content: "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?" },
  ],
};

// 결과 찍기: 마지막 메시지가 답이면 [답], 아니면 무엇으로 끝났는지
function show(out: { messages: any[] }) {
  const last = out.messages.at(-1);
  if (last.role === "assistant" && !last.tool_calls?.length) console.log("[답]  ", last.content);
  else console.log(`[끝]   마지막 메시지: ${last.role}${last.tool_calls?.length ? " (도구 요청)" : ""} · messages ${out.messages.length}개`);
}

// ── State: 대화 전체. 노드가 돌려준 메시지는 뒤에 이어 붙는다 ──
const State = Annotation.Root({
  messages: Annotation<any[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }),
  steps: Annotation<number>({ reducer: (prev, next) => prev + next, default: () => 0 }), // 모델을 부른 횟수 — 더한다
  // 실습 10: facts 필드 (도구로 확인한 사실) · 실습 11: stock 필드 (부품별 재고표) · 실습 13: question · answer 필드
});

// 실습 13: 입구 Input · 출구 Output, 그리고 질문을 대화에 넣는 ask 노드를 여기에 만든다

// ── 노드 ① agent: 모델을 부른다 ──
async function agentNode(state: typeof State.State) {
  console.log("[NODE] ▶ agent");
  return { messages: [await chat(state.messages)], steps: 1 }; // 실습 13: 최종 답(도구 요청이 아니면)이면 answer 도 돌려준다
}

// ── 노드 ② tools: 도구를 실행하고 결과를 role: "tool" 로 돌려준다 ──
function toolsNode(state: typeof State.State) {
  console.log("[NODE] ▶ tools");
  const calls = state.messages.at(-1).tool_calls;
  return {
    messages: calls.map((call: any) => {
      const result = runTool(call.function.name, JSON.parse(call.function.arguments));
      console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
      return { role: "tool", tool_call_id: call.id, content: JSON.stringify(result) };
    }),
    // 실습 10: 도구 결과마다 한 줄씩 facts 로도 · 실습 11: 재고가 나온 결과는 { [part_no]: 재고 } 로 stock 에도
  };
}

// ── 갈림길: 도구 요청이면 tools, 아니면 끝 ──
function route(state: typeof State.State) {
  const last = state.messages.at(-1);
  if (!last.tool_calls?.length) return END;
  if (state.steps >= MAX_STEPS) {                                  // 내 코드가 "그만"
    console.log(`[STOP] 모델을 ${state.steps}번 불렀다. route 가 END 로 보낸다`);
    return END;
  }
  return "tools";
}

const graph = new StateGraph(State) // 실습 13: { input: Input, output: Output } 를 넘기고, START → ask → agent 로
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", route, ["tools", END])
  .addEdge("tools", "agent")
  .compile(); // 실습 12: checkpointer 를 단다

show(await graph.invoke(input));
// 실습 10 · 11: invoke 결과에서 facts · stock 도 찍는다
// 실습 12: thread_id 를 주고 invoke, 같은 thread 로 "부족한 부품은 언제 들어와?" 를 이어서 묻는다. thread_id "2" 로도 물어 본다
// 실습 13: invoke({ question }, thread1) 로 바꿔 두 번 묻고, 나온 필드 이름(Object.keys)과 답 · 재고표를 찍는다
