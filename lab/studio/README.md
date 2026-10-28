# 내 그래프를 LangGraph Studio 에서 보기

오후 실습 파일(`pm/agent.ts` ~ `agent4.ts`)에서 만든 그래프를 Studio 화면에 띄운다. 그림으로 보고, 입력을 넣어 돌리고, 노드마다 State 를 본다.

```bash
cd lab/studio
pnpm install              # 처음 한 번 (Studio 서버)
pnpm studio               # 내 노트북: localhost:2024 에 서버를 켜고 브라우저로 Studio 를 연다
pnpm studio:codespaces    # Codespaces: 터미널에 찍히는 Studio 주소(…/studio?baseUrl=https://….trycloudflare.com)를 브라우저로 연다
```

- 그래프 이름: `pm1` ~ `pm4` = 오후 ① ~ ④ 실습 파일. 아직 그래프를 만들지 않은 파일은 건너뛴다
- 실습 파일을 고쳤으면 `pnpm studio` 를 다시 켠다 (켤 때 실습 파일에서 그래프를 잘라 온다)
- Studio 화면(smith.langchain.com)은 LangSmith 무료 계정으로 로그인해야 열린다
- 모델 접속 정보는 `lab/.env` 를 그대로 쓴다
- 입력: pm1 · pm2 는 `{ "messages": [system, user] }`, pm3 부터는 `{ "question": "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?" }` (JSON 으로 넣는다)

## 어떻게 도는가

실습 파일은 맨 아래에서 바로 실행한다 (invoke · readline 으로 묻기). Studio 가 그대로 불러오면 그 코드까지 돈다. 그래서 `pnpm studio` 가 먼저 `extract.mjs` 로 `const graph = new StateGraph(...)` 부터 `.compile(...)` 까지만 잘라 `graphs/` 로 옮기고 `langgraph.json` 을 만든다. 실습 파일은 고치지 않는다.

answers 브랜치에서는 정답 `pm/answers/8.ts ~ 22.ts` 도 실습 번호(`8` ~ `22`)를 이름으로 함께 뜬다.
