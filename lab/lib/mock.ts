/**
 * lib/mock.ts — LLM_MODE=mock 일 때 쓰는 가짜 모델 (키 없이 실습을 끝까지 돌려 보기)
 *
 * 정해진 답이지만, 실제 모델이 할 법한 행동을 흉내 낸다
 *   · 지난 답이 messages 에 없으면 "방금 답" 을 모른다 (실습 2)
 *   · 도구 설명이 비어 있으면 그 도구를 쓰지 못한다 (실습 3)
 *   · 도구를 요청하고도 결과를 못 받으면, 당일 모델(OpenRouter qwen3-32b)처럼 결과를 지어내 답한다 (실습 4)
 *   · 정비 계획을 본 뒤, 거기 나온 부품번호로 재고를 "한 번에 여러 개" 조회한다 (실습 5)
 */
import type { Msg, Tool, ToolCall as Call } from "./llm.js";

type Reply = Msg;
type Part = { 부품번호: string; 이름: string; 수량: number };

const text = (m?: Msg) => (m && typeof m.content === "string" ? m.content : "");
const parse = (s: string): Record<string, any> => { try { return JSON.parse(s); } catch { return { error: s }; } };
const answer = (content: string): Reply => ({ role: "assistant", content });

export function mockChat(messages: Msg[], tools?: Tool[]): Reply {
  // 도구를 요청했는데 결과(role: "tool")가 없다 → 당일 모델은 그럴듯하게 지어낸다 (OpenAI 같은 서버는 400 으로 거절한다)
  const asked = messages.flatMap((m) => (m.role === "assistant" && m.tool_calls ? m.tool_calls : []));
  const missing = asked.filter((c) => !messages.some((x) => x.role === "tool" && x.tool_call_id === c.id));
  if (missing.length) return answer("TR-1023 의 다음 정기 정비는 2024년 5월 15일 A-check 입니다. 엔진 점검과 전자 시스템 검사가 포함되며 약 48시간 걸립니다.");

  const question = text([...messages].reverse().find((m) => m.role === "user"));
  const usable = (tools ?? []).filter((t) => t.function.description && Object.keys((t.function.parameters as { properties?: object })?.properties ?? {}).length);
  if (!tools?.length) return talk(messages, question);

  const has = (name: string) => usable.some((t) => t.function.name === name);
  let n = messages.length;
  const call = (name: string, args: Record<string, unknown>): Call => ({ id: `call_mock_${n++}`, type: "function", function: { name, arguments: JSON.stringify(args) } });
  const want = (...cs: Call[]): Reply => ({ role: "assistant", content: null, tool_calls: cs });

  // 지금까지 받은 도구 결과: 요청과 결과를 id 로 짝짓는다
  const results = asked.map((c) => ({ name: c.function.name, args: parse(c.function.arguments), result: parse(text(messages.find((x) => x.role === "tool" && x.tool_call_id === c.id))) }));
  const got = (name: string) => results.filter((r) => r.name === name);

  const tail = question.toUpperCase().match(/[A-Z]{2}-\d{4}/)?.[0];
  if (!tail) return answer("정비 부품 담당입니다. 기체번호(예: TR-1023)를 알려 주시면 정비 계획과 부품 재고를 확인해 드립니다.");
  if (!has("get_maintenance_plan")) return answer(`${tail} 의 정비 계획을 확인할 방법이 없어 답할 수 없습니다.`);
  if (!got("get_maintenance_plan").length) return want(call("get_maintenance_plan", { tail_no: tail }));

  const plan = got("get_maintenance_plan").at(-1)!.result;
  if (plan.error) return answer(`정비 계획 조회에 실패했습니다: ${plan.error}`);
  const parts: Part[] = plan.부품;
  const head = `${tail} 다음 정기 정비는 ${plan.정비}, ${plan.정비일} 입니다.`;
  const list = parts.map((p) => `- ${p.이름} ${p.부품번호} ${p.수량}개`);
  if (!/재고|부품/.test(question)) return answer([head, "필요한 부품:", ...list].join("\n"));
  if (!has("check_stock")) return answer([head, "필요한 부품:", ...list, "재고를 확인할 도구가 없어 재고는 알 수 없습니다."].join("\n"));

  // 아직 재고를 못 본 부품은 한 번에 전부 조회한다
  const stock = new Map(got("check_stock").map((r) => [String(r.args.part_no).toUpperCase(), r.result]));
  const todo = parts.filter((p) => !stock.has(p.부품번호));
  if (todo.length) return want(...todo.map((p) => call("check_stock", { part_no: p.부품번호 })));

  const short = parts.filter((p) => !stock.get(p.부품번호)!.error && Number(stock.get(p.부품번호)!.재고) < p.수량);
  if (has("request_part") && short.length && !got("request_part").length) {
    return want(...short.map((p) => call("request_part", { part_no: p.부품번호, qty: p.수량 - Number(stock.get(p.부품번호)!.재고) })));
  }

  const lines = parts.map((p) => {
    const s = stock.get(p.부품번호)!;
    if (s.error) return `- ${p.이름} ${p.부품번호}: 조회 실패 → 담당자 확인 필요`;
    const lack = p.수량 - Number(s.재고);
    if (lack <= 0) return `- ${p.이름} ${p.부품번호}: 필요 ${p.수량} · 재고 ${s.재고} → 충분`;
    const late = s.입고예정 && s.입고예정 > plan.정비일 ? " (정비일 뒤라 늦음)" : "";
    return `- ${p.이름} ${p.부품번호}: 필요 ${p.수량} · 재고 ${s.재고} → ${lack}개 부족${s.입고예정 ? `, 입고 예정 ${s.입고예정}${late}` : ""}`;
  });
  const requested = got("request_part").map((r) => (r.result.청구번호 ? `- ${r.result.부품번호} ${r.result.수량}개 청구 접수 (${r.result.청구번호})` : `- 청구 안 함: ${r.result.결과 ?? r.result.error}`));
  const ok = !short.length && parts.every((p) => !stock.get(p.부품번호)!.error);
  return answer([
    head,
    ...lines,
    ...(requested.length ? ["청구:", ...requested] : []),
    ok ? "결론: 지금 재고로 정비할 수 있습니다." : "결론: 지금 재고로는 정비를 다 할 수 없습니다. 부족한 부품을 확보하거나 정비일을 조정해야 합니다.",
  ].join("\n"));
}

/** 도구 없이 대화만 (실습 1 · 2) */
function talk(messages: Msg[], question: string): Reply {
  if (!question) return answer("무엇을 도와드릴까요? (user 메시지가 없습니다)");
  if (/한 줄|줄여/.test(question)) {
    const before = messages.filter((m) => m.role === "assistant").map((m) => text(m)).filter(Boolean);
    return answer(before.length ? "브레이크 패드는 정해진 기간이 아니라 마모 한계에 닿으면 교체한다." : "앞에서 무슨 답을 했는지 알 수 없습니다. 무엇을 줄여 드릴까요?");
  }
  if (/브레이크/.test(question)) {
    return answer("브레이크 패드는 정해진 기간보다 마모 상태로 교체합니다. 정기 점검 때 마모 지시 핀 길이를 재서 한계에 닿으면 바꾸고, 정확한 기준은 기종별 정비 교범을 따릅니다.");
  }
  return answer(`(mock) "${question.slice(0, 30)}" 에 대한 정해진 답이 없습니다. 실제 모델로 바꾸면 답합니다 (.env 의 LLM_MODE).`);
}
