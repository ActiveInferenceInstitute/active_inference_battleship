export type Theme = "system" | "light" | "dark";

export function bindTheme(theme: Theme): () => void {
  const preference = matchMedia("(prefers-color-scheme: light)");
  const update = () => {
    document.documentElement.dataset["theme"] =
      theme === "system" ? (preference.matches ? "light" : "dark") : theme;
  };
  update();
  preference.addEventListener("change", update);
  return () => preference.removeEventListener("change", update);
}
