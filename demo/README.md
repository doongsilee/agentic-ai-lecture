# LLM 직접 불러 보기 · 시연 노트북

TypeScript · Deno 커널로 도는 노트북 아홉 개.

## llm-call.ipynb

강의 16 ~ 19장 내용을 실제 LLM 호출로 확인한다.

| 필드 | 보여 주는 것 | 강의 장표 |
| --- | --- | --- |
| ① | LLM 호출은 `messages` 를 담은 HTTP 요청 하나다 | 16장 |
| ② | 지난 대화를 같이 보내지 않으면 모른다 | 16장 |
| ③ | 대화가 길어질수록 입력 토큰이 쌓인다 | 17 ~ 18장 |
| ④ | 컨텍스트 윈도우를 넘기면 앞부분이 잘린다 | 18장 |

## tool-call.ipynb

강의 20 ~ 26장 내용을 실제 도구 호출로 확인한다.

| 필드 | 보여 주는 것 | 강의 장표 |
| --- | --- | --- |
| ① | `tools` 로 도구를 알려 주면, LLM 은 답 대신 `tool_calls` 요청을 돌려준다. 필요 없으면 부르지 않는다 | 21장 |
| ② | 실행은 우리 코드가 하고, 결과를 `tool` 메시지로 넣어 다시 부른다 | 21장 |
| ③ | 지어낸 결과를 넣어도 LLM 은 그대로 믿는다 | 21장 |
| ④ | `while` 로 감싸면 Agent 루프가 된다. 결과를 보고 다음 도구를 고르고, 모델이 "끝" 하거나 하네스가 "그만" 할 때 멈춘다 | 24 ~ 26장 |

## graph-basics.ipynb

강의 오후 ① 11 ~ 14장 (Academy 모듈 1 · L2 Simple Graph) 을 LangGraph 코드로 확인한다. `@langchain/langgraph` 버전은 2일차 저장소와 같다.

| 필드 | 보여 주는 것 | 강의 장표 |
| --- | --- | --- |
| ① ~ ② | State 는 노드끼리 주고받는 필드, 노드는 바꾼 필드만 돌려주는 함수 | 오후 ① 9 ~ 10장 |
| ③ ~ ⑤ | 조건부 엣지는 다음 노드 이름을 돌려주는 함수. 글에 따라 이메일 · IELTS 분석기로 갈린다 | 오후 ① 5 · 9장 |

## tutor-agent.ipynb

강의 오후 ① (Academy 모듈 1 · L4 ~ L6) 을 코드로 확인한다. 같은 영어 튜터 그래프를 한 단계씩 키운다. 접속 정보는 `lab/.env` (OpenRouter · `qwen/qwen3-32b`).

| 필드 | 보여 주는 것 |
| --- | --- |
| ① Chain | 노드 하나가 LLM 을 부른다. 도구 요청은 오지만 실행할 노드가 없다 |
| ② Router | 도구냐 답이냐를 모델이 고른다. 도구는 실행되지만 결과가 모델에게 가지 않는다 |
| ③ Agent | `tools → tutor` 선 하나로 루프가 된다. 결과를 보고 최종 답을 낸다 |
| 상한 | `recursionLimit` 에 걸리면 `GraphRecursionError` |

## 오후 ② · State 와 기억 (Academy 모듈 2 + 모듈 1 L7)

예제는 계속 영어 튜터. `tutor-memory` · `long-chat` 은 `lab/.env` 의 모델을 부르고, `state-reducers` 는 LLM 없이 돈다.

