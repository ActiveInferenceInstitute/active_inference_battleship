"""Shared producer/consumer input contract, independent of receipt-supplied keys."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re


INVENTORY = Path(__file__).with_name("source-inventory.json")


def contained_file(root: Path, relative: str) -> Path:
    name = Path(relative)
    if not relative or name.is_absolute() or ".." in name.parts:
        raise ValueError(f"Unsafe research input: {relative}")
    path = root / name
    for component in (path, *path.parents):
        if component == root:
            break
        if component.is_symlink():
            raise ValueError(f"Symlinked research input: {relative}")
    if not path.is_file():
        raise ValueError(f"Missing research input: {relative}")
    return path


def tree_paths(root: Path, directory: str, *, ignore: tuple[str, ...] = ()) -> list[str]:
    base = root / directory
    if base.is_symlink() or not base.is_dir():
        raise ValueError(f"Missing or symlinked research directory: {directory}")
    paths = []
    for entry in sorted(base.iterdir()):
        if entry.name in ignore:
            continue
        relative = entry.relative_to(root).as_posix()
        if entry.is_symlink():
            raise ValueError(f"Symlinked research input: {relative}")
        if entry.is_dir():
            paths.extend(tree_paths(root, relative, ignore=ignore))
        else:
            contained_file(root, relative)
            paths.append(relative)
    return sorted(paths)


def source_paths(root: Path, study: str) -> list[str]:
    # This validator's contract is authority, not a list offered by a receipt.
    inventory = json.loads(INVENTORY.read_text())
    names = set(inventory["files"]) | set(inventory["studies"][study])
    for directory in inventory["trees"]:
        names.update(tree_paths(root, directory))
    for name in names:
        contained_file(root, name)
    return sorted(names)


def require_sources(root: Path, study: str, sources: object, *, label: str) -> None:
    expected = source_paths(root, study)
    if (not isinstance(sources, dict) or set(sources) != set(expected) or
        any(not isinstance(value, str) or re.fullmatch(r"[0-9a-f]{64}", value) is None
            for value in sources.values())):
        raise ValueError(f"Incomplete {label} source inventory")
    for relative in expected:
        if hashlib.sha256(contained_file(root, relative).read_bytes()).hexdigest() != sources[relative]:
            raise ValueError(f"Changed {label} input: {relative}")
