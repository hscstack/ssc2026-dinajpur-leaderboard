import os
import json
import math
from collections import defaultdict
from pathlib import Path

# Input dataset sources
MASTER_STUDENT_JSON = r"c:\Users\labib_n4\Documents\Project\SSC-Rankings\all_student_data\all_students_dinajpur_board.json"

GROUP_QUOTAS = {
    'SCIENCE': {
        'genderTalentpoolCutoff': 190,  # 380 total (50% Male : 50% Female)
        'genderUpazilaSeats': 2,        # 4 total per upazila (2 Male : 2 Female)
        'genderZillaSeats': 24          # 48 total per district pool (24 Male : 24 Female)
    },
    'HUMANITIES': {
        'genderTalentpoolCutoff': 80,   # 160 total (50% Male : 50% Female)
        'genderUpazilaSeats': 2,        # 4 total per upazila (2 Male : 2 Female)
        'genderZillaSeats': 18          # 36 total per district pool (18 Male : 18 Female)
    },
    'BUSINESS STUDIES': {
        'genderTalentpoolCutoff': 18,   # 35 total (50% Male : 50% Female)
        'genderUpazilaSeats': 1,        # 2 total per upazila (1 Male : 1 Female)
        'genderZillaSeats': 8           # 16 total per district pool (8 Male : 8 Female)
    }
}

TIERS = [
    'TALENTPOOL',
    'UPAZILA_GENERAL',
    'DISTRICT_GENERAL',
    'BUBBLE',
    'COMPETITIVE',
    'LOW',
    'INELIGIBLE'
]
TIER_MAP = {t: i for i, t in enumerate(TIERS)}

def safe_float(val):
    try:
        return float(val)
    except:
        return 0.0

