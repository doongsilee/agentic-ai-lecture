/**
 * 실습 4 · 실행하고, 결과를 돌려준다 (한 바퀴)                               강의 20 · 22장
 *
 *   할 일     도구 결과를 { role: "tool", tool_call_id, content } 로 messages 에 넣는다 (아래 ▼ 한 곳)
 *   돌리기    pnpm lab4
 *   성공하면  [TOOL] 줄 (내 코드가 실행) 다음, 두 번째 호출에서 정비 계획(정비일 2026-11-03)을 보고 한 [답]
 *             넣기 전에는 모델이 결과를 못 받고 정비 계획을 지어낸다 (데이터와 다른 날짜 · 내용 = 환각)
 *             서버에 따라서는 아예 거절한다 (OpenAI: 400 "tool_calls 다음엔 role: tool 이 있어야 한다")
 *
 * ① 모델이 도구를 요청한다 → ② 실행은 내 코드 → ③ 결과를 넣어 다시 부르면 모델이 답한다
 */
import { readFileSync } from "node:fs";
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js";

// 도구 설명 (실습 3 에서 쓴 것)
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

// 도구 실행 — 평범한 함수다. 정비 계획 파일에서 찾는다 (교육용 합성 자료)
const plans = JSON.parse(readFileSync(new URL("../data/maintenance-plans.json", import.meta.url), "utf8"));
function getMaintenancePlan(tail_no: string) {
  return plans[tail_no] ? { tail_no, ...plans[tail_no] } : { error: `'${tail_no}' 의 정비 계획이 없습니다` };
}

// LLM 을 한 번 부른다 — 이번엔 tools 도 같이 보낸다
async function chat(messages: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2 }),
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
messages.push(reply); // 요청도 대화의 일부다

// ② 실행은 내 코드가 한다
for (const call of reply.tool_calls ?? []) {
  const args = JSON.parse(call.function.arguments); // arguments 는 JSON "글자" 다
  const result = getMaintenancePlan(args.tail_no);
  console.log(`[TOOL] ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(result));
  // ▼ 실습 4: 결과를 messages 에 넣는다 — { role: "tool", tool_call_id: call.id, content: 결과를 JSON 글자로 }
  
}

// ③ 결과를 넣어 다시 부른다
const final = await chat(messages);
console.log("[답]  ", final.content);
