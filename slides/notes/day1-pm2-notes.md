# 오후 ② 발표자 노트 — State 와 기억

장 번호는 `slides/day1-pm2-state.html` 기준. 각 장마다

- **말할 것**: 읽으면서 말할 수 있게 쓴 대본
- **Academy 에서**: LangChain Academy 「Introduction to LangGraph」 대본에서 가져온 설명 (요약 · 번역)
- **우리 예로 바꾼 것 / 주의**: 우리 강의에 맞춰 바꾼 곳, 받을 만한 질문

오후 ② 는 Academy **모듈 1 의 L7 (Agent Memory)** 과 **모듈 2 전체 (State and Memory)** 다.

| 장 | Academy |
|---|---|
| 1 ~ 5 | 모듈 2 L1 State Schema (5장 zod 는 Academy 의 Pydantic 자리) |
| 6 ~ 11 | 모듈 2 L2 Reducers |
| 12 ~ 13 | 모듈 2 L3 Multiple Schemas (12 private state · 13 input / output) · 1 ~ 13 의 시연 `demo/state-reducers.ipynb` (14장) |
| 15 ~ 17 | 모듈 1 L7 Agent Memory · 시연 `demo/tutor-memory.ipynb` (18장) |
| 19 ~ 20 | 모듈 2 L4 Trim and Filter |
| 21 | 모듈 2 L5 Chatbot w/ Summarization |
| 22 | 모듈 2 L6 External Memory (개념만) · 19 ~ 22 의 시연 `demo/long-chat.ipynb` (23장) |
| 24 ~ 28 | 실습 12 ~ 15 |

Academy 는 L7 (checkpointer) 을 모듈 1 끝에 두지만, 우리는 State · reducer · 단계를 먼저 설명하고 나서 "그 State 를 단계마다 저장한다" 로 checkpointer 를 꺼낸다.

---

## 1장 · State 는 무엇인가

**말할 것**

오후 ① 에서 State 는 "노드들이 같이 보는 것" 정도로만 보고 넘어갔습니다. 이번 시간에는 State 를 조금 더 깊이 보고, 그 State 로 기억과 긴 대화까지 다뤄 보겠습니다.

먼저 State 가 무엇인지부터 다시 보겠습니다. State 는 그래프가 도는 동안 노드들이 함께 들고 다니는 객체 하나입니다. 평범한 자바스크립트 객체입니다.

오후 ① 의 이메일 분석 그래프로 보겠습니다. 처음에 invoke 로 넣는 State 에는 학생이 쓴 글, text 하나만 있습니다. classify 노드는 이 State 를 받아서 글을 읽고, 이메일이라고 판단해서 kind 를 돌려줍니다. 그러면 State 에 kind 가 생깁니다. 다음 analyze_email 노드는 text 와 kind 가 다 들어 있는 State 를 받고, 분석해서 feedback 을 돌려줍니다.

이 객체의 키 하나하나를 필드라고 부릅니다. text 필드, kind 필드, feedback 필드입니다.

노드는 State 전체를 다시 만들어 돌려주지 않습니다. 바꾸고 싶은 필드만 돌려줍니다. 나머지 필드는 그대로 다음 노드로 넘어갑니다.

**Academy 에서** (모듈 1 L2 복습)

- State 는 그래프의 모든 노드와 엣지가 함께 쓰는 입력 schema 이자 데이터다. 노드는 State 를 받아 업데이트를 돌려준다

**주의**

- "그럼 State 는 전역 변수인가?" → 비슷하게 보이지만, 노드가 직접 고치지 않고 돌려준 값을 LangGraph 가 합친다. 어떻게 합치는지가 뒤의 reducer 다

---

## 2장 · State 를 정의한다 — schema

**말할 것**

State 가 왜 필요할까요? 세 가지 이유가 있습니다.

첫째, 노드는 서로를 부르지 않습니다. classify 는 analyze_email 을 직접 부르지 않고, 결과를 돌려주고 끝납니다. 그 결과를 State 에 두면 다음 노드가 꺼내 씁니다. 노드끼리 값을 넘겨주는 통로가 State 입니다.

둘째, 갈림길도 State 를 보고 정합니다. 오후 ① 의 route 함수는 State 의 kind 나 messages 를 보고 다음 노드를 골랐습니다.

셋째, LangGraph 가 필드를 알아야 합니다. 노드가 돌려준 값을 필드마다 합치고, 단계마다 저장해 두려면 어떤 필드가 있는지 미리 알아야 합니다. 둘 다 뒤에서 봅니다.

그래서 State 를 미리 정의해 둡니다. 이 정의가 schema 입니다. schema 는 State 를 정의하기 위한 방법이고, 필드마다 키, 즉 필드 이름과, 그 필드에 들어갈 값의 타입을 지정합니다. 코드로는 `Annotation.Root` 안에 필드 하나에 한 줄씩 적고, `new StateGraph(State)` 로 그래프에 넘깁니다. 오후 ① 에서 계속 쓰던 그 코드입니다.

다음 장에서 어떤 타입을 적을 수 있는지 보겠습니다.

**Academy 에서** (L1)

- schema 는 그래프가 쓸 데이터의 구조와 타입이다. Python 에서는 TypedDict 를 주로 쓴다. 편하고 권장된다

---

## 3장 · 어떤 타입을 지정할 수 있나

**말할 것**

TypeScript 타입이면 어떤 타입이든 지정할 수 있습니다. 글이면 string, 숫자면 number, 참/거짓이면 boolean 입니다.

정해진 값 중 하나만 오게 할 수도 있습니다. kind 처럼 "email" 아니면 "ielts" 라고 적으면 됩니다. 여러 개를 모으는 필드는 배열로 적습니다. 실습에서 facts 를 이렇게 적습니다. 부품번호마다 재고 수량을 담는 표 같은 건 객체로 적습니다. 실습의 stock 필드입니다.

사실 TypeScript 타입이면 무엇이든 됩니다. 오후 ① 의 messages 는 메시지 객체의 배열이었습니다.

**Academy 에서** (L1)

- TypedDict 말고도 dataclass, Pydantic 으로 schema 를 정할 수 있다. dataclass 는 값을 `state["name"]` 대신 `state.name` 으로 꺼낸다는 정도만 다르다

**우리 예로 바꾼 것 / 주의**

- Python 의 TypedDict · dataclass → TypeScript 에서는 `Annotation` 에 TypeScript 타입을 적는다

---

## 4장 · 타입이 틀리면 어떻게 되나?

