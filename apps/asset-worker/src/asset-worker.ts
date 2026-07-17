import type {AssetWorkerMessage} from "@storystage/contracts";
import {runAssetWorkerCommand} from "./worker-protocol";

type UtilityParentPort = {
  on(event: "message", listener: (event: {data: unknown}) => void): void;
  postMessage(message: unknown): void;
};

const parentPort = (process as NodeJS.Process & {parentPort?: UtilityParentPort}).parentPort;
if (!parentPort) throw new Error("StoryStage asset worker requires an Electron utility-process parent port.");

parentPort.on("message", (event) => {
  void runAssetWorkerCommand(event.data, (message: AssetWorkerMessage) => parentPort.postMessage(message));
});
