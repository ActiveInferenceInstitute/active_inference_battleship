"""Prospectively specified paired sign tests and descriptive case-bootstrap effects.

The test concerns conditional non-tied sign balance, never equality of means.
No final observations are used to choose endpoints, tests, profiles, or exclusions.
"""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path

import numpy as np
from scipy.stats import binomtest

ROOT = Path(__file__).resolve().parents[1]
PROFILES = ("random", "pragmatic", "epistemic", "combined", "weighted")
NAMES = ("Random", "Pragmatic", "Epistemic", "Combined β=1", "Weighted β=4")
ENDPOINTS = ("shots", "hits5", "entropy5")
SOURCE_FILES = ("research/strategy-protocol.json", "research/strategy-cases.json", "scripts/strategy-study.ts",
                "src/research/paired-search.ts", "src/core/fleet.ts", "src/core/inference.ts",
                "src/core/math.ts", "src/core/random.ts", "src/generated/model.json", "models/battleship.gnn.md",
                "research/strategy_analysis.py", "research/strategy_figures.py")


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def holm(values: list[float]) -> list[float]:
    if not values or any(not np.isfinite(p) or not 0 <= p <= 1 for p in values):
        raise ValueError("Invalid Holm family")
    order = sorted(range(len(values)), key=lambda i: (values[i], i))
    adjusted = [0.] * len(values)
    maximum = 0.
    for rank, i in enumerate(order):
        maximum = max(maximum, (len(values)-rank)*values[i])
        adjusted[i] = min(1., maximum)
    return adjusted


def comparison(differences, endpoint: str, rng: np.random.Generator) -> dict:
    values = np.asarray(differences, dtype=float)
    if values.ndim != 1 or not len(values) or not np.isfinite(values).all() or endpoint not in ENDPOINTS:
        raise ValueError("Invalid paired differences")
    epsilon = 1e-10 if endpoint == "entropy5" else 0.
    positive, negative = int(np.sum(values > epsilon)), int(np.sum(values < -epsilon))
    tied = len(values)-positive-negative
    p = float(binomtest(positive, positive+negative, .5, alternative="two-sided").pvalue) if positive+negative else 1.
    # Resample paired units, equivalently their within-unit differences. Raw tiny
    # entropy differences remain here even when classified as sign-test ties.
    indices = rng.integers(0, len(values), size=(10000, len(values)))
    distribution = values[indices].mean(axis=1)
    low, high = np.quantile(distribution, [.025,.975], method="linear")
    wins, losses = (positive,negative) if endpoint == "hits5" else (negative,positive)
    return dict(n=len(values), meanDifference=float(values.mean()), lower=float(low), upper=float(high),
                wins=wins, ties=tied, losses=losses, rawP=p, tieTolerance=epsilon)