**말할 것**

kind 에 "poem" 처럼 정하지 않은 값이 들어오면 어떻게 될까요?

코드에 직접 `kind: "poem"` 이라고 쓰면, 편집기가 빨간 줄을 긋고 tsc 도 타입 에러를 냅니다. 여기까지는 TypeScript 가 지켜 줍니다.

문제는 실행 중입니다. TypeScript 타입은 코드를 쓸 때만 검사하고, 실행 중에는 아무도 확인하지 않습니다. 사용자가 입력한 값이나 모델이 돌려준 값처럼 실행 중에 밖에서 들어온 값은, 타입이 틀려도 그대로 State 에 들어갑니다. 노드는 "poem" 을 받고 그대로 돕니다.

그래서 밖에서 들어온 값은 따로 확인해야 합니다. 그걸 대신 해 주는 방법이 다음 장입니다.

**Academy 에서** (L1)

- TypedDict 와 dataclass 의 타입 힌트는 실행 중에 강제되지 않는다. mood 를 "happy" | "sad" 로 적어도 "mad" 를 넣으면 에러 없이 들어간다. 타입 검사기는 잡지만 실행 중에는 못 잡는다
- Pydantic 은 데이터 검증을 한다. "mad" 를 넣으면 ValidationError 가 난다. LangGraph 에 State 로 그대로 넘길 수 있다

**우리 예로 바꾼 것 / 주의**

- tsc 에러 문구는 `Type '"poem"' is not assignable to type '"email" | "ielts" | undefined'`
- 그림의 아랫줄 "실행 중에 들어오면" 이 다음 장 zod 로 이어진다

---

## 5장 · 실행 중에도 막으려면 — zod

**말할 것**

실행 중에 들어오는 값까지 막고 싶으면 schema 를 **zod** 로 적으면 됩니다.

왼쪽이 지금까지 쓴 Annotation, 오른쪽이 zod 입니다. 모양은 거의 같습니다. `z.object` 안에 필드를 적고, "email" 아니면 "ielts" 는 `z.enum` 으로 적습니다. 이걸 그대로 `new StateGraph(State)` 에 넘깁니다. 노드와 엣지는 하나도 안 바뀝니다.

차이는 실행 중입니다. Annotation 은 "poem" 이 들어와도 그냥 받습니다. zod 는 값이 State 에 들어오는 순간 검사해서, 정해 둔 값이 아니면 그 자리에서 에러를 내고 멈춥니다. 다음 노드는 틀린 값을 받지 않습니다.

모델의 답이나 사용자 입력처럼 밖에서 들어오는 값이 State 에 들어갈 때 쓰면 좋습니다. 오늘 실습은 Annotation 으로 갑니다.

**Academy 에서** (L1)

- Academy 는 TypedDict → dataclass → Pydantic 순서로 보여 준다. Pydantic 만 실행 중에 검증한다 (ValidationError). TypeScript 에서 그 자리가 zod 다

**우리 예로 바꾼 것 / 주의**

- 시연 노트북 ① 의 "실행 중에도 막으려면 — zod" 칸. classify 가 모델처럼 "poem" 을 돌려주면 `ZodError` · `Invalid option: expected one of "email"|"ielts"` 가 나고 analyze_email 은 돌지 않는다
- invoke 에 넣는 입력도 같은 방법으로 검사한다. `invoke({ kind: "poem" })` 도 같은 에러
- 노드가 돌려주는 타입은 zod 에서 나온다 (`z.infer`). 그래서 시연 코드도 "poem" 을 돌려주려면 `as any` 가 필요했다. 코드를 쓸 때 검사도 그대로 된다
- 받을 만한 질문: "zod 로는 reducer 를 어떻게 다나?" → `@langchain/langgraph/zod` 의 `registry` 에 등록한다. 장표에서는 다루지 않는다

```ts
import { registry } from "@langchain/langgraph/zod";
steps: z.array(z.string()).register(registry, {
  reducer: { fn: (prev: string[], next: string[]) => [...prev, ...next] },
  default: () => [],
}),
```

  registry 방식은 준비하면서 실행해 확인함. messages 는 `MessagesZodState` 가 있다 (`MessagesAnnotation` 의 zod 판)
- 받을 만한 질문: "그럼 처음부터 zod 를 쓰지 왜 Annotation 을?" → 둘 다 공식 방법이다. LangGraph.js 문서의 예제는 Annotation 이 많고, reducer 를 적는 법이 더 짧다. 검사가 필요한 그래프라면 zod 로 바꿔도 노드와 엣지는 그대로다

---

## 6장 · 노드가 돌려준 값은 어떻게 합쳐지나 — reducer

**말할 것**

노드는 State 를 받아서, 바꾸고 싶은 필드만 돌려준다고 했습니다. 그럼 돌려준 값은 State 에 어떻게 들어갈까요? 그걸 정하는 게 reducer 입니다. 필드마다 따로 정합니다.

reducer 를 안 적으면 어떻게 될까요? revision 이 1 인 State 에서 노드가 2 를 돌려주면, State 에는 2 가 남습니다. 덮어씁니다. LangGraph 는 이 필드를 어떻게 합치고 싶은지 모르기 때문에, 기본은 덮어쓰기입니다.

이어 붙이는 reducer 를 달면 다릅니다. 이미 "문법" 이 있는 필드에 노드가 "어휘" 를 돌려주면, 덮어쓰지 않고 뒤에 붙입니다.

사실 오후 ① 에서 이미 썼습니다. messages 필드는 이어 붙였고, steps 필드는 더했습니다. 둘 다 reducer 입니다.

**Academy 에서** (L2)

- reducer 는 schema 의 특정 키(채널)에 대한 State 업데이트를 어떻게 할지 정한다
- 기본으로 LangGraph 는 업데이트를 어떻게 하고 싶은지 모른다. 그래서 값을 덮어쓴다. foo 에 1 을 넣고 노드가 foo + 1 을 돌려주면 최종 State 는 2 다

**우리 예로 바꾼 것 / 주의**

- Academy 의 `foo` → `revision` (고쳐 쓴 횟수), `operator.add` → `(prev, next) => [...prev, ...next]`
- reducer 가 있는 필드는 `default` 로 시작값도 같이 적는다. 이어 붙이려면 처음에 빈 배열이 있어야 한다

---

## 7장 · reducer 는 schema 에 적는다

**말할 것**

reducer 를 어디에 적는지 코드로 보겠습니다. schema 에서 필드를 적을 때, Annotation 안에 reducer 와 default 를 같이 적습니다.

