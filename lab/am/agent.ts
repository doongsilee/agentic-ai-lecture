/**
 * 1일차 오전 실습 · 정비 부품 담당 Agent
 *
 * 이 파일 하나를 과제마다 키워 간다. 과제와 "성공하면 보이는 화면" 은 lab/README.md 에 있다
 *   돌리기   pnpm agent
 *   데이터   lab/data/maintenance-plans.json · parts-stock.json · substitutes.json (교육용 합성 자료)
 *   막히면   GitHub 의 answers 브랜치 → lab/am/answers/1.ts ~ 4.ts (그 과제를 끝낸 시점의 이 파일)
 *
 * 지금은 LLM 을 한 번 부르는 코드만 있다 (강의 시연 ① 과 같다)
 */
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js"; // .env 의 접속 정보

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
