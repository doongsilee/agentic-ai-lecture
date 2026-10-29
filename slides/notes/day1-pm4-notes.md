# 오후 ④ 발표자 노트 — 스스로 멈추고 되돌아가기

장 번호는 `slides/day1-pm4-control.html` 기준. 각 장마다

- **말할 것**: 읽으면서 말할 수 있게 쓴 대본
- **Academy 에서**: LangChain Academy 「Introduction to LangGraph」 대본에서 가져온 설명 (요약 · 번역)
- **우리 예로 바꾼 것 / 주의**: 우리 강의에 맞춰 바꾼 곳, 받을 만한 질문

오후 ④ 는 Academy **모듈 3 의 L4 · L5** 와 **모듈 4 L2 (Sub-graphs) 개념**, 그리고 1일차 정리다. 모듈 4 의 병렬 실행(L1)은 오후 ② 에서 다뤘으니 다시 보기 한 장만, Map-reduce (`Send`) 와 모듈 5 장기 기억은 2일차.

| 장 | Academy |
|---|---|
| 1 | 도입: 오늘 오후 ④ 의 세 가지 |
| 2 ~ 5 | 모듈 3 L4 Dynamic breakpoints · 시연 `demo/tutor-interrupt.ipynb` (6장) |
| 7 ~ 10 | 모듈 3 L5 Time travel · 시연 `demo/tutor-time-travel.ipynb` (11장) |
| 12 | 다시 보기: 오후 ② 의 동시 실행 + 합류 (모듈 4 L1) |
| 13 ~ 15 | 모듈 4 L2 Sub-graphs (개념) · 시연 `demo/tutor-subgraph.ipynb` (16장) |
| 17 ~ 20 | 실습 20 ~ 22 |
| 21 | 1일차 정리 |

2일차 강사가 1일차에 전제로 둔 것 중 오후 ④ 몫: `interrupt()` + `Command({ resume })` + thread_id (2일차 7단계 approve), 서브그래프 = 노드 · 이름이 겹치는 필드만 부모로 (1단계), `subgraphs: true` (`--watch`). 2일차 코드는 LangChain 포장 없이 OpenAI 호환 API + StateGraph 를 손으로 조립하니, 우리 코드와 모양이 같다.

---

## 1장 · 오후 ④ — 스스로 멈추고, 되돌아가고, 꽂는다

**말할 것**

오후 ③ 에서는 사람이 정해 둔 자리에서 그래프를 멈췄습니다. 이번 시간에는 세 가지를 더 합니다.

첫째, 그래프가 멈출 때를 스스로 정합니다. 노드가 상황을 보고 필요할 때만 멈추고, 사람의 답은 노드 안으로 바로 들어갑니다. 둘째, 지난 기록으로 돌아갑니다. 지난 checkpoint 에서 다시 돌려 보고, 다른 갈래로도 가 봅니다. 셋째, 그래프를 부품처럼 다른 그래프의 노드로 꽂습니다.

셋 다 오후 ② 의 checkpointer 위에서 돕니다. 실습에서는 앞의 둘을 정비 부품 Agent 에 넣어 봅니다.

---

## 2장 · breakpoint 는 늘 같은 자리에서 멈춘다

**말할 것**

오후 ③ 의 breakpoint 를 떠올려 보겠습니다. 멈출 노드를 `interruptBefore: ["tools"]` 처럼 이름으로 적었습니다. compile 할 때 적을 수도 있고, stream 을 부를 때 옵션으로 줄 수도 있었죠. 어느 쪽이든 돌리기 전에, 그래프 밖에서 정합니다.

그래서 그 노드에 닿으면 매번 멈춥니다. 사전에 있는 단어 ubiquitous 를 찾을 때도 멈추고, 사전에 없는 단어 serendipity 를 찾을 때도 멈춥니다. 우리는 없는 단어일 때만 묻고 싶은데요.

멈출지 말지를 돌리는 도중에, 그래프가 State 를 보고 정하게 하려면 어떻게 할까요. 필요할 때만 스스로 멈추는 것, 이걸 dynamic breakpoint 라고 합니다.