reducer 는 함수 하나입니다. 첫 번째 인자 prev 는 지금 State 에 있는 값, 두 번째 인자 next 는 노드가 돌려준 값입니다. 그리고 이 함수가 돌려준 것이 새 State 의 값이 됩니다.

default 는 처음 값입니다. 이어 붙이려면 처음에 빈 배열이 있어야 하니까, 빈 배열을 돌려주는 함수를 적습니다.

규칙을 바꾸려면 함수만 바꾸면 됩니다. 이어 붙이기는 두 배열을 펼쳐 합치고, 더하기는 두 숫자를 더합니다. 덮어쓰기는 reducer 를 안 적으면 됩니다.

**Academy 에서** (L2)

- Python 에서는 `Annotated[list[int], operator.add]` 처럼 타입에 reducer 함수를 붙인다. operator.add 는 리스트에 쓰면 이어 붙이기다

**우리 예로 바꾼 것 / 주의**

- Python 의 `Annotated[…, operator.add]` → TypeScript 의 `Annotation<string[]>({ reducer, default })`

---

## 8장 · 그래프는 단계로 돈다 — super-step

**말할 것**

다음 장으로 가기 전에, LangGraph 가 그래프를 어떻게 도는지 하나 짚고 가겠습니다.

LangGraph 는 그래프를 단계로 나눠서 돕니다. 한 단계에서는 이번에 실행할 노드들을 모아서 함께 돌립니다. 각 노드는 바꾸고 싶은 필드를 돌려줍니다. 그리고 단계가 끝나면, 돌려받은 값을 한꺼번에 State 에 합칩니다. 이때 reducer 를 씁니다. 합친 State 를 들고 다음 단계로 갑니다.

그림에서 START 에서 grammar 와 vocab 으로 선이 둘 다 나가 있습니다. 그러면 두 노드는 같은 단계에 들어가서 함께 돕니다. grammar 가 1초, vocab 이 3초 걸려도 상관없습니다. 합치는 건 단계 끝에 한 번입니다. 누가 먼저 끝났는지는 결과에 영향이 없습니다.

반대로 START → grammar → vocab 처럼 순서대로 이으면 단계가 둘로 나뉩니다. 1단계에서 grammar 의 값이 들어가고, 2단계에서 vocab 의 값이 그걸 덮어씁니다.

**Academy 에서** (L2)

- node 2 와 node 3 은 병렬로 돈다. 그래서 같은 단계(step)에 속한다

**주의**

- LangGraph 문서의 용어는 super-step. 강의에서는 "단계" 로 부른다
- 오후 ① 의 `recursionLimit` (기본 25) 도 이 단계 수를 센다

---

## 9장 · 같은 단계에서 두 노드가 같은 필드에 쓰면?

**말할 것**

앞 장의 그래프에서, 문법 분석과 어휘 분석이 둘 다 notes 필드에 쓴다고 해 보겠습니다. 둘은 같은 단계에서 함께 돕니다.

reducer 가 없으면 InvalidUpdateError 가 납니다. 한 단계에 같은 필드로 값이 둘 들어오니, 어느 쪽을 남길지 정할 수가 없습니다. LangGraph 는 조용히 하나를 버리지 않고 에러로 알려 줍니다.

이어 붙이는 reducer 를 달면 문제가 없습니다. 규칙이 있으니 같은 단계에 값이 둘 와도 합칠 수 있습니다. 여러 일을 동시에 돌리려면, 그 일들이 같이 쓰는 필드에는 reducer 가 있어야 합니다.

**Academy 에서** (L2)

- node 1 에서 node 2 · node 3 으로 갈라지는 그래프. 둘은 병렬로 돌고, 같은 단계(step)에 속한다
- 같은 단계에서 둘 다 foo 를 업데이트하면 어느 것을 남길지 모호하다. 그래서 `InvalidUpdateError: Can receive only one value per step` 가 난다
- reducer 는 이 문제를 푸는 일반적인 방법이다. 갈라지는 그래프에서 같은 단계에 여러 노드가 업데이트할 때 꼭 필요하다

**주의**

- LangGraph.js 의 에러 문구는 `LastValue can only receive one value per step`. LastValue 는 "마지막 값만 갖는 필드", 즉 덮어쓰는 필드다
- "순서대로 도는 노드 둘이 같은 필드에 쓰면?" → 에러가 아니다. 단계가 다르니 뒤의 것이 덮어쓴다

---

## 10장 · 규칙은 직접 만들 수도 있다 — custom reducer

**말할 것**

reducer 는 함수 하나입니다. 앞의 State 와 노드가 돌려준 값을 받아서, 합친 결과를 돌려줍니다. 그러니 규칙을 직접 만들 수도 있습니다.

단어장 필드를 예로 들어 보겠습니다. 문법 분석기는 ubiquitous 와 mitigate 를, 어휘 분석기는 mitigate 와 meticulous 를 골랐습니다. 그냥 이어 붙이면 mitigate 가 두 번 들어갑니다. 이어 붙이되 겹치는 건 빼는 규칙을 한 줄로 만들면, 세 단어만 남습니다.

정리하면 필드마다 고를 수 있는 규칙은 넷입니다. 덮어쓰기, 이어 붙이기, 더하기, 그리고 직접 만든 규칙.

**Academy 에서** (L2)

- 리스트 필드에 None 을 넣으면 `operator.add` 가 리스트와 None 을 더하지 못해 에러가 난다. 이런 경우 때문에 직접 만든 reducer 가 필요하다. 여러 리스트를 안전하게 합치는 함수를 만들어 reducer 로 쓴다

**우리 예로 바꾼 것 / 주의**

- Academy 의 None 예 → 단어장 중복 빼기. 우리 강의에는 None 을 넣을 일이 없어서다. "빈 값 처리" 는 장표에 한 마디로만 남겼다

---

## 11장 · messages 를 위한 reducer 는 미리 있다 — MessagesAnnotation

**말할 것**

대화, 그러니까 messages 는 거의 모든 Agent 에 있습니다. 그래서 LangGraph 에는 messages 를 위한 reducer 가 미리 들어 있습니다. MessagesAnnotation 을 State 로 쓰면 이 reducer 가 달린 messages 필드가 생깁니다.

이 reducer 는 세 가지를 합니다. 첫째, 뒤에 붙입니다. 여기까지는 우리가 직접 만든 이어 붙이기와 같습니다.