**state-reducers.ipynb** (모듈 2 L1 ~ L3)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① State | schema 로 필드를 적고 돌린다. 노드를 지날 때마다 State 에 필드가 채워진다. 타입이 틀린 값은 Annotation 이면 그냥 통과, zod (`z.object`) 로 적으면 `ZodError` 로 멈춘다 |
| ② reducer | 기본은 덮어쓰기. 같은 단계에서 두 분석기가 쓰면 `InvalidUpdateError`, 이어 붙이는 reducer 를 달면 둘 다 남는다. 단어장은 직접 만든 규칙(겹치면 빼기)으로 |
| ③ messages reducer | `messagesStateReducer` · `MessagesAnnotation`: 뒤에 붙이기 · 같은 id 덮어쓰기 · `RemoveMessage` 지우기 |
| ④ 여러 schema | `addNode(이름, 함수, { input: Private })` — write 노드는 notes 만 받고 결과에 notes 가 없다 (private state). `new StateGraph(State, { input, output })` — 글을 넣으면 피드백만 나온다. State 에 없는 필드는 조용히 버려진다 |

**tutor-memory.ipynb** (모듈 1 L7)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① 기억 없이 | invoke 두 번은 서로 다른 실행. "방금 찾은 단어로 예문" 을 엉뚱한 단어로 만든다 |
| ② checkpointer | `compile({ checkpointer: new MemorySaver() })` + 같은 `thread_id` → 앞의 State 에서 이어 간다 |
| ③ thread | 다른 `thread_id` 는 다른 대화 |
| ④ checkpoint | `getStateHistory` 로 단계마다 저장된 State 를 본다 |

**long-chat.ipynb** (모듈 2 L4 ~ L6)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① 골라서 보내기 | State 는 그대로 두고 노드가 최근 것만 보내면 입력 토큰이 줄어든다. 대신 보내지 않은 앞 대화는 모른다 |
| ② 요약하는 튜터 | summary 필드 + summarize 노드. 6개를 넘으면 요약하고 최근 2개만 남긴다(RemoveMessage). 요약 덕분에 이름 · 목표를 기억한다 |
| ③ 다시 켜면 | 새 MemorySaver 로는 State 가 비어 있다. 오래 남기려면 파일 · DB checkpointer |

## 오후 ③ · 사람이 끼어들기 (Academy 모듈 3 L1 ~ L3)

예제는 계속 영어 튜터. 셋 다 `lab/.env` 의 모델을 부른다.

**tutor-stream.ipynb** (모듈 3 L1)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① invoke | 다 돌 때까지 아무것도 안 보인다. 15초쯤 뒤에 한꺼번에 |
| ② stream · updates | 노드가 끝날 때마다, 그 노드가 바꾼 것만 받는다 |
| ③ stream · values | 노드가 끝날 때마다 State 전체를 받는다 (입력부터) |
| ④ 토큰 | fetch 를 `stream: true` 로 부르고, 노드가 `config.writer` 로 글자를 흘려보낸다 → `streamMode: "custom"` |

**tutor-breakpoints.ipynb** (모듈 3 L2)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① 멈춘다 | `interruptBefore: ["tools"]` 로 도구 앞에서 멈춘다. stream 이 `__interrupt__` 를 받고 끝난다 |
| ② 본다 | `getState` 의 `next` 로 어디서 멈췄는지, `values` 로 모델이 하려는 일을 본다 |
| ③ 이어 간다 | 같은 thread 로 `stream(null)` |
| ④ 승인 | y 면 이어 가고, 아니면 멈춘 채로 둔다 |

**tutor-edit-state.ipynb** (모듈 3 L3)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① State 고치기 | tutor 앞에서 멈추고 `updateState` 로 "아니, meticulous 를" 을 넣는다. 모델은 고친 State 를 본다 |
| ② human_feedback | 하는 일 없는 노드 앞에서 멈추고 `updateState(…, "human_feedback")` (asNode) 로 의견을 넣는다. 다음 노드는 tutor |

## 오후 ④ · 스스로 멈추고 되돌아가기 (Academy 모듈 3 L4 ~ L5 · 모듈 4 L2 개념)

`slides/day1-pm4-control.html` 의 시연. 앞의 둘은 튜터 Agent 로 모델을 부르고, subgraph 는 모델 없이 바로 돈다.

