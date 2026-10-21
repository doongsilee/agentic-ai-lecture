/**
 * 실습 2 · 대화를 이어 간다                                                강의 15 ~ 17장
 *
 *   할 일     첫 답(first)을 messages 에 넣는다 (아래 ▼ 한 곳)
 *   돌리기    pnpm lab2
 *   성공하면  두 번째 답이 첫 답을 한 줄로 줄여 준다. 넣기 전에는 "무슨 답을 했는지 모른다"
 *             [LLM] 두 번째 줄의 입력 토큰이 늘어난다 — 지난 대화를 통째로 다시 보냈기 때문
 *
 * LLM 은 지난 대화를 기억하지 않는다. 대화는 매번 보내는 messages 배열 하나다
 */
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js";

// LLM 을 한 번 부른다 — 실습 1 의 fetch 를 함수로 묶었을 뿐이다
async function chat(messages: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 }),
  });
  const data = await res.json();
  console.log(`[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`);
  const { role, content } = data.choices[0].message;
  return { role, content }; // 다시 보낼 건 role · content 뿐
}

const messages = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." },
  { role: "user", content: "브레이크 패드는 보통 언제 교체해?" },
];

const first = await chat(messages);
console.log("[답]  ", first.content);

// ▼ 실습 2: 받은 답(first)을 messages 에 넣는다 — 모델이 한 말도 대화의 일부다


messages.push({ role: "user", content: "방금 답한 내용을 한 줄로 줄여 줘" });
const second = await chat(messages);
console.log("[답]  ", second.content);

console.log("\n두 번째에 보낸 messages:");
for (const m of messages) console.log(`  ${m.role.padEnd(9)} ${m.content.slice(0, 60)}`);
