/**
 * 실습 15 정답 · 토큰 스트리밍 — 실습 15 를 끝낸 시점의 lab/pm/agent3.ts
 *   chat() 을 stream: true 로 부르고, 응답은 lib 의 readStream 으로 읽는다. agent 노드는 받은 토큰을 config.writer 로 흘려보낸다
 *   부르는 쪽은 streamMode: ["updates", "custom"]. updates 면 진행 상황, custom 이면 토큰을 줄바꿈 없이 찍는다
 */
import { readFileSync } from "node:fs";
import { Annotation, StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";
import { readStream } from "../../lib/llm.js";

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

const plans = JSON.parse(readFileSync(new URL("../../data/maintenance-plans.json", import.meta.url), "utf8"));
const stock = JSON.parse(readFileSync(new URL("../../data/parts-stock.json", import.meta.url), "utf8"));
const substitutes = JSON.parse(readFileSync(new URL("../../data/substitutes.json", import.meta.url), "utf8"));
function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan") return plans[args.tail_no] ? { tail_no: args.tail_no, ...plans[args.tail_no] } : { error: `'${args.tail_no}' 의 정비 계획이 없습니다` };
  if (name === "check_stock") return stock[args.part_no] ? { part_no: args.part_no, ...stock[args.part_no] } : { error: `'${args.part_no}' 는 재고 시스템에 없는 부품번호입니다 (재고 0 이 아니라 조회 실패)` };
  if (name === "find_substitute") return substitutes[args.part_no] ? { part_no: args.part_no, ...substitutes[args.part_no] } : { 결과: `'${args.part_no}' 의 대체품이 없습니다` };
  return { error: `모르는 도구: ${name}` };
}

// stream: true 로 부르면 답이 토큰 단위로 온다. 읽는 일은 lib 의 readStream 이 한다 (글자는 onToken 으로, 다 모이면 chat() 과 같은 모양)
async function chat(messages: object[], onToken?: (token: string) => void) {
  console.log(`[LLM]  보낸 messages ${messages.length}개`);
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2, stream: true }),
  });
  return readStream(res, onToken);
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
async function agentNode(state: typeof State.State, config: LangGraphRunnableConfig) {
  console.log("[NODE] ▶ agent");
  const reply = await chat(state.messages, (token) => config.writer?.(token)); // 받은 토큰을 그래프 밖으로 흘려보낸다
  return { messages: [reply], steps: 1, ...(reply.tool_calls?.length ? {} : { answer: reply.content }) }; // 최종 답이면 answer 도
}

// ── 노드 ② tools: 도구를 실행하고 결과를 role: "tool" 로 돌려준다 ──
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
  return "tools";
}

const graph = new StateGraph(State, { input: Input, output: Output })
  .addNode("ask", askNode)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "ask")
  .addEdge("ask", "agent")
  .addConditionalEdges("agent", route, ["tools", END])
  .addEdge("tools", "agent")
  .compile({ checkpointer: new MemorySaver() }); // 단계마다 State 를 저장한다

// ── 진행 상황: 노드가 끝날 때마다 그 노드 이름과 바꾼 필드를 찍는다 ──
function progress(chunk: Record<string, any>) {
  for (const [node, update] of Object.entries(chunk)) {
    const asked = update.messages?.at(-1)?.tool_calls?.map((c: any) => c.function.name);
    console.log(`[STREAM] ${node.padEnd(5)} → ${Object.keys(update).join(" · ")}${asked?.length ? `  (도구 요청 ${asked.join(", ")})` : ""}`);
  }
}

// ── 받은 값 찍기: updates 면 진행 상황, custom 이면 모델이 쓰는 토큰 (줄바꿈 없이 이어서) ──
let writing = false; // 지금 토큰이 흘러나오는 중인가
function print([mode, value]: [string, any]) {
  if (mode === "custom") {
    if (!writing) process.stdout.write("[토큰] ");
    writing = true;
    process.stdout.write(value);
    return;
  }
  if (writing) process.stdout.write("\n");
  writing = false;
  progress(value);
}

const thread1 = { configurable: { thread_id: "1" } };
for (const question of [input.messages[1].content, "부족한 부품은 언제 들어와?"]) {
  for await (const out of await graph.stream({ question }, { ...thread1, streamMode: ["updates", "custom"] as const })) print(out);
  const { answer, stock } = (await graph.getState(thread1)).values; // 다 돈 뒤의 State
  console.log("[답]  ", answer);
  console.log("[재고]", stock);
}
