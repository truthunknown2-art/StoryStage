import {readFileSync} from "node:fs";

type Metrics = {averageShotSeconds: number; routedInsertShare: number; characterPerformanceEventsPerMinute: number};
const [kidsPath, historyPath] = process.argv.slice(2);
if (!kidsPath || !historyPath) throw new Error("Usage: compare-profile-output.ts <kids-metrics.json> <history-metrics.json>");
const read = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Metrics;
const kids = read(kidsPath);
const history = read(historyPath);
const cadenceRatio = Math.max(kids.averageShotSeconds, history.averageShotSeconds) / Math.min(kids.averageShotSeconds, history.averageShotSeconds);
const result = {
  cadenceRatio,
  historyInsertRoutingRatio: history.routedInsertShare / kids.routedInsertShare,
  kidsPerformanceRatio: kids.characterPerformanceEventsPerMinute / history.characterPerformanceEventsPerMinute,
  passes: cadenceRatio >= 1.2 && history.routedInsertShare >= kids.routedInsertShare * 1.5 && kids.characterPerformanceEventsPerMinute >= history.characterPerformanceEventsPerMinute * 1.5,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passes) process.exitCode = 1;