그림에 HumanMessage, AIMessage 가 보이죠. 오전부터 써 온 `{ role, content }` 는 모델 API 가 받는 모양입니다. 그런데 이 모양에는 id 가 없어서 "이 메시지를 고쳐라, 지워라" 를 가리킬 수가 없습니다. 그래서 LangGraph 는 messages 를 id 가 붙는 메시지 객체로 다룹니다. 모델 회사마다 다른 API 모양을 그래프 안에서는 한 가지로 맞추려는 이유도 있습니다. 넣을 때는 `{ role, content }` 로 넣어도 알아서 바꿔 줍니다.

다른 점은 메시지마다 id 가 붙는다는 것입니다. 둘째, 같은 id 의 메시지를 돌려주면 붙이지 않고 그 메시지를 바꿉니다. 셋째, RemoveMessage 에 id 를 담아 돌려주면 그 메시지를 지웁니다. 이 지우기는 뒤에서 긴 대화를 정리할 때 씁니다.

**Academy 에서** (L2)

- MessagesState 는 messages 키와 `add_messages` reducer 가 미리 들어 있는 지름길이다. 직접 TypedDict 로 messages 키에 add_messages 를 달아도 같다
- add_messages 는 메시지를 뒤에 붙인다. 메시지마다 id 가 붙고, 같은 id 의 메시지를 넘기면 덮어쓴다
- RemoveMessage 로 id 를 지정해 지울 수 있다. 메시지 기록을 정리하는 좋은 방법이고, 뒤의 레슨에서 쓴다

**우리 예로 바꾼 것 / 주의**

- Python 의 MessagesState · add_messages → TypeScript 의 `MessagesAnnotation` · `messagesStateReducer`
- 실습과 오후 ① 은 messages 를 `{ role, content }` 객체로 직접 다루고 이어 붙이는 reducer 를 직접 달았다. MessagesAnnotation 에 `{ role, content }` 를 넣으면 LangChain 메시지 객체로 바뀐다. 그래서 오전의 fetch `chat()` 에 그대로 넘기려면 `{ role, content }` 로 다시 바꿔야 한다 (노트북 `long-chat` 의 `toApi`)

---

## 12장 · 노드마다 받는 State 를 정할 수 있다 — private state

**말할 것**

지금까지는 모든 노드가 같은 State 하나를 받았습니다. 그런데 노드마다 받는 필드를 따로 정할 수도 있습니다.

글을 분석하는 analyze 와 피드백을 쓰는 write 가 있습니다. analyze 는 분석 메모 notes 를 남기고, write 는 그 메모로 피드백을 씁니다. notes 는 write 만 쓰면 되고, 그래프 밖으로 나갈 필요는 없습니다.

그래서 notes 는 그래프 State 인 Overall 에 넣지 않고 Private 이라는 schema 에 따로 적습니다. 그리고 write 를 등록할 때 `{ input: Private }` 를 줍니다. 그러면 write 는 Private 의 필드, notes 만 받습니다. text 는 받지 않습니다.

돌려 보면 결과에는 text 와 feedback 만 있고 notes 는 없습니다. notes 가 그래프 State 에 없기 때문입니다. 이렇게 노드끼리만 주고받고 밖으로는 안 나가는 값을 **private state** 라고 부릅니다.

**Academy 에서** (L3)

- 보통 모든 노드는 하나의 schema 로 통신한다. 하지만 노드끼리 주고받는 중간 값이 그래프의 입력 · 출력에는 필요 없을 때가 있다
- node 1 이 PrivateState 의 baz 를 쓰고 node 2 가 그걸 받는다. 최종 출력에는 baz 가 없다. Python 은 노드 함수의 타입 힌트(`def node_2(state: PrivateState)`) 로 받는 schema 를 정한다

**우리 예로 바꾼 것 / 주의**

- LangGraph.js 는 타입 힌트가 실행 중에 사라지니까 `addNode("write", fn, { input: Private })` 옵션으로 정한다 (4장에서 본 것처럼 타입은 실행 중에 사라진다)
- analyze 는 Overall 에 없는 notes 를 돌려줬는데 버려지지 않았다. write 의 입구 schema 에 notes 가 있어서 그래프가 notes 필드를 안다. 어느 노드의 입구 schema 에도 없으면 13장의 함정처럼 버려진다
- 노드 단위의 출구 옵션은 따로 없다. 노드는 그래프에 등록된 필드면 아무거나 돌려줄 수 있다
- 시연 노트북 ④ 의 첫 셀. 준비하면서 실행 · 타입 검사 확인함

---

## 13장 · 밖에서 넣는 필드, 내보내는 필드 — input / output schema

**말할 것**

앞 장은 노드 하나가 받는 필드였고, 이번에는 그래프 전체입니다. 지금까지는 그래프에 넣을 때도 State, 받을 때도 State 전부였습니다. 그런데 쓰는 쪽에는 필요 없는 필드가 있습니다. 학생은 글을 넣고 피드백만 받으면 됩니다. 분석기끼리 주고받은 notes 는 그래프 안에서만 쓰는 메모입니다.

`StateGraph` 에 State 전체와 함께 입구와 출구를 따로 줄 수 있습니다. 입구는 text, 출구는 feedback. 출구는 State 에서 무엇만 내보낼지 거르는 필터라고 보면 됩니다. 안에서 notes 는 잘 쓰이지만, 출구에 없으니 밖으로 나오지 않습니다.

이 입구와 출구를 input schema, output schema 라고 부릅니다. 앞 장의 private state 와 함께, schema 를 여러 개 쓰는 이 두 가지를 묶어서 **multiple schemas** 라고 합니다.

그리고 함정이 하나 있습니다. 노드가 State 에 없는 필드를 돌려주면, 에러 없이 버려집니다. 필드 이름에 오타를 내도 아무 말이 없습니다. 노드가 분명히 돌려줬는데 State 에 안 보이면, 먼저 필드 이름부터 보세요.

**Academy 에서** (L3)

- 보통 모든 노드는 하나의 schema 로 통신하고, 그 schema 에 그래프의 입력 · 출력 키가 다 들어 있다. 하지만 더 제어하고 싶을 때가 있다
- 입력 · 출력 schema: OverallState 에 question, answer, notes. 입력은 question 만, 출력은 answer 만. 입력 · 출력 schema 는 OverallState 위에 거는 필터다

**우리 예로 바꾼 것 / 주의**