**Academy 에서** (L4)

- breakpoint 는 승인 · 디버깅 · State 고치기에 쓰인다. 그런데 그래프가 스스로 멈추게 하고 싶다면? 내부 breakpoint, 어떤 조건에 따라 멈추는 dynamic breakpoint
- 영상은 `NodeInterrupt` 로 보여 준다 (입력이 5글자보다 길면 step 2 에서 멈춤)

**우리 예로 바꾼 것 / 주의**

- `NodeInterrupt` 는 예전 방식이다. 지금 LangGraph.js 는 노드 안에서 `interrupt(값)` 을 부른다. 받을 만한 질문: "영상이랑 다른데?" → 같은 생각, 요즘 API. 영상은 멈춘 뒤 updateState 로 입력을 바꿔야 빠져나왔지만, `interrupt()` 는 `Command({ resume })` 로 답을 바로 넣는다

---

## 3장 · 노드 안에서 멈춘다 — interrupt()

**말할 것**

그래프의 상태에 따라, 돌다가 동적으로 멈추고 싶을 때가 있습니다. 그럴 때는 breakpoint 를 그래프 밖이 아니라 노드 안에 둡니다. Academy 는 이걸 내부 breakpoint, internal breakpoint 라고 부릅니다.

노드 안에 조건을 둡니다. State 값이 어떤지, 특정 플래그가 켜졌는지. 예를 들어 사전에 없는 단어일 때, 청구 금액이 기준을 넘을 때, State 에 "확인 필요" 플래그가 켜졌을 때. 조건이 맞으면 `interrupt(값)` 을 부르고, 그 자리에서 그래프가 멈춥니다. 조건이 안 맞으면 그냥 지나갑니다.

튜터 Agent 의 tools 노드라면, 사전을 찾아보고 없는 단어일 때만 `interrupt()` 를 부릅니다. 넘기는 값에는 무엇을 물을지 적습니다. "사전에 없는 단어입니다. 뜻을 알려 주세요" 와 그 단어.

부른 쪽, stream 으로 받는 쪽에는 `__interrupt__` 가 옵니다. 오후 ③ 에서는 빈 배열이었죠. 이번에는 `interrupt()` 에 넘긴 값이 그대로 들어 있습니다. 왜 멈췄는지를 그래프가 직접 알려 주는 겁니다.

멈춘 자리를 저장해 둬야 이어 갈 수 있으니, checkpointer 는 여전히 있어야 합니다.

**우리 예로 바꾼 것 / 주의**

- 준비하면서 확인함 (LangGraph.js 1.4.18): `__interrupt__` 는 `[{ id, value }]` 모양. `getState(thread).tasks[0].interrupts` 에도 같은 값이 있고, `next` 는 `["tools"]` (tools 노드가 끝나지 못한 채)
- invoke 로 부르면 결과에 `__interrupt__: [{ id, value }]` 가 붙는다
- 한 노드에서 `interrupt()` 를 여러 번 부를 수도 있다. 이어 갈 때마다 차례로 하나씩 답을 받는다 (시연에는 없다)

---

## 4장 · 답을 넣어 이어 간다 — Command

**말할 것**

이어 갈 때는 null 대신 `new Command({ resume: answer })` 을 넣습니다.

그러면 멈췄던 `interrupt()` 가 그 답을 돌려줍니다. `const meaning = interrupt(…)` 의 meaning 에 "뜻밖의 행운" 이 들어가는 겁니다. 이번에는 멈추지 않고 지나가서, 도구 결과에 그 뜻과 source: "사람" 이 붙습니다.

오후 ③ 에서 사람 의견을 넣으려면 human_feedback 노드를 따로 두고, 그 앞에서 멈추고, updateState 에 asNode 를 붙이고, null 로 이어 갔습니다. 이제는 노드 안 `interrupt()` 한 줄과 `Command({ resume })` 로 끝납니다.

