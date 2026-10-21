# LLM 직접 불러 보기 · 시연 노트북

TypeScript · Deno 커널로 도는 노트북 두 개.

## llm-call.ipynb

강의 12 ~ 17장 내용을 실제 LLM 호출로 확인한다.

| 칸 | 보여 주는 것 | 강의 장표 |
| --- | --- | --- |
| ① | LLM 호출은 `messages` 를 담은 HTTP 요청 하나다 | 15장 |
| ② | 지난 대화를 같이 보내지 않으면 모른다 | 15장 |
| ③ | 대화가 길어질수록 입력 토큰이 쌓인다 | 16 ~ 17장 |
| ④ | 컨텍스트 윈도우를 넘기면 앞부분이 잘린다 | 17장 |

## tool-call.ipynb

강의 19 ~ 25장 내용을 실제 도구 호출로 확인한다.

| 칸 | 보여 주는 것 | 강의 장표 |
| --- | --- | --- |
| ① | `tools` 로 도구를 알려 주면, LLM 은 답 대신 `tool_calls` 요청을 돌려준다. 필요 없으면 부르지 않는다 | 19 ~ 20장 |
| ② | 실행은 우리 코드가 하고, 결과를 `tool` 메시지로 넣어 다시 부른다 | 20장 |
| ③ | 지어낸 결과를 넣어도 LLM 은 그대로 믿는다 | 20장 |
| ④ | `while` 로 감싸면 Agent 루프가 된다. 결과를 보고 다음 도구를 고르고, 모델이 "끝" 하거나 하네스가 "그만" 할 때 멈춘다 | 23 ~ 25장 |

## 공통

SDK 없이 `fetch` 로 OpenAI 형식(`/chat/completions`) 요청을 보낸다. 그래서 OpenAI, Ollama, vLLM 등 OpenAI 호환 서버면 어디서든 돈다.

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
