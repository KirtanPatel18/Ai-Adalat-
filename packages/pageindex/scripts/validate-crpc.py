import json
import re
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CRPC_TREE_FILE = ROOT / "packages" / "pageindex" / "artifacts" / "crpc-tree.json"
VALIDATION_REPORT_FILE = ROOT / "packages" / "pageindex" / "reports" / "crpc-validation.json"

def main():
    print("Starting CrPC tree validation...")

    if not CRPC_TREE_FILE.exists():
        print(f"Error: Tree file not found at {CRPC_TREE_FILE}")
        return

    with open(CRPC_TREE_FILE, "r", encoding="utf-8") as f:
        nodes = json.load(f)

    print(f"Loaded {len(nodes)} nodes.")

    # Validation tracking
    errors = []
    warnings = []
    
    # Fast lookup dictionaries
    node_by_id = {node["id"]: node for node in nodes}
    
    # Formats to check
    id_patterns = {
        "act": re.compile(r"^CRPC-1973$"),
        "part": re.compile(r"^CRPC-1973/PART-[A-Z]+$"),
        "chapter": re.compile(r"^CRPC-1973/PART-[A-Z]+/CHAPTER-[I|V|X|L|C|D|M]+$"),
        "section": re.compile(r"^CRPC-1973/PART-[A-Z]+/CHAPTER-[I|V|X|L|C|D|M]+/SECTION-\d+[A-Z]?$")
    }

    # 1. Structural checks
    node_counts_by_type = {}
    
    for node in nodes:
        node_id = node.get("id")
        node_type = node.get("type")
        
        node_counts_by_type[node_type] = node_counts_by_type.get(node_type, 0) + 1
        
        # Verify fields
        required_fields = ["id", "node_id", "type", "level", "title", "snapshot_id", "text", "path", "act_code", "act_name", "number"]
        for field in required_fields:
            if field not in node:
                errors.append(f"Node {node_id} is missing required field '{field}'")
        
        # Check node_id format
        pattern = id_patterns.get(node_type)
        if not pattern:
            errors.append(f"Node {node_id} has invalid/unknown type '{node_type}'")
        elif not pattern.match(node_id):
            errors.append(f"Node {node_id} ID format does not match expected pattern for type '{node_type}'")

        # Verify parent references
        parent_id = node.get("parent_id")
        if parent_id:
            if parent_id not in node_by_id:
                errors.append(f"Node {node_id} references non-existent parent '{parent_id}'")
            else:
                parent_node = node_by_id[parent_id]
                # Parent should list this node in its children
                if node_id not in parent_node.get("children", []) and node_id not in parent_node.get("children_ids", []):
                    errors.append(f"Node {node_id} references parent '{parent_id}' but parent does not list it as child")

        # Verify children references
        children_ids = node.get("children_ids", [])
        for child_id in children_ids:
            if child_id not in node_by_id:
                errors.append(f"Node {node_id} references non-existent child '{child_id}'")
            else:
                child_node = node_by_id[child_id]
                if child_node.get("parent_id") != node_id:
                    errors.append(f"Node {node_id} lists child '{child_id}' but child references parent '{child_node.get('parent_id')}'")

        # Path verification
        path = node.get("path", [])
        if path:
            if path[-1] != node_id:
                errors.append(f"Node {node_id} path list does not end with the node's own ID")
            for ancestor_id in path[:-1]:
                if ancestor_id not in node_by_id:
                    errors.append(f"Node {node_id} path references non-existent ancestor '{ancestor_id}'")

    print(f"Node counts by type: {node_counts_by_type}")

    # 2. Pick 5 random sections and validate their text
    sections = [n for n in nodes if n["type"] == "section"]
    print(f"\nChecking 5 random sections out of {len(sections)}:")
    random.seed(42) # Set seed for reproducible validation run
    sampled_sections = random.sample(sections, min(len(sections), 5))
    
    for sec in sampled_sections:
        print(f"\n- Section Node ID: {sec['id']}")
        print(f"  Title: {sec['title']}")
        print(f"  Path: {' -> '.join(sec['path'])}")
        snippet = sec['text'].replace('\n', ' ')[:100]
        print(f"  Text snippet: {snippet}...")
        
        if not sec['text'].strip():
            errors.append(f"Section {sec['id']} has empty text content")
        if not sec['title'].strip():
            errors.append(f"Section {sec['id']} has empty title")

    # 3. Write validation report
    validation_status = "PASS" if not errors else "FAIL"
    report = {
        "status": validation_status,
        "total_nodes": len(nodes),
        "node_counts": node_counts_by_type,
        "errors": errors,
        "warnings": warnings,
        "sampled_sections": [
            {
                "id": sec["id"],
                "title": sec["title"],
                "text_length": len(sec["text"])
            }
            for sec in sampled_sections
        ]
    }

    VALIDATION_REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(VALIDATION_REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\nValidation finished with status: {validation_status}")
    print(f"Report saved to {VALIDATION_REPORT_FILE}")

    if errors:
        print(f"Found {len(errors)} errors:")
        for err in errors[:10]:
            print(f"- ERROR: {err}")
        if len(errors) > 10:
            print(f"... and {len(errors) - 10} more.")
        exit(1)
    else:
        print("All structural and formatting checks passed successfully!")

if __name__ == "__main__":
    main()
