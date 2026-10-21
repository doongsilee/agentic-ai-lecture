/**
 * 실습 1 · LLM 을 한 번 부른다                                              강의 15 · 18장
 *
 *   할 일     messages 에 user 메시지 하나를 넣는다 (아래 ▼ 한 곳)
 *   돌리기    pnpm lab1
 *   성공하면  모델의 답 { role: "assistant", content: "…" } 과 쓴 토큰 수(usage)가 찍힌다
 *
 * LLM 을 부르는 건 /chat/completions 주소로 POST 요청을 한 번 보내는 것이다 (OpenAI 형식)
 * 요청에 담는 건 두 가지: model(어떤 모델에게) · messages(지금까지의 대화). 메시지 하나는 { role, content }
 *   system     역할 · 규칙. 개발자가 정한다
 *   user       사용자가 한 말
 *   assistant  모델이 한 말
 */
import { API_KEY, BASE_URL, MODEL } from "../../lib/env.js"; // .env 의 접속 정보

const messages = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." },
  // ▼ 실습 1: user 메시지를 넣는다. 예: { role: "user", content: "브레이크 패드는 보통 언제 교체해?" }
  { role: "user", content: "브레이크 패드는 보통 언제 교체해?" },
];

const res = await fetch(`${BASE_URL}/chat/completions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
  body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 }),
});
const data = await res.json();

const { role, content } = data.choices[0].message; // 답도 메시지 하나다 (모델에 따라 reasoning 같은 칸이 더 온다)
console.log({ role, content });
console.log(data.usage); // 이번 호출에 쓴 토큰 수