승인도 같은 모양입니다. 노드 안에서 interrupt 로 "청구할까요?" 를 묻고, y 를 Command 로 넣습니다. 실습 20 에서 해 봅니다.

**우리 예로 바꾼 것 / 주의**

- resume 에는 문자열이든 객체든 넣을 수 있다. 그대로 `interrupt()` 의 돌려준 값이 된다
- human_feedback 노드 + asNode 가 쓸모없어진 건 아니다. 그래프 그림에 사람이 끼는 자리가 보이게 하고 싶으면 여전히 노드로 둔다. 노드 안에서 interrupt 를 부르면 그 노드가 곧 human_feedback 자리다

---

## 5장 · 이어 가면 노드가 처음부터 다시 돈다

**말할 것**

주의할 점이 있습니다. Command 로 이어 가면 멈췄던 노드가 멈춘 줄부터가 아니라 처음부터 다시 돕니다.

왜 그럴까요? `interrupt()` 는 await 로 기다리는 함수가 아닙니다. 불리면 예외를 던집니다. 그래서 그 아래 줄은 실행되지 않고 노드가 그 자리에서 끝납니다. LangGraph 가 그 예외를 받아서 멈춘 자리를 checkpoint 로 저장하고 실행을 끝냅니다. 어딘가에서 기다리고 있는 게 아니라 실행이 끝난 겁니다. 그래서 사람이 한 시간 뒤에 답해도 됩니다.

이어 갈 때는 노드를 처음부터 다시 돌립니다. 이번에는 `interrupt()` 가 예외를 던지지 않고 resume 으로 넣은 답을 돌려줍니다. 그 아래 줄은 이때 처음 실행됩니다.

그림을 보면, 처음에는 tools 시작, ubiquitous 찾기, serendipity 찾기, 그리고 멈춤. 이어 가면 다시 tools 시작, ubiquitous 를 또 찾고, serendipity 에서 이번에는 `interrupt()` 가 사람의 답을 돌려줍니다.

사전 찾기는 두 번 해도 괜찮습니다. 그런데 청구나 메일 보내기처럼 되돌리기 어려운 일을 `interrupt()` 앞에 두면 두 번 일어납니다. 그래서 그런 일은 `interrupt()` 뒤에 둡니다. 실습 20 의 청구가 그렇습니다.

그리고 예외로 멈추는 것이니, `interrupt()` 를 try/catch 로 감싸고 catch 에서 예외를 삼키면 멈추지 않습니다. 도구 실행을 try/catch 로 감싸는 코드가 흔해서 실제로 겪기 쉽습니다. 감싸야 한다면 catch 에서 다시 던집니다.

**우리 예로 바꾼 것 / 주의**

- 준비하면서 확인함: 노드 첫 줄의 console.log 가 이어 갈 때 다시 찍힌다. 시연 노트북 ③ 에서 `사전 찾기: ubiquitous` 가 두 번 나온다
- 준비하면서 확인함 (LangGraph.js 1.4.18): `interrupt()` 를 try/catch 로 감싸 보니 catch 에 `GraphInterrupt` 가 잡혔다. 다시 던지면 멈추고, 삼키면 멈추지 않는다. 이어 갈 때는 `interrupt()` 앞 줄이 다시 찍히고 다음 줄이 처음 찍혔다
- 받을 만한 질문: "왜 멈춘 줄부터가 아니라 처음부터?" → 예외로 노드를 끝냈으니 노드 중간의 지역 변수는 남아 있지 않다. checkpoint 는 노드 단위로 저장한다
- 받을 만한 질문: "await 처럼 기다리는 거 아닌가?" → 아니다. 실행이 끝난다. 서버라면 요청 하나를 붙잡고 있지 않는다

---

## 6장 · 시연: 그래프가 스스로 멈추기

**말할 것**

노트북 `demo/tutor-interrupt.ipynb` 입니다. tools 노드만 새로 썼습니다.

**순서와 볼 것**

