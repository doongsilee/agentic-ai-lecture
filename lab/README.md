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
| 1 · LLM 부르기 | 두 문장으로 `messages` 를 직접 만든다 — 모델에게 줄 역할 "너는 공군 정비대대의 부품 담당이다. 짧게 답한다." · 물어볼 것 "브레이크 패드는 보통 언제 교체해?". LLM 을 부르는 `chat(messages)` 함수를 만들어 한 번 부른다. `POST ${BASE_URL}/chat/completions`, 헤더 `Authorization: Bearer ${API_KEY}`, body 에 `model` 과 `messages`. 함수 안에서 입력 토큰 수(`usage.prompt_tokens`)를 찍고, 받은 답(`choices[0].message`)의 `role` · `content` 를 돌려준다 | `[LLM]  보낸 messages 2개 · 입력 토큰 …` 다음 `{ role: 'assistant', content: '…' }` |
| 2 · 대화 이어 가기 | 실습 1 의 `chat()` 을 그대로 쓴다. 받은 답을 `messages` 에 넣고 "방금 답한 내용을 한 줄로 줄여 줘" 를 이어서 묻는다 | 두 번째 답이 첫 답을 줄여 준다. 두 번째 호출의 입력 토큰이 늘어난다 |
| 3 · 도구 하나로 한 바퀴 | `get_maintenance_plan(tail_no)` 도구를 만든다 (설명 + `data/maintenance-plans.json` 에서 찾는 함수). body 에 `tools` 를 넣고, `tool_calls` 가 오면 실행해서 `role: "tool"` 로 돌려준 뒤 다시 부른다. 질문: "TR-1023 다음 정기 정비 계획 알려 줘" | `[TOOL]` 줄 다음, 정비일 2026-11-03 과 부품 4종을 말한다 |
| 4 · 루프 | `check_stock(part_no)` 도구를 더한다 (`data/parts-stock.json`). 한 바퀴를 `for` / `while` 로 감싸고 멈추는 길 두 개를 넣는다: 도구 요청이 없으면 답하고 끝, `MAX_STEPS` 번 불렀으면 내 코드가 끊는다. 질문: "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?" | 정비 계획 → 부품마다 재고 → 답 (브레이크 패드 부족 · PN-7730 조회 실패). `pnpm agent:limit` 은 1번 부르고 멈춘다 |
| 5 · 내 도구 만들기 | PN-7730 은 번호가 바뀐 부품이다. `find_substitute(part_no)` 도구를 직접 설계해서 더한다 (`data/substitutes.json`). 설명을 어떻게 쓰면 모델이 알아서 쓸지가 핵심 | 모델이 PN-7730 조회 실패 → 대체품 PN-7731 찾기 → PN-7731 재고 조회를 스스로 이어 간다 |

힌트

- 도구 설명의 모양, `tool_calls` 의 모양, `role: "tool"` 메시지의 모양은 강의 장표와 시연에 있다
- 실패(없는 부품번호 등)는 throw 하지 말고 `{ error: "…" }` 를 결과로 돌려준다. 모델이 그걸 보고 다음을 정한다
- 모델 답에서 다시 보낼 건 `role` · `content` · `tool_calls` 세 필드뿐이다 (모델에 따라 `reasoning` 같은 필드가 더 온다)

막히면: GitHub 의 **answers 브랜치** → `lab/am/answers/1.ts ~ 5.ts` (그 실습을 끝낸 시점의 `agent.ts`)

