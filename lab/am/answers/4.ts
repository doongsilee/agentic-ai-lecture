/**
 * 실습 4 정답 · 도구 실행하기 — 실습 4 를 끝낸 시점의 lab/am/agent.ts
 *   데이터를 불러와 도구 함수를 만들고, 실습 3 에서 받은 도구 요청(tool_calls)대로 내 코드가 실행한다
 *   결과는 role: "tool" 로 넣어 다시 부른다
 */
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";
import planData from "../../data/maintenance-plans.json" with { type: "json" }; // 정비 계획 (교육용 합성 자료) · 실습 4

const plans: Record<string, any> = planData; // 기체번호 → 정비 계획

// tools 를 받아 body 에 같이 보내고, 답의 tool_calls 도 돌려준다
async function chat(messages: object[], tools?: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2 }), // tools 도 같이 보낸다
  });
  const data = await res.json();
  console.log(`[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`);
  const { role, content, tool_calls } = data.choices[0].message;
  return { role, content, tool_calls }; // 도구 요청도 돌려준다
}

// 도구 설명 — 모델은 이것만 보고 고른다
const tools = [
  {
    type: "function",
    function: {
      name: "get_maintenance_plan",
      description: "기체번호로 정기 정비 계획을 조회한다. 정비일과 필요한 부품번호 · 수량이 나온다.",
      parameters: { type: "object", properties: { tail_no: { type: "string", description: "기체번호. 예: TR-1023" } }, required: ["tail_no"] },
    },
  },
];

// 도구 함수 — 평범한 함수 · 실습 4
function getMaintenancePlan(tail_no: string) {
  return plans[tail_no] ? { tail_no, ...plans[tail_no] } : { error: `'${tail_no}' 의 정비 계획이 없습니다` };
}

const messages: object[] = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 도구로 확인한 사실만 짧게 답한다." },
  { role: "user", content: "TR-1023 다음 정기 정비 계획 알려 줘" },
];

// 모델은 답 대신 "이 도구를 이 값으로 불러 달라" 는 요청을 돌려준다
const reply = await chat(messages, tools);
messages.push(reply); // 도구 요청도 대화의 일부다

// 실행은 내 코드가 한다. 이 질문에는 요청이 하나 온다 · 실습 4
const call = reply.tool_calls[0];
const args = JSON.parse(call.function.arguments); // arguments 는 JSON "글자"
const result = getMaintenancePlan(args.tail_no);
console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) }); // 어느 요청의 결과인지 짝을 맞춘다

// 결과를 보고 답한다 · 실습 4
const final = await chat(messages, tools);
console.log("[답]  ", final.content);
