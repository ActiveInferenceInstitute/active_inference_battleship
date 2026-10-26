import type { CSSProperties, KeyboardEvent } from "react";
import { coordinate, type Fleet } from "../core/fleet";
import type { Shot } from "../core/game";

interface BoardProps {
  readonly title: string;
  readonly size: number;
  readonly shots: readonly Shot[];
  readonly probabilities: readonly number[];
  readonly cellDetails?: readonly string[];
  readonly fleet: Fleet | null;
  readonly selected: number | null;
  readonly recommended: number | null;
  readonly heatmap: boolean;
  readonly interactive: boolean;
  readonly onSelect: (cell: number) => void;
}

export function Board(props: BoardProps) {
  const { size, shots, fleet } = props;
  const shotMap = new Map(shots.map((s) => [s.cell, s]));
  const fired = new Set(shots.map((s) => s.cell));
  const sunkCells = new Set(
    fleet?.ships.filter((ship) => ship.every((c) => fired.has(c))).flat() ?? [],
  );
  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, cell: number) => {
    const offsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: size,
      ArrowUp: -size,
      Home: -(cell % size),
      End: size - 1 - (cell % size),
    };
    const offset = offsets[event.key];
    if (offset === undefined) return;
    event.preventDefault();
    const target = Math.max(0, Math.min(size ** 2 - 1, cell + offset));
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[data-cell="${target}"]`)
      ?.focus();
  };
  return (
    <fieldset
      className="board"
      style={{ "--size": size } as CSSProperties}
      aria-label={props.title}
    >
      <div className="board-labels" aria-hidden="true">
        <span />
        {Array.from({ length: size }, (_, i) => i + 1).map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="board-body">
        <div className="row-labels" aria-hidden="true">
          {Array.from({ length: size }, (_, i) => (
            <span key={String.fromCharCode(65 + i)}>{String.fromCharCode(65 + i)}</span>
          ))}
        </div>
        <div className="board-cells">
          {Array.from({ length: size ** 2 }, (_, cell) => {
            const shot = shotMap.get(cell);
            const probability = props.probabilities[cell] ?? 0;
            const occupied = fleet?.occupied[cell] === true;
            const selected = props.selected === cell;
            const recommended = props.recommended === cell && !shot;
            const state = shot
              ? shot.hit
                ? sunkCells.has(cell)
                  ? "sunk"
                  : "hit"
                : "miss"
              : occupied
                ? "ship"
                : "unknown";
            return (
              <button
                type="button"
                key={coordinate(cell, size)}
                data-cell={cell}
                data-state={state}
                className={`cell ${state} ${selected ? "selected" : ""} ${recommended ? "recommended" : ""}`}
                style={
                  {
                    "--belief": props.heatmap && !shot && fleet === null ? probability : 0,
                  } as CSSProperties
                }
                aria-label={`${props.title} ${coordinate(cell, size)}: ${state}${props.cellDetails?.[cell] ?? (fleet === null ? `, ship probability ${(probability * 100).toFixed(1)}%` : "")}`}
                aria-pressed={selected}
                aria-disabled={!props.interactive || shot !== undefined}
                tabIndex={props.interactive ? 0 : -1}
                onKeyDown={(e) => moveFocus(e, cell)}
                onClick={() => {
                  if (props.interactive && !shot) props.onSelect(cell);
                }}
              >
                <span
                  className={recommended && !selected && !shot ? "leading-marker" : undefined}
                  aria-hidden="true"
                >
                  {shot
                    ? shot.hit
                      ? "×"
                      : "·"
                    : selected
                      ? "+"
                      : recommended
                        ? "⌖"
                        : occupied
                          ? "▪"
                          : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </fieldset>
  );
}