- LangGraph.js 문법: `new StateGraph(Overall, { input: Input, output: Output })`. 노드 이름은 State 의 필드 이름과 겹치면 안 된다 (`answer` 필드가 있으면 노드 이름을 `answer` 로 못 쓴다)
- 이 장의 notes 는 State 전체에 들어 있고 출구에서 걸러질 뿐이다. 앞 장의 private state (State 전체에도 없는 필드) 와는 다르다. 질문이 나오면 구분해 준다
- `addEdge(["grammar", "vocab"], "write")` 는 두 노드가 다 끝나면 write 로 가라는 뜻 (노트북 `state-reducers` ④)

---

## 14장 · 시연: State 와 reducer

**말할 것**

지금까지 본 걸 노트북 `demo/state-reducers.ipynb` 로 확인해 보겠습니다. 이 노트북은 모델을 부르지 않습니다.

**순서와 볼 것**

1. State: classify 는 text 만 받고, analyze_email 은 kind 까지 받는다. 마지막 State 에는 필드 셋이 다 있다 → "poem" 을 any 로 넣으면 그냥 통과한다 → zod 로 적으면 classify 가 돌려준 "poem" 에서 `ZodError`, analyze_email 은 안 돈다
2. reducer: `{ revision: 2 }` (덮어쓰기) → 두 분석기를 같은 단계에서 돌리면 `InvalidUpdateError` → reducer 를 달면 둘 다 → 단어장 세 개
3. messages reducer: 3번이 뒤에 붙고, 같은 id 2번은 내용만 바뀌고, RemoveMessage 로 1번이 지워진다. MessagesAnnotation 그래프는 `{ role, content }` 를 메시지 객체로 바꾸고 id 를 붙인다
4. 여러 schema: write 는 `{ notes }` 만 받고 결과에 notes 가 없다 → 입구와 출구: `{ feedback: "고칠 곳 2개 …" }` 만 나온다 → 오타 난 필드는 `{ feedback: "처음 값" }` 그대로

---

## 15장 · 튜터에게 이어서 물으면?

**말할 것**

오후 ① 에서 만든 튜터 Agent 에게 두 번 이어서 물어보겠습니다. 먼저 "ubiquitous 뜻을 사전에서 찾아 줘". 사전을 찾아서 "어디에나 있는, everywhere" 라고 잘 답합니다.

이어서 "방금 찾은 단어로 예문 하나 만들어 줘". 그런데 튜터는 엉뚱한 단어로 예문을 만듭니다. 시연할 때는 resilience 같은, 처음 보는 단어를 골랐습니다.

왜 그럴까요? invoke 한 번이 그래프 실행 한 번입니다. State 는 그 실행 안에서만 살아 있습니다. 두 번째 invoke 는 새 State 로 시작하는, 완전히 별개의 실행입니다. 첫 번째 대화를 전혀 모릅니다.

오전에 직접 만든 루프에서도 그랬습니다. messages 배열을 다음 호출에 같이 넘겨야 이어졌죠. 이번에는 이걸 LangGraph 에서 어떻게 하는지 보겠습니다.

**Academy 에서** (모듈 1 L7)

- 덧셈 · 곱셈 · 나눗셈 도구를 가진 Agent 에게 "3 더하기 4" 를 시키면 7. 이어서 "그걸 2 로 곱해" 라고 하면, "그것" 이 7 인 줄 모르고 2 × 2 를 한다
- State 는 그래프 실행 한 번에만 머문다(transient). 두 번째 실행은 새 State 를 가진 독립된 실행이라, 앞의 실행과 이어지는 게 없다

**우리 예로 바꾼 것 / 주의**

- Academy 의 "그걸 2 로 곱해" → "방금 찾은 단어로 예문". 결과는 그때그때 다르지만, ubiquitous 가 아닌 단어로 예문을 만든다는 점은 같다

---

## 16장 · 단계마다 State 를 저장한다 — checkpointer

**말할 것**

이걸 푸는 게 checkpointer 입니다. 그림을 위에서부터 한 줄씩 보겠습니다.

맨 위가 그래프입니다. 튜터가 ubiquitous 를 찾는 실행입니다. messages 2개로 들어가서 tutor, tools, tutor 를 지나 5개가 됩니다.

둘째 줄, 단계입니다. 8장에서 본 super-step 입니다. 노드가 차례로 돌면 노드 하나가 한 단계입니다.

셋째 줄이 checkpoint 입니다. checkpointer 를 달면 그래프가 단계를 하나 지날 때마다 그때의 State 를 저장합니다. 이 저장 기록 하나가 checkpoint 입니다. State 만 있는 게 아니라, 다음에 갈 노드(next) 와 id 같은 정보도 같이 들어 있습니다. 첫 checkpoint 는 messages 3개에 next 는 tools, 마지막은 5개에 next 는 끝.

맨 아래가 thread 입니다. 이 checkpoint 들을 하나로 묶은 것입니다. 대화 하나가 thread 하나이고, thread_id 로 부릅니다.

가장 쉬운 checkpointer 는 MemorySaver 입니다. 이름 그대로 메모리에 저장합니다. 다는 방법은 한 줄입니다. compile 할 때 checkpointer 로 넘기면 됩니다.

**Academy 에서** (모듈 1 L7)

- LangGraph 는 checkpointer 로 단계마다 그래프 State 를 저장하고, 이게 메모리가 된다. 가장 쉬운 것은 MemorySaver, 메모리 안의 key-value 저장소다
- 노드 하나가 단계 하나다. checkpointer 는 단계마다 checkpoint 를 쓴다. checkpoint 에는 State, 다음에 갈 노드, 메타데이터, checkpoint id 가 있다
- checkpoint 들은 thread 로 묶인다. thread 는 checkpoint 의 모음이다

**주의**

- 이 checkpoint 는 뒤의 오후 ③ 에서 "멈췄다가 이어 가기" 의 바탕이 된다. 여기서는 "단계마다 저장된다" 까지만
- 그림은 Academy (모듈 3 L2) 의 Graph · Super-steps · Checkpoints · Thread 네 층 그림을 튜터 예로 옮긴 것
- 그림은 간단히 했다. 실제로는 입력을 받은 시점과 START 에도 checkpoint 가 하나씩 더 생긴다 (18장 시연의 getStateHistory 에서 checkpoint 가 노드 수보다 많은 이유)
- next 의 "끝" 은 실제로는 빈 배열 `[]`

---

## 17장 · thread_id 는 대화 번호다

**말할 것**

부를 때는 invoke 에 두 번째 인자로 config 를 넘깁니다. configurable 안에 thread_id. 이 번호가 대화 번호입니다.

