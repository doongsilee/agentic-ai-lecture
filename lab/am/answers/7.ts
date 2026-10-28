/**
 * 실습 7 정답 · 사람 승인 — 실습 7 을 끝낸 시점의 lab/am/agent.ts
 *   request_part(청구) 도구를 더하고, runTool 에서 실행 직전에 사람에게 y / n 을 묻는다
 *   대체품 찾기(find_substitute)는 tools 에서 주석 처리한다. 모델이 대체품 찾기와 청구를 헷갈리지 않게
 *   거절하면 실행하지 않고, 거절했다는 사실을 결과로 돌려준다. 루프는 runTool 앞에 await 하나만 붙는다
 */
import readline from "node:readline/promises";
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";
import planData from "../../data/maintenance-plans.json" with { type: "json" };
import stockData from "../../data/parts-stock.json" with { type: "json" };
import substituteData from "../../data/substitutes.json" with { type: "json" };

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
  // 실습 7: 대체품 찾기는 주석 처리한다. 대체품 찾기와 청구를 모델이 헷갈리지 않게
  // {
  //   type: "function",
  //   function: {
  //     name: "find_substitute",
  //     description: "재고 조회에 실패한(error) 부품번호의 대체품(바뀐 부품번호)을 찾는다. 대체품이 있으면 그 번호로 다시 재고를 확인한다. 재고가 모자란 부품에는 쓰지 않는다.",
  //     parameters: { type: "object", properties: { part_no: { type: "string", description: "조회에 실패한 부품번호. 예: PN-7730" } }, required: ["part_no"] },
  //   },
  // },
  {
    type: "function",
    function: {
      name: "request_part",
      description: "재고를 확인한 뒤, 정비일까지 모자라는 부품을 모자라는 수량만큼 상급 부대에 청구한다. 입고 예정일이 정비일보다 늦으면 모자라는 것이다. 청구는 되돌리기 어렵다.",
      parameters: {
        type: "object",
        properties: { part_no: { type: "string", description: "부품번호. 예: PN-4471" }, qty: { type: "number", description: "청구할 수량" } },
        required: ["part_no", "qty"],
      },
    },
  },
];

const plans: Record<string, any> = planData;
const stock: Record<string, any> = stockData;
const substitutes: Record<string, any> = substituteData;

// 도구 함수 — 실습 3 · 4 그대로
function getMaintenancePlan(tail_no: string) {
  return plans[tail_no] ? { tail_no, ...plans[tail_no] } : { error: `'${tail_no}' 의 정비 계획이 없습니다` };
}

// 도구 함수 — 실습 5
function checkStock(part_no: string) {
  return stock[part_no] ? { part_no, ...stock[part_no] } : { error: `'${part_no}' 는 재고 시스템에 없는 부품번호입니다 (재고 0 이 아니라 조회 실패)` };
}

// 도구 함수 — 실습 6 에서 더한다
function findSubstitute(part_no: string) {
  return substitutes[part_no] ? { part_no, ...substitutes[part_no] } : { 결과: `'${part_no}' 의 대체품이 없습니다` };
}

// 도구 함수 — 실습 7 에서 더한다. 청구번호를 하나씩 매긴다
let requests = 0;
function requestPart(part_no: string, qty: number) {
  return { 청구번호: `REQ-${String(++requests).padStart(4, "0")}`, 부품번호: part_no, 수량: qty, 상태: "청구 접수" };
}

// 사람에게 y / n 을 묻는다 — 실습 7
async function ask(question: string) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`[사람] ${question} (y/n) `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

// 도구 이름으로 함수를 고른다. 사람에게 묻느라 기다려야 해서 async 가 된다
async function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan") return getMaintenancePlan(args.tail_no);
  if (name === "check_stock") return checkStock(args.part_no);
  if (name === "find_substitute") return findSubstitute(args.part_no);
  if (name === "request_part") {
    if (!(await ask(`${args.part_no} ${args.qty}개를 청구할까요?`))) return { 결과: "담당자가 청구를 승인하지 않았습니다" }; // 거절하면 실행하지 않는다
    return requestPart(args.part_no, args.qty);
  }
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
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 오늘은 2026-10-29 이다. 순서대로 하라: ① 기체번호로 정비 계획을 본다 ② 필요한 부품마다 재고를 확인한다 ③ 정비일까지 모자라는 부품만 모자라는 수량만큼 request_part 로 청구한다. 재고가 충분한 부품은 청구하지 않는다. 청구는 답에 글로 쓰지 말고 반드시 request_part 도구를 불러서 한다. 도구로 확인한 사실만 짧게 답한다." },
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
    const result = await runTool(call.function.name, JSON.parse(call.function.arguments)); // runTool 이 async 라 await
    console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
    messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
  }
}
