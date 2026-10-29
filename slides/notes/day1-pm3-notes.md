# 오후 ③ 발표자 노트 — 사람이 끼어들기

장 번호는 `slides/day1-pm3-hitl.html` 기준. 각 장마다

- **말할 것**: 읽으면서 말할 수 있게 쓴 대본
- **Academy 에서**: LangChain Academy 「Introduction to LangGraph」 대본에서 가져온 설명 (요약 · 번역)
- **우리 예로 바꾼 것 / 주의**: 우리 강의에 맞춰 바꾼 곳, 받을 만한 질문

오후 ③ 은 Academy **모듈 3 의 L1 ~ L3** 이다. L4 (dynamic breakpoints) · L5 (time travel) 는 오후 ④.

| 장 | Academy |
|---|---|
| 1 ~ 2 | 도입: 언제 사람이 끼어들어야 하나 · 보고 · 멈추고 · 고친다 (강의 소개 · L1 · L2 첫머리) |
| 3 ~ 6 | 모듈 3 L1 Streaming · 시연 `demo/tutor-stream.ipynb` (7장) |
| 8 ~ 11 | 모듈 3 L2 Breakpoints · 시연 `demo/tutor-breakpoints.ipynb` (12장) |
| 13 ~ 15 | 모듈 3 L3 Editing State and Human Feedback · 시연 `demo/tutor-edit-state.ipynb` (16장) |
| 17 ~ 18 | 실습 준비 (청구만 따로 노드로) |
| 19 ~ 22 | 실습 16 ~ 19 |

Academy 는 산수 Agent (multiply) 로 보여 주지만, 우리는 오후 ① · ② 의 영어 튜터 (`lookup_word`) 로 시연하고 정비 부품 Agent 로 실습한다. Academy 의 LangGraph API · SDK 부분 (Studio 서버에 붙어서 stream · interrupt) 은 장표에서 뺐다. 오후 ① 처럼 Studio 를 강사 화면으로만 보여 줄 수 있다 (아래 16장 주의).

---

## 1장 · 언제 사람이 끼어들어야 하나 — human-in-the-loop

**말할 것**

오후 ① 에서 만든 Agent 는 도구를 고르고 부르는 것까지 혼자 합니다. 편하지만, 사람이 꼭 확인해야 하는 때가 있습니다. 세 가지입니다.

첫째, 승인입니다. 되돌리기 어려운 일을 하기 전입니다. DB 에 쓰기, 메일 보내기, 결제 같은 것. 오늘 실습에서는 정비 부품 청구입니다. 한 번 청구하면 되돌리기 어렵습니다. 그래서 Agent 가 청구하려고 하면 사람이 먼저 보고 승인합니다.

둘째, 고치기입니다. Agent 가 잘못 알아들었을 때입니다. 학생이 ubiquitous 를 물었다가 "아니, meticulous 를 찾아 줘" 라고 바꿨다면, 처음부터 다시 돌리지 않고 State 를 고쳐서 이어 갑니다.

셋째, 되돌려 보기입니다. Agent 가 왜 이렇게 답했는지 알고 싶을 때, 지난 단계로 돌아가 다시 돌려 봅니다. 이건 오후 ④ 에서 합니다.

셋 다 같은 바탕 위에서 돕니다. 오후 ② 에서 본 checkpoint, 단계마다 저장해 둔 State 입니다.

**Academy 에서** (강의 소개 · L1 · L2 첫머리 · 모듈 4 첫머리)

- 강의 소개: 모듈 3 은 human-in-the-loop — 승인이나 State 고치기 같은 일에 사람이 끼어든다. 모듈 1 의 Agent 에 도구 호출 전 human-in-the-loop 을 붙이고, streaming 도 같이 다룬다
- L1 첫머리: human-in-the-loop 은 메모리 위에서 돌아가고, 사용자가 그래프와 여러 방식으로 상호작용하게 해 준다. 그 무대를 깔려고 streaming 부터 본다
- L2 첫머리: 좋은 쓰임 세 가지 — 승인 (민감한 도구: DB 쓰기, 외부 서비스), 디버깅 (되감아서 재현), 편집 (사람 피드백으로 State 를 직접 고친다)
- 모듈 4 첫머리 요약: 모듈 3 은 도구 사용 같은 행동의 승인, time travel 로 하는 디버깅, State 편집을 다뤘다

**우리 예로 바꾼 것 / 주의**

- Academy 에는 모듈 3 의 도입 영상이 따로 없다. 위 네 군데에 흩어진 이야기를 이 장 하나로 모았다
- 결제 · 메일은 예시일 뿐 실습에는 없다. 실습의 "되돌리기 어려운 일" 은 request_part (청구)

---
## 2장 · 사람이 중간에 확인하려면

**말할 것**

오후 ① 의 튜터 Agent 를 떠올려 보겠습니다. 질문을 받으면 tutor 가 모델을 부르고, 모델이 원하면 tools 에서 사전을 찾고, 다시 tutor 가 답을 씁니다. 지금은 이 과정을 끝까지 혼자 갑니다. invoke 가 끝날 때까지 아무것도 안 보이고, 모델이 무엇을 찾으려는지 확인할 틈도 없습니다.

