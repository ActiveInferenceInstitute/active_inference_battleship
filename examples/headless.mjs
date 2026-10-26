import { analyzeReplay, applyEvent, createSession, encodeAnalysis, exportSession, loadDefaultModel } from "active-inference-battleship";

const model = loadDefaultModel();
let session = createSession(model, 1943, 16);
session = applyEvent(session, { type: "begin" });
session = applyEvent(session, { type: "shot", cell: 0 });
const replay = exportSession(session, model);
const analysis = analyzeReplay(replay, { actor: "player", controls: { epistemicWeight: 2 } });
process.stdout.write(encodeAnalysis(analysis));
