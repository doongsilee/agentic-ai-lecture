# 1일차 오전 실습 — 첫 Agent 만들기

11:00 ~ 11:50 · 강의에서 본 것을 이번엔 혼자 짠다. `lab/am/agent.ts` 파일 하나를 실습마다 키워 간다.

> 데이터(정비 계획 · 부품 재고 · 대체 부품)는 전부 **교육용 합성 자료**이며 실제 기종 · 부대 · 기체번호와 무관합니다.

## 시작

**Codespaces (설치 없음):** 저장소에서 Code → Codespaces → Create codespace. 2~3분 뒤 설치까지 끝난다.

**내 노트북:** Node 22 이상

```bash
cd lab
corepack enable
pnpm install
cp .env.example .env      # 키 없이 mock 으로도 흐름은 돈다
pnpm agent
```

당일에는 강사가 나눠 주는 조별 키로 `.env` 의 두 줄만 바꾼다: `LLM_MODE=cloud`, `LLM_API_KEY=...`

## 실습

`pnpm agent` 로 지금 상태(접속 정보만 찍힌다)를 한 번 돌려 본 뒤, 실습을 차례로 푼다. 실습마다 `am/agent.ts` 를 고치고 다시 돌린다. 강의 장표에도 실습마다 한 장씩 있고, 정답은 시간이 되면 장표에서 공개한다.

| 실습 | 할 일 | 성공하면 |
|---|---|---|
| 1 · LLM 부르기 | 두 문장으로 `messages` 를 직접 만든다 — 모델에게 줄 역할 "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." · 물어볼 것 "브레이크 패드는 보통 언제 교체해?". 그걸 실어 LLM 을 한 번 부른다. `POST ${BASE_URL}/chat/completions`, 헤더 `Authorization: Bearer ${API_KEY}`, body 에 `model` 과 `messages`. 받은 답(`choices[0].message`)과 토큰 수(`usage`)를 찍는다 | `{ role: 'assistant', content: '…' }` 와 토큰 수 |
| 2 · 대화 이어 가기 | 실습 1 의 fetch 를 `chat(messages)` 함수로 묶는다. 받은 답을 `messages` 에 넣고 "방금 답한 내용을 한 줄로 줄여 줘" 를 이어서 묻는다 | 두 번째 답이 첫 답을 줄여 준다. 두 번째 호출의 입력 토큰이 늘어난다 |
| 3 · 도구 하나로 한 바퀴 | `get_maintenance_plan(tail_no)` 도구를 만든다 (설명 + `data/maintenance-plans.json` 에서 찾는 함수). body 에 `tools` 를 넣고, `tool_calls` 가 오면 실행해서 `role: "tool"` 로 돌려준 뒤 다시 부른다. 질문: "TR-1023 다음 정기 정비 계획 알려 줘" | `[TOOL]` 줄 다음, 정비일 2026-11-03 과 부품 4종을 말한다 |
| 4 · 루프 | `check_stock(part_no)` 도구를 더한다 (`data/parts-stock.json`). 한 바퀴를 `for` / `while` 로 감싸고 멈추는 길 두 개를 넣는다: 도구 요청이 없으면 답하고 끝, `MAX_STEPS` 번 불렀으면 내 코드가 끊는다. 질문: "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?" | 정비 계획 → 부품마다 재고 → 답 (브레이크 패드 부족 · PN-7730 조회 실패). `pnpm agent:limit` 은 1번 부르고 멈춘다 |
| 5 · 내 도구 만들기 | PN-7730 은 번호가 바뀐 부품이다. `find_substitute(part_no)` 도구를 직접 설계해서 더한다 (`data/substitutes.json`). 설명을 어떻게 쓰면 모델이 알아서 쓸지가 핵심 | 모델이 PN-7730 조회 실패 → 대체품 PN-7731 찾기 → PN-7731 재고 조회를 스스로 이어 간다 |
| 보너스 · 사람 승인 | `request_part(part_no, qty)` 청구 도구를 더하고, 실행 직전에 터미널에서 y / n 을 묻는다. 거절하면 실행하지 않고 그 사실을 결과로 돌려준다 | `[사람] PN-4471 1개를 청구할까요? (y/n)` |

힌트

- 도구 설명의 모양, `tool_calls` 의 모양, `role: "tool"` 메시지의 모양은 강의 장표와 시연 노트북(`demo/tool-call.ipynb`)에 있다
- 실패(없는 부품번호 등)는 throw 하지 말고 `{ error: "…" }` 를 결과로 돌려준다. 모델이 그걸 보고 다음을 정한다
- 모델 답에서 다시 보낼 건 `role` · `content` · `tool_calls` 세 칸뿐이다 (모델에 따라 `reasoning` 같은 칸이 더 온다)

막히면: GitHub 의 **answers 브랜치** → `lab/am/answers/1.ts ~ 5.ts · bonus.ts` (그 실습을 끝낸 시점의 `agent.ts`)

## 화면 읽는 법 (정답 코드 기준)

| 줄 | 뜻 |
|---|---|
| `[LLM]` | 모델을 한 번 불렀다. 보낸 messages 수 · 입력 토큰 |
| `[TOOL]` | 내 코드가 도구를 실행했다 (모델이 아니라). 도구 이름(arguments) → 결과 |
| `[답]` | 모델의 최종 답 |
| `[STOP]` | 내 코드가 멈췄다 |
| `[사람]` | 사람에게 물었다 |

---

# 1일차 오후 실습 — 오전 Agent 를 LangGraph 로

13:00 ~ 13:50 (오후 ①) · 강의 시연(Chain → Router → Agent)을 오전의 정비 부품 Agent 로 직접 해 본다. `lab/pm/agent.ts` 파일 하나를 실습마다 키워 간다.

도구 세 개 · `runTool` · `chat()` · 결과를 찍는 `show()` 는 오전에 만든 그대로 준비해 두었다. **그래프만 새로 만든다.**

```bash
pnpm pm          # 지금 상태 돌려 보기
pnpm pm:limit    # 실습 9: MAX_STEPS=1 로 돌리기
```

| 실습 | 할 일 | 성공하면 |
|---|---|---|
| 6 · Chain | State (`messages` 칸 하나, 이어 붙이는 reducer) 와 agent 노드 하나로 START → agent → END 그래프를 만들고 `show(await graph.invoke(input))` | `[NODE] ▶ agent` 다음 `[끝] 마지막 메시지: assistant (도구 요청)` — 실행할 노드가 없다 |
| 7 · Router | tools 노드(`runTool` 로 실행 → `role: "tool"`) 와 갈림길 `route` (도구 요청이면 `"tools"`, 아니면 `END`) 를 더한다. tools 다음은 END | `[TOOL] get_maintenance_plan(...)` 다음 `[끝] 마지막 메시지: tool` — 결과를 모델이 못 봤다 |
| 8 · Agent | 선 **하나만** 바꿔서 도구 결과가 모델에게 돌아가게 한다 | 정비 계획 → 부품마다 재고 → 대체품 → `[답]` (오전 실습 5 와 같은 결과) |
| 9 · 멈춤 | State 에 `steps` 칸(더하기)을 두고, agent 가 1 씩 더하고, route 에서 `MAX_STEPS` 면 END | `pnpm pm:limit` 이 `[STOP] 모델을 1번 불렀다` 로 조용히 끝난다 (recursionLimit 에러가 아니다) |

힌트: 강의 시연 노트북 `demo/tutor-agent.ipynb` 와 같은 모양이다. 막히면 answers 브랜치 → `lab/pm/answers/6.ts ~ 9.ts`
