import type { Session } from "../core/session";
import type { SessionRequest, SessionResponse } from "./session.worker";

export function sessionTask(request: SessionRequest, signal?: AbortSignal): Promise<Session> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Fleet operation canceled", "AbortError"));
      return;
    }
    const worker = new Worker(new URL("./session.worker.ts", import.meta.url), { type: "module" });
    const timer = window.setTimeout(() => {
      stop();
      reject(new Error("Fleet computation exceeded 30 seconds"));
    }, 30000);
    const stop = () => {
      window.clearTimeout(timer);
      worker.terminate();
      signal?.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      stop();
      reject(new DOMException("Fleet operation canceled", "AbortError"));
    };
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (event: MessageEvent<SessionResponse>) => {
      stop();
      switch (event.data.ok) {
        case true:
          resolve(event.data.session);
          break;
        case false:
          reject(new Error(event.data.error));
          break;
      }
    };
    worker.onerror = (event) => {
      stop();
      reject(
        new Error(
          `Fleet worker failed: ${event.message || "The browser could not load or run the fleet worker. Retry this operation."}`,
        ),
      );
    };
    worker.onmessageerror = () => {
      stop();
      reject(new Error("Fleet worker returned an unreadable session"));
    };
    try {
      worker.postMessage(request);
    } catch (cause) {
      stop();
      throw cause;
    }
  });
}
