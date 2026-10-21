/**
 * 과제 1 정답 · 대화 이어 가기 — 과제 1 을 끝낸 시점의 lab/am/agent.ts
 *   fetch 를 chat() 으로 묶고, 받은 답을 messages 에 넣은 뒤 이어서 묻는다
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
  console.log(`[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`);
  const { role, content } = data.choices[0].message;
  return { role, content }; // 다시 보낼 건 role · content 뿐
}

const messages: object[] = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." },
  { role: "user", content: "브레이크 패드는 보통 언제 교체해?" },
];

const first = await chat(messages);
console.log("[답]  ", first.content);

messages.push(first); // 모델이 한 말도 대화의 일부다
messages.push({ role: "user", content: "방금 답한 내용을 한 줄로 줄여 줘" });

const second = await chat(messages);
console.log("[답]  ", second.content);
