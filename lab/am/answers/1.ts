/**
 * 실습 1 정답 · LLM 부르기 — 실습 1 을 끝낸 시점의 lab/am/agent.ts
 *   messages 를 실어 /chat/completions 에 POST 하고, 받은 답과 토큰 수를 찍는다
 */
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js";

const messages = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." },
  { role: "user", content: "브레이크 패드는 보통 언제 교체해?" },
];

const res = await fetch(`${BASE_URL}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 }),
});
const data = await res.json();

const { role, content } = data.choices[0].message; // 답도 메시지 하나다
console.log({ role, content });
console.log(data.usage); // 이번 호출에 쓴 토큰 수
