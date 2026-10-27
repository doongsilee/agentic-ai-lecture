# 정답을 LangGraph Studio 에서 보기 (answers 브랜치 전용)

오후 실습 정답 `lab/pm/answers/6.ts ~ 20.ts` 의 그래프를 Studio 에 띄운다. 그래프 이름이 실습 번호다.

```bash
cd lab && pnpm install        # 정답이 쓰는 lab 의 패키지 (처음 한 번)
cd studio && pnpm install     # Studio 서버 (처음 한 번)
pnpm studio                   # localhost:2024 에 서버를 켜고 브라우저로 Studio 를 연다
```

- 정답 파일은 맨 아래에서 바로 실행한다 (readline 으로 묻기 · run). 그래서 `pnpm studio` 가 먼저 `extract.mjs` 로 정답마다 그래프를 compile 하는 데까지만 잘라 `graphs/N.ts` 로 옮긴다. 정답 파일은 고치지 않는다
- 모델 접속 정보는 `lab/.env` (langgraph.json 의 env)
- 입력: 6 ~ 12 는 `{ "messages": [system, user] }`, 13 부터는 `{ "question": "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?" }`. 13 부터는 Studio 가 입력 칸을 못 만들어서 JSON 으로 넣는다
- 16 · 17 은 order 앞에서 멈춘다 (interruptBefore). 18 ~ 20 은 order 안에서 interrupt() 로 멈추고, Resume 에 `y` 나 담당자 의견을 넣는다
- Studio 화면(smith.langchain.com)은 LangSmith 무료 계정 로그인이 필요하다
