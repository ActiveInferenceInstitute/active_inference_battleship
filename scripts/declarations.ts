/** Normalize generated declarations for Node ESM without changing type literals or comments. */
interface Token {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly kind: "word" | "string" | "punctuation";
}
function tokens(source: string): Token[] {
  const result: Token[] = [];
  let at = 0;
  const scan = (interpolation = false): void => {
    let braces = 1;
    while (at < source.length) {
      const start = at,
        char = source[at];
      if (char === undefined) break;
      if (/\s/.test(char)) {
        at++;
        continue;
      }
      if (source.startsWith("//", at)) {
        const end = source.indexOf("\n", at);
        at = end < 0 ? source.length : end;
        continue;
      }
      if (source.startsWith("/*", at)) {
        const end = source.indexOf("*/", at + 2);
        if (end < 0) throw new Error("Unterminated declaration comment");
        at = end + 2;
        continue;
      }
      if (char === '"' || char === "'") {
        at++;
        while (at < source.length && source[at] !== char) {
          if (source[at] === "\\") at++;
          at++;
        }
        if (at >= source.length) throw new Error("Unterminated declaration string");
        at++;
        result.push({ start, end: at, text: source.slice(start + 1, at - 1), kind: "string" });
        continue;
      }
      if (char === "`") {
        result.push({ start, end: ++at, text: "`", kind: "punctuation" });
        let closed = false;
        while (at < source.length) {
          if (source[at] === "\\") {
            at += 2;
            continue;
          }
          if (source[at] === "`") {
            result.push({ start: at, end: at + 1, text: "`", kind: "punctuation" });
            at++;
            closed = true;
            break;
          }
          if (source.startsWith("${", at)) {
            at += 2;
            scan(true);
          } else at++;
        }
        if (!closed) throw new Error("Unterminated declaration template");
        continue;
      }
      if (/[a-zA-Z_$]/.test(char)) {
        at++;
        while (at < source.length && /[a-zA-Z0-9_$]/.test(source[at] ?? "")) at++;
        result.push({ start, end: at, text: source.slice(start, at), kind: "word" });
        continue;
      }
      if (interpolation && char === "{") braces++;
      if (interpolation && char === "}" && --braces === 0) {
        at++;
        return;
      }
      result.push({ start, end: ++at, text: char, kind: "punctuation" });
    }
    if (interpolation) throw new Error("Unterminated declaration interpolation");
  };
  scan();
  return result;
}

export function normalizeDeclaration(
  source: string,
  validateRelative: (specifier: string) => void,
): string {
  const items = tokens(source);
  const changes: { readonly start: number; readonly end: number; readonly text: string }[] = [];
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (item?.kind !== "word" || (item.text !== "from" && item.text !== "import")) continue;
    const next = items[index + 1];
    const module = item.text === "import" && next?.text === "(" ? items[index + 2] : next;
    if (module?.kind !== "string" || !/^\.\.?\//.test(module.text)) continue;
    if (module.text.includes("\\"))
      throw new Error("Escaped relative declaration paths are unsupported");
    validateRelative(module.text);
    if (/\.(?:js|mjs|cjs|json)$/.test(module.text)) continue;
    const quote = source[module.start];
    changes.push({
      start: module.start,
      end: module.end,
      text: `${quote}${module.text}.js${quote}`,
    });
  }
  let output = source;
  for (const change of changes.toReversed())
    output = output.slice(0, change.start) + change.text + output.slice(change.end);
  return output;
}