같은 thread_id 로 다시 부르면, LangGraph 는 그 thread 에 저장해 둔 State 를 꺼내서 거기서 이어 갑니다. 그래서 두 번째에는 새 user 메시지 하나만 넣으면 됩니다. messages 의 reducer 가 이어 붙이니까, 앞의 대화 뒤에 붙습니다. 첫 번째 대화가 messages 5개였으면, 두 번째가 끝나면 7개가 됩니다. 그리고 이번에는 ubiquitous 로 예문을 만듭니다.

thread_id 가 다르면 다른 대화입니다. 같은 그래프, 같은 checkpointer 라도 thread 2 는 앞의 대화를 모릅니다. 학생마다, 대화마다 thread_id 를 따로 주면 됩니다.

**Academy 에서** (모듈 1 L7)

- config 에 thread_id 를 넣어 invoke 한다. checkpointer 로 compile 했으니 State 가 그 thread 에 쓰인다
- 같은 thread_id 로 "그걸 2 로 곱해" 를 보내면, 그 thread 의 State 가 Agent 에게 넘어가 이어 간다. "그것" 이 7 인 걸 알고 14 를 답한다
- Studio 는 LangGraph API 가 자체 저장소(Postgres)를 붙여 주기 때문에 checkpointer 를 따로 달지 않아도 된다

**우리 예로 바꾼 것 / 주의**

- "두 번째 invoke 에 system 메시지를 또 넣으면?" → system 이 두 번 들어간다. 그래서 두 번째부터는 새 user 메시지만 넣는다

---

## 18장 · 시연: 기억하는 튜터

**말할 것**

노트북 `demo/tutor-memory.ipynb` 로 확인해 보겠습니다. 오후 ① 의 튜터 Agent 그대로이고, 모델을 부릅니다.

**순서와 볼 것**

1. 기억 없이 두 번: 두 번째 답이 ubiquitous 가 아닌 단어로 예문을 만든다 (resilience 등)
2. MemorySaver 를 달고 thread "1" 로 두 번: 두 번째 답이 ubiquitous 로 예문을 만든다. messages 5 → 7
3. thread "2": 다시 엉뚱한 단어
4. `getStateHistory`: thread 1 에 checkpoint 가 여러 개. 각 checkpoint 의 messages 수와 다음 노드가 보인다

**주의**

- 모델 답이 매번 조금씩 다르다. ① · ③ 에서 고르는 단어는 그때그때 바뀐다
- 처음 실행 때 Deno 가 npm 패키지를 받느라 10초쯤 걸린다. 강의 전에 한 번 돌려 둔다

---

## 19장 · 같은 thread 로 대화가 길어지면?

**말할 것**

이제 다시 앞의 기억으로 돌아가 보겠습니다. thread 로 대화를 이어 가면 messages 는 계속 길어집니다. 한 번 주고받을 때마다 학생 질문, 튜터의 도구 요청, 도구 결과, 튜터 답, 이렇게 메시지가 네 개쯤 쌓입니다. 열 번이면 마흔 개, 서른 번이면 백 개가 넘습니다.

그리고 Agent 는 부를 때마다 이 messages 를 전부 모델에게 보냅니다. 오전에 봤듯이 토큰이 많이 들고, 그만큼 느리고 비쌉니다. 그리고 언젠가는 모델이 한 번에 읽을 수 있는 양, 컨텍스트 윈도우를 넘습니다.

그럼 전부 보내야 할까요?

**Academy 에서** (L4)

- 긴 대화는 실무에서 큰 문제다. 수십 개 메시지가 오가는 대화는 토큰이 많이 들어서, 지연과 비용 둘 다 커진다

**주의**

- "메시지 4개" 는 도구를 한 번 쓰는 경우로 센 대략의 수다. 숫자보다 늘어나는 모양을 보여 주는 그림이다

---

## 20장 · State 와 모델이 보는 것은 다르다 — trim · filter

**말할 것**

State 에는 대화를 전부 남겨 둡니다. 그런데 모델에게 무엇을 보낼지는 노드가 고를 수 있습니다. 노드 안에서 messages 중 일부만 골라 chat 을 부르면 됩니다. State 는 그대로입니다.

시연에서 보겠지만, system 메시지와 최근 메시지 하나만 보내면 입력 토큰이 210 에서 51 로 줄어듭니다. 답도 잘 합니다.

대신 공짜는 아닙니다. 보내지 않은 대화는 모델이 모릅니다. "내가 맨 처음에 뭘 물어봤지?" 하고 물으면 모릅니다. 그래서 무엇을 남기고 무엇을 뺄지는 우리가 정해야 하는 설계입니다.

방법은 몇 가지입니다. 최근 몇 개만 고르는 것, 토큰 수에 맞춰 자르는 것, 그리고 다음 장에서 볼, 오래된 대화를 요약해서 남기는 것.

하나만 조심하세요. 도구 요청과 도구 결과는 짝으로 자릅니다. 요청 없이 결과만 남으면 API 가 거절합니다.

**Academy 에서** (L4)

- 긴 대화는 토큰이 많이 든다. 지연과 비용 둘 다
- 방법 ① `RemoveMessage` 로 State 에서 오래된 메시지를 지운다 (`add_messages` reducer 가 알아듣는다)
- 방법 ② State 는 건드리지 않고, 모델을 부를 때 일부만 넘긴다. 예: 마지막 메시지만. LangSmith 로 보면 모델은 정말 마지막 메시지만 받았다
- 방법 ③ `trim_messages`: 개수가 아니라 토큰 수로 자른다. strategy="last" 로 최근 것부터, allow_partial 로 메시지 중간을 자를지 정한다

**우리 예로 바꾼 것 / 주의**

- Academy 의 고래 · 범고래 대화 → IELTS 쓰기 대화. 방법 ② 를 시연한다 (노트북 `long-chat` ①). 방법 ① (RemoveMessage) 은 다음 장의 요약에서 쓴다
- TypeScript 의 `trimMessages` 는 `@langchain/core/messages` 에 있다. LangChain 메시지 객체와 토큰 세는 함수를 같이 넘겨야 해서 시연은 하지 않는다
- "한 번 질문 안에서도 자르면 되나?" → 실습 준비하면서 해 봤다. 정비 부품 Agent 가 도는 도중에 최근 메시지만 보냈더니, 앞에서 본 정비 계획을 잊고 다시 조회하거나 정비일을 틀리게 말했다. 자르기는 긴 대화에 쓰는 기술이다

---

## 21장 · 오래된 대화는 요약해서 남긴다 — summarization

