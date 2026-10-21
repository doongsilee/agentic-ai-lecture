/**
 * 실습 5 · while 로 감싸면 Agent                                           강의 23 ~ 25장
 *
 *   할 일     멈추는 길 두 개를 넣는다 (아래 ▼ 한 곳)
 *               ① 모델이 도구를 요청하지 않았다 → 답을 찍고 끝
 *               ② 모델을 MAX_STEPS 번 불렀다 → 내 코드가 끊는다
 *   돌리기    pnpm lab5          · pnpm lab5:limit   (MAX_STEPS=1)
 *   성공하면  정비 계획 → 부품마다 재고 → [답]. lab5:limit 은 [STOP]
 *             넣기 전에는 답을 내도 알아보지 못하고 계속 부른다 (안전망 10번에서 끊긴다)
 *
 * 실습 4 의 한 바퀴를 반복할 뿐이다. 재고 도구에 넣을 부품번호는 첫 결과(정비 계획)를 봐야 안다
 * 루프를 돌리는 것도, 멈추는 것도 모델이 아니라 내 코드다
 */
import { readFileSync } from "node:fs";
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js";

const MAX_STEPS = Number(process.env.MAX_STEPS ?? 8); // 모델을 최대 몇 번까지 부를지
const SAFETY = 10; // 안전망: 멈추는 길을 비워 둬도 영원히 돌지는 않게

// 도구 설명 — 두 개
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

// 도구 실행 — 평범한 함수들 (교육용 합성 자료)
const plans = JSON.parse(readFileSync(new URL("../data/maintenance-plans.json", import.meta.url), "utf8"));
const stock = JSON.parse(readFileSync(new URL("../data/parts-stock.json", import.meta.url), "utf8"));
function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan") return plans[args.tail_no] ? { tail_no: args.tail_no, ...plans[args.tail_no] } : { error: `'${args.tail_no}' 의 정비 계획이 없습니다` };
  if (name === "check_stock") return stock[args.part_no] ? { part_no: args.part_no, ...stock[args.part_no] } : { error: `'${args.part_no}' 는 재고 시스템에 없는 부품번호입니다 (재고 0 이 아니라 조회 실패)` };
  return { error: `모르는 도구: ${name}` }; // 실패도 결과로 돌려준다 — 모델이 보고 다음을 정한다
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

const messages: object[] = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 오늘은 2026-10-29 이다. 기체번호를 받으면 정비 계획을 보고, 필요한 부품마다 재고를 확인하라. 도구로 확인한 사실만 짧게 답하고, 부족한 부품은 정비일까지 확보되는지 말하라." },
  { role: "user", content: "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?" },
];

for (let step = 1; step <= SAFETY; step++) {
  const reply = await chat(messages);
  messages.push(reply);

  // ▼ 실습 5: 멈추는 길 두 개
  //   ① reply.tool_calls 가 없으면 → console.log("[답]  ", reply.content) 하고 break
  //   ② step 이 MAX_STEPS 이상이면 → console.log("[STOP] …내 코드가 멈춘다") 하고 break
  

  // 실습 4 그대로: 실행하고 결과를 돌려준다
  for (const call of reply.tool_calls ?? []) {
    const result = runTool(call.function.name, JSON.parse(call.function.arguments));
    console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
    messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
  }
  if (step === SAFETY) console.log(`[STOP] 안전망: 모델을 ${SAFETY}번 불러서 강제로 끊는다 — 멈추는 길이 없다 (실습 5)`);
}
