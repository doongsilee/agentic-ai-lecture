/**
 * 실습 2 정답 · 대화 이어 가기 — 실습 2 를 끝낸 시점의 lab/am/agent.ts
 *   실습 1 의 chat() 을 그대로 쓴다. 받은 답을 messages 에 넣은 뒤 이어서 묻는다
 */
import { API_KEY, BASE_URL, MODEL } from "../lib/env.js";
import planData from "../data/maintenance-plans.json" with { type: "json" };
import stockData from "../data/parts-stock.json" with { type: "json" };
import substitutesData from "../data/substitutes.json" with { type: "json" };
import readline from "node:readline/promises";

const plans: Record<string, any> = planData;
const stock: Record<string, any> = stockData;
const substitutes: Record<string, any> = substitutesData;

function getSubstitutes(part_no: string) {
  return substitutes[part_no]
    ? { part_no, ...substitutes[part_no] }
    : { error: `'${part_no}' 의 대체 부품이 없습니다` };
}

function getStock(part_no: string) {
  return stock[part_no]
    ? { part_no, ...stock[part_no] }
    : { error: `'${part_no}' 의 재고가 없습니다` };
}

function getMaintenancePlan(tail_no: string) {
  return plans[tail_no]
    ? { tail_no, ...plans[tail_no] }
    : { error: `'${tail_no}' 의 정비 계획이 없습니다` };
}

function requestPart(part_no: string, qty: number) {
  return {
    청구번호: `REQ-${String(++requests).padStart(4, "0")}`,
    부품번호: part_no,
    수량: qty,
    상태: "청구 접수",
  };
}

let requests = 0;
async function ask(question: string) {
  // 사람에게 y / n 을 묻는다
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(`[사람] ${question} (y/n) `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

// LLM 을 한 번 부른다
async function chat(messages: object[], tools: object[]) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2, tools }),
  });
  const data = await res.json();
  console.log(
    `[LLM]  보낸 messages ${messages.length}개 · 입력 토큰 ${data.usage.prompt_tokens}`,
  ); // 이번 호출에 쓴 토큰 수
  const { role, content, tool_calls } = data.choices[0].message; // 답도 메시지 하나다
  return { role, content, tool_calls }; // 다시 보낼 건 role · content 뿐
}

async function runTool(name: string, args: any) {
  if (name === "get_maintenance_plan") return getMaintenancePlan(args.tail_no);
  if (name === "get_stock") return getStock(args.part_no);
  if (name === "get_substitutes") return getSubstitutes(args.part_no);
  if (name === "request_part")
    if (await ask(`${args.part_no} ${args.qty} 청구할까요? (y/n)`)) {
      const result = requestPart(args.part_no, args.qty);
      console.log(`[청구]  ${result.청구번호} ${result.부품번호} ${result.수량}`);
      return result;
    } else {
      return { error: `'${args.part_no} ${args.qty} 청구를 취소했습니다` };
    }
  return { error: `'${name}' 도구를 실행할 수 없습니다` };
}

const tools = [
  {
    type: "function",
    function: {
      name: "get_maintenance_plan", // ③ 도구 설명
      description:
        "기체번호로 정기 정비 계획을 조회한다. 정비일과 필요한 부품번호 · 수량이 나온다.",
      parameters: {
        type: "object",
        properties: {
          tail_no: { type: "string", description: "기체번호. 예: TR-1023" },
        },
        required: ["tail_no"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stock",
      description:
        "부품번호로 재고를 조회한다. 정비에 필요한 부품이 충분한지 확인할 때 쓴다. 부품마다 한 번씩 부른다.",
      parameters: {
        type: "object",
        properties: {
          part_no: { type: "string", description: "부품번호. 예: PN-4471" },
        },
        required: ["part_no"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_substitutes",
      description:
        "재고 조회에 실패한 부품번호의 대체품(바뀐 부품번호)을 찾는다. 대체품이 있으면 그 번호로 다시 재고를 확인한다.",
      parameters: {
        type: "object",
        properties: {
          part_no: {
            type: "string",
            description: "조회에 실패한 부품번호. 예: PN-7730",
          },
        },
        required: ["part_no"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_part",
      description: "부품번호와 수량을 청구한다. 청구번호가 나온다.",
      parameters: {
        type: "object",
        properties: {
          part_no: { type: "string", description: "부품번호. 예: PN-4471" },
          qty: { type: "number", description: "수량. 예: 1" },
        },
        required: ["part_no", "qty"],
      },
    },
  },
];

const messages: object[] = [
  {
    role: "system",
    content:
      "너는 공군 정비대대의 부품 담당이다. 짧게 답한다. 정비일까지 모자라는 부품은 request_part 로 청구하라",
  },
  {
    role: "user",
    content: "TR-1023 다음 주 정기 정비에 필요한 부품, 재고 다 있어?",
  },
];

for (let step = 0; ; step++) {
  const response = await chat(messages, tools);
  messages.push(response);

  if (!response.tool_calls?.length) {
    console.log(`[답]  ${response.content}`);
    break;
  }

  if (response.tool_calls) {
    for (const tool_call of response.tool_calls) {
      console.log(
        `[도구]  ${tool_call.function.name} 호출 ${tool_call.function.arguments}`,
      );
      const tool_name = tool_call.function.name;
      const tool_args = JSON.parse(tool_call.function.arguments);
      const tool_result = await runTool(tool_name, tool_args);
      console.dir(tool_result, { depth: null });
      messages.push({
        role: "tool",
        tool_call_id: tool_call.id,
        content: JSON.stringify(tool_result),
      });
    }
  }
}