사람이 중간에 확인하려면 세 가지가 필요합니다. 첫째, 지금 무엇을 하는지 볼 수 있어야 합니다. stream 입니다. 둘째, 정해 둔 자리, 예를 들어 사전을 찾기 직전에 멈출 수 있어야 합니다. breakpoint 입니다. 셋째, 멈춘 동안 State 를 고쳐서 이어 갈 수 있어야 합니다. updateState 입니다.

이 순서대로 갑니다. Academy 모듈 3 의 L1, L2, L3 순서와 같습니다. 실습에서는 이걸 정비 Agent 의 부품 청구에 씁니다.

**Academy 에서** (L1 · L2 첫머리)

- 모듈 3 은 human-in-the-loop. 그 앞에 streaming 을 먼저 다룬다 — 단계마다 State 를 내보낼 수 있어야 사람이 끼어들 수 있다

**우리 예로 바꾼 것 / 주의**

- 이론 · 시연은 튜터 Agent, 실습은 정비 Agent (오후 ① · ② 와 같은 나눔). 17장 (실습 준비) 만 정비 Agent 이야기

---

## 3장 · 답이 나올 때까지 아무것도 안 보인다

**말할 것**

단어 두 개를 찾아서 문장을 고쳐 달라고 해 보겠습니다. 튜터는 모델을 두 번 부릅니다. 한 번은 사전을 찾겠다고 하고, 사전을 찾은 뒤 한 번 더 불러서 답을 씁니다.

그런데 우리는 지금까지 invoke 로 불렀습니다. invoke 는 그래프가 END 에 닿아야 돌아옵니다. 준비하면서 재 보니 14.7초였습니다. 그 사이에 노드 안에서 찍는 로그는 그래프를 돌리는 쪽, 서버에만 보입니다.

이 튜터를 웹 화면에 붙였다면, 학생은 15초 동안 멈춘 화면을 봅니다. 사전을 찾는 중인지, 답을 쓰는 중인지도 모릅니다.

**Academy 에서** (L1)

- 모듈 3 은 human-in-the-loop 이고, 그 앞에 streaming 을 먼저 다룬다. 모듈 2 의 요약 챗봇을 다시 띄워서 stream 해 본다

**우리 예로 바꾼 것 / 주의**

- 그림의 시간 (8.5초 · 14.3초 · 14.7초) 은 시연 노트북 `tutor-stream` 을 준비하면서 잰 값. 그날 OpenRouter 상황에 따라 다르다

---

## 4장 · 노드가 끝날 때마다 받는다 — stream

**말할 것**

invoke 대신 stream 으로 부르면 됩니다. stream 은 노드가 하나 끝날 때마다 값을 하나씩 돌려줍니다. `for await` 로 하나씩 꺼냅니다.

그러면 그래프를 부른 쪽이 중간 과정을 받습니다. 8초쯤에 "사전을 찾는 중", 14초쯤에 답. 이런 걸 화면에 띄울 수 있습니다.

다 돈 뒤의 State 는 어떻게 보느냐. checkpointer 가 달려 있으면 오후 ② 의 getState 로 봅니다. 아니면 마지막으로 받은 값까지 모아 두면 됩니다.

무엇을 받을지는 streamMode 로 고릅니다. 다음 장입니다.

**Academy 에서** (L1)

- 스트리밍 메서드는 `.stream` 과 `.astream` (동기 · 비동기). 상태를 스트리밍하는 방법이 여러 가지다

**우리 예로 바꾼 것 / 주의**

- LangGraph.js 에서는 `await graph.stream(...)` 이 AsyncIterable 을 돌려준다. `for await (const chunk of await graph.stream(...))` 처럼 await 가 두 번
- Python 의 sync · async 구분은 JS 에 없다

---

## 5장 · 바뀐 것만, 아니면 전부 — streamMode

**말할 것**

노드 셋이 차례로 A, B, C 를 더한다고 해 보겠습니다.

updates 는 노드가 돌려준 값만 줍니다. 처음은 node_a 가 돌려준 A, 그다음은 node_b 의 B. 받는 값의 모양은 `{ 노드 이름: 돌려준 값 }` 입니다. 그래서 "누가 무엇을 했나" 를 알기 좋습니다.

values 는 그때의 State 전체를 줍니다. A, 그다음 A B, 그다음 A B C. 처음 넣은 입력만 있는 State 가 먼저 나옵니다.

진행 상황을 띄우려면 updates, 화면에 State 를 통째로 그리려면 values 가 편합니다.

**Academy 에서** (L1)

- values 는 노드가 불릴 때마다 그래프의 전체 상태를, updates 는 노드가 만든 업데이트만 스트리밍한다. A → A B → A B C 그림으로 설명
- updates 로 받으면 `{ 노드 이름: 업데이트 }` 모양이 온다

**우리 예로 바꾼 것 / 주의**

- 다른 streamMode 도 있다: `"messages"` (LangChain 모델의 토큰), `"custom"` (노드가 직접 보내는 값), `"debug"`. 여러 개를 배열로 주면 `[모드, 값]` 으로 온다 (5장)