def build():
    print("Loading all student records for leaderboard build...")
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)
    leaderboard_file = data_dir / "leaderboard.json"

    with open(MASTER_STUDENT_JSON, 'r', encoding='utf-8') as f:
        students_raw = json.load(f)

    print(f"Loaded {len(students_raw):,} student records from master dataset.")

    # Transcripts Map
    transcripts_dir = data_dir / "transcripts"
    transcripts_dir.mkdir(exist_ok=True)
    transcripts_map = {}

    # Standardize records
    students = []
    for idx, s in enumerate(students_raw):
        name = (s.get('name') or 'STUDENT').strip().upper()
        school = (s.get('institution') or 'UNKNOWN SCHOOL').strip().upper()
        upazila = (s.get('upazila') or 'UNKNOWN').strip().upper()
        district = (s.get('district') or 'UNKNOWN').strip().upper()
        
        grp = (s.get('group') or 'SCIENCE').strip().upper()
        if 'SCIENCE' in grp: grp = 'SCIENCE'
        elif 'HUMANITIES' in grp or 'ARTS' in grp: grp = 'HUMANITIES'
        elif 'BUSINESS' in grp or 'COMMERCE' in grp: grp = 'BUSINESS STUDIES'
        else: grp = 'SCIENCE'

        gpa = safe_float(s.get('gpa', 0.0))
        tot_marks = s.get('total_marks')
        mark = int(tot_marks) if (tot_marks is not None and str(tot_marks).isdigit()) else 0
        status = str(s.get('status', 'FAILED')).strip().upper()
        is_passed = 1 if status == 'PASSED' else 0
        roll = str(s.get('roll', ''))
        gender = str(s.get('gender', 'MALE')).strip().upper()
        cand_type = str(s.get('candidate_type', 'REGULAR')).strip().upper()
        is_regular = 1 if cand_type == 'REGULAR' else 0

        sub_grades = s.get('subject_grades')
        has_sub = 0
        if sub_grades and len(sub_grades) > 0 and roll:
            has_sub = 1
            transcripts_map[roll] = sub_grades

        students.append({
            'name': name,
            'school': school,
            'upazila': upazila,
            'district': district,
            'group': grp,
            'gpa': gpa,
            'mark': mark,
            'status': status,
            'is_passed': is_passed,
            'roll': roll,
            'gender': gender,
            'candidate_type': cand_type,
            'is_regular': is_regular,
            'has_transcript': has_sub,
            'raw_idx': idx
        })

    # Sort descending by GPA, Mark, Roll
    students.sort(key=lambda x: (x['gpa'], x['mark'], -int(x['roll']) if x['roll'].isdigit() else 0), reverse=True)

    # Assign Global Board Ranks (handling ties)
    current_rank = 1
    for i, s in enumerate(students):
        if i > 0:
            prev = students[i - 1]
            if s['gpa'] != prev['gpa'] or s['mark'] != prev['mark']:
                current_rank = i + 1
        s['globalRank'] = current_rank
        s['id'] = i

    # Compute Scholarship Probability Engine (Ministry / DSHE Quota Simulation)
    print("Computing Official 50:50 Gender Scholarship Quotas...")
    
    # 1. Talentpool Selection
    by_grp_gender = defaultdict(list)
    for s in students:
        if s['is_passed'] and s['is_regular'] and s['gpa'] >= 3.00:
            by_grp_gender[(s['group'], s['gender'])].append(s)

    talentpool_set = set()
    for (grp_name, gender), g_list in by_grp_gender.items():
        quota = GROUP_QUOTAS.get(grp_name, GROUP_QUOTAS['SCIENCE'])
        limit = quota['genderTalentpoolCutoff']
        for rank_idx, s in enumerate(g_list):
            if rank_idx < limit:
                s['scholarship_tier'] = 'TALENTPOOL'
                s['scholarship_prob'] = 98
                talentpool_set.add(s['id'])

    # 2. Upazila General Quota Selection (for non-talentpool regular students)
    by_upz_gender = defaultdict(list)
    for s in students:
        if s['id'] not in talentpool_set and s['is_passed'] and s['is_regular'] and s['gpa'] >= 3.00:
            by_upz_gender[(s['district'], s['upazila'], s['group'], s['gender'])].append(s)

    upazila_selected_set = set()
    for (dist, upz, grp_name, gender), u_list in by_upz_gender.items():
        quota = GROUP_QUOTAS.get(grp_name, GROUP_QUOTAS['SCIENCE'])
        seats = quota['genderUpazilaSeats']
        for rank_idx, s in enumerate(u_list):
            if rank_idx < seats:
                s['scholarship_tier'] = 'UPAZILA_GENERAL'
                s['scholarship_prob'] = 95
                upazila_selected_set.add(s['id'])
            elif rank_idx < seats + 1:
                s['scholarship_tier'] = 'BUBBLE'
                s['scholarship_prob'] = 75
                upazila_selected_set.add(s['id'])

    # 3. District Pool & Remaining Tiers
    by_dist_gender = defaultdict(list)
    for s in students:
        if s['id'] not in talentpool_set and s['id'] not in upazila_selected_set and s['is_passed'] and s['is_regular'] and s['gpa'] >= 3.00:
            by_dist_gender[(s['district'], s['group'], s['gender'])].append(s)

    for (dist, grp_name, gender), d_list in by_dist_gender.items():
        quota = GROUP_QUOTAS.get(grp_name, GROUP_QUOTAS['SCIENCE'])
        z_seats = quota['genderZillaSeats']
        for rank_idx, s in enumerate(d_list):
            if rank_idx < z_seats:
                s['scholarship_tier'] = 'DISTRICT_GENERAL'
                s['scholarship_prob'] = 80
            elif rank_idx < int(z_seats * 1.5):
                s['scholarship_tier'] = 'COMPETITIVE'
                s['scholarship_prob'] = 55
            elif s['gpa'] >= 4.50:
                s['scholarship_tier'] = 'LOW'
                s['scholarship_prob'] = 35
            else:
                s['scholarship_tier'] = 'INELIGIBLE'
                s['scholarship_prob'] = 0

    # Default remaining
    for s in students:
        if 'scholarship_tier' not in s:
            s['scholarship_tier'] = 'INELIGIBLE'
            s['scholarship_prob'] = 0

    # Extract unique filter lists
    unique_districts = sorted(list(set(s['district'] for s in students if s['district'])))
    unique_upazilas = sorted(list(set(s['upazila'] for s in students if s['upazila'])))
    unique_schools = sorted(list(set(s['school'] for s in students if s['school'])))
    unique_groups = ["SCIENCE", "HUMANITIES", "BUSINESS STUDIES"]

    dist_map = {d: i for i, d in enumerate(unique_districts)}
    upz_map = {u: i for i, u in enumerate(unique_upazilas)}
    sch_map = {s: i for i, s in enumerate(unique_schools)}
    grp_map = {g: i for i, g in enumerate(unique_groups)}

    # Map district to upazilas dictionary for cascaded filtering
    dist_to_upazilas = defaultdict(set)
    for s in students:
        dist_to_upazilas[s['district']].add(s['upazila'])
    dist_upz_dict = {d: sorted(list(upzs)) for d, upzs in dist_to_upazilas.items()}

    print(f"Districts: {len(unique_districts)}, Upazilas: {len(unique_upazilas)}, Schools: {len(unique_schools)}")

    # Compact student rows:
    # [id, name, school_idx, upz_idx, dist_idx, grp_idx, gpa, mark, globalRank, is_passed, roll, scholarship_prob, tier_idx, gender (1=M,2=F), is_regular, has_transcript]
    compact_students = []
    for s in students:
        s_idx = sch_map.get(s['school'], -1)
        u_idx = upz_map.get(s['upazila'], -1)
        d_idx = dist_map.get(s['district'], -1)
        g_idx = grp_map.get(s['group'], 0)
        t_idx = TIER_MAP.get(s['scholarship_tier'], 6)
        gender_code = 2 if s['gender'] == 'FEMALE' else 1

        compact_students.append([
            s['id'],
            s['name'],
            s_idx,
            u_idx,
            d_idx,
            g_idx,
            s['gpa'],
            s['mark'],
            s['globalRank'],
            s['is_passed'],
            s['roll'],
            s['scholarship_prob'],
            t_idx,
            gender_code,
            s['is_regular'],
            s['has_transcript']
        ])

    payload = {
        "districts": unique_districts,
        "upazilas": unique_upazilas,
        "district_upazilas": dist_upz_dict,
        "schools": unique_schools,
        "groups": unique_groups,
        "tiers": TIERS,
        "students": compact_students
    }

    # Write minified JSON
    print("Writing compressed leaderboard.json...")
    payload_str = json.dumps(payload, separators=(',', ':'), ensure_ascii=False)
    leaderboard_file.write_text(payload_str, encoding="utf-8")

    size_mb = len(payload_str.encode("utf-8")) / (1024 * 1024)
    print(f"Generated {leaderboard_file.name} successfully!")
    print(f"Total students indexed: {len(students):,}")
    print(f"File size: {size_mb:.2f} MB")

    # Export chunked transcript JSONs (grouped by 3-digit roll prefix for speed and clean filesystem)
    print("Grouping transcripts by 3-digit roll prefix...")
    transcripts_dir.mkdir(exist_ok=True)

    prefix_map = defaultdict(dict)
    for roll, sub_list in transcripts_map.items():
        prefix = roll[:3] if len(roll) >= 3 else 'other'
        prefix_map[prefix][roll] = sub_list

    print(f"Exporting {len(prefix_map)} transcript chunk files for {len(transcripts_map):,} examinees...")
    for prefix, rolls_dict in prefix_map.items():
        chunk_file = transcripts_dir / f"{prefix}.json"
        with open(chunk_file, 'w', encoding='utf-8') as f:
            json.dump(rolls_dict, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Transcripts successfully saved to {transcripts_dir} ({len(prefix_map)} chunk files)")

if __name__ == "__main__":
    build()
