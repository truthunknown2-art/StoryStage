import process from "node:process";
import { runPreflight } from "./preflight";

function readReceiptArgument(args: string[]): string | undefined {
  const receiptIndex = args.indexOf("--receipt");
  if (receiptIndex < 0) return undefined;
  const value = args[receiptIndex + 1];
  if (!value) throw new Error("--receipt requires a repository-relative path.");
  return value;
}

try {
  const { receipt, receiptPath } = await runPreflight({
    receiptPath: readReceiptArgument(process.argv.slice(2)),
  });
  process.stdout.write(
    `E1-WP1 App Server preflight ${receipt.result}: ${receipt.accountState}\nReceipt: ${receiptPath}\n`,
  );
  if (receipt.result !== "pass") process.exitCode = 1;
} catch (error) {
  process.stderr.write(
    `E1-WP1 App Server preflight could not write a safe receipt: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exitCode = 1;
}