**말할 것**

고르기와 자르기보다 정보를 더 잘 남기는 방법이 있습니다. 모델에게 대화를 요약하게 하는 겁니다.

State 에 summary 필드를 하나 더 둡니다. 그래프는 노드 둘입니다. tutor 는 평소처럼 답하는데, 요약이 있으면 system 메시지에 붙여서 보냅니다. summarize 는 지금까지의 대화로 요약을 씁니다. 요약이 이미 있으면 거기에 새 내용을 더해 고쳐 씁니다. 그리고 최근 2개만 남기고 나머지 메시지는 RemoveMessage 로 지웁니다. 앞에서 본 messages reducer 의 지우기입니다.

갈림길은 하나입니다. tutor 가 답한 뒤 messages 가 6개를 넘으면 summarize 로, 아니면 그냥 끝.

여러 번 나눠 묻는 대화라서, 앞에서 본 checkpointer 와 thread 를 같이 씁니다. 그러면 대화가 계속 길어져도 State 의 messages 는 일정한 크기로 유지됩니다. 오래된 메시지는 지워졌지만, 요약 덕분에 학생 이름이나 목표 점수 같은 앞 대화를 기억합니다.

**Academy 에서** (L5)

- 요약은 고르기 · 자르기보다 정보를 잘 보존하는 압축 방법이다. LLM 으로 대화의 요약을 계속 고쳐 써 간다
- MessagesState 에 summary 키를 더한다. call_model 은 요약이 있으면 messages 에 붙여 모델을 부른다
- summarize_conversation 은 요약이 있으면 "지금까지의 요약은 이렇다. 새 내용을 더해 요약을 늘려라", 없으면 "위 대화를 요약하라" 로 모델을 부르고, 최근 2개를 뺀 메시지를 RemoveMessage 로 지운다
- 메시지가 6개를 넘으면 요약하는 조건부 엣지. State 는 한 실행에만 머무니 MemorySaver checkpointer 로 thread 를 이어 간다
- 6개를 넘어서야 summary 가 생긴다. 이름 · 좋아하는 팀 · 물어본 선수가 요약에 남는다

**우리 예로 바꾼 것 / 주의**

- Academy 의 "49ers 팬 Lance" → "IELTS 를 준비하는 지민, 목표 7.0"
- "6개" 와 "최근 2개" 는 조절하는 값이다. 실제 서비스에서는 토큰 수로 정하기도 한다

---

## 22장 · MemorySaver 는 메모리에만 저장한다 — external memory

**말할 것**

마지막으로 하나 더. MemorySaver 는 이름처럼 메모리에만 저장합니다. 프로그램을 끄면 thread 도 같이 사라집니다.

시연에서는 새 MemorySaver 로 다시 compile 해서, 프로그램을 다시 켠 상황을 흉내 냅니다. thread_id 는 그대로인데 State 가 비어 있습니다. 재미있는 건 모델의 반응입니다. "기억하고 있어요" 라고 답하면서 이름과 점수를 지어냅니다. State 에는 아무것도 없는데도요.

오래 남겨야 하는 대화라면, 파일이나 데이터베이스에 저장하는 checkpointer 를 씁니다. LangGraph 에는 SQLite, Postgres 같은 저장소용 checkpointer 가 있고, 코드는 compile 에 넘기는 checkpointer 하나만 바뀝니다. Studio 도 자체 저장소에 thread 를 남겨서, 창을 닫았다 열어도 대화가 남아 있습니다.

**Academy 에서** (L6)

- MemorySaver 는 노트북 세션이 살아 있는 동안만 유지된다. LangGraph 는 외부 DB 를 쓰는 checkpointer 를 지원한다. SQLite 로 시작하고, 운영에는 Postgres 같은 것을 쓴다
- SQLite checkpointer 로 바꾸면 노트북을 재시작해도 같은 thread_id 로 getState 하면 저장된 State 가 나온다
- Studio 는 LangGraph API 가 붙여 주는 Postgres 저장소를 쓴다. thread 를 바꿔 가며 대화하고, 앞 thread 로 돌아가 이어 갈 수 있다

**우리 예로 바꾼 것 / 주의**

- SQLite checkpointer 를 직접 붙여 보는 건 이번 시간에 하지 않는다. 장표는 "그런 checkpointer 가 있고, 바뀌는 건 한 줄" 까지만
- 받을 만한 질문: "프로그램을 끈다는 게 언제?" → MemorySaver 를 만든 **프로세스**가 끝날 때. invoke 한 번이 끝나는 건 상관없다 (같은 프로세스면 이어 간다). 서버 재시작 · 배포 · 크래시, 노트북 커널 재시작, `deno run` 스크립트 종료면 사라진다. 서버가 여러 대면 서로의 thread 를 못 본다. 요청마다 `new MemorySaver()` 를 새로 만들어도 매번 비어 있다
- 받을 만한 질문: "메모리가 계속 차지 않나? 오래된 걸 지우는 기능은?" → 없다. MemorySaver 에는 크기 제한도, 자동 삭제(TTL)도 없고 `saver.deleteThread("jimin")` 로 thread 를 통째로 지우는 것뿐이다 (`@langchain/langgraph-checkpoint` 1.2.1 코드에서 확인). 언제 지울지는 우리 코드가 정한다
  - checkpoint 는 대화 한 번이 아니라 **단계마다** 하나씩, 그 시점의 State 전체를 담아 쌓인다 (18장 시연의 getStateHistory)
  - 그래서 21장의 요약 + RemoveMessage 는 **지금 State** 를 줄여 토큰을 아끼는 방법이지, 저장 공간을 줄이지는 않는다. 지우기 전의 checkpoint 는 그대로 남는다
  - MemorySaver 는 개발 · 시연용. 서비스에서는 DB checkpointer 를 쓰고, 오래된 thread 는 기준을 정해 deleteThread 로 지우거나 DB 에서 정리한다

---

## 23장 · 시연: 대화가 길어지면

**말할 것**

노트북 `demo/long-chat.ipynb` 로 확인하겠습니다. 모델을 부릅니다.

**순서와 볼 것**

