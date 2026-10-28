#!/usr/bin/env node
/**
 * tools/step.mjs — 따라잡기. pnpm step 13 = "13번을 풀 차례" 로 바로 넘어간다 (12번까지는 풀린 상태)
 *   그 시간의 실습 파일(am/agent.ts · pm/agent.ts · pm/agent2.ts ~ agent4.ts)에 정답 12 를 덮어쓴다
 *   그 시간의 첫 실습(1 · 8 · 12 · 16 · 20)이면 시작 파일로 되돌린다
 *   정답은 answers 브랜치에서 읽는다 (git 이 없으면 GitHub 에서 받는다). 덮어쓰는 파일에 내가 고친 내용은 사라지므로 먼저 묻는다
 *
 * 사용:  pnpm step 13          13번을 풀 차례로 (pm/agent2.ts 에 정답 12)
 *        pnpm step 12          오후 ② 시작 파일로 되돌리기
 *        pnpm step 13 --yes    묻지 않고 바로
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import readline from "node:readline/promises";
import { sessionOf } from "./sessions.mjs";

const REPO = "doongsilee/agentic-ai-lecture";
const { no: step, session } = sessionOf(process.argv.slice(2), "풀 차례인 실습 번호(1 ~ 22)가 필요합니다. 예: pnpm step 13");

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const tryGit = (...args) => { try { return git(...args); } catch { return null; } };
if (tryGit("rev-parse", "--abbrev-ref", "HEAD")?.trim() === "answers") {
  console.error("지금 answers(정답) 브랜치입니다. pnpm step 은 main 브랜치에서 씁니다: git switch main");
  process.exit(1);
}

// 브랜치의 파일 하나를 읽는다: 받아 온 origin → 내 브랜치 → GitHub 순서
async function read(branch, path) {
  for (const rev of [`origin/${branch}`, branch]) {
    const text = tryGit("show", `${rev}:lab/${path}`);
    if (text !== null) return { text, from: rev };
  }
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${branch}/lab/${path}`).catch(() => null);
  if (res?.ok) return { text: await res.text(), from: `GitHub ${branch}` };
  console.error(`lab/${path} 를 ${branch} 브랜치에서 읽지 못했습니다. 인터넷 연결이나 git clone 상태를 확인하세요`);
  process.exit(1);
}

// 강사가 고친 최신 정답 · 시작 파일이 있으면 먼저 받아 온다 (인터넷이 없으면 갖고 있는 것으로)
tryGit("fetch", "origin", "--quiet", "+refs/heads/answers:refs/remotes/origin/answers", "+refs/heads/main:refs/remotes/origin/main");

const first = step === session.from;
const { text, from } = first
  ? await read("main", session.file) // 그 시간의 시작 파일
  : await read("answers", `${session.answers}/${step - 1}.ts`); // 바로 앞 실습의 정답
// 정답은 answers/ 폴더에 있어서 한 단계 깊다. 실습 파일 자리에 맞게 경로를 고친다
const content = first ? text : text.replaceAll('"../../lib/', '"../lib/').replaceAll('"../../data/', '"../data/');

const what = first ? `시작 파일로 되돌립니다 (실습 ${step} 부터)` : `실습 ${step - 1} 까지 풀린 상태로 바꿉니다 (정답 ${step - 1})`;
console.log(`${session.file} 를 ${what}. 출처: ${from}`);
console.log(`이 파일에 직접 고친 내용은 사라집니다.`);
if (!process.argv.includes("--yes")) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ok = (await rl.question("계속할까요? (y/N) ")).trim().toLowerCase();
  rl.close();
  if (ok !== "y") { console.log("그만둡니다."); process.exit(0); }
}

fs.writeFileSync(new URL(`../${session.file}`, import.meta.url), content);

// 이번에 풀 실습의 자리 표시(// 실습 N)가 몇 번째 줄에 있는지 찍는다
const spots = content.split("\n")
  .map((line, i) => ({ line: line.trim(), at: `${session.file}:${i + 1}` }))
  .filter(({ line }) => !line.startsWith("*") && line.includes("//") && new RegExp(`실습 ${step}(?!\\d)`).test(line.slice(line.indexOf("//"))));
if (spots.length) {
  console.log(`\n고칠 곳 (파일:줄 — VS Code 터미널에서 Ctrl+클릭하면 그 줄로 갑니다):`);
  const w = Math.max(...spots.map((s) => s.at.length));
  spots.forEach((s) => console.log(`  ${s.at.padEnd(w)}  ${s.line.slice(s.line.indexOf("//"))}`));
} else {
  console.log(`\n실습 ${step} 은 강의 장표를 보고 ${session.file} 에 이어서 만듭니다.`);
}
console.log(`지금 상태 확인: pnpm lab ${step}`);
