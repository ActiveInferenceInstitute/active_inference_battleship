"""Resolve declared pin fields and hydrate ignored render copies, never authored prose."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re


_TOKEN = re.compile(r"\{\{([A-Z][A-Z0-9_]*)\}\}")


def load_variables(root: Path) -> tuple[dict[str, str], dict[str, str]]:
    """Return substitutions and hashes of the exact declaration/source bytes read."""
    declaration_path = root / "manuscript/variables.json"
    declaration_bytes = declaration_path.read_bytes()
    declaration = json.loads(declaration_bytes)
    if not isinstance(declaration, dict) or declaration.get("schema") != "battleship-manuscript-variables/v1":
        raise ValueError("Unsupported manuscript variable declaration")
    relative = declaration.get("source")
    if not isinstance(relative, str) or not relative or Path(relative).is_absolute() or ".." in Path(relative).parts:
        raise ValueError("Manuscript variable source must be a project-relative file")
    source_path = root / relative
    if not source_path.resolve(strict=True).is_relative_to(root.resolve()):
        raise ValueError("Manuscript variable source escapes the project")
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    schema = declaration.get("sourceSchema")
    if not isinstance(schema, str) or not schema or not isinstance(source, dict) or source.get("schema") != schema:
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
                for path, data in ((declaration_path, declaration_bytes), (source_path, source_bytes))}
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
