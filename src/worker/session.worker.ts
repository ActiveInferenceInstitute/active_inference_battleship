import { createSession, importSession, type Session } from "../core/session";
import type { CompiledModel } from "../model/schema";

export type SessionRequest =
  | {
      readonly type: "create";
      readonly model: CompiledModel;
      readonly seed: number;
      readonly count: number;
    }
  | { readonly type: "import"; readonly model: CompiledModel; readonly text: string };
export type SessionResponse =
  | { readonly ok: true; readonly session: Session }
  | { readonly ok: false; readonly error: string };

self.addEventListener("message", (event: MessageEvent<SessionRequest>) => {
  try {
    let session: Session;
    switch (event.data.type) {
      case "create":
        session = createSession(event.data.model, event.data.seed, event.data.count);
        break;
      case "import":
        session = importSession(event.data.text, event.data.model);
        break;
    }
    self.postMessage({ ok: true, session } satisfies SessionResponse);
  } catch (cause) {
    self.postMessage({
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause),
    } satisfies SessionResponse);
  }
});