---

## 6장 · 모델이 쓰는 글자를 바로 보여 주려면 — token streaming

**말할 것**

updates 로도 모델의 답은 노드가 끝나야 옵니다. ChatGPT 처럼 글자가 써지는 대로 보여 주려면 모델에게서 답을 토큰 단위로 받아야 합니다.

chat API 에 `stream: true` 를 주면, 답이 토큰 단위로 옵니다. 노드가 토큰을 받을 때마다 `config.writer` 로 그래프 밖에 흘려보내고, 부르는 쪽은 `streamMode: "custom"` 으로 받습니다.

**말로만 설명할 것** (장표에는 없다. 이번 강의는 LangChain 을 일부러 쓰지 않아서, 장표에 넣으면 오히려 헷갈린다)

Academy 영상은 토큰을 `astream_events` 로 받습니다. TypeScript 에도 같은 게 있습니다 (`graph.streamEvents(input, { version: "v2" })`). 그런데 이건 LangChain 모델 객체(ChatOpenAI 같은)로 부를 때만 토큰이 나옵니다. LangChain 모델이 토큰을 받을 때마다 신호를 보내 주고, LangGraph 가 그 신호를 모아 이벤트로 내보내는 방식이라서요. `streamMode: "messages"` 도 같은 방식입니다.

우리는 오전부터 fetch 로 직접 불렀습니다. 그러면 그 신호가 없으니 이벤트도 안 옵니다. 그래서 노드가 직접 `config.writer` 로 흘려보내고 custom 으로 받습니다. Python 이냐 TypeScript 냐의 차이가 아니라, LangChain 모델을 쓰느냐의 차이입니다.

- 준비하면서 확인함 (LangGraph.js 1.4.18): LangChain 모델을 부르는 노드는 `streamEvents` 에서 `on_chat_model_stream` 이 글자마다 나왔다. 같은 그래프를 fetch 처럼 직접 받는 노드로 바꾸면 `on_chain_start/end` · `on_chain_stream` 만 나오고 토큰은 0개. `config.writer` 로 보낸 값도 streamEvents 에는 나오지 않았다 → fetch 로 부르면 토큰 받는 길은 custom 하나
- fetch 로 `streamMode: "messages"` 를 받아 보면 받는 값이 0개 (준비하면서 확인함)

**Academy 에서** (L1)

- 그래프 안의 LLM 토큰은 `astream_events` 로 받는다. 이벤트의 metadata 에 `langgraph_node` 가 있어서 특정 노드의 토큰만 골라낼 수 있다. `on_chat_model_stream` 이벤트의 `data.chunk.content` 를 찍으면 토큰이 나온다
- LangGraph API 에는 messages 스트림 모드가 따로 있어서, 도구 요청이 만들어지는 것까지 토큰으로 보인다

**우리 예로 바꾼 것 / 주의**

- `astream_events` · `on_chat_model_stream` 는 LangChain 모델에서 나오는 이벤트라서, fetch 로 부르는 우리 코드에서는 나오지 않는다. 그래서 `config.writer` + `"custom"` 으로 보여 준다
- SSE 응답은 `data: {...}` 줄 단위로 오고, 마지막은 `data: [DONE]`. 도구 요청(`tool_calls`) 도 `index` 별로 나눠서 와서 이어 붙여야 한다 (시연 노트북의 `chatStream`)
- 받을 만한 질문: "LangChain 모델로 바꾸면?" → `@langchain/openai` 의 ChatOpenAI 를 OpenRouter 주소로 쓰면 `streamMode: "messages"` 가 바로 된다. 오늘은 오전 코드를 그대로 두려고 쓰지 않았다

---

## 7장 · 시연: 진행 상황 보기

**말할 것**

노트북 `demo/tutor-stream.ipynb` 로 보겠습니다. 오후 ① 의 튜터 Agent 그대로입니다.

**순서와 볼 것**

1. invoke: 단어 두 개를 찾아 문장을 고친다. 15초쯤 아무것도 없다가 답이 한꺼번에 (준비하면서 14.7초)
2. updates: 8초쯤에 tutor 의 도구 요청, 바로 tools 의 사전 결과 둘, 14초쯤에 답. tools 는 messages 2개 — 그 노드가 돌려준 것만
3. values: messages 2 → 3 → 5 → 6. 첫 State 는 입력
4. 토큰: 긴 답 (결론 문단 쓰는 법) 을 글자 단위로. 질문 끝의 `/no_think` 로 qwen3 의 생각(reasoning)을 꺼서 첫 글자가 1초쯤. "빼면 10초 넘게 걸린다 — 생각(reasoning) 줄이 먼저 오기 때문. SSE 들여다보기에서 본 수백 줄이 그것"

**주의**

- 첫 글자까지의 시간은 그날 OpenRouter 상황에 따라 다르다. 너무 늦으면 3번까지만 보여 주고 4번은 결과만 말로
- 4번의 `Deno.stdout.write` 는 노트북에서 줄바꿈 없이 이어서 찍힌다

---

