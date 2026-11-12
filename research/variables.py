"""Resolve GNN-derived manuscript variables through the pinned importer reader.

The prose states which GNN release the model consumes. Those facts come from
``gnn.importers.importer_variables`` in the pinned revision, not from a second
JSON read, so the manuscript and the conformance job cannot disagree.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import sys


_TOKEN = re.compile(r"\{\{([A-Z][A-Z0-9_]*)\}\}")
#: The conformance job the registry records for this member (`scripts/README.md`).
_JOB_KEY = "model-check"
_JOB_NAME = "gnn conformance (pinned)"


def _reader():
    """Import the pinned reader, naming the pinned source when it is absent."""
    try:
        import gnn.importers as importers
    except ModuleNotFoundError as exc:
        source = ", ".join(sys.path)
        raise RuntimeError(
            "The pinned gnn.importers reader is not importable from this interpreter; "
            f"put the pinned revision's src on PYTHONPATH (searched: {source})"
        ) from exc
    return importers


def load_variables(root: Path) -> tuple[dict[str, str], dict[str, str]]:
    """Return substitutions and hashes of the exact declaration/pin bytes read."""
    declaration_path = root / "manuscript/variables.json"
    declaration_bytes = declaration_path.read_bytes()
    declaration = json.loads(declaration_bytes)
    if not isinstance(declaration, dict) or declaration.get("schema") != "battleship-manuscript-variables/v1":
        raise ValueError("Unsupported manuscript variable declaration")
    relative = declaration.get("source")
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute() or ".." in Path(relative).parts:
        raise ValueError("Manuscript variable source must be a project-relative file")
    pin_path = root / relative
    if not pin_path.resolve(strict=True).is_relative_to(root.resolve()):
        raise ValueError("Manuscript variable source escapes the project")
    pin_bytes = pin_path.read_bytes()
    source_schema = declaration.get("sourceSchema")
    if not isinstance(source_schema, str) or not source_schema:
        raise ValueError("Manuscript variable declaration must name its source schema")

    importers = _reader()
    try:
        pin = importers.read_pin(pin_path)
    except importers.PinError as exc:
        raise ValueError(f"Manuscript variable source is not a readable GNN pin: {exc}") from exc
    if pin.schema != importers.PIN_SCHEMA:
        raise ValueError(
            f"Manuscript variable source declares schema {pin.schema!r}, not {importers.PIN_SCHEMA!r}"
        )
    source = importers.importer_variables(pin, repo_root=root, job=_JOB_KEY, job_name=_JOB_NAME)
    if source.get("schema") != source_schema:
        raise ValueError("Manuscript variable source schema differs from its declaration")

    bindings = declaration.get("variables")
    if not isinstance(bindings, dict) or not bindings:
        raise ValueError("No declared manuscript variables")
    variables = {}
    for name, binding in bindings.items():
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", name) or not isinstance(binding, dict):
            raise ValueError(f"Invalid manuscript variable declaration: {name}")
        field = binding.get("field")
        value = source.get(field) if isinstance(field, str) else None
        if not isinstance(value, str) or not value or "\n" in value or "\r" in value:
            raise ValueError(f"Missing or non-text manuscript variable field: {name}")
        if "stripPrefix" in binding:
            prefix = binding["stripPrefix"]
            if not isinstance(prefix, str) or not prefix or not value.startswith(prefix):
                raise ValueError(f"Manuscript variable prefix differs from its declaration: {name}")
            value = value[len(prefix):]
        if not value or "{{" in value or "}}" in value:
            raise ValueError(f"Empty or nested manuscript variable: {name}")
        variables[name] = value
    snapshot = {str(path.relative_to(root)): hashlib.sha256(data).hexdigest()
                for path, data in ((declaration_path, declaration_bytes), (pin_path, pin_bytes))}
    return variables, snapshot


def hydrate_text(content: str, variables: dict[str, str], source: Path) -> str:
    def substitute(match: re.Match[str]) -> str:
        name = match[1]
        if name not in variables:
            raise ValueError(f"Unbound manuscript variable {name}: {source}")
        return variables[name]

    hydrated = _TOKEN.sub(substitute, content)
    if "{{" in hydrated:
        raise ValueError(f"Unbound or malformed manuscript variable token: {source}")
    return hydrated


def hydrate_sources(sources: list[Path], variables: dict[str, str], directory: Path) -> list[Path]:
    """Validate every source before writing render-only copies with identical names."""
    contents = [(source, hydrate_text(source.read_text(encoding="utf-8"), variables, source))
                for source in sources]
    if any((directory / source.name).resolve() == source.resolve() for source in sources):
        raise ValueError("Manuscript hydration cannot overwrite authored sources")
    directory.mkdir(parents=True, exist_ok=True)
    hydrated = []
    for source, content in contents:
        target = directory / source.name
        target.write_text(content, encoding="utf-8")
        hydrated.append(target)
    return hydrated
