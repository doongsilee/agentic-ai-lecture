/**
 * 실습 3 정답 · 도구 알려 주기 — 실습 3 을 끝낸 시점의 lab/am/agent.ts
 *   ① chat() 에 tools 파라미터 → ② 도구 설명 → ③ 불러서 도구 요청(tool_calls)을 받는다
 *   도구 함수를 만들고 실행해서 결과를 돌려주는 건 실습 4
 */
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";

// ① tools 를 받아 body 에 같이 보내고, 답의 tool_calls 도 돌려준다
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

// ② 도구 설명 — 모델은 이것만 보고 고른다
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

const messages: object[] = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 도구로 확인한 사실만 짧게 답한다." },
  { role: "user", content: "TR-1023 다음 정기 정비 계획 알려 줘" },
];

// ③ 모델은 답 대신 "이 도구를 이 값으로 불러 달라" 는 요청을 돌려준다. 실행은 하지 않았다
const reply = await chat(messages, tools);
console.dir(reply, { depth: null }); // 안쪽까지 다 찍는다