## 8장 · 정해 둔 노드에서 멈춘다 — breakpoint

**말할 것**

앞에서는 스트리밍으로 진행 상황을 봤습니다. 이제 진짜 human-in-the-loop, 사람이 실제로 끼어드는 방법입니다.

여기서 breakpoint 라는 개념이 나옵니다. 정해 둔 노드에서 그래프를 멈추는 것입니다. LangGraph 는 이걸 거는 방법을 두 가지 줍니다. 하나는 interruptBefore, 적어 둔 노드를 실행하기 직전에 멈춥니다. 다른 하나는 interruptAfter, 적어 둔 노드를 실행한 직후에 멈춥니다. 거는 자리도 두 군데입니다. compile 할 때 적으면 그 그래프는 늘 거기서 멈추고, stream 을 부를 때 옵션으로 주면 그 실행만 멈춥니다.

그림은 예시로 tools 를 적은 경우입니다. interruptBefore 면 모델이 도구를 요청한 뒤, 도구를 실제로 돌리기 전에 멈춥니다. interruptAfter 면 도구를 돌린 뒤, 결과를 가지고 tutor 로 가기 전에 멈춥니다.

주의할 점이 하나 있습니다. 앞에서 다룬 checkpointer 가 반드시 설정되어 있어야 합니다. 인터럽트는 State 를 저장해 놓고 멈춘 다음, 나중에 그 State 에서 다시 실행하는 방식이기 때문입니다. 저장할 곳이 없으면 멈출 수는 있어도 이어 갈 수가 없습니다.

**Academy 에서** (L2)

- 브레이크포인트: compile 할 때 `interrupt_before=["tools"]`. 그래프는 그 노드 직전까지 돌고 멈춘다. `interrupt_after` 도 있다
- LangGraph API 를 쓰면 interrupt_before 를 compile 대신 실행할 때 인자로 넘길 수도 있다

**우리 예로 바꾼 것 / 주의**

- 실행할 때 줄 수도 있다: `graph.stream(입력, { ...thread, streamMode, interruptBefore: ["tools"] })`. 같은 그래프라도 이 옵션을 준 실행만 멈춘다 (준비하면서 확인함, interruptAfter 도 같다). 장표 아래 코드 두 줄. Academy 의 LangGraph API 부분(`client.runs.stream(..., interrupt_before=...)`) 이 이것
- checkpointer 없이 interruptBefore 만 주면 멈춘 뒤 이어 갈 수 없다
- 질문이 나오면: 노드 안에서 readline 으로 기다리면 그동안 실행이 붙잡혀 있다. 그래프가 멈추면 checkpoint 에 남기고 실행을 끝내니까, 담당자가 나중에 답해도 같은 thread 로 이어 간다. 단 MemorySaver 는 메모리에만 저장해서 서버가 다시 켜지면 사라진다 (오후 ② 22장)

---

## 9장 · 멈춘 자리를 본다 — getState

**말할 것**

앞에서 배운 stream 으로 돌려 보면, State 가 차례로 오다가 breakpoint 자리에서 State 대신 `__interrupt__` 가 옵니다. 그리고 그래프 실행이 끝납니다. for await 루프도 거기서 끝납니다.

그럼 어디서 멈춘 걸까요. 이걸 확인할 때 getState 를 씁니다. 오후 ② 에서 본 그 getState 입니다.

여기에 next 필드가 있습니다. 다음에 돌 노드입니다. 값을 보면 멈췄는지, 다 돈 건지 알 수 있습니다. `["tools"]` 면 tools 앞에서 멈춘 것이고, 빈 배열 `[]` 이면 그래프가 끝까지 돌아 종료된 것입니다.

values 는 지금의 State 입니다. 마지막 메시지가 도구 요청이니까 모델이 무엇을 하려는지도 여기서 보입니다.

**Academy 에서** (L2)

- 그래프는 단계마다 State 를 checkpointer 가 checkpoint 로 쓴다. checkpoint 에는 State 와 다음에 갈 곳, checkpoint id 같은 정보가 있다. thread 는 checkpoint 의 모음. StateSnapshot 은 checkpoint 의 타입
- `get_state` 는 가장 최근 checkpoint, `get_state_history` 는 전체 목록

**우리 예로 바꾼 것 / 주의**

- 준비하면서 확인함 (LangGraph.js 1.4.18): interruptBefore 로 멈추면 values · updates 어느 모드든 마지막에 받는 값이 `{ __interrupt__: [] }` 이다. 값은 빈 배열이라 어디서 멈췄는지는 안 알려 준다 → 그래서 getState 의 next. invoke 로 부르면 결과 State 에 `__interrupt__: []` 키가 붙는다
- config (어느 thread 의 어느 checkpoint 인지) 도 snapshot 에 있지만 장표에서는 뺐다. 오후 ④ time travel 에서 다시 나온다
- `snapshot.tasks` 에도 다음에 돌 작업이 들어 있다. next 만 보면 충분하다

---

## 10장 · null 을 넣으면 이어 간다

**말할 것**

