# lab — 1일차 실습

시작 방법 · 실습 파일 · 따라잡기는 저장소 맨 위 [README.md](../README.md) 에 있습니다. 실습 문제와 성공 화면은 강의 장표에 있습니다.

```bash
pnpm lab 11            # 실습 11 을 하는 파일 돌리기 (1 ~ 5 am/agent.ts · 6 ~ 9 pm/agent.ts · 10 ~ 13 pm/agent2.ts · 14 ~ 17 pm/agent3.ts · 18 ~ 20 pm/agent4.ts)
pnpm lab 9 --limit     # MAX_STEPS=1 로 (실습 4 · 9)
pnpm step 11           # 따라잡기: 11번을 풀 차례로
```

## 실습 16 에서 복사해서 쓰는 코드 · request_part

도구를 만드는 법은 오전에 해 봤으니 그대로 복사해서 씁니다.

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