1. 스스로 멈춘다: ubiquitous 는 멈추지 않고 답까지 간다 → serendipity 는 도구 요청 State 다음 `__interrupt__` 에 `{ question, word: "serendipity" }`. next `["tools"]`
2. 답을 넣는다: `Command({ resume: "뜻밖의 행운, …" })` → `▶ tools 시작` 이 다시 찍히고, 도구 결과에 `source: "사람"`, tutor 가 그 뜻으로 답
3. 다시 돈다: ubiquitous 랑 serendipity 를 같이 → 이어 갈 때 `사전 찾기: ubiquitous` 가 한 번 더
4. 직접 묻기: `getState(thread).tasks` 의 interrupts 에서 질문을 꺼내 `prompt()` 로 묻는다. 노트북 위쪽에 입력창

**주의**

- 모델을 부른다. 모델이 serendipity 를 사전에서 찾지 않고 바로 답하면 멈추지 않는다 — 그러면 다시 돌리거나 "사전에서 찾아 줘" 를 강조
- values 로 이어 가면 처음 받는 State 가 멈춘 자리의 State 라 도구 요청이 한 번 더 보인다 (오후 ③ 과 같다)

---

## 7장 · 되돌려 보기 — 바탕은 checkpoint

**말할 것**

앞에서 그래프를 멈추는 이유를 몇 가지 얘기했습니다. 사람의 승인을 받으려고, State 를 고치려고 멈췄습니다.

이제는 LangGraph 의 이전 상태를 보고, 다시 재생하고, 다른 갈래로 분기하는 방법을 알아보겠습니다. 이런 방법은 특히 디버깅에 유용합니다. Agent 가 왜 이렇게 답했는지 지난 단계를 하나씩 보고, 문제가 난 자리 직전에서 다시 돌려 보고, 그때 다르게 했으면 어땠을지 갈라져 봅니다. 오후 ③ 첫 장에서 "되돌려 보기는 오후 ④" 라고 했던 그것입니다. 묶어서 time travel 이라고 부릅니다.

이 셋의 바탕은 checkpoint 입니다. 지금까지 써 온 말들을 한 장에 정리하겠습니다. Academy 의 그림을 우리 튜터 Agent 로 바꿨습니다.

맨 위가 그래프입니다. 질문이 들어와서 tutor, tools, tutor 를 차례로 돌고 답이 나옵니다.

노드 하나가 도는 한 단계를 super-step 이라고 합니다. 오후 ② 에서 본 것처럼 두 노드가 동시에 돌면 그 둘은 같은 super-step 입니다.

checkpointer 는 super-step 마다 그때의 State 와 정보를 저장합니다. 이게 checkpoint 입니다. messages 가 몇 개인지, 다음에 돌 노드가 무엇인지가 들어 있습니다.

thread 는 checkpoint 의 모음입니다. thread_id 가 같으면 같은 모음에 쌓입니다.

checkpoint 하나를 꺼내면 StateSnapshot 이라는 모양으로 나옵니다. values, next, config. 오후 ② · ③ 에서 getState 로 보던 그 모양입니다.

getState 는 가장 최근 checkpoint 하나를 줍니다. getStateHistory 는 전부를 줍니다. 최근 것부터. 그리고 stream 에 null 을 넣으면 가장 최근 checkpoint 에서 이어 갑니다.

다음 장부터는 이 중 getStateHistory 로 지난 것들을 꺼내고, 지난 checkpoint 에서 이어 가 봅니다.

**Academy 에서** (L5)

- 같은 구성의 그림 (Graph · Super-steps · Checkpoints · Thread · StateSnapshot · get_state · get_state_history · stream(None, thread)). 순차 노드는 각각 다른 super-step, 동시에 도는 노드는 같은 super-step

**우리 예로 바꾼 것 / 주의**

- 그림은 단순하게 세 단계만 그렸다. 실제로는 처음 넣은 입력 (step -1) 과 tutor 직전 (step 0) checkpoint 도 있다. 다음 장의 실제 목록에서 보인다
- checkpoint 의 messages 수 (3 · 4 · 5) 는 system · user 를 포함한 수. 다음 장 목록과 같다