이어 가는 방법입니다. 같은 thread 로, 입력 자리에 null 을 넣어 부릅니다. "새 입력은 없다, 멈춘 자리에서 계속" 이라는 뜻입니다.

첫 번째 stream 은 tutor 까지 돌고 tools 앞에서 멈췄습니다. `__interrupt__` 를 받고 루프가 끝났죠. 두 번째, null 로 stream 을 부르면 멈춘 자리부터 다시 돌며 State 가 옵니다. tools 가 사전을 찾고, tutor 가 답하고 끝납니다. 이번에는 `__interrupt__` 가 오지 않습니다.

입력을 넣으면 어떻게 될까요? 새 질문으로 처음부터 돕니다. 그래서 이어 갈 때는 꼭 null 입니다.

**Academy 에서** (L2)

- `graph.stream(None, thread)` 처럼 None 을 넣으면 현재 checkpoint 에서 다시 실행한다. 현재 State 를 한 번 다시 내보내고 다음 노드로 간다

**우리 예로 바꾼 것 / 주의**

- Python 은 None, JS 는 null
- 준비하면서 확인함: values 로 이어 가면 처음 받는 State 가 멈춘 자리의 State (도구 요청이 마지막 메시지) 다. 같은 메시지가 한 번 더 보여서 헷갈려하면 이 얘기
- invoke 로도 똑같이 된다 (`invoke(null, thread)`). 오늘은 앞에서 배운 stream 으로 통일했다
- 멈춘 상태에서 null 대신 새 입력을 넣으면: 남은 도구 요청에 결과가 없는 채로 새 user 메시지가 붙는다. 모델 API 가 "tool_calls 뒤에 tool 결과가 없다" 고 거절할 수 있다. 실습 18 에서 n 이면 질문을 더 하지 않는 이유

---

## 11장 · 승인은 멈추기 · 보기 · 이어 가기를 묶은 것

**말할 것**

이제 셋을 묶으면 승인이 됩니다. stream 이 `__interrupt__` 를 받고 멈추면, getState 로 모델이 하려는 일을 사람에게 보여 주고, y 면 null 로 stream 을 다시 부릅니다. 장표의 run 은 시연 노트북에서 stream 루프를 묶은 함수입니다.

아니면요? 멈춘 채로 두면 일은 거기서 끝입니다. 모델은 거절당한 줄도 모릅니다. 거절이나 의견을 그래프에 알려 주려면 State 를 고쳐야 합니다. 시연을 먼저 보고 나서 다룹니다.

**Academy 에서** (L2)

- user_approval 입력을 받아서 yes 면 None 으로 이어 간다. 멈춰 있는 동안 사람이 승인하는 단계

---

## 12장 · 시연: 멈추고, 보고, 승인하기

**말할 것**

노트북 `demo/tutor-breakpoints.ipynb` 입니다. 8 ~ 11장을 차례로 돌려 봅니다. Academy L2 처럼 승인까지만 하고, State 고치기는 다음 시연입니다.

**순서와 볼 것**

1. 멈춘다: stream 으로 돌리면 질문 State · 도구 요청 State 뒤에 `__interrupt__` 가 오고 루프가 끝난다. 사전은 아직 찾지 않았다
2. 본다: getState 의 next `["tools"]`, 모델이 하려는 일 `lookup_word {"word": "ubiquitous"}`
3. 이어 간다: `run(approveAgent, null, thread1)`. 처음 받는 State 는 멈춘 자리의 State (도구 요청이 한 번 더 보인다) → tools → 답. `__interrupt__` 없이 끝난다
4. 승인: `prompt()` 가 노트북 위쪽에 입력창을 띄운다 (Python 의 `input()` 과 같다). y 로 한 번, 승인 ① 부터 다시 돌려서 n 으로 한 번 더. n 이면 tools 앞에 멈춘 채로 남는다 → "거절을 그래프에 알리려면?" 으로 13장

**주의**

- 모델을 부른다. 답의 말투는 매번 조금씩 다르다
- `run` 은 ① 의 stream 루프를 함수로 묶은 것. 처음 한 번은 루프를 그대로 보여 주고 나서 묶는다

---

## 13장 · 멈춘 동안 State 를 고친다 — updateState

**말할 것**

멈춰 있는 동안에는 State 를 볼 수만 있는 게 아니라 고칠 수도 있습니다. Agent 는 State 를 보고 다음에 할 일을 정하니까, State 를 고치면 Agent 의 다음 동작이 바뀝니다. 그럼 실제로는 언제 고칠까요?

방향을 바꿀 때. 사용자가 요청을 바꿨습니다. 학생이 ubiquitous 를 물었다가 "아니, meticulous 를 찾아 줘" 라고 합니다. 처음부터 다시 돌릴 필요 없이 메시지를 하나 더 넣고 이어 가면 됩니다.

실행할 값을 고칠 때. 도구 요청을 보니 대체로 맞는데 값 하나가 틀렸습니다. 청구 수량이 3 인데 2 면 된다, 메일 받는 사람이 틀렸다. 거절하고 다시 시키는 것보다 그 값만 고쳐서 실행하는 게 빠릅니다.

