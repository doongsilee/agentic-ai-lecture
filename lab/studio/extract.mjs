/**
 * studio/extract.mjs — 정답 파일에서 그래프를 만드는 데까지만 잘라 graphs/N.ts 로 옮긴다
 *
 *   정답 파일은 맨 아래에서 바로 실행한다 (readline 으로 묻기 · run). Studio 가 그대로 불러오면 그 코드까지 돈다
 *   그래서 const graph = ... .compile(...) 문장이 끝나는 줄까지만 쓰고 export 를 붙인다. 정답 파일은 그대로 둔다
 *   graphs/ 는 pm/answers/ 와 깊이가 같아서 ../../lib/env.js 같은 import 가 그대로 맞는다
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const from = new URL("../pm/answers/", import.meta.url);
const to = new URL("./graphs/", import.meta.url);
mkdirSync(to, { recursive: true });

const made = [];
for (const name of readdirSync(from).filter((f) => /^\d+\.ts$/.test(f))) {
  const lines = readFileSync(new URL(name, from), "utf8").split("\n");
  const start = lines.findIndex((l) => l.startsWith("const graph = new StateGraph"));
  if (start < 0) continue; // 그래프가 없는 정답 (그래프는 실습 6 부터)
  const end = lines.findIndex((l, i) => i > start && /\.compile\(.*\);/.test(l));
  const head = `// 자동 생성 (studio/extract.mjs): ../pm/answers/${name} 에서 그래프까지만 잘라 왔다. 여기를 고치지 말고 정답 파일을 고친다\n`;
  writeFileSync(new URL(name, to), head + lines.slice(0, end + 1).join("\n") + "\n\nexport { graph };\n");
  made.push(name.replace(".ts", ""));
}
console.log(`graphs/ 에 정답 ${made.length}개: 실습 ${made.sort((a, b) => a - b).join(" · ")}`);
