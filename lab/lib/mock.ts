/**
 * lib/mock.ts — LLM_MODE=mock 일 때 쓰는 가짜 모델 (키 없이 실습 흐름을 확인)
 *
 * 정해진 답이지만, 실제 모델이 할 법한 행동을 흉내 낸다
 *   · 지난 답이 messages 에 없으면 "방금 답" 을 모른다
 *   · 설명(description)이나 입력 모양(parameters)이 비어 있는 도구는 쓰지 못한다
 *   · 도구를 요청하고도 결과를 못 받으면 결과를 지어내 답한다 (당일 모델이 실제로 그랬다)
 *   · 정비 계획 → 부품마다 재고 → (조회 실패면) 대체 부품 → 대체품 재고 → (부족하면) 청구 → 답
 */
import type { Msg, Tool, ToolCall } from "./llm.js";

type Part = { 부품번호: string; 이름: string; 수량: number };

const text = (m?: Msg) => (m && typeof m.content === "string" ? m.content : "");
const parse = (s: string): any => { try { return JSON.parse(s); } catch { return { error: s }; } };
const answer = (content: string): Msg => ({ role: "assistant", content });

export function mockChat(messages: Msg[], tools?: Tool[]): Msg {
  const asked = messages.flatMap((m) => (m.role === "assistant" && m.tool_calls ? m.tool_calls : []));
  const resultOf = (c: ToolCall) => messages.find((x) => x.role === "tool" && x.tool_call_id === c.id);
  if (asked.some((c) => !resultOf(c))) return answer("TR-1023 의 다음 정기 정비는 2024년 5월 15일 A-check 입니다. 엔진 점검과 전자 시스템 검사가 포함되며 약 48시간 걸립니다.");

  const question = text([...messages].reverse().find((m) => m.role === "user"));
  if (!tools?.length) return talk(messages, question);

  const usable = new Set(tools.filter((t) => t.function.description && Object.keys((t.function.parameters as any)?.properties ?? {}).length).map((t) => t.function.name));
  let n = messages.length;
  const call = (name: string, args: object): ToolCall => ({ id: `call_mock_${n++}`, type: "function", function: { name, arguments: JSON.stringify(args) } });
  const want = (...calls: ToolCall[]): Msg => ({ role: "assistant", content: null, tool_calls: calls });
  const results = asked.map((c) => ({ name: c.function.name, args: parse(c.function.arguments), result: parse(text(resultOf(c))) }));
  const got = (name: string) => results.filter((r) => r.name === name);

  const tail = question.toUpperCase().match(/[A-Z]{2}-\d{4}/)?.[0];
  if (!tail) return answer("정비 부품 담당입니다. 기체번호(예: TR-1023)를 알려 주시면 정비 계획과 부품 재고를 확인해 드립니다.");
  if (!usable.has("get_maintenance_plan")) return answer(`${tail} 의 정비 계획을 확인할 방법이 없어 답할 수 없습니다.`);
  if (!got("get_maintenance_plan").length) return want(call("get_maintenance_plan", { tail_no: tail }));
  const plan = got("get_maintenance_plan").at(-1)!.result;
  if (plan.error) return answer(`정비 계획 조회에 실패했습니다: ${plan.error}`);

  const head = `${tail} 다음 정기 정비는 ${plan.정비}, ${plan.정비일} 입니다.`;
  const parts: Part[] = plan.부품;
  const list = parts.map((p) => `- ${p.이름} ${p.부품번호} ${p.수량}개`);
  if (!/재고|부품/.test(question)) return answer([head, "필요한 부품:", ...list].join("\n"));
  if (!usable.has("check_stock")) return answer([head, "필요한 부품:", ...list, "재고를 확인할 도구가 없어 재고는 알 수 없습니다."].join("\n"));

  // 아직 재고를 못 본 부품은 한 번에 전부 조회한다
  const stock = new Map<string, any>(got("check_stock").map((r) => [String(r.args.part_no).toUpperCase(), r.result]));
  const todo = parts.filter((p) => !stock.has(p.부품번호));
  if (todo.length) return want(...todo.map((p) => call("check_stock", { part_no: p.부품번호 })));

  // 조회에 실패한 부품은 대체품을 찾고, 대체품 재고를 본다
  const subs = new Map<string, any>(got("find_substitute").map((r) => [String(r.args.part_no).toUpperCase(), r.result]));
  if (usable.has("find_substitute")) {
    const failed = parts.filter((p) => stock.get(p.부품번호).error && !subs.has(p.부품번호));
    if (failed.length) return want(...failed.map((p) => call("find_substitute", { part_no: p.부품번호 })));
    const subTodo = [...subs.values()].map((s) => s.대체품).filter((no) => no && !stock.has(no));
    if (subTodo.length) return want(...subTodo.map((no) => call("check_stock", { part_no: no })));
  }
  // 부품마다 실제로 쓸 재고: 조회 실패면 대체품 재고
  const have = (p: Part) => {
    const sub = subs.get(p.부품번호)?.대체품;
    return stock.get(p.부품번호).error && sub ? { ...stock.get(sub), via: sub } : stock.get(p.부품번호);
  };
  const short = parts.filter((p) => !have(p).error && Number(have(p).재고) < p.수량);
  if (usable.has("request_part") && short.length && !got("request_part").length) {
    return want(...short.map((p) => call("request_part", { part_no: p.부품번호, qty: p.수량 - Number(have(p).재고) })));
  }

  const lines = parts.map((p) => {
    const s = have(p);
    const name = `${p.이름} ${p.부품번호}${s.via ? ` (대체품 ${s.via})` : ""}`;
    if (s.error) return `- ${name}: 조회 실패 → 담당자 확인 필요`;
    const lack = p.수량 - Number(s.재고);
    if (lack <= 0) return `- ${name}: 필요 ${p.수량} · 재고 ${s.재고} → 충분`;
    const late = s.입고예정 && s.입고예정 > plan.정비일 ? " (정비일 뒤라 늦음)" : "";
    return `- ${name}: 필요 ${p.수량} · 재고 ${s.재고} → ${lack}개 부족${s.입고예정 ? `, 입고 예정 ${s.입고예정}${late}` : ""}`;
  });
  const requested = got("request_part").map((r) => (r.result.청구번호 ? `- ${r.result.부품번호} ${r.result.수량}개 청구 접수 (${r.result.청구번호})` : `- 청구 안 함: ${r.result.결과 ?? r.result.error}`));
  const ok = !short.length && parts.every((p) => !have(p).error);
  return answer([
    head,
    ...lines,
    ...(requested.length ? ["청구:", ...requested] : []),
    ok ? "결론: 지금 재고로 정비할 수 있습니다." : "결론: 지금 재고로는 정비를 다 할 수 없습니다. 부족한 부품을 확보하거나 정비일을 조정해야 합니다.",
  ].join("\n"));
}

/** 도구 없이 대화만 (과제 1) */
function talk(messages: Msg[], question: string): Msg {
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