수정을 요청할 때. Agent 가 만든 초안이나 계획에 의견을 줍니다. "더 쉬운 말로", "2개만 청구해". 의견을 State 에 넣으면 모델이 그걸 보고 다시 합니다. 승인을 거절할 때도 같습니다. 11장에서 n 이면 멈춘 채로 끝났죠. 모델은 거절당한 줄도 모릅니다. 거절 이유를 넣어 주면 다시 판단합니다. 14장과 실습 19 가 이 경우입니다.

모르는 걸 알려 줄 때. 도구 결과가 낡았거나, 시스템에 아직 없는 사실이 있습니다. 재고 시스템에는 0 개인데 어제 2 개가 들어왔다. 사람이 아는 사실을 State 에 넣어 주면 Agent 가 그걸 바탕으로 판단합니다.

그림은 첫 번째, 방향을 바꾸는 경우입니다. 이번에는 tutor 앞에서 멈춥니다. 모델을 부르기 전입니다. 학생이 ubiquitous 를 물었다가 "아니, meticulous 를 찾아 줘" 라고 바꿨다고 해 보겠습니다.

`updateState(thread, 값)` 으로 State 에 값을 넣습니다. 노드가 돌려준 값과 똑같이 그 필드의 reducer 를 거칩니다. messages 는 이어 붙이는 reducer 니까 뒤에 붙습니다. 이어 가면 모델은 user 메시지 둘을 보고 meticulous 를 찾습니다.

값을 고치는 경우는 메시지를 바꿔치기해야 합니다. MessagesAnnotation 을 쓰면 됩니다. 오후 ② 11장의 같은 id 덮어쓰기. 기존 메시지와 같은 id 로 넣으면 붙지 않고 그 메시지를 바꿉니다.

**Academy 에서** (L3)

- assistant 앞에 interrupt 를 걸고, 멈춘 뒤 `update_state` 로 "No, actually multiply 3 and 3" 을 넣는다. messages 의 add_messages reducer 가 그대로 적용되어 뒤에 붙는다
- 이어 가면 모델이 새 메시지를 보고 3 × 3 을 계산한다. assistant 앞에 interrupt 가 있으니 도구를 돌고 와서 또 멈춘다. 한 번 더 None
- API 로 할 때는 마지막 메시지를 꺼내 content 만 고치고 id 는 그대로 두었다 → 같은 id 라 덮어쓰기

**우리 예로 바꾼 것 / 주의**

- 우리 튜터의 messages 는 `{ role, content }` 객체 + 이어 붙이는 reducer 라서 id 가 없다. 그래서 값을 고치는 경우 (바꿔치기) 는 말로만 (오후 ② 11장으로 연결). 시연은 방향 바꾸기, 수정 요청은 14 · 15장과 실습 19
- Studio 에서도 멈춘 State 를 화면에서 고치고 fork 해서 이어 갈 수 있다 (Academy L3). 시간이 남으면 강사 화면으로

---

## 14장 · 사람 의견을 넣는 자리를 노드로 둔다 — human feedback

**말할 것**

그럼 실행 도중에 사람의 입력을 받아서 State 에 넣고 싶다면 어떻게 할까요?

앞 장에서는 tutor 앞에서 멈추고, 그래프 밖에서 updateState 로 State 를 고쳤습니다. 되긴 하지만, 사람의 입력이 들어오는 자리가 그래프 어디에도 없습니다. 그래프만 봐서는 사람이 어디서 끼어드는지 모릅니다.

그래서 입력을 받는 자리를 아예 노드로 만들어 둡니다. human_feedback 이라는, 아무 일도 하지 않는 노드를 tutor 앞에 두고, 그 앞에서 멈추게 합니다. 사람의 입력은 이 노드가 돌려준 값처럼 State 에 넣습니다. 어떻게 넣는지는 다음 장입니다.

도구를 쓰고 돌아올 때마다 이 자리를 지나니까, 그때마다 입력을 받을 수 있습니다. 사람이 끼어드는 자리가 그래프 그림에 보입니다. 입력이 없으면 State 를 건드리지 않고 null 로 그냥 이어 갑니다.

**Academy 에서** (L3)

- breakpoint 에서 State 를 고칠 수 있다는 걸 보인 뒤 "사용자 입력을 명시적으로 받아 State 를 고치고 싶다면?" 으로 넘어간다. 아무 일도 하지 않는 dummy node (no-op) 를 assistant 앞에 두고 그 앞에서 interrupt 한다. 사람의 피드백을 그래프의 정해진 지점에 넣는다
- 앞에서는 assistant 앞에서 멈추고 assistant 노드 자리에서 State 를 고쳤다는 점과 대비한다

**우리 예로 바꾼 것 / 주의**

- LangGraph.js 에서 아무것도 안 하는 노드는 `() => ({})`. 준비하면서 실행 확인함
- tools → human_feedback → tutor 로 선을 바꿨다 (원래 tools → tutor)

---

## 15장 · 그 노드가 쓴 것으로 친다 — asNode

**말할 것**

의견을 넣을 때 updateState 에 세 번째 인자를 줍니다. 어느 노드가 쓴 값으로 칠지입니다.

