# 1일차 오전 실습 — 프레임워크 없이 Agent 만들기

11:00 ~ 11:50 · 강의에서 본 순서 그대로, LLM 한 번 부르기부터 Agent 루프까지 직접 짠다.

> 데이터(정비 계획 · 부품 재고)는 전부 **교육용 합성 자료**이며 실제 기종 · 부대 · 기체번호와 무관합니다.

## 시작

**Codespaces (설치 없음):** 저장소에서 Code → Codespaces → Create codespace. 2~3분 뒤 설치까지 끝난다.

**내 노트북:** Node 22 이상

```bash
cd lab
corepack enable
pnpm install
cp .env.example .env      # 키 없이 mock 으로 전부 돈다
pnpm lab1
```

당일에는 강사가 나눠 주는 조별 키로 `.env` 의 두 줄만 바꾼다: `LLM_MODE=cloud`, `LLM_API_KEY=...` (2일차와 같은 규칙)

## 실습 — 파일 하나에 빈칸 하나

파일을 열면 맨 위에 **할 일 · 돌리기 · 성공하면** 이 있다. `▼ 실습 N` 자리를 채우고 돌려 본다.

| 실습 | 파일 | 할 일 | 돌리기 | 성공하면 |
|---|---|---|---|---|
| 1 | `am/01-call.ts` | `messages` 에 user 메시지를 넣는다 | `pnpm lab1` | `{ role: "assistant", content }` 와 토큰 수 |
| 2 | `am/02-chat.ts` | 첫 답을 `messages` 에 넣고 이어서 묻는다 | `pnpm lab2` | 두 번째 답이 첫 답을 이어 간다. 입력 토큰이 늘어난다 |
| 3 | `am/03-tool-call.ts` | 도구 설명(description · parameters)을 쓴다 | `pnpm lab3` | 답 대신 `tool_calls` 가 온다 |
| 4 | `am/04-one-round.ts` | 도구 결과를 `role: "tool"` 로 돌려준다 | `pnpm lab4` | `[TOOL]` 다음 정비 계획을 보고 한 `[답]` |
| 5 | `am/05-loop.ts` | `while` 안에 멈추는 길 두 개 | `pnpm lab5` · `pnpm lab5:limit` | 정비 계획 → 재고 여러 개 → `[답]` / `[STOP]` |
| 6 | `am/06-bonus.ts` | (보너스) 청구 전에 사람 승인 | `pnpm lab6` | `[사람] PN-4471 1개를 청구할까요?` |

- 파일마다 앞 실습의 정답이 이미 들어 있다. 늦었으면 다음 파일을 열면 된다
- 막히면 정답: `am/answers/` 의 같은 이름 파일 (`pnpm exec tsx am/answers/05-loop.ts` 로 돌려 볼 수도 있다)
- 파일 하나에 전부 들어 있다: `fetch` 로 LLM 부르기, 도구 설명, 도구 실행 함수, 출력. 앞 파일에서 쓴 코드는 다음 파일에 그대로 옮겨 적혀 있다
- `lib/` 에는 `.env` 읽기(`env.ts`)와 키 없이 연습할 때 쓰는 가짜 서버(`mock.ts`)만 있다. 열어 보지 않아도 된다

## 화면 읽는 법

| 줄 | 뜻 |
|---|---|
| `[LLM]` | 모델을 한 번 불렀다. 보낸 messages 수 · 입력 토큰 |
| `[TOOL]` | 내 코드가 도구를 실행했다 (모델이 아니라). 도구 이름(arguments) → 결과 |
| `[답]` | 모델의 최종 답 |
| `[STOP]` | 내 코드가 멈췄다 (한도 · 안전망) |
| `[사람]` | 사람에게 물었다 |
