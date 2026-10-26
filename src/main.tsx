import { Component, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Startup } from "./ui/Startup";
import { bindTheme } from "./ui/theme";
import { defaults, model } from "./ui/useBattle";
import { sessionTask } from "./worker/client";
import "./styles.css";

class ApplicationBoundary extends Component<
  { readonly children: ReactNode },
  { readonly message: string }
> {
  state = { message: "" };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Battleship failed", error, info.componentStack);
  }
  render() {
    if (this.state.message)
      return (
        <main className="fatal-error" role="alert">
          <h1>Unable to continue this session</h1>
          <p>{this.state.message}</p>
          <button type="button" onClick={() => location.reload()}>
            Reload game
          </button>
        </main>
      );
    return this.props.children;
  }
}

if (import.meta.env.DEV && import.meta.env["VITE_INSPECT_REACT"] === "1") {
  void import("react-grab");
  void import("react-scan").then(({ scan }) => scan({ enabled: true }));
}
const root = document.getElementById("root");
if (!root) throw new Error("Application mount point is missing");
const application = createRoot(root);
const stopStartupTheme = bindTheme("system");
let disposed = false;
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposed = true;
    stopStartupTheme();
    application.unmount();
  });
}
application.render(<Startup />);
void sessionTask({
  type: "create",
  model,
  seed: defaults.seed,
  count: defaults.catalogueSize,
}).then(
  (session) => {
    if (disposed) return;
    stopStartupTheme();
    application.render(
      <ApplicationBoundary>
        <App initialSession={session} />
      </ApplicationBoundary>,
    );
  },
  (cause: unknown) => {
    if (disposed) return;
    application.render(<Startup error={cause instanceof Error ? cause.message : String(cause)} />);
  },
);
