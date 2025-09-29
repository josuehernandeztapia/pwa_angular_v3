#!/usr/bin/env python3
"""Audit Tailwind-style utility classes across the codebase.

This script scans files (default: src/) looking for class tokens that match
Tailwind-style prefixes (e.g. bg-, flex, gap-, sm:flex). It produces a CSV
summary ordered by descending occurrence count so you can prioritise refactors.

Usage:
    python3 scripts/audit_tailwind.py [path]

The optional path argument lets you target a subdirectory. Results are written
to stdout in CSV format with the columns: file,total,unique,top_samples.
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, Tuple


# Tailwind-like utility prefixes worth flagging. Extend as needed.
UTILITY_PREFIXES = (
    "bg",
    "text",
    "flex",
    "grid",
    "items",
    "justify",
    "gap",
    "space",
    "p",
    "px",
    "py",
    "pt",
    "pr",
    "pb",
    "pl",
    "m",
    "mx",
    "my",
    "mt",
    "mr",
    "mb",
    "ml",
    "w",
    "h",
    "min-w",
    "min-h",
    "max-w",
    "max-h",
    "rounded",
    "shadow",
    "border",
    "font",
    "leading",
    "tracking",
    "ring",
    "container",
    "col-span",
    "row-span",
    "divide",
    "sr-only",
    "inline",
    "block",
    "aspect",
    "opacity",
    "z",
    "top",
    "left",
    "right",
    "bottom",
    "overflow",
    "object",
    "whitespace",
    "place",
    "content",
    "self",
    "backdrop",
    "translate",
    "rotate",
    "scale",
    "skew",
    "origin",
)


RESPONSIVE_PREFIX = (
    r"(?:sm|md|lg|xl|2xl|hover|focus|focus-visible|active|disabled|"
    r"group-hover|group-focus|dark|motion-safe|motion-reduce|print|"
    r"visited|aria-selected|aria-checked|aria-expanded|aria-pressed):"
)
PREFIX_PATTERN = r"(?:" + RESPONSIVE_PREFIX + r")*"
TOKEN_CHARSET = r"A-Za-z0-9_/\\\[\]\.\-%(),"
UTILITY_TOKEN_PATTERN = re.compile(
    rf"^{PREFIX_PATTERN}"
    rf"(?:" + "|".join(re.escape(prefix) for prefix in UTILITY_PREFIXES) + r")"
    rf"-[{TOKEN_CHARSET}]+$"
)

CLASS_ATTR_PATTERN = re.compile(
    r"class(?:Name)?\s*=\s*(?P<quote>[\"\'])(?P<value>.*?)(?P=quote)",
    re.DOTALL,
)
NGCLASS_PATTERN = re.compile(
    r"\[ngClass\]\s*=\s*(?P<quote>[\"\'])(?P<value>.*?)(?P=quote)",
    re.DOTALL,
)
QUOTED_PATTERN = re.compile(r"[\"\']([^\"\']+)[\"\']")


ALLOWED_EXTENSIONS = {
    ".html",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".md",
}


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() not in ALLOWED_EXTENSIONS:
            continue
        yield path


def split_class_tokens(value: str) -> Iterable[str]:
    return [token for token in value.replace("\n", " ").split() if token]


def audit_path(root: Path) -> Dict[Path, Counter]:
    results: Dict[Path, Counter] = defaultdict(Counter)
    for file_path in iter_files(root):
        try:
            text = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        tokens: Counter[str] = Counter()

        for match in CLASS_ATTR_PATTERN.finditer(text):
            value = match.group("value")
            for token in split_class_tokens(value):
                tokens[token] += 1

        for match in NGCLASS_PATTERN.finditer(text):
            value = match.group("value")
            for quoted in QUOTED_PATTERN.finditer(value):
                for token in split_class_tokens(quoted.group(1)):
                    tokens[token] += 1

        if not tokens:
            continue

        filtered = {token: count for token, count in tokens.items() if UTILITY_TOKEN_PATTERN.match(token)}
        if not filtered:
            continue

        counter = results[file_path]
        for token, count in filtered.items():
            counter[token] += count
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit Tailwind utility usage.")
    parser.add_argument(
        "path",
        nargs="?",
        default="src",
        help="Directory to scan (default: src)",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=5,
        help="Number of sample utility classes to list per file.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Write CSV output to the given file path instead of stdout.",
    )
    parser.add_argument(
        "--fail-on-violation",
        action="store_true",
        help="Exit with status 1 if any Tailwind-style utilities are detected.",
    )
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        print(f"error: path '{root}' does not exist", file=sys.stderr)
        return 1

    results = audit_path(root)
    rows: Iterable[Tuple[Path, Counter]] = sorted(
        results.items(),
        key=lambda item: sum(item[1].values()),
        reverse=True,
    )

    total_matches = sum(sum(counter.values()) for _, counter in rows)

    output_path = Path(args.output).resolve() if args.output else None
    out_stream = None
    try:
        if output_path:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            out_stream = output_path.open("w", newline="", encoding="utf-8")
        writer = csv.writer(out_stream or sys.stdout)
        writer.writerow(["file", "total", "unique", "top_samples"])
        for file_path, counter in rows:
            total = sum(counter.values())
            unique = len(counter)
            samples = sorted(counter.items(), key=lambda kv: kv[1], reverse=True)[: args.top]
            sample_tokens = " ".join(token for token, _ in samples)
            writer.writerow([str(file_path.relative_to(root.parent)), total, unique, sample_tokens])
    finally:
        if out_stream:
            out_stream.close()

    if args.fail_on_violation and total_matches > 0:
        print(
            f"Tailwind audit detected {total_matches} utility occurrences. See {output_path or 'stdout'} for details.",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