---

## 8장 · 지난 기록을 본다 — getStateHistory

**말할 것**

checkpointer 는 노드가 하나 돌 때마다 State 를 저장합니다. 지금까지 우리는 그중 마지막 것만 봤습니다. getState 입니다.

getStateHistory 는 이 thread 의 checkpoint 를 전부 돌려줍니다. 최근 것부터 하나씩 옵니다. 하나하나는 getState 로 보던 것과 같은 모양입니다. values, next, config. config 에는 checkpoint_id 가 들어 있습니다.

맨 아래 step -1 이 처음 넣은 입력, 그다음 tutor 를 돌기 직전, tools 를 돌기 직전, … 맨 위가 지금입니다.

**Academy 에서** (L5)

- human-in-the-loop 의 세 번째 쓰임새, 디버깅. 지난 상태를 보고(viewing), 다시 돌리고(replaying), 갈라져 본다(forking). 모아서 time travel
- `get_state_history` 로 모든 checkpoint 를 본다. StateSnapshot 은 checkpoint 의 타입

**우리 예로 바꾼 것 / 주의**

- 장표의 step 번호와 messages 수는 튜터 Agent 가 도구를 한 번 쓰는 경우. 실제 시연에서는 모델이 몇 번 도구를 부르느냐에 따라 달라진다

---

## 9장 · 지난 자리에서 다시 돌린다 — replay

**말할 것**

지난 checkpoint 를 하나 고릅니다. tutor 가 처음 모델을 부르기 직전, step 0. 그 config 로 `stream(null, …)` 을 부르면 그 자리부터 다시 돕니다.

이때 그 뒤의 노드는 다시 실행됩니다. 모델도 다시 부릅니다. 그래서 답이 처음과 조금 다를 수 있습니다.

어디에 쓸까요? 오래 걸린 실행에서 뭔가 이상했을 때, 처음부터 다시 돌리지 않고 문제가 난 자리 직전으로 돌아가 다시 봅니다.

**Academy 에서** (L5)

- checkpoint_id 를 config 에 넣고 None 으로 돌리면 그 자리부터 돈다. 영상은 "이미 돈 노드는 다시 실행하지 않고 다시 재생(replay)한다" 고 말한다

**우리 예로 바꾼 것 / 주의**

- 준비하면서 확인함 (LangGraph.js 1.4.18): 지난 checkpoint 에서 stream(null) 을 부르면 그 뒤의 노드가 **다시 실행된다** (tutor 노드 호출 수가 늘었다). Academy 영상의 설명과 다르다. 장표는 실제 동작대로 썼다. 받을 만한 질문이니 미리 말해 두면 좋다
- 다시 돈 것도 같은 thread 에 새 checkpoint 로 쌓인다. getState 는 가장 최근, 다시 돈 쪽을 보여 준다

---

## 10장 · 다른 갈래로 가 본다 — fork

**말할 것**

이번에는 같은 checkpoint 에 updateState 로 값을 넣습니다. "아니, meticulous 를 찾아 줘".

지난 checkpoint 를 고치는 게 아닙니다. 그 뒤에 새 checkpoint 가 하나 생깁니다. updateState 가 그 새 checkpoint 의 config 를 돌려주니, 그걸로 이어 가면 새 갈래로 돕니다. 모델은 meticulous 를 찾습니다.

원래 기록은 지워지지 않습니다. 갈래도 같은 thread 에 쌓이고, getState 는 가장 최근 것을 보여 줍니다.

"그때 다르게 답했으면 어땠을까" 를 확인할 때 씁니다. 실습 21 에서 청구 직전으로 돌아가 다른 답을 해 봅니다.

**Academy 에서** (L5)

- 지난 checkpoint 에 update_state 를 하면 fork 된 checkpoint 가 생긴다. 영상은 사람 메시지를 같은 id 로 넣어 덮어쓰고 (Multiply 5 and 3), 그 갈래로 돌린다

**우리 예로 바꾼 것 / 주의**

