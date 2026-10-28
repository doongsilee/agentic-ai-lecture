/**
 * 실습 5 정답 · 도구 하나 더와 루프 — 실습 5 를 끝낸 시점의 lab/am/agent.ts
 *   check_stock 도구를 직접 설계해 더하고(설명 · 입력 모양 · 실행 함수), 한 바퀴를 for 로 감싼다
 *   멈추는 길은 둘: 도구 요청이 없을 때 · MAX_STEPS
 */
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";
import planData from "../../data/maintenance-plans.json" with { type: "json" };
import stockData from "../../data/parts-stock.json" with { type: "json" };

const MAX_STEPS = 15; // 모델을 부르는 상한. 1 로 바꿔 돌리면 [STOP] 으로 끝나는 걸 볼 수 있다

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
];

const plans: Record<string, any> = planData;
const stock: Record<string, any> = stockData;

// 도구 함수 — 실습 3 · 4 그대로
function getMaintenancePlan(tail_no: string) {
  return plans[tail_no] ? { tail_no, ...plans[tail_no] } : { error: `'${tail_no}' 의 정비 계획이 없습니다` };
}

// 도구 함수 — 실습 5 에서 더한다
function checkStock(part_no: string) {
  return stock[part_no] ? { part_no, ...stock[part_no] } : { error: `'${part_no}' 는 재고 시스템에 없는 부품번호입니다 (재고 0 이 아니라 조회 실패)` };
}

// 도구가 둘이라 이름으로 고른다
function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan") return getMaintenancePlan(args.tail_no);
  if (name === "check_stock") return checkStock(args.part_no);
  return { error: `모르는 도구: ${name}` }; // 실패도 결과로 돌려준다
}

async function chat(messages: object[], tools?: object[]) {
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

const messages: object[] = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 오늘은 2026-10-29 이다. 기체번호를 받으면 정비 계획을 보고, 필요한 부품마다 재고를 확인하라. 도구로 확인한 사실만 짧게 답하고, 부족한 부품은 정비일까지 확보되는지 말하라." },
  { role: "user", content: "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?" },
];

for (let step = 1; ; step++) {
  const reply = await chat(messages, tools);
  messages.push(reply);

  if (!reply.tool_calls?.length) { // ① 모델이 "끝"
    console.log("[답]  ", reply.content);
    break;
  }
  if (step >= MAX_STEPS) { // ② 내 코드가 "그만"
    console.log(`[STOP] 모델을 ${step}번 불렀다. 내 코드가 멈춘다`);
    break;
  }

  for (const call of reply.tool_calls) {
    const result = runTool(call.function.name, JSON.parse(call.function.arguments));
    console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
    messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
  }
}
