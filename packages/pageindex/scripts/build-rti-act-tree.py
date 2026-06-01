from __future__ import annotations

import json
import re
from pathlib import Path

SNAPSHOT_ID = "2026-05-28"

ROOT = Path(__file__).resolve().parents[3]

INPUT_FILE = (
    ROOT
    / "corpus"
    / "acts"
    / "rti-act"
    / f"snapshot-{SNAPSHOT_ID}"
    / "cleaned-text.md"
)

OUTPUT_FILE = (
    ROOT
    / "packages"
    / "pageindex"
    / "artifacts"
    / "rti-act-2005.json"
)

SECTION_PATTERN = re.compile(
    r"(?m)^(\d+)\.\s+(.*?)(?=^\d+\.\s+|\Z)",
    re.DOTALL
)


def load_text():
    return INPUT_FILE.read_text(
        encoding="utf-8"
    )


def build_tree(text):

    root = {
        "node_id": "RTI-2005",
        "title": "Right to Information Act, 2005",
        "snapshot_id": SNAPSHOT_ID,
        "level": "act",
        "children": []
    }

    chapter = {
        "node_id": "RTI-2005/SECTIONS",
        "title": "Sections",
        "snapshot_id": SNAPSHOT_ID,
        "level": "chapter",
        "parent_id": "RTI-2005",
        "children": []
    }

    matches = SECTION_PATTERN.findall(text)

    for section_number, body in matches:

        lines = [
            x.strip()
            for x in body.splitlines()
            if x.strip()
        ]

        if not lines:
            continue

        title = lines[0]

        section_text = "\n".join(lines)

        chapter["children"].append(
            {
                "node_id": f"RTI-2005/S-{section_number}",
                "title": title,
                "section_number": section_number,
                "text": section_text,
                "snapshot_id": SNAPSHOT_ID,
                "level": "section",
                "parent_id": "RTI-2005/SECTIONS"
            }
        )

    root["children"].append(chapter)

    return root


def main():

    text = load_text()

    tree = build_tree(text)

    OUTPUT_FILE.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            tree,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"Generated {OUTPUT_FILE}"
    )


if __name__ == "__main__":
    main()