**tutor-interrupt.ipynb** (모듈 3 L4)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① 스스로 멈춘다 | tools 노드 안에서 사전에 없는 단어일 때만 `interrupt(값)`. ubiquitous 는 지나가고 serendipity 에서 멈춘다 |
| ② 답을 넣는다 | `new Command({ resume: answer })` → `interrupt()` 가 그 답을 돌려준다 |
| ③ 다시 돈다 | 이어 가면 노드가 처음부터 다시 돈다. `interrupt()` 앞의 코드가 두 번 |
| ④ 직접 묻기 | `getState().tasks` 의 interrupts 를 보여 주고 `prompt()` 로 받은 답을 넣는다 |

**tutor-time-travel.ipynb** (모듈 3 L5)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① 지난 기록 | `getStateHistory` 로 checkpoint 마다 step · next · messages 수 |
| ② 다시 돌리기 | 지난 checkpoint 의 config 로 `stream(null, …)`. 그 뒤 노드는 다시 실행된다 (모델도 다시 부른다) |
| ③ 갈라지기 | 지난 checkpoint 에 `updateState` → 새 갈래로 이어 간다. 기록이 쌓인다 |

**tutor-subgraph.ipynb** (모듈 4 L2, 개념)

| 칸 | 보여 주는 것 |
| --- | --- |
| ① 노드로 꽂기 | compile 한 사전 찾기 그래프를 부모의 `addNode` 에 그대로 |
| ② 이름이 같은 필드만 | 자식은 `word` 만 받고, `tries` 는 부모로 안 올라온다 |
| ③ 안쪽 단계 | `stream(…, { subgraphs: true })` → `[어느 그래프인지, 값]` |

## LangSmith 로 실행 기록 보기 (강사 시연)

노트북과 Studio 에서 돌린 그래프 실행이 LangSmith 에 trace 로 남는다. 노드마다 언제 돌았는지, State 가 어떻게 바뀌었는지, 모델에 무엇을 보내고 무엇을 받았는지(`chat` 한 칸) 볼 수 있다.

```bash
cp demo/.env.example demo/.env     # LANGSMITH_API_KEY 를 넣고 LANGSMITH_TRACING=true
```