def verify_study(root: Path = ROOT) -> dict:
    base = root/"research/generated/strategy-study"
    data = json.loads((base/"results.json").read_text())
    freeze = json.loads((base/"preexecution.json").read_text())
    if set(freeze["sources"]) != set(SOURCE_FILES) or data["preexecutionSha256"] != digest(base/"preexecution.json"):
        raise ValueError("Incomplete strategy source inventory")
    for relative, expected in freeze["sources"].items():
        if digest(root/relative) != expected:
            raise ValueError(f"Changed strategy input: {relative}")
    protocol = json.loads((root/"research/strategy-protocol.json").read_text())
    manifest = json.loads((root/"research/strategy-cases.json").read_text())
    units = {(c["count"],c["index"]):c for c in manifest["cases"]}
    if len(units) != 256 or len(data["cases"]) != 1280:
        raise ValueError("Missing strategy case or profile")
    seen, catalogs = set(), {}
    for case in data["cases"]:
        unit = (case["count"],case["index"])
        key = (*unit,case["profile"])
        if unit not in units or case["profile"] not in PROFILES or key in seen:
            raise ValueError("Duplicate or unexpected strategy row")
        seen.add(key)
        identity = (case["catalogueSha256"],case["truthIndex"],case["truthSha256"])
        if unit in catalogs and catalogs[unit] != identity:
            raise ValueError("Mismatched paired catalog or truth")
        catalogs[unit] = identity
        if any(case[role] != units[unit][role] for role in ("catalogSeed","truthSeed","randomSeed")):
            raise ValueError("Mismatched case seed")
        trace = case["trace"]
        if len(trace) != case["shots"] or not 17 <= len(trace) <= 100:
            raise ValueError("Invalid strategy completion")
        visited, hits, previous = set(), 0, case["count"]
        for step in trace:
            cell = step["cell"]
            if not isinstance(cell,int) or not 0 <= cell < 100 or cell in visited:
                raise ValueError("Illegal or repeated strategy shot")
            visited.add(cell)
            if not isinstance(step["hit"],bool): raise ValueError("Invalid outcome")
            hits += int(step["hit"])
            support = step["survivingLabels"]
            if (not all(np.isfinite(step[name]) for name in ("posteriorEntropy","predictedHit","expectedInformation","survivingLabels")) or
                step["hits"] != hits or not isinstance(support,int) or not 1 <= support <= previous or
                abs(step["posteriorEntropy"]-np.log(support)) > 1e-12 or
                not 0 <= step["predictedHit"] <= 1 or not 0 <= step["expectedInformation"] <= np.log(2)+1e-12):
                raise ValueError("Invalid strategy diagnostic")
            previous = support
        if hits != 17: raise ValueError("Incomplete strategy fleet")
    if seen != {(*unit,profile) for unit in units for profile in PROFILES}:
        raise ValueError("Missing paired strategy row")
    data["protocol"] = protocol
    return data


def endpoint(case: dict, name: str) -> float:
    if name == "shots": return case["shots"]
    step = case["trace"][4]
    return step["hits"] if name == "hits5" else step["posteriorEntropy"]/np.log(case["count"])


def analyze(data: dict) -> dict:
    rows, summaries = [], []
    for count in (256,4096):
        baseline = {c["index"]:c for c in data["cases"] if c["count"] == count and c["profile"] == "pragmatic"}
        for profile in PROFILES:
            cases = sorted((c for c in data["cases"] if c["count"] == count and c["profile"] == profile),key=lambda c:c["index"])
            if len(cases) != 128 or set(baseline) != {c["index"] for c in cases}:
                raise ValueError("Incomplete analysis pairing")
            summaries.append(dict(count=count,profile=profile,n=128,
                **{name:float(np.mean([endpoint(c,name) for c in cases])) for name in ENDPOINTS}))
            if profile == "pragmatic": continue
            for name in ENDPOINTS:
                seed = int.from_bytes(hashlib.sha256(f"aib-bootstrap|20261025|{count}|{profile}|{name}".encode()).digest()[:8],"big")
                effect = comparison([endpoint(c,name)-endpoint(baseline[c["index"]],name) for c in cases],name,np.random.default_rng(seed))
                rows.append(dict(count=count,profile=profile,endpoint=name,bootstrapSeed=seed,**effect))
    adjusted = holm([r["rawP"] for r in rows])
    for row,p in zip(rows,adjusted,strict=True):
        row["adjustedP"] = p
        row["annotation"] = "all ties" if row["ties"] == 128 else "***" if p <= .001 else "**" if p <= .01 else "*" if p <= .05 else "ns"
    return dict(schemaVersion=1,familySize=24,alpha=.05,test="exact conditional paired sign balance; Holm 24",
                summaries=summaries,comparisons=rows)


def main() -> None:
    import scipy
    data = verify_study()
    result = analyze(data)
    result.update(resultsSha256=digest(ROOT/"research/generated/strategy-study/results.json"),
                  analysisSha256=digest(Path(__file__)),runtime=dict(numpy=np.__version__,scipy=scipy.__version__))
    output = ROOT/"research/generated/strategy-study"
    (output/"analysis.json").write_text(json.dumps(result,indent=2)+"\n")
    with (output/"comparisons.csv").open("w",newline="") as handle:
        writer=csv.DictWriter(handle,fieldnames=list(result["comparisons"][0]))
        writer.writeheader(); writer.writerows(result["comparisons"])
    print(json.dumps({"searches":len(data["cases"]),"comparisons":len(result["comparisons"]),"summaries":result["summaries"]}))


if __name__ == "__main__": main()
