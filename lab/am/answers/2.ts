/**
 * 과제 2 정답 · 도구 하나로 한 바퀴 — 과제 2 를 끝낸 시점의 lab/am/agent.ts
 *   ① 도구를 알려 주고 → ② 모델이 요청하면 내 코드가 실행 → ③ 결과를 role: "tool" 로 넣어 다시 부른다
 */
import { readFileSync } from "node:fs";
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";

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

// 도구 실행 — 평범한 함수
const plans = JSON.parse(readFileSync(new URL("../../data/maintenance-plans.json", import.meta.url), "utf8"));
function getMaintenancePlan(tail_no: string) {
  return plans[tail_no] ? { tail_no, ...plans[tail_no] } : { error: `'${tail_no}' 의 정비 계획이 없습니다` };
}

async function chat(messages: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2 }), // tools 도 같이 보낸다
  });
  const data = await res.json();
  console.log(`[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`);
  const { role, content, tool_calls } = data.choices[0].message;
  return { role, content, tool_calls }; // 다시 보낼 건 role · content · tool_calls 뿐
}

const messages: object[] = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 도구로 확인한 사실만 짧게 답한다." },
  { role: "user", content: "TR-1023 다음 정기 정비 계획 알려 줘" },
];

// ① 모델이 도구를 요청한다
const reply = await chat(messages);
messages.push(reply);

// ② 실행은 내 코드가 한다. 결과는 tool_call_id 로 짝지어 돌려준다
for (const call of reply.tool_calls ?? []) {
  const args = JSON.parse(call.function.arguments); // arguments 는 JSON "글자"
  const result = getMaintenancePlan(args.tail_no);
  console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
  messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
}

// ③ 결과를 보고 답한다
const final = await chat(messages);
console.log("[답]  ", final.content);
