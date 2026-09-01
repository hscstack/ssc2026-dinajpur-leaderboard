import os
import json
import html
from collections import defaultdict
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
LEADERBOARD_FILE = DATA_DIR / "leaderboard.json"
TRANSCRIPTS_DIR = DATA_DIR / "transcripts"

POSSIBLE_MASTER_FILES = [
    ROOT_DIR / "all_students_dinajpur_board.json",
    ROOT_DIR / "all_students.json",
    DATA_DIR / "all_students_dinajpur_board.json",
    Path.home() / "Documents" / "all_students_dinajpur_board.json",
    Path(r"c:\Users\labib_n4\Documents\Project\SSC-Rankings\all_student_data\all_students_dinajpur_board.json")
]

def safe_float(val):
    try:
        return float(val)
    except:
        return 0.0

def build():
    DATA_DIR.mkdir(exist_ok=True)
    TRANSCRIPTS_DIR.mkdir(exist_ok=True)

    master_path = None
    for p in POSSIBLE_MASTER_FILES:
        if p.exists():
            master_path = p
            break

    if master_path:
        print(f"Loading master dataset from {master_path}...")
        with open(master_path, 'r', encoding='utf-8') as f:
            students_raw = json.load(f)

        print(f"Processing {len(students_raw):,} students...")
        transcripts_map = {}
        students = []

        for idx, s in enumerate(students_raw):
            name = html.unescape(s.get('name') or 'STUDENT').strip().upper()
            school = html.unescape(s.get('institution') or s.get('school') or 'UNKNOWN SCHOOL').strip().upper()
            upazila = html.unescape(s.get('upazila') or 'UNKNOWN').strip().upper()
            district = html.unescape(s.get('district') or 'UNKNOWN').strip().upper()

            grp = (s.get('group') or 'SCIENCE').strip().upper()
            if 'SCIENCE' in grp:
                grp = 'SCIENCE'
            elif 'HUMANITIES' in grp or 'ARTS' in grp:
                grp = 'HUMANITIES'
            elif 'BUSINESS' in grp or 'COMMERCE' in grp:
                grp = 'BUSINESS STUDIES'
            else:
                grp = 'SCIENCE'

            gpa = safe_float(s.get('gpa', 0.0))
            tot_marks = s.get('total_marks') if s.get('total_marks') is not None else s.get('mark')
            mark = int(tot_marks) if (tot_marks is not None and str(tot_marks).isdigit()) else 0
            status = str(s.get('status', 'PASSED')).strip().upper()
            is_passed = 1 if status == 'PASSED' else 0
            roll = str(s.get('roll', '')).strip()

            sub_grades = s.get('subject_grades') or s.get('grades')
            if sub_grades and len(sub_grades) > 0 and roll:
                transcripts_map[roll] = sub_grades

            students.append({
                'name': name,
                'school': school,
                'upazila': upazila,
                'district': district,
                'group': grp,
                'gpa': gpa,
                'mark': mark,
                'is_passed': is_passed,
                'roll': roll
            })

        # Sort descending: GPA first, then Total Marks, then Roll
        students.sort(key=lambda x: (x['gpa'], x['mark'], -int(x['roll']) if x['roll'].isdigit() else 0), reverse=True)

        # Global Board Rank
        current_rank = 1
        for i, s in enumerate(students):
            if i > 0:
                prev = students[i - 1]
                if s['gpa'] != prev['gpa'] or s['mark'] != prev['mark']:
                    current_rank = i + 1
            s['globalRank'] = current_rank
            s['id'] = i

        unique_districts = sorted(list(set(s['district'] for s in students if s['district'])))
        unique_upazilas = sorted(list(set(s['upazila'] for s in students if s['upazila'])))
        unique_schools = sorted(list(set(s['school'] for s in students if s['school'])))
        unique_groups = ["SCIENCE", "HUMANITIES", "BUSINESS STUDIES"]

        dist_map = {d: i for i, d in enumerate(unique_districts)}
        upz_map = {u: i for i, u in enumerate(unique_upazilas)}
        sch_map = {s: i for i, s in enumerate(unique_schools)}
        grp_map = {g: i for i, g in enumerate(unique_groups)}

        dist_to_upazilas = defaultdict(set)
        for s in students:
            dist_to_upazilas[s['district']].add(s['upazila'])
        dist_upz_dict = {d: sorted(list(upzs)) for d, upzs in dist_to_upazilas.items()}

        # Compact student rows:
        # [id, name, school_idx, upz_idx, dist_idx, grp_idx, gpa, mark, globalRank, is_passed, roll]
        compact_students = []
        for s in students:
            compact_students.append([
                s['id'],
                s['name'],
                sch_map.get(s['school'], -1),
                upz_map.get(s['upazila'], -1),
                dist_map.get(s['district'], -1),
                grp_map.get(s['group'], 0),
                s['gpa'],
                s['mark'],
                s['globalRank'],
                s['is_passed'],
                s['roll']
            ])

        payload = {
            "districts": unique_districts,
            "upazilas": unique_upazilas,
            "district_upazilas": dist_upz_dict,
            "schools": unique_schools,
            "groups": unique_groups,
            "students": compact_students
        }

        payload_str = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
        LEADERBOARD_FILE.write_text(payload_str, encoding="utf-8")
        size_mb = len(payload_str.encode("utf-8")) / (1024 * 1024)
        print(f"Generated {LEADERBOARD_FILE.name} successfully ({size_mb:.2f} MB, {len(students):,} students)")

        if transcripts_map:
            prefix_map = defaultdict(dict)
            for roll, sub_list in transcripts_map.items():
                prefix = roll[:3] if len(roll) >= 3 else 'other'
                prefix_map[prefix][roll] = sub_list

            print(f"Exporting {len(prefix_map)} transcript chunks...")
            for prefix, rolls_dict in prefix_map.items():
                chunk_file = TRANSCRIPTS_DIR / f"{prefix}.json"
                with open(chunk_file, 'w', encoding='utf-8') as f:
                    json.dump(rolls_dict, f, ensure_ascii=False, separators=(',', ':'))

    elif LEADERBOARD_FILE.exists():
        print(f"{LEADERBOARD_FILE.name} already exists. Ready.")
    else:
        print("No student data source found to build.")

if __name__ == "__main__":
    build()
