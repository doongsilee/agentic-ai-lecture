/**
 * 실습 3 · LLM 에게 도구를 알려 준다                                        강의 19 ~ 22장
 *
 *   할 일     get_maintenance_plan 도구의 설명(description)과 입력 모양(parameters)을 채운다 (아래 ▼ 두 곳)
 *   돌리기    pnpm lab3
 *   성공하면  모델의 답에 content 대신 tool_calls 가 온다: 어떤 도구를, 어떤 값으로 부를지
 *             LLM 은 요청만 한다. 아직 아무것도 실행되지 않았다
 *
 * 도구 설명 = 이름 + 언제 쓰는지(description) + 어떻게 부르는지(parameters). 모델은 이것만 보고 고른다
 * 요청할 때 body 에 tools 를 같이 넣으면 된다
 */
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";

const tools = [
  {
    type: "function",
    function: {
      name: "get_maintenance_plan",
      // ▼ 실습 3-1: 무엇을 하는 도구인지, 언제 쓰는지 한 줄로. 예: "기체번호로 정기 정비 계획(정비일 · 필요한 부품)을 조회한다"
      description: "기체번호로 정기 정비 계획을 조회한다. 정비일과 필요한 부품번호 · 수량이 나온다.",
      // ▼ 실습 3-2: 넣을 값. tail_no(기체번호, string) 하나. 인자 이름은 영어로
      parameters: {
        type: "object",
        properties: { tail_no: { type: "string", description: "기체번호. 예: TR-1023" } },
        required: ["tail_no"],
      },
    },
  },
];

const messages = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." },
  { role: "user", content: "TR-1023 다음 정기 정비 계획 알려 줘" },
];

const res = await fetch(`${BASE_URL}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({ model: MODEL, messages, tools, temperature: 0.2 }), // 이번엔 tools 도 같이 보낸다
});
const data = await res.json();

const { role, content, tool_calls } = data.choices[0].message;
console.log(JSON.stringify({ role, content, tool_calls }, null, 2)); // 모델이 돌려준 모양 그대로
console.log("finish_reason:", data.choices[0].finish_reason);
