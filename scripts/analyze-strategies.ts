import { runTemplatePython } from "./template-process";

if (import.meta.main)
  process.exitCode = await runTemplatePython(["-m", "research.strategy_analysis"]);
