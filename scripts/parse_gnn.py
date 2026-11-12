# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Read-only bridge to the pinned upstream GNN reader and Markdown parser.

The gate runs under Bun, so no Python package is importable from it. This
wrapper is the recorded bridge: every pin fact and every parse comes from the
materialized pinned revision on ``--source``, never from a checkout's working
tree and never from a second implementation of the pin shape.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

#: Conformance job the repository's pointer and workflow record.
JOB_KEY = "model-check"
JOB_NAME = "gnn conformance (pinned)"


def _require_vault(source: Path, repo: Path, vault: Path) -> None:
    """Refuse interpreters or sources that do not resolve on GitVault."""
    for prefix in (sys.prefix, sys.base_prefix):
        if not Path(prefix).resolve().is_relative_to(vault):
            raise RuntimeError(f"Python prefix is outside GitVault: {prefix}")
    for label, path in (("GNN source", source), ("importer checkout", repo)):
        if not path.is_relative_to(vault):
            raise RuntimeError(f"{label} must resolve on GitVault: {path}")


def _check(source: Path, repo: Path) -> None:
    """Run the pinned reader's own pin, pointer and specification check."""
    result = subprocess.run(
        [
            sys.executable, "-B", "-m", "gnn.importers", "check",
            "--repo", str(repo),
            "--require-pointer", "--workflow", ".github/workflows/ci.yml",
            "--job", JOB_KEY,
        ],
        env={**os.environ, "PYTHONPATH": str(source / "src")},
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        check=False,
    )
    # Keep checker output off the JSON parser channel consumed by Bun.
    sys.stderr.write(result.stdout)
    sys.stderr.write(result.stderr)
    if result.returncode != 0:
        raise SystemExit(f"GNN importer check failed ({result.returncode})")


def _variables(source: Path, repo: Path) -> None:
    """Print the reader's ``gnn-importer-variables/v1`` map for the manuscript."""
    sys.path.insert(0, str(source / "src"))
    from gnn import importers

    pin_file = importers.find_pin(repo)
    if pin_file is None:
        raise SystemExit("no GNN pin found for the manuscript variables")
    pin = importers.read_pin(pin_file)
    print(json.dumps(
        importers.importer_variables(pin, repo_root=repo, job=JOB_KEY, job_name=JOB_NAME),
        indent=2,
    ))


def _parse(source: Path, specification: Path) -> None:
    """Parse one specification with the pinned upstream parser."""
    sys.path.insert(0, str(source / "src"))
    from gnn.parsers.markdown_parser import MarkdownGNNParser

    result = MarkdownGNNParser().parse_file(specification)
    payload = {
        "success": result.success,
        "errors": result.errors,
        "warnings": result.warnings,
        "modelName": result.model.model_name,
        "parameters": [{"name": p.name, "value": p.value} for p in result.model.parameters],
        "variables": [{"name": v.name, "dimensions": v.dimensions} for v in result.model.variables],
        "connections": [
            {"source": c.source_variables, "target": c.target_variables}
            for c in result.model.connections
        ],
        "equations": result.model.raw_sections.get("Equations", ""),
        "time": None if result.model.time_specification is None else {
            "timeType": result.model.time_specification.time_type,
            "discretization": result.model.time_specification.discretization,
            "horizon": result.model.time_specification.horizon,
            "stepSize": result.model.time_specification.step_size,
        },
        "pythonPrefix": sys.prefix,
        "pythonBasePrefix": sys.base_prefix,
    }
    print(json.dumps(payload, allow_nan=False))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path,
                        help="materialized pinned revision root, containing src/gnn")
    parser.add_argument("--vault", required=True, type=Path,
                        help="GitVault root every Python prefix must resolve under")
    parser.add_argument("--repo", type=Path, default=Path.cwd(),
                        help="importer checkout the reader validates")
    parser.add_argument("--specification", type=Path,
                        help="GNN specification to parse with the pinned parser")
    parser.add_argument("--variables", action="store_true",
                        help="print the manuscript variables map instead of parsing a specification")
    args = parser.parse_args()
    source = args.source.resolve()
    repo = args.repo.resolve()
    _require_vault(source, repo, args.vault.resolve())
    if args.variables:
        _variables(source, repo)
        return
    if args.specification is None:
        parser.error("--specification is required unless --variables is given")
    _check(source, repo)
    _parse(source, args.specification.resolve())


if __name__ == "__main__":
    main()
