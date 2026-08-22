import json
from pathlib import Path

data_dir = Path(__file__).parent / "data"
manifest = data_dir / "manifest.json"

files = sorted(
    f.name for f in data_dir.glob("*_results.json")
    if f.is_file()
)

manifest.write_text(json.dumps(files, indent=2) + "\n")
print(f"Manifest updated: {len(files)} files")
