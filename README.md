# 공군 AI센터 · Agentic AI 1일차 — 실습 저장소

2026. 10. 29(목) · TypeScript · LangGraph.js

**실습 시작 (설치 없음, 브라우저만):** 아래 버튼 또는 주소를 열고 **Create codespace**

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/doongsilee/agentic-ai-lecture?ref=main)

```
https://codespaces.new/doongsilee/agentic-ai-lecture?ref=main
```

> 이 저장소의 데이터(정비 계획 · 부품 재고 · 대체 부품)는 전부 **교육용 합성 자료**이며 실제 기종 · 부대 · 기체번호와 무관합니다.

---

## 1. 시작

### Codespaces (설치 없음, 권장)

GitHub 계정만 있으면 됩니다. 위 버튼을 열고 브랜치가 `main` 인지 확인한 뒤 **Create codespace** 를 누르세요.

- 2~3분 뒤 브라우저에 VS Code 가 열리고, 터미널에서 패키지 설치와 `lab/.env` 만들기가 자동으로 끝납니다
- "준비 끝" 이 보이면 `cd lab && pnpm agent`
- 30분 동안 아무것도 안 하면 잠듭니다. 다시 열면 파일은 그대로입니다
- 수업 중 강사가 고친 내용은 `git pull` 로 받습니다

### 내 노트북

Node.js 22 이상, git, VS Code

```bash
git clone https://github.com/doongsilee/agentic-ai-lecture.git
cd agentic-ai-lecture/lab
corepack enable
pnpm install
cp .env.example .env      # 키 없이 mock 으로도 흐름은 돈다
pnpm agent
```

### 조별 키

당일 강사가 나눠 주는 조별 키로 `lab/.env` 의 두 줄만 바꿉니다.

```bash
LLM_MODE=cloud
LLM_API_KEY=조별-키
```

---

## 2. 실습 파일

실습 문제와 성공 화면은 강의 장표에 있습니다. 명령은 모두 `lab/` 폴더에서 칩니다.

| 시간 | 실습 | 파일 | 돌리기 |
|---|---|---|---|
| 오전 | 1 ~ 5 | `lab/am/agent.ts` | `pnpm agent` · `pnpm agent:limit` |
| 오후 ① | 6 ~ 9 | `lab/pm/agent.ts` | `pnpm pm` · `pnpm pm:limit` |
| 오후 ② | 10 ~ 13 | `lab/pm/agent2.ts` | `pnpm pm2` |
| 오후 ③ | 14 ~ 17 | `lab/pm/agent3.ts` | `pnpm pm3` |
| 오후 ④ | 18 ~ 20 | `lab/pm/agent4.ts` | `pnpm pm4` |

- 오전과 오후 ① 은 파일 하나를 실습마다 키워 갑니다
- 오후 ② ~ ④ 는 시간마다 시작 파일이 따로 있습니다. 파일 안의 `// 실습 N` 자리에 코드를 넣습니다
- 오후 ③ 부터는 터미널에서 사람에게 묻습니다 (y / n). 직접 터미널에서 돌리세요

---

## 3. 막히면

**따라잡기:** `pnpm step <풀 차례인 실습 번호>`

```bash
pnpm step 11      # pm/agent2.ts 에 실습 10 정답을 넣는다 → 11번을 풀 차례
pnpm step 10      # 오후 ② 시작 파일로 되돌린다 (그 시간의 첫 실습 번호면 시작 파일로)
```

- 그 시간의 파일을 알아서 고릅니다. 덮어쓰기 전에 묻습니다 (그 파일에 고친 내용은 사라집니다)
- 끝나면 다음에 고칠 곳을 `파일:줄` 로 찍어 줍니다. VS Code 터미널에서 Ctrl+클릭하면 그 줄로 갑니다

**정답 보기:** `answers` 브랜치의 `lab/am/answers/1.ts ~ 5.ts`, `lab/pm/answers/6.ts ~ 20.ts` (그 실습을 끝낸 시점의 파일). GitHub 에서 브랜치를 `answers` 로 바꿔 보거나 아래처럼 봅니다.

```bash
git show origin/answers:lab/pm/answers/11.ts
```

---

## 4. 화면 읽는 법

| 줄 | 뜻 |
|---|---|
| `[LLM]` | 모델을 한 번 불렀다. 보낸 messages 수 · 입력 토큰 |
| `[TOOL]` | 내 코드가 도구를 실행했다 (모델이 아니라). 도구 이름(arguments) → 결과 |
| `[NODE]` | 그래프의 노드가 돌기 시작했다 |
| `[STATE]` | 그래프 State 의 필드를 찍었다 |
| `[STREAM]` | stream 으로 받은 진행 상황. 노드 → 바꾼 필드 |
| `[멈춤]` | 그래프가 멈췄다. 사람의 답을 기다린다 |
| `[STOP]` | 내 코드가 멈췄다 (`MAX_STEPS`) |
| `[답]` | 모델의 최종 답 |

---

## 5. 폴더

| 폴더 | 내용 |
|---|---|
| `lab/` | 실습. `am/` 오전 · `pm/` 오후 · `data/` 합성 자료 · `lib/` 접속 정보 · stream 읽기 · `tools/` 따라잡기 |
| `slides/` | 강의 장표 (HTML, 브라우저로 열기) |
| `.devcontainer/` | Codespaces 환경 레시피 |