- 우리 messages 는 id 가 없고 이어 붙이는 reducer 라 덮어쓰지 않고 메시지를 하나 더 붙인다 (오후 ③ 13장과 같은 방식)
- 준비하면서 확인함: interrupt 로 멈췄던 지난 checkpoint 에 바로 `Command({ resume: 다른 답 })` 을 주면, 그때 넣었던 예전 답이 그대로 다시 쓰인다 (답이 그 checkpoint 에 저장돼 있다). 다른 답을 하려면 `stream(null, 그 config)` 로 다시 돌려 다시 멈추게 한 다음 Command 를 준다 — 실습 21 이 이렇게 한다

---

## 11장 · 시연: 지난 기록으로 돌아가기

**말할 것**

노트북 `demo/tutor-time-travel.ipynb` 입니다. 오후 ③ 과 같은 튜터 Agent 에 checkpointer 만 달았습니다.

**순서와 볼 것**

1. 지난 기록: ubiquitous 를 한 번 끝까지 → checkpoint 마다 step · next · messages 수 · 마지막 메시지 역할
2. 다시 돌리기: next 가 tutor 이고 messages 가 2개인 checkpoint (처음 모델을 부르기 직전) → 그 자리의 State 부터 다시. 모델을 다시 부른다
3. 갈라지기: 같은 checkpoint 에 "아니, ubiquitous 말고 meticulous 를" → 이어 가면 meticulous. 기록 수가 늘어난 걸 센다

**주의**

- 모델을 부른다. ② 에서 답이 처음과 다를 수 있다 — 그게 "다시 실행된다" 의 증거라고 말한다

---

## 12장 · 다시 보기 — 동시에 돌리고 합류하기

**말할 것**

subgraph 로 넘어가기 전에 오후 ② 에서 본 모양 하나를 다시 보겠습니다. START 에서 두 선이 나가면 grammar 와 vocab 이 같은 단계에서 동시에 돕니다. `addEdge(["grammar", "vocab"], "write")` 는 둘 다 끝나면 write 로 가라는 뜻입니다.

둘이 같은 필드에 쓰면 reducer 가 있어야 했죠. 없으면 InvalidUpdateError.

subgraph 도 노드라서, 이렇게 동시에 돌리고 합류시킬 수 있습니다.

**우리 예로 바꾼 것 / 주의**

- Academy 모듈 4 L1 (Parallelization) 의 핵심. 갈래 길이가 다를 때 기다리는 방식, 합친 결과의 순서는 다루지 않는다. 모듈 4 L3 의 Map-reduce (`Send`, 실행 중에 갈래 수를 정함) 도 2일차 코드가 쓰지 않아서 뺐다

---

## 13장 · 그래프를 노드로 꽂는다 — subgraph

**말할 것**

이제 그래프를 부품처럼 씁니다. 사전 찾기를 따로 그래프로 만들어 compile 했다고 해 보겠습니다. look 하고 check 하는 작은 그래프.

이걸 부모 그래프의 addNode 에 그대로 넣습니다. `.addNode("dictionary", dictionary)`. 부모에게는 노드 하나입니다. pick 다음 dictionary, 그다음 write.

왜 이렇게 할까요? 큰 Agent 를 나눠서 만들고, 따로 시험하고, 다른 그래프에서 다시 쓸 수 있습니다.

**Academy 에서** (모듈 4 L2)

- 서브그래프는 다른 그래프 안의 노드로 쓰는 그래프. 여러 팀이 나눠 만들거나 다른 State 를 쓰는 부분을 나눌 때. 부모와 자식은 겹치는 키로 소통한다
- 영상은 로그 분석을 두 서브그래프 (실패 분석 · 요약) 로 나눠 동시에 돌린다

---

## 14장 · 무엇이 오가나 — 이름이 같은 필드만

**말할 것**

부모 State 에는 question, word, meaning, answer 가 있고, 자식 State 에는 word, meaning, tries 가 있습니다.

