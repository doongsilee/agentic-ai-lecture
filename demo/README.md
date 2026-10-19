# LLM 직접 불러 보기 · 시연 노트북

`llm-call.ipynb`: 강의 12 ~ 17장 내용을 실제 LLM 호출로 확인하는 노트북 (TypeScript · Deno 커널).

| 칸 | 보여 주는 것 | 강의 장표 |
|---|---|---|
| ① | LLM 호출은 `messages` 를 담은 HTTP 요청 하나다 | 15장 |
| ② | 지난 대화를 같이 보내지 않으면 모른다 | 15장 |
| ③ | 대화가 길어질수록 입력 토큰이 쌓인다 | 16 ~ 17장 |
| ④ | `logprobs` 로 다음 토큰 후보와 확률을 본다 | 12장 |

SDK 없이 `fetch` 로 OpenAI 형식(`/chat/completions`) 요청을 보낸다. 그래서 OpenAI, Ollama, vLLM 등 OpenAI 호환 서버면 어디서든 돈다.

## 준비

1. Deno 설치

   ```bash
   brew install deno
   ```

2. Jupyter 설치 (VS Code 의 Jupyter 확장을 쓰면 생략 가능)

   ```bash
   pip install jupyterlab
   ```

3. Deno 커널 등록

   ```bash
   deno jupyter --install
   ```

4. 모델 준비: 둘 중 하나

   - 로컬 Ollama (기본값, 인터넷 없이 가능)

     ```bash
     ollama pull llama3.2
     ```

   - OpenAI: 노트북을 열기 전에 환경 변수를 정한다

     ```bash
     export LLM_BASE_URL=https://api.openai.com/v1
     export LLM_API_KEY=sk-...
     export LLM_MODEL=gpt-4o-mini
     ```

5. 실행

   ```bash
   jupyter lab demo/llm-call.ipynb
   ```

   커널은 **Deno** 를 고른다.

## 참고

- llama3.2 는 한국어 답이 어색할 수 있다. 시연 품질이 중요하면 OpenAI 쪽을 쓴다
- ④ `logprobs` 는 서버나 모델에 따라 지원하지 않을 수 있다. OpenAI 추론 모델은 `max_tokens` 대신 `max_completion_tokens` 를 쓴다
