"""Build a compact official INSEE snapshot. Input is the downloaded workbook, never an inferred classification."""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from openpyxl import load_workbook

source = Path(sys.argv[1])
destination = Path(__file__).resolve().parents[1] / "data" / "density.json"
workbook = load_workbook(source, read_only=True, data_only=True)
sheet = workbook["Maille communale"]
rows = iter(sheet.values)
header = next((row for row in rows if row[0] == "CODGEO"), None)
if header is None or "DENS7" not in header or "LIBDENS7" not in header:
    raise ValueError("INSEE columns changed: review the official workbook before importing")
code_index, label_index = header.index("DENS7"), header.index("LIBDENS7")
entries, labels = {}, {}
for row in rows:
    code = str(row[0])
    if not re.fullmatch(r"(?:\d{5}|2[AB]\d{3})", code):
        continue
    density, label = row[code_index], row[label_index]
    if density not in range(1, 8) or not isinstance(label, str):
        raise ValueError("Unexpected INSEE density value for " + code)
    if code in entries:
        raise ValueError("Duplicate commune " + code)
    entries[code], labels[str(density)] = int(density), label
if len(entries) < 30000:
    raise ValueError("Snapshot is incomplete; existing file is not replaced")
result = {
    "source": "INSEE", "url": "https://www.insee.fr/fr/information/8571524",
    "downloadUrl": "https://www.insee.fr/fr/statistiques/fichier/8571524/fichier_diffusion_2026.xlsx",
    "pageUpdated": "2026-05-06", "updated": "2026-05-15", "geography": "2026-01-01",
    "imported": datetime.now(timezone.utc).isoformat(), "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "labels": labels, "entries": entries
}
destination.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Imported {len(entries)} official commune classifications; workbook publication 15-05-2026")