둘은 이름이 같은 필드만 주고받습니다. 들어갈 때 자식은 word 만 받습니다. question 은 자식 State 에 없는 이름이라 넘어가지 않습니다. 나올 때는 word 와 meaning 이 부모로 올라옵니다. tries 는 자식만의 필드라 자식 안에 남습니다.

**우리 예로 바꾼 것 / 주의**

- 준비하면서 확인함: 자식의 첫 노드가 받은 필드는 `word` 하나. 부모 updates 의 dictionary 값은 `{ word, meaning }` (tries 없음)
- 받을 만한 질문: "이름이 다르면?" → 자식을 노드 함수 안에서 직접 invoke 하고 필드를 옮겨 담는다 (Academy 의 다른 방식). 오늘은 이름을 맞추는 방식만

---

## 15장 · 안쪽 단계까지 본다 — subgraphs: true

**말할 것**

부모를 stream 하면 dictionary 는 한 번에 끝난 노드로 보입니다. 안에서 look 하고 check 한 건 안 보이죠.

`subgraphs: true` 를 주면 자식 안의 단계도 옵니다. 받는 값이 `[어느 그래프인지, 값]` 으로 바뀝니다. 빈 배열은 부모, `["dictionary:…"]` 는 자식입니다.

자식 안에서 무슨 일이 있었는지 볼 때, 디버깅할 때 켭니다.

**우리 예로 바꾼 것 / 주의**

- 준비하면서 확인함: updates · values 둘 다 `[namespace, chunk]` 모양. namespace 의 `dictionary:` 뒤는 실행마다 바뀌는 id

---

## 16장 · 시연: 그래프를 노드로 꽂기

**말할 것**

노트북 `demo/tutor-subgraph.ipynb` 입니다. 모델을 부르지 않아서 바로 돕니다.

**순서와 볼 것**

1. 노드로 꽂기: invoke 결과에 answer 까지. 자식 look 이 찍은 "받은 필드: [ word ]"
2. 이름이 같은 필드만: 결과에 tries 가 없다
3. 안쪽 단계: updates 만이면 pick · dictionary · write, subgraphs: true 면 그 사이에 자식의 look · check

---

## 17장 · 실습: 노드 안에서 묻고, 지난 기록으로 돌아가기

**말할 것**

오후 ④ 는 모두 시작 파일 `lab/pm/agent4.ts` 에서 시작합니다. 오후 ③ 까지의 정비 부품 Agent 가 들어 있고, 아직 멈추지 않습니다. 파일 안의 `// 실습 20` ~ `// 실습 22` 자리에 코드를 넣으면 됩니다. `pnpm lab 20` 처럼 실습 번호를 붙여 돌립니다. 18 은 청구를 order 노드 안에서 묻는 것, 19 는 지난 기록을 찍고 청구 직전으로 돌아가 보는 것, 20 은 재고 보고서를 서브그래프로 만들어 꽂는 것입니다.

---

## 18 ~ 20장 · 실습 20 ~ 22

**실습 20 · interrupt 로 묻기**

- 시작 파일 `agent4.ts` 는 오후 ③ 의 interruptBefore · updateState 없이 시작한다 (지우는 일이 없게). 넣을 곳은 두 군데: orderNode 의 `// 실습 20` 과 아래쪽 `// 실습 20`. 정답 18 은 시작 파일에 이 두 곳만 채운 것
- 성공 화면에서 `[NODE] ▶ order` 가 두 번 찍힌다. 이어 갈 때 노드가 처음부터 다시 돈 것 — 5장 얘기. 그래서 청구 (`runCalls`) 는 interrupt 뒤에 있다
- 담당자 의견은 orderNode 가 도구 결과로 돌려준다. 오후 ③ 실습 19 에서 updateState(…, "order") 로 하던 일이 노드 안으로 들어왔다. 노드가 직접 돌려주니 asNode 도 필요 없다
- 멈춘 이유는 `getState(thread1).tasks` 의 `interrupts` 에서 꺼낸다 (`[{ id, value }]`)
- mock: 실습 19 와 같은 규칙. "2개만 청구해" 면 qty 2 로 다시 청구 요청

