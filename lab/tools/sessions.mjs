/**
 * tools/sessions.mjs — 시간마다 실습 번호와 그 시간의 실습 파일 (pnpm lab · pnpm step 이 같이 쓴다)
 */
export const SESSIONS = [
  { from: 1, to: 5, file: "am/agent.ts", answers: "am/answers" },
  { from: 6, to: 9, file: "pm/agent.ts", answers: "pm/answers" },
  { from: 10, to: 13, file: "pm/agent2.ts", answers: "pm/answers" },
  { from: 14, to: 17, file: "pm/agent3.ts", answers: "pm/answers" },
  { from: 18, to: 20, file: "pm/agent4.ts", answers: "pm/answers" },
];

// 명령줄에서 실습 번호를 읽어 그 시간을 찾는다. 없으면 사용법을 찍고 끝낸다
export function sessionOf(argv, usage) {
  const no = Number(argv.find((a) => !a.startsWith("--")));
  const session = SESSIONS.find((s) => no >= s.from && no <= s.to);
  if (!Number.isInteger(no) || !session) {
    console.error(usage);
    process.exit(1);
  }
  return { no, session };
}