**따라잡기:** 앞 실습을 못 끝냈으면 `pnpm step <풀 차례인 실습 번호>` 로 바로 넘어간다. 예를 들어 `pnpm step 3` 은 `am/agent.ts` 에 실습 2 정답을 넣는다 (실습 3 을 풀 차례). 그 시간의 첫 실습 번호(1 · 6 · 10 · 14 · 18)면 시작 파일로 되돌린다. 덮어쓰기 전에 묻고(그 파일에 고친 내용은 사라진다), 끝나면 다음에 고칠 곳을 `파일:줄` 로 찍어 준다. 오후도 같다 — 실습 번호만 넣으면 그 시간의 파일을 알아서 고른다

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
| 6 · Chain | State (`messages` 필드 하나, 이어 붙이는 reducer) 와 agent 노드 하나로 START → agent → END 그래프를 만들고 `show(await graph.invoke(input))` | `[NODE] ▶ agent` 다음 `[끝] 마지막 메시지: assistant (도구 요청)` — 실행할 노드가 없다 |
| 7 · Router | tools 노드(`runTool` 로 실행 → `role: "tool"`) 와 갈림길 `route` (도구 요청이면 `"tools"`, 아니면 `END`) 를 더한다. tools 다음은 END | `[TOOL] get_maintenance_plan(...)` 다음 `[끝] 마지막 메시지: tool` — 결과를 모델이 못 봤다 |
| 8 · Agent | 선 **하나만** 바꿔서 도구 결과가 모델에게 돌아가게 한다 | 정비 계획 → 부품마다 재고 → 대체품 → `[답]` (오전 실습 5 와 같은 결과) |
| 9 · 멈춤 | State 에 `steps` 필드(더하기)를 두고, agent 가 1 씩 더하고, route 에서 `MAX_STEPS` 면 END | `pnpm pm:limit` 이 `[STOP] 모델을 1번 불렀다` 로 조용히 끝난다 (recursionLimit 에러가 아니다) |

힌트: 강의 시연과 같은 모양이다. 막히면 answers 브랜치 → `lab/pm/answers/6.ts ~ 9.ts`, 따라잡기는 `pnpm step 7` 처럼

---

# 1일차 오후 ② 실습 — 정비 부품 Agent 에 State 와 기억 더하기

14:00 ~ 14:50 (오후 ②) · 오후 ② 는 모두 시작 파일 `lab/pm/agent2.ts` 에서 시작한다. 오후 ① 까지의 정비 부품 Agent (그래프 · steps 멈춤) 가 들어 있다. 파일 안의 `// 실습 10` ~ `// 실습 13` 자리에 코드를 넣는다.

```bash
pnpm pm2
```

| 실습 | 할 일 | 성공하면 |
|---|---|---|
| 10 · 확인한 사실 필드 | State 에 `facts` 필드(`string[]`)를 두고, tools 노드가 도구 결과마다 한 줄씩 `facts` 로도 돌려준다. invoke 뒤에 `out.facts` 를 찍는다. 먼저 reducer 없이, 그다음 이어 붙이는 reducer 를 달고 | reducer 없이 `[STATE] facts 1개` (마지막 단계만) → 달면 `facts 7개` (정비 계획 · 부품마다 재고 · 대체품) |
| 11 · 부품별 재고표 | State 에 `stock` 필드(`Record<string, number>`). tools 노드가 재고가 나온 결과만 `{ [part_no]: 재고 }` 로 돌려주고, 표를 합치는 reducer 를 직접 만든다 | `[STATE] stock { 'PN-2208': 5, 'PN-4471': 1, 'PN-5150': 6, 'PN-7731': 3 }` (reducer 없이는 `{ 'PN-7731': 3 }`) |
| 12 · 이어서 묻기 | `compile({ checkpointer: new MemorySaver() })` 로 바꾸고, `{ configurable: { thread_id: "1" } }` 로 invoke. 같은 thread 로 "부족한 부품은 언제 들어와?" 를 이어서 묻는다 (새 user 메시지 하나만). 끝난 뒤 facts · stock 도 찍어 본다. thread_id "2" 로도 물어 본다 | thread 1 은 `PN-4471 … 2026-11-06 입고 예정`, facts · 재고표도 그대로 남아 있다. thread 2 는 기체번호를 되묻는다 |
| 13 · 입구와 출구 | State 에 `question` · `answer` 필드. `Input = { question }`, `Output = { answer, stock }` 로 `new StateGraph(State, { input: Input, output: Output })`. 질문을 대화에 넣는 `ask` 노드(처음이면 system 메시지부터)를 START 와 agent 사이에 두고, agent 는 최종 답이면 `answer` 도 돌려준다. 같은 thread 로 `invoke({ question })` 두 번 | `[OUT] [ 'answer', 'stock' ]` 두 번 — messages 는 밖으로 나오지 않는다 |

힌트: 강의 시연과 같은 모양이다. 막히면 answers 브랜치 → `lab/pm/answers/10.ts ~ 13.ts`, 따라잡기는 `pnpm step 11` 처럼

# 1일차 오후 ③ 실습 — 정비 부품 Agent 에 사람 끼우기