- 노트북: 준비 칸이 `demo/.env` 를 읽는다. `{ LangSmith: "기록함 · project …" }` 이 찍히면 켜진 것. 키가 없으면 "기록 안 함" 으로 예전처럼 돈다
- Studio: `demo/studio/langgraph.json` 의 `env` 가 `../.env` (= `demo/.env`) 다. 모델 접속 정보는 노트북처럼 `lab/.env` 에서 읽는다
- 모델은 fetch 로 부르니까, `chat()` 을 LangSmith 의 `traceable` 로 감싸서(`asLLM`) 모델 호출도 trace 에 남긴다
- 실습(`lab/.env`)에는 LangSmith 설정이 없다. 학생 실습 실행은 남지 않는다
- project 이름에 공백이 있으면 따옴표로 감싼다 (`LANGSMITH_PR## LangGraph Studio 로 보기 (강사 시연)

오후 시연 노트북의 그래프를 `demo/studio/` 에 모아 두었다 (강사 PC 전용, lab 과 따로 설치).

```bash
cd demo/studio && pnpm install     # 처음 한 번
pnpm studio                        # localhost:2024 에 서버를 켜고 브라우저로 Studio 를 연다
```

| 파일 | 그래프 | 노트북 |
| --- | --- | --- |
| `pm1.ts` | simple · chain · router · agent | graph-basics · tutor-agent |
| `pm2.ts` | pm2-email · pm2-revise · pm2-two-analyzers-error · pm2-two-analyzers-reducer · pm2-wordbook · pm2-messages · pm2-private-state · pm2-input-output · pm2-typo · pm2-send-all · pm2-send-recent · pm2-summary | state-reducers · long-chat |
| `pm3.ts` | pm3-stream · pm3-approve · pm3-edit · pm3-feedback | tutor-stream · tutor-breakpoints · tutor-edit-state |
| `pm4.ts` | pm4-interrupt · pm4-dictionary · pm4-subgraph | tutor-interrupt · tutor-subgraph |

- 튜터 그래프의 부품(모델 부르기 · 사전 · tutor / tools 노드)은 `common.ts` 에 있다. 입력은 `{ "question": "ubiquitous 뜻을 사전에서 찾아 줘" }` 한 줄. 다른 그래프의 입력은 파일의 주석에 적어 두었다
- tutor-memory 의 기억, tutor-time-travel 의 되돌리기 · fork 는 Studio 의 thread · 기록 화면이 대신한다. `agent` 로 보인다
- checkpointer 는 달지 않는다. Studio(LangGraph API)가 자기 저장소를 붙여 준다
- Studio 는 thread 에 남은 State 를 전부 보여 준다. 그래서 pm2-private-state · pm2-input-output 에서도 `notes` 가 보인다 (노트북의 invoke 결과와 다른 점)
- Studio 화면(smith.langchain.com)은 LangSmith 무료 계정 로그인이 필요하다. 서버 자체는 키 없이 뜬다 (키는 trace 를 남길 때만)
ous 뜻을 사전에서 찾아 줘" }`
- 강의장 망에서 Studio 가 안 열릴 때를 대비해 화면 녹화를 준비해 둔다

## 공통

SDK 없이 `fetch` 로 OpenAI 형식(`/chat/completions`) 요청을 보낸다. 그래서 OpenAI, Ollama, vLLM 등 OpenAI 호환 서버면 어디서든 돈다.

그래프를 만드는 셀은 바로 뒤에서 `showGraph(그래프)` 로 그래프 그림을 띄운다 (graph-basics 이후 모든 그래프 노트북). LangGraph 의 `drawMermaidPng()` 가 노드·엣지 이름을 mermaid.ink 로 보내 PNG 를 받아 오므로 인터넷이 필요하다. 받지 못하면 같은 그림을 mermaid 글자로 찍는다.

## 준비

VS Code 와 Jupyter 확장(`ms-toolsai.jupyter`)이 있으면 JupyterLab 은 따로 설치하지 않아도 된다.

1. Deno 설치

   ```bash
   brew install deno
   ```

2. Deno 커널 등록

   ```bash
   deno jupyter --install
   ```

3. (VS Code 를 쓰지 않을 때만) JupyterLab 설치

   ```bash
   pip install jupyterlab
   ```

4. 모델 준비: 둘 중 하나

   - 로컬 Ollama (기본값, 인터넷 없이 가능)

     ```bash
     ollama pull qwen3.5:9b-q4_K_M
     ```

   - OpenAI: 노트북을 열기 전에 환경 변수를 정한다

     ```bash
     export LLM_BASE_URL=https://api.openai.com/v1
     export LLM_API_KEY=sk-...
     export LLM_MODEL=gpt-4o-mini
     ```

5. 실행

   - VS Code: `demo/llm-call.ipynb` 를 열고 오른쪽 위 **Select Kernel → Jupyter Kernel… → Deno** 를 고른다
   - JupyterLab: `jupyter lab demo/llm-call.ipynb` 로 열고 커널은 **Deno** 를 고른다

   환경 변수(OpenAI)를 쓰면, 변수를 정한 터미널에서 VS Code 나 JupyterLab 을 띄워야 커널이 그 값을 읽는다.

## 참고

- `tool-call.ipynb` 는 `temperature: 0` 으로 돈다. 온도를 높이면 qwen3.5 가 가끔 도구를 부르지 않고 답을 지어낸다
- `tool-call.ipynb` ④ 는 생각 단계를 켜고 돈다. 끄면 qwen3.5 가 첫 결과만 보고 점검 조회 없이 답해 버린다. 생각 단계 때문에 한 번 도는 데 20 ~ 40초쯤 걸린다
- 기본 모델은 qwen3.5:9b-q4_K_M (GGUF). Mac 에서 기본 태그 qwen3.5 는 MLX 실행기로 돌아 컨텍스트 한도를 지키지 않아 ④ 시연이 안 된다. 생각 단계는 `OPTIONS` 의 `reasoning_effort: "none"` 으로 끈다. 이 옵션을 받지 않는 모델이면 `OPTIONS` 를 `{}` 로 바꾼다
