import json
import html
from pathlib import Path

def build():
    data_dir = Path(__file__).parent / "data"
    manifest_file = data_dir / "manifest.json"
    leaderboard_file = data_dir / "leaderboard.json"

    # Find all school results files
    school_files = sorted(
        f.name for f in data_dir.glob("*_results.json")
        if f.is_file()
    )

    # Save manifest.json
    manifest_file.write_text(json.dumps(school_files, indent=2) + "\n")
    print(f"Manifest updated: {len(school_files)} files")

    students = []
    
    # Read each file and collect student records
    for file_name in school_files:
        file_path = data_dir / file_name
        try:
            school_records = json.loads(file_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error reading {file_name}: {e}")
            continue

        for idx, s in enumerate(school_records):
            s_school = html.unescape(s.get("school", "") or "").strip()
            s_name = html.unescape(s.get("name", "") or "").strip()
            s_district = html.unescape(s.get("district", "") or "").strip()
            s_group = (s.get("group", "") or "").strip()

            students.append({
                "name": s_name,
                "school": s_school,
                "district": s_district,
                "group": s_group,
                "gpa": float(s.get("gpa", 0.0) or 0.0),
                "mark": int(s.get("mark", 0) or 0),
                "status": s.get("status", "PASSED"),
                "roll": s.get("roll", "") or "",
                "file": file_name,
                "file_idx": idx
            })

    # Sort descending: GPA first, then Total Marks
    students.sort(key=lambda x: (x["gpa"], x["mark"]), reverse=True)

    # Calculate global ranks (handling ties properly)
    current_rank = 1
    for i, s in enumerate(students):
        if i > 0:
            prev = students[i - 1]
            if s["gpa"] != prev["gpa"] or s["mark"] != prev["mark"]:
                current_rank = i + 1
        s["globalRank"] = current_rank
        s["id"] = i

    # Extract unique filter lists
    unique_districts = sorted(list(set(s["district"].upper() for s in students if s["district"])))
    unique_schools = sorted(list(set(s["school"].upper() for s in students if s["school"])))
    unique_groups = sorted(list(set(s["group"].upper() for s in students if s["group"])))
    unique_files = school_files

    dist_map = {d: i for i, d in enumerate(unique_districts)}
    sch_map = {s: i for i, s in enumerate(unique_schools)}
    grp_map = {g: i for i, g in enumerate(unique_groups)}
    file_map = {f: i for i, f in enumerate(unique_files)}

    # Build compact student rows:
    # [id, name, school_idx, dist_idx, grp_idx, gpa, mark, globalRank, passed_flag, roll, file_idx, file_inner_idx]
    compact_students = []
    for s in students:
        s_idx = sch_map.get(s["school"].upper(), -1) if s["school"] else -1
        d_idx = dist_map.get(s["district"].upper(), -1) if s["district"] else -1
        g_idx = grp_map.get(s["group"].upper(), -1) if s["group"] else -1
        f_idx = file_map.get(s["file"], -1)
        
        compact_students.append([
            s["id"],
            s["name"],
            s_idx,
            d_idx,
            g_idx,
            s["gpa"],
            s["mark"],
            s["globalRank"],
            1 if s["status"].upper() == "PASSED" else 0,
            s["roll"],
            f_idx,
            s["file_idx"]
        ])

    payload = {
        "districts": unique_districts,
        "schools": unique_schools,
        "groups": unique_groups,
        "files": unique_files,
        "students": compact_students
    }

    # Write minified JSON
    payload_str = json.dumps(payload, separators=(',', ':'))
    leaderboard_file.write_text(payload_str, encoding="utf-8")
    
    size_mb = len(payload_str.encode("utf-8")) / (1024 * 1024)
    print(f"Generated {leaderboard_file.name} successfully!")
    print(f"Total students: {len(students)}")
    print(f"Index file size: {size_mb:.2f} MB (reduced from 11.1 MB across 148 requests)")

if __name__ == "__main__":
    build()