1. 골라서 보내기: 전부 보내면 messages 8개 · 입력 토큰 210 쯤, 고르면 2개 · 51 쯤. "맨 처음에 뭘 물어봤지?" 에 고른 쪽은 모른다, 전부 보낸 쪽은 "IELTS 서론" 이라고 답한다
2. 요약하는 튜터: 지민이 네 번 묻는다. messages 2 → 4 → 6, 네 번째에 8개가 되면서 summarize 가 돌고 2개만 남는다. summary 를 찍어 보고, "내 이름이랑 목표 점수 기억해?" 에 지민 · 7.0 이라고 답한다
3. 다시 켜면: 새 MemorySaver 로는 State 가 비어 있다. 모델이 "기억한다" 며 다른 이름 · 점수를 지어낸다

**주의**

- 모델 답은 매번 다르다. ① 에서 고른 쪽은 "방금 한 질문" 을 처음 질문이라고 하거나 "모른다" 고 한다. ③ 에서는 "모른다" 고 정직하게 답할 때도 있다. 어느 쪽이든 State 에 앞 대화가 없다는 점은 같다
- ② 는 모델을 다섯 번 부른다 (답 네 번 + 요약 한 번 + 마지막 질문). 30초쯤 걸린다

---

## 24장 · 실습: 정비 부품 Agent 에 State 와 기억 더하기

**말할 것**

이제 오후 ① 에서 만든 정비 부품 Agent 의 State 를 키우고, 기억을 달아 보겠습니다. 시작 파일 `lab/pm/agent2.ts` 에 오후 ① 까지의 Agent 가 들어 있으니, 모두 여기서 시작합니다. `// 실습 12` 부터 `// 실습 15` 까지 표시된 자리에 코드를 넣으면 됩니다. 돌리는 명령은 `pnpm lab 12` 처럼 실습 번호를 붙입니다. 앞 실습을 못 끝냈으면 `pnpm step 13` 처럼 따라잡습니다.

실습 12 는 확인한 사실 필드, 11 은 부품별 재고표, 12 는 이어서 묻기, 13 은 입구와 출구입니다.

---

## 25 ~ 28장 · 실습

**실습 12 · 확인한 사실 필드**

- 먼저 reducer 없이 돌리게 한다. facts 가 1개만 남는 걸 직접 보는 게 핵심이다 (마지막 tools 단계의 결과만)
- tools 노드는 결과를 `results` 로 한 번 모아 두고, messages 와 facts 두 필드로 돌려주게 고친다. `runTool` 을 두 번 부르지 않게
- 모델이 부품 넷을 한 번에 요청하면(병렬 도구 호출) tools 단계가 하나로 끝난다. 그래도 단계는 여러 개라 차이가 보인다

**실습 13 · 부품별 재고표**

- 이어 붙이기는 배열, 더하기는 숫자용이다. 객체(표)를 합치는 규칙은 없으니 직접 만든다: `(prev, next) => ({ ...prev, ...next })`
- reducer 없이 돌리면 `{ 'PN-7731': 3 }` 만 남는다. find_substitute 단계는 빈 표 `{}` 를 돌려줘서, 그 사이에도 한 번 덮어써진다
- 덤으로 볼 것: 준비하면서 돌렸을 때 모델이 PN-5150 을 조회하지 않고 답에 "재고 10개" 라고 지어낸 적이 있다. 재고표에는 PN-5150 이 없었다. 답만 믿지 말고, 확인한 것을 필드로 받아 두면 이런 걸 잡을 수 있다

**실습 14 · 이어서 묻기**

- 두 번째 invoke 에는 새 user 메시지 하나만 넣는다. system 과 첫 질문은 thread 에 이미 있다
- thread 1 은 앞에서 조회한 재고(입고 예정 2026-11-06)로 바로 답한다. 도구를 다시 부르지 않는 경우가 많다
- 두 번째 질문 뒤에 facts 7개와 재고표가 그대로 있다. checkpointer 는 messages 만이 아니라 State 전체를 저장한다
- thread 2 는 기체번호를 모른다. "기체번호를 알려 주세요" 류의 답이 나온다
- 주의: `steps` 필드도 thread 에 이어진다. 첫 질문에서 7번쯤 불렀으면, 두 번째 질문에서 도구가 필요할 때 MAX_STEPS(8) 에 금방 걸린다. 질문이 나오면 "State 가 통째로 이어지니 횟수도 이어진다" 고 설명한다
- mock 으로도 이어서 묻기가 된다 (앞 대화에 입고 예정이 있으면 그걸로 답한다)

**실습 15 · 입구와 출구**

- 질문을 대화에 넣는 `ask` 노드를 START 와 agent 사이에 둔다. 대화가 처음이면(messages 가 비었으면) system 메시지부터 넣는다. 그래서 같은 thread 로 두 번째 질문을 해도 된다
- Output 의 stock 필드에는 reducer 를 다시 적지 않는다. 합치는 규칙은 State 에 적은 것을 쓴다
- 최종 답일 때만 `answer` 를 돌려준다 (도구 요청이 없을 때)
- 노드 이름을 `answer` 로 지으면 필드 이름과 겹쳐서 에러가 난다
- 준비하면서 돌렸을 때, 첫 질문에서 모델이 대체품 조회를 건너뛰고 답한 적이 있다. 두 번째 질문에서 대체품을 찾아 재고표에 PN-7731 이 더해졌다. 재고표가 thread 를 따라 쌓인다는 걸 보여 주는 예로 쓸 수 있다

**공통**

- 정답은 → 키로 공개한다. 정답 파일은 answers 브랜치의 `lab/pm/answers/12.ts ~ 15.ts`
- 키 없이 하는 분은 mock 으로도 돈다. 답 문장은 mock 의 정해진 문장이지만 facts · stock 은 똑같이 쌓인다

---

## 29장 · 오후 ② 정리

**말할 것**

오늘 한 시간 동안 세 가지를 봤습니다.

첫째, State 에 값이 들어가는 규칙. schema 로 필드를 정하고, 필드마다 reducer 로 합칩니다. 기본은 덮어쓰기이고, 같은 단계에 여럿이 쓰는 필드에는 규칙이 있어야 합니다. messages 를 위한 reducer 는 미리 있고, 밖에서 넣고 받는 필드는 따로 정할 수 있습니다.

둘째, 기억. checkpointer 가 단계마다 State 를 저장합니다. 같은 thread_id 로 부르면 앞의 대화에서 이어 갑니다.

셋째, 길어진 대화. State 에는 남기고 모델에게는 골라서 보냅니다. 오래된 대화는 요약하고 지웁니다. 그리고 MemorySaver 는 끄면 사라집니다.

다음 시간에는 그래프를 중간에 멈추고, 사람에게 묻고, 고쳐서 이어 가는 법을 봅니다. 오늘 본 checkpoint 가 그 바탕입니다.