asNode 없이 넣으면, LangGraph 는 마지막으로 돈 노드가 쓴 것으로 치고 그 노드 다음 자리를 다시 정합니다. 여기서 마지막으로 돈 건 tools 이고 tools 다음은 human_feedback 이니까, 다시 human_feedback 앞입니다.

`"human_feedback"` 을 주면, human_feedback 노드가 이 값을 돌려준 것이 됩니다. 그 노드는 돈 셈이니 다음 노드는 tutor 입니다. 이어 가면 tutor 가 의견을 보고 다시 판단합니다.

어느 노드가 쓴 것으로 칠지가 이어 갈 자리를 정합니다. 실습 19 에서는 이걸로 "청구 노드가 돈 것으로 치고, 결과 자리에 담당자의 말을 넣는다" 를 합니다.

**Academy 에서** (L3)

- `update_state(thread, 업데이트, as_node="human_feedback")`: 이 업데이트를 human_feedback 노드가 한 것처럼 적용한다. 더 넣을 피드백이 없으면 그냥 이어 간다

**우리 예로 바꾼 것 / 주의**

- 준비하면서 확인함: 튜터 그래프에서 asNode 없이 넣으면 next 는 `["human_feedback"]` (이어 가면 human_feedback 을 돌고 tutor 로 — 결과는 같아 보인다). asNode 를 주면 next 가 `["tutor"]`
- 차이가 크게 나는 건 마지막으로 돈 노드 다음이 갈림길일 때다. 실습 19 의 order 앞에서 asNode 없이 넣으면, agent 가 쓴 것으로 쳐서 route 를 다시 본다. 마지막 메시지가 도구 결과라 route 는 END — 그래프가 답 없이 끝나 버린다 (mock 으로 확인)

---

## 16장 · 시연: 멈춘 동안 고치기

**말할 것**

노트북 `demo/tutor-edit-state.ipynb` 입니다. 준비 칸은 앞 노트북과 같습니다.

**순서와 볼 것**

1. State 고치기: tutor 앞에서 멈춤 → updateState 로 "아니, ubiquitous 말고 meticulous 를 찾아 줘" → user 메시지 둘 → null 로 두 번 이어 간다 (tutor 앞에서 또 멈추니까) → meticulous 의 뜻
2. human_feedback: next `["human_feedback"]` → asNode 로 의견 → next `["tutor"]` → 이어 가면 meticulous 를 찾고 human_feedback 앞에서 다시 멈춤 → 의견 없이 null → 답

**주의**

- 모델을 부른다. 답의 말투는 매번 조금씩 다르다
- values 로 이어 가면 처음 받는 State 가 멈춘 자리의 State 라서 같은 메시지가 한 번 더 찍힌다
- Studio (강사 화면, 선택): `cd demo/studio && pnpm studio` 의 pm3-approve · pm3-edit · pm3-feedback 그래프로, 또는 agent 그래프의 노드에 interrupt 를 걸고 멈춘 State 를 고쳐 보일 수 있다. 시간이 남을 때만

---

## 17장 · 멈출 자리는 노드 단위로 정한다

**말할 것**

이제 정비 Agent 에 적용해 보겠습니다. 그런데 정비 Agent 의 tools 앞에서 멈추면 어떻게 될까요? 정비 계획 조회, 재고 조회, 대체품 찾기 — 조회할 때마다 멈추고 묻습니다. 한 질문에 몇 번씩.

조회는 되돌릴 필요가 없는 일입니다. 되돌리기 어려운 건 청구뿐입니다. 그래서 청구만 order 라는 노드로 따로 뺍니다. route 가 청구 요청이면 order, 다른 도구면 tools 로 보냅니다. 하는 일은 둘이 같습니다.

그리고 interruptBefore 는 order 하나만. 조회는 그냥 돌고, 청구 앞에서만 사람을 거칩니다. 멈출 자리는 노드 단위라서, 멈추고 싶은 일을 노드로 나누는 게 설계입니다.

**우리 예로 바꾼 것 / 주의**

- Academy 에는 없는 장. Academy 는 tools 전체 앞에서 멈춘다 (도구가 산수라서 문제가 없다)
- 모델이 청구와 조회를 한 번에 같이 요청하면 그 메시지 전체가 order 로 간다. 조회도 승인을 거치게 되지만 안전한 쪽이라 그대로 둔다
- 오후 ④ 의 dynamic interrupt 를 쓰면 노드 안에서 "청구일 때만" 멈출 수도 있다. 오늘은 노드를 나누는 방법으로

---

## 18장 · 실습: 정비 부품 Agent 에 사람 끼우기

**말할 것**

실습은 세 개입니다. 14 는 진행 상황을 stream 으로 받기, 15 는 청구 앞에서 멈추고 y / n, 16 은 y 가 아니면 담당자의 말을 State 에 넣어서 다시 판단하게 하기.

시작 파일 `lab/pm/agent3.ts` 에 오후 ② 까지의 Agent 가 들어 있으니, 모두 여기서 시작합니다. `// 실습 16` 부터 `// 실습 19` 까지 표시된 자리에 넣으면 됩니다. readline 으로 묻기 때문에 터미널에서 직접 `pnpm lab 16` 처럼 실습 번호를 붙여 돌립니다.

