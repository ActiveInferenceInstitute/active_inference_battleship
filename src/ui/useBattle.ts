import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyEvent,
  assistant,
  exportSession,
  type Session,
  type SessionEvent,
  suggestedCell,
} from "../core/session";
import generated from "../generated/model.json";
import { compiledModelSchema, modelDefaults } from "../model/schema";
import { sessionTask } from "../worker/client";
import { bindTheme, type Theme } from "./theme";

export const model = compiledModelSchema.parse(generated);
export const defaults = modelDefaults(model);
export type View = "play" | "diagnostics" | "lab" | "guide";
export function useBattle(initialSession: Session) {
  const [session, setSession] = useState(initialSession);
  const [operation, setOperation] = useState<"create" | "import" | null>(null);
  const busy = operation !== null;
  const [workError, setWorkError] = useState("");
  const [workNotice, setWorkNotice] = useState("");
  const workAbort = useRef<AbortController | null>(null);
  const [inspectedActor, setInspectedActor] = useState<"player" | "opponent">("player");
  const workEpoch = useRef(0);
  const [view, setView] = useState<View>("play");
  const [selected, setSelected] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [pace, setPace] = useState(700);
  const [seed, setSeed] = useState(String(defaults.seed));
  const [count, setCount] = useState(defaults.catalogueSize);
  const [heatmap, setHeatmap] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<Theme>("system");
  const { belief, actions } = useMemo(() => assistant(session), [session]);
  const diagnostic = useMemo(
    () => (inspectedActor === "player" ? { belief, actions } : assistant(session, "opponent")),
    [inspectedActor, session, belief, actions],
  );
  const game = session.game;
  const top = actions[0];
  const target = selected === null ? top : actions.find((a) => a.cell === selected);
  const hits = game.playerShots.filter((s) => s.hit).length;
  const enemyHits = game.opponentShots.filter((s) => s.hit).length;
  const totalSegments = game.rules.shipLengths.reduce((a, b) => a + b, 0);
  const last = game.playerShots.at(-1);
  const lastEnemy = game.opponentShots.at(-1);
  const playing = game.phase === "playing" && !busy;

  useEffect(() => bindTheme(theme), [theme]);

  useEffect(() => {
    if (!autoplay || game.phase !== "playing") return;
    const timer = window.setTimeout(() => {
      try {
        setSession(applyEvent(session, { type: "shot", cell: suggestedCell(session) }));
        setSelected(null);
        setNotice("");
        setWorkNotice("");
      } catch (cause) {
        setAutoplay(false);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }, pace);
    return () => window.clearTimeout(timer);
  }, [autoplay, game.phase, session, pace]);

  useEffect(() => {
    if (view !== "play") setAutoplay(false);
  }, [view]);

  useEffect(() => () => workAbort.current?.abort(), []);

  const cancelWork = () => {
    ++workEpoch.current;
    workAbort.current?.abort();
    workAbort.current = null;
    setOperation(null);
    setWorkError("");
    setWorkNotice("Operation canceled. Your previous game is preserved.");
  };

  const dispatch = (event: SessionEvent) => {
    try {
      setSession(applyEvent(session, event));
      setError("");
      setNotice("");
      setWorkNotice("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setAutoplay(false);
    }
  };
  const shoot = (cell: number) => {
    dispatch({ type: "shot", cell });
    setSelected(null);
  };
  const newGame = async () => {
    const epoch = ++workEpoch.current;
    workAbort.current?.abort();
    const abort = new AbortController();
    workAbort.current = abort;
    setOperation("create");
    setWorkError("");
    setWorkNotice("");
    setAutoplay(false);
    try {
      if (!/^\d+$/.test(seed)) throw new Error("Seed must be a nonempty integer");
      const next = await sessionTask(
        { type: "create", model, seed: Number(seed), count },
        abort.signal,
      );
      if (epoch !== workEpoch.current) return;
      setAutoplay(false);
      setSession(next);
      setSelected(null);
      setError("");
      setNotice("New game ready. Shuffle your fleet or launch.");
      setWorkNotice("New game ready. Shuffle your fleet or launch.");
    } catch (cause) {
      if (epoch === workEpoch.current)
        setWorkError(
          cause instanceof Error ? cause.message : "Unable to prepare a new game. Try again.",
        );
    } finally {
      if (epoch === workEpoch.current) {
        setOperation(null);
        workAbort.current = null;
      }
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportSession(session, model)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `battleship-${session.seed}-${game.playerShots.length}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Replay exported. The seed reproduces hidden fleets; treat it as a complete local game record.",
    );
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    const epoch = ++workEpoch.current;
    workAbort.current?.abort();
    const abort = new AbortController();
    workAbort.current = abort;
    setOperation("import");
    setWorkError("");
    setWorkNotice("");
    setAutoplay(false);
    try {
      if (file.size > 1000000) throw new Error("Replay exceeds 1 MB limit");
      const text = await file.text();
      if (epoch !== workEpoch.current) return;
      const next = await sessionTask({ type: "import", model, text }, abort.signal);
      if (epoch !== workEpoch.current) return;
      setSession(next);
      setSeed(String(next.seed));
      setCount(next.catalogueSize);
      setSelected(null);
      setError("");
      setNotice("Replay imported and reconstructed successfully.");
      setWorkNotice(
        next.game.phase === "ready"
          ? "Replay imported. Your fleet is ready to launch."
          : next.game.phase === "playing"
            ? "Replay imported. Continue the game when you are ready."
            : "Replay imported. This game has ended; start a new game to play again.",
      );
    } catch (cause) {
      if (epoch === workEpoch.current)
        setWorkError(
          file.size > 1000000
            ? "This replay exceeds the 1 MB limit. Choose a smaller replay exported by this app."
            : cause instanceof Error && /Fleet (worker|computation)/.test(cause.message)
              ? `${cause.message} Your previous game is preserved.`
              : "This file is not a supported Battleship replay. Choose a replay exported by this app. Your previous game is preserved.",
        );
    } finally {
      if (epoch === workEpoch.current) {
        setOperation(null);
        workAbort.current = null;
      }
    }
  };
  const selectCell = (cell: number) => {
    setAutoplay(false);
    setSelected(cell);
    setView("play");
  };
  const status =
    game.phase === "ready"
      ? "Fleet ready for deployment"
      : game.phase === "won"
        ? "Victory. Enemy fleet sunk."
        : game.phase === "lost"
          ? "Defeat. Your fleet was sunk."
          : `Turn ${game.playerShots.length + 1} · Select your next target`;

  return {
    session,
    view,
    setView,
    selected,
    setSelected,
    autoplay,
    setAutoplay,
    pace,
    setPace,
    seed,
    setSeed,
    count,
    setCount,
    heatmap,
    setHeatmap,
    error,
    notice,
    theme,
    setTheme,
    belief,
    actions,
    game,
    top,
    target,
    hits,
    enemyHits,
    totalSegments,
    last,
    lastEnemy,
    playing,
    dispatch,
    shoot,
    newGame,
    download,
    upload,
    selectCell,
    status,
    model,
    defaults,
    busy,
    operation,
    workError,
    workNotice,
    cancelWork,
    inspectedActor,
    setInspectedActor,
    diagnostic,
  };
}
export type BattleController = ReturnType<typeof useBattle>;
