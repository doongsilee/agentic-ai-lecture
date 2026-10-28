#!/usr/bin/env node
/**
 * tools/lab.mjs — 실습 돌리기. pnpm lab 13 = 실습 13 을 하는 파일(pm/agent2.ts)을 돌린다
 *
 * 사용:  pnpm lab 3            오전 실습 파일 (am/agent.ts)
 *        pnpm lab 13           오후 ② 실습 파일 (pm/agent2.ts)
 */
import { spawnSync } from "node:child_process";
import { sessionOf } from "./sessions.mjs";

const { session } = sessionOf(process.argv.slice(2), "실습 번호(1 ~ 22)가 필요합니다. 예: pnpm lab 13");

const { status } = spawnSync("tsx", [session.file], { stdio: "inherit", cwd: new URL("..", import.meta.url) });
process.exit(status ?? 1);
