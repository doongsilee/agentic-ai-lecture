/**
 * studio/extract.mjs — 실습 파일에서 그래프를 만드는 데까지만 잘라 graphs/ 로 옮기고, langgraph.json 을 만든다
 *
 *   실습 파일은 맨 아래에서 바로 실행한다 (invoke · readline 으로 묻기). Studio 가 그대로 불러오면 그 코드까지 돈다
 *   그래서 const graph = new StateGraph(...) 부터 .compile(...) 문장이 끝나는 줄까지만 쓰고 export 를 붙인다. 실습 파일은 그대로 둔다
 *
 *   내 실습 파일   pm/agent.ts ~ agent4.ts    → 그래프 이름 pm1 ~ pm4 (아직 그래프가 없으면 건너뛴다)
 *   정답 (answers 브랜치에만)  pm/answers/N.ts  → 그래프 이름 N (실습 번호)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const lab = new URL("../", import.meta.url);
const to = new URL("./graphs/", import.meta.url);
mkdirSync(to, { recursive: true });

// const graph = new StateGraph 줄부터, .compile( 이 나온 뒤 ; 로 끝나는 줄까지
function cut(lines) {
  const start = lines.findIndex((l) => l.startsWith("const graph = new StateGraph"));
  if (start < 0) return null;
  const at = lines.findIndex((l, i) => i >= start && l.includes(".compile("));
  if (at < 0) return null;
  const end = lines.findIndex((l, i) => i >= at && l.trimEnd().endsWith(";"));
  return end < 0 ? null : lines.slice(0, end + 1);
}

const graphs = {};
function add(id, from, fixImports) {
  let text = readFileSync(new URL(from, lab), "utf8");
  // pm/ 의 파일은 ../lib · ../data 를 쓴다. graphs/ 는 한 단계 더 깊어서 ../../ 로 바꾼다 (pm/answers/ 는 깊이가 같아 그대로)
  if (fixImports) text = text.replaceAll('"../lib/', '"../../lib/').replaceAll('"../data/', '"../../data/');
  const lines = cut(text.split("\n"));
  if (!lines) return console.log(`  ${from}: 아직 그래프가 없어 건너뛴다`);
  const head = `// 자동 생성 (studio/extract.mjs): ../${from} 에서 그래프까지만 잘라 왔다. 여기를 고치지 말고 실습 파일을 고친다\n`;
  writeFileSync(new URL(`${id}.ts`, to), head + lines.join("\n") + "\n\nexport { graph };\n");
  graphs[id] = `./graphs/${id}.ts:graph`;
}

["agent.ts", "agent2.ts", "agent3.ts", "agent4.ts"].forEach((f, i) => add(`pm${i + 1}`, `pm/${f}`, true));
if (existsSync(new URL("pm/answers/", lab))) {
  readdirSync(new URL("pm/answers/", lab))
    .filter((f) => /^\d+\.ts$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .forEach((f) => add(f.replace(".ts", ""), `pm/answers/${f}`, false));
}

writeFileSync(new URL("./langgraph.json", import.meta.url), JSON.stringify({ node_version: "22", dependencies: ["."], graphs, env: "../.env" }, null, 2) + "\n");
console.log(`Studio 에 띄울 그래프 ${Object.keys(graphs).length}개: ${Object.keys(graphs).join(" · ") || "(없음)"}`);
