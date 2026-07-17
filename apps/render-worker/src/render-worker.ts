import type {RenderWorkerMessage} from "@storystage/contracts";
import {runWorkerCommand} from "./worker-protocol";

type UtilityParentPort = {
  on(event: "message", listener: (event: {data: unknown}) => void): void;
  postMessage(message: unknown): void;
};

const parentPort = (process as NodeJS.Process & {parentPort?: UtilityParentPort}).parentPort;
if (!parentPort) throw new Error("StoryStage render worker requires an Electron utility-process parent port.");

parentPort.on("message", (event) => {
  void runWorkerCommand(event.data, (message: RenderWorkerMessage) => parentPort.postMessage(message));
});
