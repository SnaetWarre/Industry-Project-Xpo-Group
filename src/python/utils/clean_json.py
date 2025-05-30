#!/usr/bin/env python3
"""
clean_json.py – Minify / compact a JSON file to reduce file size.

Usage:
    python clean_json.py ffd_site_data.json -o output.json -i -c --remove-non-ascii

The script parses the input JSON (using the standard library) and writes a
compact representation with no extra spaces or line breaks. If the input is not
strict JSON (e.g., it contains trailing commas or comments), install
`python-json5` and re-run with `--json5` to accept more relaxed syntax.

Benefits:
  • Removes superfluous whitespace (\n, \r, \t, spaces) between tokens
  • Produces deterministic ordering for objects as they appeared (Python 3.7+)
  • Typically shrinks file size by 10-50 % depending on indentation level

Optional dependencies:
  • orjson – faster parsing/dumping for very large files
  • json5  – relaxed JSON5 parsing when `--json5` flag is used
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import orjson  # type: ignore

    def _dumps(obj: Any) -> str:  # noqa: D401
        return orjson.dumps(obj, option=orjson.OPT_INDENT_2 if _should_indent() else 0).decode()

    def _loads(text: str) -> Any:  # noqa: D401
        return orjson.loads(text)
except ModuleNotFoundError:

    def _dumps(obj: Any) -> str:  # noqa: D401
        # Compact separators drop all spaces after commas/colons.
        if _should_indent():
            return json.dumps(obj, indent=2, ensure_ascii=False)
        return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)

    def _loads(text: str) -> Any:  # noqa: D401
        return json.loads(text)


def _loads_json5(text: str) -> Any:  # noqa: D401
    try:
        import json5  # type: ignore
    except ModuleNotFoundError as exc:
        sys.exit(
            "Error: --json5 flag requires the 'python-json5' package.\n"
            "Install with: pip install python-json5\n\n" + str(exc)
        )
    return json5.loads(text)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:  # noqa: D401
    parser = argparse.ArgumentParser(description="Minify / compact a JSON file")
    parser.add_argument("input", type=Path, help="Path to the JSON file to clean")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Where to write cleaned JSON (defaults to <input>.min.json)",
    )
    parser.add_argument(
        "--json5",
        action="store_true",
        help="Allow JSON5 input (comments, trailing commas) – requires python-json5",
    )
    parser.add_argument(
        "-c",
        "--collapse-values",
        action="store_true",
        help="Collapse whitespace inside every string value (\\n, \\r, \\t, multiple spaces) into a single space and strip the result",
    )
    parser.add_argument(
        "--remove-non-ascii",
        action="store_true",
        help="Remove non-ASCII characters from all string values",
    )
    parser.add_argument(
        "-i",
        "--indent",
        action="store_true",
        help="Indent the output JSON file for readability.",
    )
    return parser.parse_args(argv)


# Global variable to store the indent flag
_indent_output = False

def _should_indent() -> bool:
    global _indent_output
    return _indent_output


def extract_artisan_booth_numbers(event):
    mapping = {}
    raw = event.get('raw_text_content', '')
    parts = raw.split("Company City Country Booth", 1)
    if len(parts) < 2:
        event['stand_numbers'] = mapping
        return event
    section = parts[1]
    # Regex to capture company (group 1) and booth number (group 2), skipping city and country
    pattern = re.compile(r'([A-Za-z0-9&%\'\-\.\(\) ]+?)\s+[A-Za-z\(\) \-]+?\s+[A-Z]{2}\s+([0-9A-Za-z;]+)')
    for m in pattern.finditer(section):
        company = m.group(1).strip()
        booth = m.group(2).strip()
        mapping[company] = booth
    event['stand_numbers'] = mapping
    return event


def extract_stand_numbers(event):
    # Route to specialized parser for Artisan list of exhibitors
    if event.get('event_id') == 'artisan' and 'list-of-exhibitors' in event.get('url', ''):
        return extract_artisan_booth_numbers(event)
    # Extract mapping of company names to their stand numbers or showroom location for FFD
    mapping = {}
    raw = event.get('raw_text_content', '')
    # Split on 'Read more' but include first chunk to capture the first exhibitor
    for chunk in raw.split("Read more"):
        token = chunk.strip()
        if not token:
            continue
        # Booth entries
        m = re.search(r'([^\n\r]+?)\s+Booth:\s*(\d+)', token)
        if m:
            company = m.group(1).strip()
            # Remove any leading 'View results ' prefix
            company = re.sub(r'^View results\s+', '', company)
            number = m.group(2).strip()
            mapping[company] = number
            continue
        # Showroom entries
        m2 = re.search(r'([^\n\r]+?)\s+Showroom on location', token)
        if m2:
            company = m2.group(1).strip()
            company = re.sub(r'^View results\s+', '', company)
            mapping[company] = "Showroom on location"
            continue
    event['stand_numbers'] = mapping
    return event


def main() -> None:
    args = _parse_args()

    global _indent_output
    _indent_output = args.indent

    input_path: Path = args.input
    if not input_path.exists():
        sys.exit(f"Error: file not found: {input_path}")

    try:
        raw = input_path.read_text(encoding="utf-8")
    except Exception as exc:
        sys.exit(f"Could not read {input_path}: {exc}")

    try:
        loader = _loads_json5 if args.json5 else _loads
        data = loader(raw)
    except Exception as exc:
        sys.exit(f"Failed to parse JSON{'5' if args.json5 else ''}: {exc}")

    # ------------------------------------------------------------------
    # Optional: collapse whitespace inside string values
    # ------------------------------------------------------------------

    if args.collapse_values:

        def _collapse(obj: Any) -> Any:  # noqa: D401
            if isinstance(obj, str):
                obj = re.sub(r"\s+", " ", obj).strip()
                # Always remove non-ASCII characters when collapsing values
                obj = obj.encode("ascii", "ignore").decode("utf-8")
                return obj
            if isinstance(obj, list):
                return [_collapse(i) for i in obj]
            if isinstance(obj, dict):
                return {k: _collapse(v) for k, v in obj.items()}
            return obj

        data = _collapse(data)
    elif args.remove_non_ascii:  # Handle remove_non_ascii even if not collapsing
        def _remove_non_ascii_only(obj: Any) -> Any: # noqa: D401
            if isinstance(obj, str):
                return obj.encode("ascii", "ignore").decode("utf-8")
            if isinstance(obj, list):
                return [_remove_non_ascii_only(i) for i in obj]
            if isinstance(obj, dict):
                return {k: _remove_non_ascii_only(v) for k, v in obj.items()}
            return obj
        data = _remove_non_ascii_only(data)

    # After loading and (optionally) collapsing/cleaning data, but before dumping to output
    if isinstance(data, list):
        data = [extract_stand_numbers(event) for event in data]
    elif isinstance(data, dict):
        data = extract_stand_numbers(data)

    compact = _dumps(data)

    output_path: Path = args.output or input_path.with_suffix(".min.json")
    try:
        output_path.write_text(compact, encoding="utf-8")
    except Exception as exc:
        sys.exit(f"Could not write {output_path}: {exc}")

    old_size = len(raw.encode())
    new_size = len(compact.encode())
    saved_pct = (1 - new_size / old_size) * 100 if old_size else 0
    print(
        f"✔ Cleaned {input_path.name} → {output_path.name}\n"
        f"  Size: {old_size/1024:.1f} KB → {new_size/1024:.1f} KB "
        f"({saved_pct:.1f}% saved)"
    )


if __name__ == "__main__":
    main() 