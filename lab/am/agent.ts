/**
 * 1일차 오전 실습 · 정비 부품 담당 Agent
 *
 * 이 파일 하나를 실습마다 키워 간다. 실습 문제와 "성공하면 보이는 화면" 은 lab/README.md 와 강의 장표에 있다
 *   돌리기   pnpm agent
 *   데이터   lab/data/maintenance-plans.json · parts-stock.json · substitutes.json (교육용 합성 자료)
 *   막히면   GitHub 의 answers 브랜치 → lab/am/answers/1.ts ~ 5.ts (그 실습을 끝낸 시점의 이 파일)
 */
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js"; // .env 의 접속 정보

const messages = [
  { role: "system", content: "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." },
  { role: "user", content: "브레이크 패드는 보통 언제 교체해?" },
];

// 실습 1: 이 messages 를 실어 LLM 을 한 번 부르고, 받은 답과 토큰 수를 찍는다
//   POST `${BASE_URL}/chat/completions` · 헤더 Authorization: `Bearer ${API_KEY}` · body 에 model 과 messages

console.log("보낼 messages:", messages, { BASE_URL, MODEL, 키: API_KEY ? "있음" : "없음 (mock)" });