15:00 ~ 15:50 (오후 ③) · 오후 ③ 은 모두 시작 파일 `lab/pm/agent3.ts` 에서 시작한다. 오후 ② 까지의 정비 부품 Agent (facts · stock · 기억 · 입구와 출구) 가 들어 있다. 파일 안의 `// 실습 14` ~ `// 실습 17` 자리에 코드를 넣는다. `readline` · `LangGraphRunnableConfig` · `readStream` import 는 준비돼 있다.

```bash
pnpm pm3
```

| 실습 | 할 일 | 성공하면 |
|---|---|---|
| 14 · 진행 상황 보기 | `graph.invoke({ question }, thread1)` 을 `for await (const chunk of await graph.stream({ question }, { ...thread1, streamMode: "updates" }))` 로 바꾼다. 받을 때마다 `[STREAM] 노드 → 바꾼 필드들` 을 찍고, agent 가 도구를 요청했으면 도구 이름도 찍는다. 다 돈 뒤 답과 재고표는 `(await graph.getState(thread1)).values` 에서 꺼낸다 | 노드가 끝날 때마다 `[STREAM] agent → messages · steps  (도구 요청 check_stock, …)` 가 한 줄씩 나온다 |
| 15 · 토큰 스트리밍 | agent 가 쓰는 답을 토큰 단위로 흘려보낸다. ① `chat()` 의 body 에 `stream: true` 를 더하고, 응답은 `return readStream(res, onToken)` 으로 읽는다 (`lib/llm.ts` 에 준비돼 있다. `import { readStream } from "../lib/llm.js"`). ② `agentNode(state, config)` 에서 `chat(state.messages, (token) => config.writer?.(token))`. ③ 부르는 쪽은 `streamMode: ["updates", "custom"]`. 받은 값이 `[모드, 값]` 이라 custom 이면 `process.stdout.write(값)`, updates 면 실습 14 처럼 찍는다 | `[STREAM]` 줄 사이에 `[토큰] TR-1023 다음 정기 정비는 …` 이 글자가 써지는 대로 늘어난다. 끝의 `[답]` 은 다 돈 뒤 getState 에서 꺼낸 같은 답 |
| 16 · 청구 전에 멈추기 | `request_part` 청구 도구(아래 설명 + runTool 한 줄)를 더하고, system 메시지에 "정비일까지 모자라는 부품은 request_part 로 청구한다." 를 넣는다. tools 노드의 본문을 `runCalls` 로 빼고 `orderNode` 를 하나 더 만든다. route 는 청구 요청이면 `"order"`. `compile({ checkpointer, interruptBefore: ["order"] })`. 첫 질문 하나만 묻고, `getState(thread1).next` 에 order 가 있으면 청구 내용을 찍고 readline 으로 y / n 을 묻는다. y 면 `stream(null, …)` 로 이어 간다 | `[STREAM] ⏸ 멈춤` → `[멈춤] request_part {"part_no":"PN-4471",…}` → y → `[TOOL] request_part(…) → {"청구번호":"REQ-0001", …}`. n 이면 청구 직전에 멈춘 채로 끝난다 |
| 17 · 담당자 의견 넣기 | y 가 아니면 청구하지 않고, 청구 요청마다 `{ role: "tool", content: '{"결과":"청구하지 않았습니다. 담당자 의견: …"}' }` 를 `updateState(thread1, { messages }, "order")` 로 넣은 뒤 `stream(null, …)` 로 이어 간다 | "2개만 청구해" 라고 답하면 agent 가 다시 판단해 `qty: 2` 로 청구를 요청하고 또 멈춘다 → y 로 청구 |

실습 16 의 `request_part` — 도구를 만드는 법은 오전에 해 봤으니 그대로 복사해서 쓴다

```ts
// tools 배열에 더한다
{
  type: "function",
  function: {
    name: "request_part",
    description: "정비일까지 모자라는 부품을 상급 부대에 청구한다. 청구는 되돌리기 어렵다.",
    parameters: {
      type: "object",
      properties: { part_no: { type: "string", description: "부품번호. 예: PN-4471" }, qty: { type: "number", description: "청구할 수량" } },
      required: ["part_no", "qty"],
    },
  },
},

// runTool 위에 하나, runTool 안에 한 줄
let requests = 0; // 청구번호를 매기는 수
  if (name === "request_part") return { 청구번호: `REQ-${String(++requests).padStart(4, "0")}`, 부품번호: args.part_no, 수량: args.qty, 상태: "청구 접수" };
```

