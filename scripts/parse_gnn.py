# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Read-only bridge to the real upstream GNN parser; invoked by model:import."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> None:
    """Refuse internal Python runtimes before importing upstream code."""
    root = Path(sys.argv[1]).resolve()
    vault = Path(sys.argv[3]).resolve()
    for prefix in (sys.prefix, sys.base_prefix):
        if not Path(prefix).resolve().is_relative_to(vault):
            raise RuntimeError(f"Python prefix is outside GitVault: {prefix}")
    if not root.is_relative_to(vault):
        raise RuntimeError("GNN source must resolve on GitVault")
    sys.path.insert(0, str(root / "src"))
    from gnn.parsers.markdown_parser import MarkdownGNNParser

    result = MarkdownGNNParser().parse_file(sys.argv[2])
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


if __name__ == "__main__":
    main()
