/**
 * 실습 8 정답 · Chain — 실습 8 을 끝낸 시점의 lab/pm/agent.ts
 *   agent 노드 하나가 모델을 부른다. START → agent → END
 *   돌려 보면 도구 요청만 남기고 끝난다 — 실행할 노드가 없다
 */
import { readFileSync } from "node:fs";
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";

const MAX_STEPS = 8; // 모델을 부르는 상한. 1 로 바꿔 돌리면 [STOP] 으로 끝나는 걸 볼 수 있다

// ── 오전에 만든 것 + 대체품 도구 find_substitute: 도구 세 개 · runTool · chat() ──
const tools = [
  {
    type: "function",
    function: {
      name: "get_maintenance_plan",
      description:
        "기체번호로 정기 정비 계획을 조회한다. 정비일과 필요한 부품번호 · 수량이 나온다.",
      parameters: {
        type: "object",
        properties: {
          tail_no: { type: "string", description: "기체번호. 예: TR-1023" },
        },
        required: ["tail_no"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_stock",
      description:
        "부품번호로 지금 창고 재고 수량과 입고 예정일을 조회한다. 정비에 필요한 부품이 충분한지 확인할 때 쓴다. 부품마다 한 번씩 부른다.",
      parameters: {
        type: "object",
        properties: {
          part_no: { type: "string", description: "부품번호. 예: PN-4471" },
        },
        required: ["part_no"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_substitute",
      description:
        "재고 조회에 실패한 부품번호의 대체품(바뀐 부품번호)을 찾는다. 대체품이 있으면 그 번호로 다시 재고를 확인한다.",
      parameters: {
        type: "object",
        properties: {
          part_no: {
            type: "string",
            description: "조회에 실패한 부품번호. 예: PN-7730",
          },
        },
        required: ["part_no"],
      },
    },
  },
];

const plans = JSON.parse(
  readFileSync(
    new URL("../../data/maintenance-plans.json", import.meta.url),
    "utf8",
  ),
);
const stock = JSON.parse(
  readFileSync(new URL("../../data/parts-stock.json", import.meta.url), "utf8"),
);
const substitutes = JSON.parse(
  readFileSync(new URL("../../data/substitutes.json", import.meta.url), "utf8"),
);
function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan")
    return plans[args.tail_no]
      ? { tail_no: args.tail_no, ...plans[args.tail_no] }
      : { error: `'${args.tail_no}' 의 정비 계획이 없습니다` };
  if (name === "check_stock")
    return stock[args.part_no]
      ? { part_no: args.part_no, ...stock[args.part_no] }
      : {
          error: `'${args.part_no}' 는 재고 시스템에 없는 부품번호입니다 (재고 0 이 아니라 조회 실패)`,
        };
  if (name === "find_substitute")
    return substitutes[args.part_no]
      ? { part_no: args.part_no, ...substitutes[args.part_no] }
      : { 결과: `'${args.part_no}' 의 대체품이 없습니다` };
  return { error: `모르는 도구: ${name}` };
}

async function chat(messages: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2 }),
  });
  const data = await res.json();
  console.log(
    `[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`,
  );
  const { role, content, tool_calls } = data.choices[0].message;
  return { role, content, tool_calls };
}

const input = {
  messages: [
    {
      role: "system",
      content:
        "너는 공군 정비대대의 부품 담당이다. 오늘은 2026-10-29 이다. 기체번호를 받으면 정비 계획을 보고, 필요한 부품마다 재고를 확인하라. 도구로 확인한 사실만 짧게 답하고, 부족한 부품은 정비일까지 확보되는지 말하라.",
    },
    {
      role: "user",
      content: "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?",
    },
  ],
};

// 결과 찍기: 마지막 메시지가 답이면 [답], 아니면 무엇으로 끝났는지
function show(out: { messages: any[] }) {
  const last = out.messages.at(-1);
  if (last.role === "assistant" && !last.tool_calls?.length)
    console.log("[답]  ", last.content);
  else
    console.log(
      `[끝]   마지막 메시지: ${last.role}${last.tool_calls?.length ? " (도구 요청)" : ""} · messages ${out.messages.length}개`,
    );
}

// ── State: 대화 전체. 노드가 돌려준 메시지는 뒤에 이어 붙는다 ──
const State = Annotation.Root({
  messages: Annotation<any[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

// ── 노드 ① agent: 모델을 부른다 ──
async function agentNode(state: typeof State.State) {
  console.log("[NODE] ▶ agent");
  return { messages: [await chat(state.messages)] };
}

const graph = new StateGraph(State)
  .addNode("agent", agentNode)
  .addEdge(START, "agent")
  .addEdge("agent", END)
  .compile();

show(await graph.invoke(input));