힌트: 강의 시연과 같은 모양이다. 막히면 answers 브랜치 → `lab/pm/answers/14.ts ~ 17.ts`, 따라잡기는 `pnpm step 15` 처럼. readline 으로 묻기 때문에 `pnpm pm3` 을 터미널에서 직접 돌린다

# 1일차 오후 ④ 실습 — 노드 안에서 묻고, 지난 기록으로 돌아가기

16:00 ~ 16:50 (오후 ④) · 오후 ④ 는 모두 시작 파일 `lab/pm/agent4.ts` 에서 시작한다. 오후 ③ 까지의 정비 부품 Agent (청구 도구 · order 노드 · 토큰 스트리밍) 가 들어 있고, 아직 멈추지 않는다 — order 노드가 묻지 않고 바로 청구한다. 파일 안의 `// 실습 18` · `// 실습 19` · `// 실습 20` 자리에 코드를 넣는다.

```bash
pnpm pm4
```

| 실습 | 할 일 | 성공하면 |
|---|---|---|
| 18 · interrupt 로 묻기 | ① order 노드의 `// 실습 18` 자리: `const reply = interrupt({ request: … })` 로 멈추고, `reply` 가 `"y"` 면 `runCalls(state)`, 아니면 `{ 결과: "청구하지 않았습니다. 담당자 의견: …" }` 를 도구 결과로 돌려준다. ② 아래쪽 `// 실습 18` 자리: `getState(thread1).next` 에 order 가 있는 동안, `tasks` 의 `interrupts` 에서 청구 내용을 꺼내 보여 주고, 답을 `run(new Command({ resume: answer }))` 으로 넣는다 | `[멈춤] request_part {…}` → 답 → 이어 감. 이어 갈 때마다 `[NODE] ▶ order` 가 한 번 더 찍힌다 (노드가 처음부터 다시 돈다). "2개만 청구해" 면 qty 2 로 다시 멈춘다 |
| 19 · 지난 기록 보기 | `// 실습 19` 자리: `for await (const s of graph.getStateHistory(thread1))` 로 checkpoint 마다 `[기록] step · next · messages 수` 를 찍는다. `next` 에 order 가 든 checkpoint(청구 직전)를 골라 `run(null, 그 checkpoint 의 config)` 로 다시 돌리고, order 에서 다시 멈추면 이번에는 다른 답을 한다 (실습 18 의 while 을 함수로 빼 두면 그대로 쓴다) | `[기록]` 이 최근 것부터 나오고, `[되감기]` 뒤 order 에서 다시 멈춘다. 다른 답으로 끝까지 가면 checkpoint 수가 늘어 있다 |
| 20 · 서브그래프로 보고서 만들기 | ① `// 실습 20` 자식 그래프 자리: `ReportState` (`question` · `stock` · `rows` · `report`) 와 노드 둘 — `compare` 는 질문의 기체번호로 정비 계획을 찾아 부품마다 필요 · 재고를 `rows` 에 담고 (번호가 바뀐 부품은 `substitutes` 의 대체품 재고), `format` 은 `rows` 를 표 문자열 `report` 로. compile 한다. ② 부모 State · Output 에 `report` 필드를 더하고, route 는 답이면 `"reporter"`, `addNode("reporter", reportGraph)` · `addEdge("reporter", END)`. 노드 이름은 State 필드 이름(`report`)과 같을 수 없다. ③ stream 에 `subgraphs: true` 를 주고, `print` 가 `[어느 그래프인지, 모드, 값]` 을 받아 자식 단계는 들여 쓴다. ④ 마지막에 `[보고서]` 를 찍는다 | `[STREAM]   └ compare → rows` · `└ format → report` 다음 `[STREAM] reporter → question · stock · report`. 끝에 `[보고서]` 표 — `PN-4471 브레이크 패드 · 필요 2 · 재고 1 → 1개 부족` |

`interrupt` · `Command` import, config 를 받는 `run(input, config)`, readline, 정비 계획 · 대체품 자료(`plans` · `substitutes`)는 시작 파일에 준비돼 있다.

힌트: 강의 시연과 같은 모양이다. 막히면 answers 브랜치 → `lab/pm/answers/18.ts ~ 20.ts` (시작 파일에 넣을 코드만 다르다), 따라잡기는 `pnpm step 19` 처럼
