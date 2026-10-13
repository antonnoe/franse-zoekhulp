"""Import official INSEE commune counts and periurban classification, retaining source dates."""
import csv, hashlib, io, json, re, sys, zipfile
from pathlib import Path
from datetime import datetime, timezone
from openpyxl import load_workbook

root = Path(__file__).resolve().parents[1]
archive, workbook_path = Path(sys.argv[1]), Path(sys.argv[2])
groups = {"B105": 0, "B201": 0, "B202": 0, "B207": 1, "D307": 2, "D265": 3, "D101": 4, "D106": 5}
counts, observed, seen = {}, set(), set()
with zipfile.ZipFile(archive) as z:
    member = next(n for n in z.namelist() if n.endswith("_data.csv"))
    with z.open(member) as f:
        reader = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"), delimiter=";")
        required = {"GEO", "GEO_OBJECT", "FACILITY_TYPE", "BPE_MEASURE", "OBS_STATUS", "TIME_PERIOD", "OBS_VALUE"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError("BPE schema changed; review before import")
        for row in reader:
            if row["GEO_OBJECT"] != "COM" or row["TIME_PERIOD"] != "2025" or row["BPE_MEASURE"] != "FACILITIES":
                continue
            code = row["GEO"]
            if not re.fullmatch(r"(?:\d{5}|2[AB]\d{3})", code):
                continue
            # A known total confirms commune coverage. A missing commune is unknown, never zero.
            if row["FACILITY_TYPE"] == "_T" and row["FACILITY_DOM"] == "_T" and row["FACILITY_SDOM"] == "_T" and row["OBS_STATUS"] == "A":
                observed.add(code)
            kind = row["FACILITY_TYPE"]
            if kind not in groups:
                continue
            identity = (code, kind)
            if identity in seen:
                raise ValueError("Duplicate commune/type observation")
            seen.add(identity)
            item = counts.setdefault(code, [0] * 6)
            if row["OBS_STATUS"] != "A" or not row["OBS_VALUE"]:
                item[groups[kind]] = None
                continue
            value = float(row["OBS_VALUE"])
            if value < 0 or not value.is_integer():
                raise ValueError("Unexpected BPE count")
            if item[groups[kind]] is not None:
                item[groups[kind]] += int(value)
if len(observed) < 30000:
    raise ValueError("BPE coverage incomplete; existing snapshot is preserved")
entries = {code: counts.get(code, [0] * 6) for code in observed}
book = load_workbook(workbook_path, read_only=True, data_only=True)
rows = iter(book["Maille communale"].values)
header = next(r for r in rows if r[0] == "CODGEO")
aav_index = header.index("DENS_AAV")
periurban = {}
for row in rows:
    code = str(row[0])
    if re.fullmatch(r"(?:\d{5}|2[AB]\d{3})", code):
        periurban[code] = row[aav_index] == 3
if len(periurban) < 30000:
    raise ValueError("Density coverage incomplete")
result = {"source": "INSEE BPE 2025 / dichtheidsindeling", "updated": "2026-07-09", "geography": "2026-01-01",
    "densityUpdated": "2026-05-15", "imported": datetime.now(timezone.utc).isoformat(),
    "url": "https://www.insee.fr/fr/statistiques/8217527", "densityUrl": "https://www.insee.fr/fr/information/8571524",
    "archiveSha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
    "columns": ["food", "bakery", "pharmacy", "gp", "shortStay", "emergency"], "typeGroups": groups,
    "entries": entries, "periurban": periurban}
(root / "data" / "region-data.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
print(json.dumps({"bpeCommunes": len(entries), "periurbanCommunes": len(periurban), "ceret": entries.get("66049"), "tours": entries.get("37261")}))
