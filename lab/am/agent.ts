/**
 * 1일차 오전 실습 · 정비 부품 담당 Agent
 *
 * 이 파일 하나를 실습마다 키워 간다. 실습 문제와 "성공하면 보이는 화면" 은 강의 장표와 lab/README.md 에 있다
 *   돌리기   pnpm agent
 *   데이터   lab/data/maintenance-plans.json · parts-stock.json · substitutes.json (교육용 합성 자료)
 *   막히면   GitHub 의 answers 브랜치 → lab/am/answers/1.ts ~ 5.ts (그 실습을 끝낸 시점의 이 파일)
 *   따라잡기 pnpm step <실습 번호>   (그 실습을 풀 차례로. 앞 실습의 정답이 이 파일에 들어간다)
 */
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js"; // .env 의 접속 정보

// 실습 1: 장표의 두 문장으로 messages 를 직접 만들고, LLM 을 부르는 chat(messages) 함수를 만들어 한 번 부른다 (실습 2 부터 그대로 쓴다)

console.log({ BASE_URL, MODEL, 키: API_KEY ? "있음" : "없음 (mock)" });