---

## 19 ~ 22장 · 실습 16 ~ 19

**실습 16 · 진행 상황 보기**

- 성공 화면: `[STREAM] agent → [바꾼 필드] messages · steps  (도구 요청 …)` 가 노드마다 한 줄. updates 로 받는 값의 키가 "그 노드가 바꾼 필드" 라는 걸 짚는다 (tools 는 messages · facts · stock 셋)
- 출력 schema 가 있어도 stream 의 updates 에는 노드가 바꾼 필드가 그대로 나온다. 답과 재고표는 getState 로
- 자주 막히는 곳: `await graph.stream(...)` 의 await 를 빠뜨림 → tsc 가 타입 에러를 낸다 (실행하면 async iterable 이 아니라는 에러)

**실습 17 · 토큰 스트리밍**

- 학생이 SSE 를 직접 읽지 않는다. `lib/llm.ts` 의 `readStream(res, onToken)` 을 부르기만 한다. 시연 노트북의 readStream 과 같은 함수라는 걸 짚는다
- 바꿀 곳은 세 군데: fetch 에 `stream: true` · agentNode 의 두 번째 인자 config 와 `config.writer` · streamMode 배열
- 성공 화면에서 `[답]` 이 토큰으로 한 번, getState 로 한 번 나온다. 앞은 흘러나온 것, 뒤는 State 에 저장된 것 — ⑤ 시연의 values + custom 과 같은 얘기
- stream 으로 받으면 응답에 usage 가 기본으로 오지 않는다. 그래서 `[LLM]` 줄의 입력 토큰 수는 뺐다
- mock 도 `stream: true` 면 SSE 로 나눠 보낸다 (lib/mock.ts 의 mockStream). 키 없이도 글자가 흘러나온다
- 자주 막히는 곳: streamMode 를 배열로 바꾸면 받는 값이 `[모드, 값]` 이 된다. 실습 16 의 `progress(chunk)` 를 그대로 두면 깨진다. TypeScript 가 `[모드, 값]` 으로 알아보게 `as const` 를 붙인다

**실습 18 · 청구 전에 멈추기**

- request_part 는 오전에 없던 도구라서 lab/README.md 에 정의를 두었다. 복사해서 쓴다 (도구 만들기는 오전에 해 봤으니). runTool 에 청구번호를 매기는 줄
- 실제 모델 (준비하면서 돌려 봄): PN-7730 (조회 실패한 옛 번호) 을 대체품 확인 없이 바로 청구하려다 멈췄다. "그래서 사람이 확인한다" 의 좋은 예. mock 은 PN-4471 1개를 청구한다
- 실제 모델은 청구를 아예 안 하고 답할 때도 있다. 그러면 멈춤 없이 끝난다 — system 메시지의 청구 문장을 확인
- n 이면 멈춘 채로 끝난다. getState 의 next 가 `["order"]` 로 남아 있다는 걸 보여 준다 (다음 실습으로)

**실습 19 · 담당자 의견 넣기**

- updateState 의 asNode 가 "order" 라서 order 는 돈 것이 된다. 그래서 청구는 실행되지 않고, 담당자의 말이 도구 결과 자리를 채운다. 다음은 order → agent 선을 따라 agent. asNode 를 빼면 agent 가 쓴 것으로 쳐서 route 가 END 로 보내고, 답 없이 끝난다 (15장 주의)
- tool_call_id 를 맞춰서 넣어야 한다. 도구 요청마다 결과가 하나씩 있어야 모델 API 가 받는다
- mock: "2개만 청구해" 처럼 "N개" 가 있으면 그 수량으로 다시 청구를 요청한다 (lib/mock.ts 에 규칙 추가). 그 밖의 말이면 청구하지 않고 답한다
- 실제 모델 (준비하면서 돌려 봄): PN-7730 청구에 "PN-7730 은 조회 실패한 번호다. 대체품부터 찾아봐" 라고 답하자 find_substitute 로 PN-7731 을 찾았다. "2개만 청구해" 처럼 맞지 않는 의견을 주면 청구를 포기하고 답하기도 했다 — 모델이 의견을 어떻게 받아들일지는 정해져 있지 않다

---

## 23장 · 오후 ③ 정리

**말할 것**

세 가지입니다. 진행 상황 보기: stream 으로 부르면 노드가 끝날 때마다 값이 옵니다. 멈추고 이어 가기: interruptBefore 로 정해 둔 노드 앞에서 멈추고, getState 로 보고, null 로 이어 갑니다. 고쳐서 이어 가기: updateState 로 State 를 고치고, asNode 로 이어 갈 자리를 정합니다.

다음 시간에는 멈출지를 그래프가 스스로 정하게 하고, 지난 checkpoint 로 돌아가 다시 돌려 봅니다.

**주의**

- 오전 덱의 시간표 (`slides/day1-am.html`) 에 적힌 오후 ③ · ④ 설명은 이 개편 전의 것이다. 바꿀지 확인 필요
