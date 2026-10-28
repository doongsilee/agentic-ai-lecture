/**
 * 실습 1 정답 · LLM 부르기 — 실습 1 을 끝낸 시점의 lab/am/agent.ts
 *   messages 를 만들고, /chat/completions 에 POST 하는 chat() 함수를 만들어 한 번 부른다
 *   chat() 은 실습 2 부터 그대로 쓴다
 */
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";

// LLM 을 한 번 부른다
async function chat(messages: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 }),
  });
  const data = await res.json();
  console.log(`[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`); // 이번 호출에 쓴 토큰 수
  const { role, content } = data.choices[0].message; // 답도 메시지 하나다
  return { role, content }; // 다시 보낼 건 role · content 뿐
}

const messages: object[] = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." },
  { role: "user", content: "브레이크 패드는 보통 언제 교체해?" },
];

console.log(await chat(messages));
