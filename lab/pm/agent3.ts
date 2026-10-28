/**
 * 1일차 오후 ③ 실습 · 시작 파일 — 정비 부품 Agent (오후 ② 의 facts · stock · 기억 · 입구와 출구까지)
 *
 * 오후 ③ 은 모두 이 파일에서 시작한다. "// 실습 14" ~ "// 실습 17" 자리에 코드를 넣는다
 *   돌리기   pnpm pm3          (실습 16 부터 readline 으로 물으니 터미널에서 직접 돌린다)
 *   문제     강의 장표
 *   막히면   GitHub 의 answers 브랜치 → lab/pm/answers/14.ts ~ 17.ts
 *   따라잡기 pnpm step <실습 번호>   (그 실습을 풀 차례로. 앞 실습의 정답이 이 파일에 들어간다)
 */
import { readFileSync } from "node:fs";
import readline from "node:readline/promises"; // 실습 16 에서 쓴다 (사람에게 묻기)
import { Annotation, StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph"; // 실습 15 에서 쓴다 (노드가 받는 config)
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js";
import { readStream } from "../lib/llm.js"; // 실습 15 에서 쓴다 (stream 응답 읽기)

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
  // 실습 16: request_part 청구 도구를 더한다 (lab/README.md 의 코드)
];

const plans = JSON.parse(readFileSync(new URL("../data/maintenance-plans.json", import.meta.url), "utf8"));
const stock = JSON.parse(readFileSync(new URL("../data/parts-stock.json", import.meta.url), "utf8"));
const substitutes = JSON.parse(readFileSync(new URL("../data/substitutes.json", import.meta.url), "utf8"));
// 실습 16: 청구번호를 매기는 수 (let requests = 0)
function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan") return plans[args.tail_no] ? { tail_no: args.tail_no, ...plans[args.tail_no] } : { error: `'${args.tail_no}' 의 정비 계획이 없습니다` };
  if (name === "check_stock") return stock[args.part_no] ? { part_no: args.part_no, ...stock[args.part_no] } : { error: `'${args.part_no}' 는 재고 시스템에 없는 부품번호입니다 (재고 0 이 아니라 조회 실패)` };
  // 실습 16: request_part 한 줄
  if (name === "find_substitute") return substitutes[args.part_no] ? { part_no: args.part_no, ...substitutes[args.part_no] } : { 결과: `'${args.part_no}' 의 대체품이 없습니다` };
  return { error: `모르는 도구: ${name}` };
}

// 실습 15: onToken 을 받고, body 에 stream: true, 응답은 readStream(res, onToken) 으로 읽는다
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
    // 실습 16: system 메시지에 "정비일까지 모자라는 부품은 request_part 로 청구한다." 를 넣는다
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
  facts: Annotation<string[]>({ reducer: (prev, next) => [...prev, ...next], default: () => [] }), // 도구로 확인한 사실 — 이어 붙인다
  stock: Annotation<Record<string, number>>({ reducer: (prev, next) => ({ ...prev, ...next }), default: () => ({}) }), // 부품별 재고표 — 부품번호마다 합친다
  question: Annotation<string>(), // 입구: 이번 질문
  answer: Annotation<string>(),   // 출구: 이번 답
});

// ── 입구와 출구: 밖에서는 질문을 넣고, 답과 재고표만 받는다. messages · facts · steps 는 그래프 안에서만 ──
const Input = Annotation.Root({ question: Annotation<string>() });
const Output = Annotation.Root({ answer: Annotation<string>(), stock: Annotation<Record<string, number>>() });

// ── 노드 ⓪ ask: 질문을 대화에 넣는다. 대화가 처음이면 system 메시지부터 ──
function askNode(state: typeof State.State) {
  console.log("[NODE] ▶ ask");
  return { messages: [...(state.messages.length ? [] : [input.messages[0]]), { role: "user", content: state.question }] };
}

// ── 노드 ① agent: 모델을 부른다 ──
async function agentNode(state: typeof State.State) { // 실습 15: config 도 받아서, 받은 토큰을 config.writer 로 흘려보낸다
  console.log("[NODE] ▶ agent");
  const reply = await chat(state.messages);
  return { messages: [reply], steps: 1, ...(reply.tool_calls?.length ? {} : { answer: reply.content }) }; // 최종 답이면 answer 도
}

// ── 노드 ② tools: 도구를 실행하고 결과를 role: "tool" 로 돌려준다 ──
// 실습 16: 본문을 runCalls 로 빼고, 청구 요청만 받는 orderNode 를 하나 더 만든다
function toolsNode(state: typeof State.State) {
  console.log("[NODE] ▶ tools");
  const calls = state.messages.at(-1).tool_calls;
  const results = calls.map((call: any) => {
    const result = runTool(call.function.name, JSON.parse(call.function.arguments));
    console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
    return { call, result };
  });
  return {
    messages: results.map(({ call, result }: any) => ({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) })),
    facts: results.map(({ call, result }: any) => `${call.function.name} ${call.function.arguments} → ${JSON.stringify(result)}`),
    stock: Object.fromEntries(results.filter(({ result }: any) => "재고" in result).map(({ result }: any) => [result.part_no, result.재고])),
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
  return "tools"; // 실습 16: 청구 요청(request_part)이면 "order"
}

const graph = new StateGraph(State, { input: Input, output: Output })
  .addNode("ask", askNode)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "ask")
  .addEdge("ask", "agent")
  .addConditionalEdges("agent", route, ["tools", END]) // 실습 16: order 노드를 더하고, 갈 곳에 "order", order 다음은 agent
  .addEdge("tools", "agent")
  .compile({ checkpointer: new MemorySaver() }); // 단계마다 State 를 저장한다. 실습 16: interruptBefore 로 order 앞에서 멈춘다

const thread1 = { configurable: { thread_id: "1" } };
// 실습 14: invoke 를 stream (streamMode "updates") 으로 바꾸고, 받을 때마다 [STREAM] 노드 → 바꾼 필드를 찍는다. 답 · 재고표는 getState(thread1).values 에서
// 실습 15: streamMode ["updates", "custom"] — custom 이면 토큰을 줄바꿈 없이 찍는다
// 실습 16: 첫 질문 하나만 묻고, getState(thread1).next 에 order 가 있으면 청구 내용을 찍고 readline 으로 y / n 을 묻는다. y 면 stream(null, …) 로 이어 간다
// 실습 17: y 가 아니면 담당자 의견을 도구 결과로 updateState(thread1, { messages }, "order") 로 넣고 이어 간다
for (const question of [input.messages[1].content, "부족한 부품은 언제 들어와?"]) {
  const out = await graph.invoke({ question }, thread1);
  console.log("[OUT] ", Object.keys(out));
  console.log("[답]  ", out.answer);
  console.log("[재고]", out.stock);
}
