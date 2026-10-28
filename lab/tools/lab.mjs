#!/usr/bin/env node
/**
 * tools/lab.mjs — 실습 돌리기. pnpm lab 11 = 실습 11 을 하는 파일(pm/agent2.ts)을 돌린다
 *
 * 사용:  pnpm lab 3            오전 실습 파일 (am/agent.ts)
 *        pnpm lab 11           오후 ② 실습 파일 (pm/agent2.ts)
 *        pnpm lab 9 --limit    MAX_STEPS=1 로 (모델을 한 번만 부르고 멈추는지 보기 · 실습 4 · 9)
 */
import { spawnSync } from "node:child_process";
import { sessionOf } from "./sessions.mjs";

const { session } = sessionOf(process.argv.slice(2), "실습 번호(1 ~ 20)가 필요합니다. 예: pnpm lab 11  (MAX_STEPS=1 로 돌리려면 pnpm lab 9 --limit)");
const env = process.argv.includes("--limit") ? { ...process.env, MAX_STEPS: "1" } : process.env;

const { status } = spawnSync("tsx", [session.file], { stdio: "inherit", env, cwd: new URL("..", import.meta.url) });
process.exit(status ?? 1);