**실습 21 · 지난 기록 보기**

- run 은 시작 파일에서 이미 config 를 받는다 (지난 checkpoint 의 config 로 stream 해야 하니까). 넣을 곳은 `// 실습 21` 한 군데
- 실습 20 의 while 을 함수 (answerPauses) 로 빼 두면 되감은 뒤에도 그대로 쓴다
- `history.find((s) => s.next.includes("order"))` 는 최근 것부터 찾으니 마지막 청구 직전이 나온다
- 성공 화면의 청구번호가 REQ-0002 다. checkpoint 는 되돌아가도, 이미 보낸 청구 REQ-0001 은 바깥 세상에 남는다 (runTool 의 청구 카운터는 그래프 밖에 있다). "time travel 은 State 만 되돌린다. 바깥에 한 일은 안 되돌린다" — 좋은 이야깃거리
- 지난 interrupt checkpoint 에 바로 `Command({ resume: 다른 답 })` 을 주면 예전 답 (y) 이 그대로 쓰인다 (10장 주의). 그래서 `run(null, config)` 로 다시 멈추게 한 다음 답한다
- mock 으로 확인함: y → 기록 14개 → 되감기 → "2개만 청구해" → qty 2 로 다시 멈춤 → y → REQ-0002, 기록 19개

**실습 22 · 서브그래프로 보고서 만들기**

- 자식 그래프 `reportGraph`: question · stock 이 부모에서 들어오고, rows 는 자식 안에만, report 가 부모로 나간다. 장표 15장 (이름이 같은 필드만) 을 직접 확인하는 실습
- 준비하면서 겪은 함정: 노드 이름을 `report` 로 하면 `report is already being used as a state attribute` 에러. 노드 이름은 State 필드 이름과 같을 수 없다 → `reporter`. 학생도 그대로 겪을 만하니 미리 짚는다
- `addNode("reporter", …)` 는 `addConditionalEdges` 보다 먼저 와야 TypeScript 가 "reporter" 를 노드 이름으로 안다 (순서가 바뀌면 타입 에러)
- `subgraphs: true` 와 streamMode 배열을 같이 주면 받는 값이 `[어느 그래프인지, 모드, 값]` 셋이 된다. print 를 이 모양으로 바꿔야 한다. 자식 단계의 위치는 `["reporter:…"]`
- 성공 화면의 `[STREAM] reporter → [바꾼 필드] question · stock · report`: 부모 쪽 updates 에는 자식이 돌려준 이름이 같은 필드가 다 나온다 (rows 는 없다)
- 실습 21 의 되감기 뒤에도 보고서 노드가 다시 돌아서 보고서가 두 번 찍힌다. 그대로 둬도 된다
- mock 으로 확인함: 보고서 4줄, PN-4471 1개 부족, PN-7730→PN-7731 대체품 재고 3

---

## 21장 · 1일차 정리

**말할 것**

오늘 하루를 돌아보겠습니다. 오전에는 손으로 Agent 루프를 만들었습니다. tool_calls 를 받아 실행하고 role: tool 로 돌려주는 왕복, 그리고 도구는 설명과 함수라는 것.

오후 ① 에서 그 루프를 그래프로 다시 만들었습니다. 노드, 엣지, route, 멈추는 길. ② 에서 State 와 reducer, checkpointer 와 thread 로 기억을 얻었습니다. ③ 에서 사람이 보고, 멈추고, 고칠 자리를 만들었고, ④ 에서 그래프가 스스로 멈추고, 지난 기록으로 돌아가고, 그래프를 꽂았습니다.

오늘 손으로 만든 코드는 `lab/am/agent.ts` 와 `lab/pm/agent.ts` 부터 `agent4.ts` 까지입니다. 정답은 answers 브랜치에 있습니다.

**우리 예로 바꾼 것 / 주의**

- 장표와 말할 것에는 2일차 얘기를 넣지 않는다 (아직 다루지 않은 것은 먼저 꺼내지 않는다). 2일차 연결은 강사 머리말 참고
