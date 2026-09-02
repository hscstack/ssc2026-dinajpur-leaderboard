import os
import json
import math
import re
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
CHUNK_SIZE = 75  # 3 pages of 25 students per chunk

def safe_float(val):
    try:
        return float(val)
    except:
        return 0.0

def tokenize(text):
    if not text:
        return []
    words = re.findall(r'[a-zA-Z0-9]+', text.lower())
    return [w for w in words if len(w) >= 2]

def build():
    print("Loading all student records for leaderboard build...")
    root_dir = Path(__file__).parent
    data_dir = root_dir / "data"
    data_dir.mkdir(exist_ok=True)

    chunks_dir = data_dir / "chunks"
    chunks_dir.mkdir(exist_ok=True)

    search_dir = data_dir / "search"
    search_dir.mkdir(exist_ok=True)

    transcripts_dir = data_dir / "transcripts"
    transcripts_dir.mkdir(exist_ok=True)

    with open(MASTER_STUDENT_JSON, 'r', encoding='utf-8') as f:
        students_raw = json.load(f)

    print(f"Loaded {len(students_raw):,} student records from master dataset.")

    transcripts_map = {}
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

    # Compute Scholarship Quotas
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

    # 2. Upazila General Quota Selection
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

    dist_to_upazilas = defaultdict(set)
    for s in students:
        dist_to_upazilas[s['district']].add(s['upazila'])
    dist_upz_dict = {d: sorted(list(upzs)) for d, upzs in dist_to_upazilas.items()}

    # Compact student representation:
    # [id, name, school_idx, upz_idx, dist_idx, grp_idx, gpa, mark, globalRank, is_passed, roll, scholarship_prob, tier_idx, gender (1=M,2=F), is_regular, has_transcript]
    compact_students = []
    for s in students:
        s_idx = sch_map.get(s['school'], -1)
        u_idx = upz_map.get(s['upazila'], -1)
        d_idx = dist_map.get(s['district'], -1)
        g_idx = grp_map.get(s['group'], 0)
        t_idx = TIER_MAP.get(s['scholarship_tier'], 6)
        gender_code = 2 if s['gender'] == 'FEMALE' else 1

        compact_row = [
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
        ]
        s['compact'] = compact_row
        compact_students.append(compact_row)

    print(f"Total students compact encoded: {len(compact_students):,}")

    # Chunking: Write global chunks data/chunks/all/{chunkIndex}.json
    all_chunks_dir = chunks_dir / "all"
    all_chunks_dir.mkdir(parents=True, exist_ok=True)
    num_global_chunks = math.ceil(len(compact_students) / CHUNK_SIZE)

    print(f"Writing {num_global_chunks} global chunks ({CHUNK_SIZE} students per chunk)...")
    for c_idx in range(num_global_chunks):
        start = c_idx * CHUNK_SIZE
        end = min(start + CHUNK_SIZE, len(compact_students))
        chunk_data = compact_students[start:end]
        chunk_path = all_chunks_dir / f"{c_idx}.json"
        chunk_path.write_text(json.dumps(chunk_data, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')

    # Calculate Scoped Group & District counts
    scope_totals = defaultdict(int)
    scope_students = defaultdict(list)

    for s in students:
        d = s['district']
        u = s['upazila']
        g = s['group']
        c = s['compact']

        scope_totals['ALL_ALL'] += 1
        
        scope_totals[f"{d}_ALL"] += 1
        scope_students[f"{d}_ALL"].append(c)

        scope_totals[f"ALL_{g}"] += 1
        scope_students[f"ALL_{g}"].append(c)

        scope_totals[f"{d}_{g}"] += 1
        scope_students[f"{d}_{g}"].append(c)

        scope_totals[f"{d}_{u}_ALL"] += 1
        scope_students[f"{d}_{u}_ALL"].append(c)

        scope_totals[f"{d}_{u}_{g}"] += 1
        scope_students[f"{d}_{u}_{g}"].append(c)

    # Write scoped chunks for instant filtered browsing
    print("Writing scoped chunks for districts, upazilas, and groups...")
    for scope_key, rows in scope_students.items():
        safe_scope_dir = chunks_dir / scope_key.replace(' ', '_')
        safe_scope_dir.mkdir(parents=True, exist_ok=True)
        n_chunks = math.ceil(len(rows) / CHUNK_SIZE)
        for c_idx in range(n_chunks):
            start = c_idx * CHUNK_SIZE
            end = min(start + CHUNK_SIZE, len(rows))
            chunk_data = rows[start:end]
            (safe_scope_dir / f"{c_idx}.json").write_text(
                json.dumps(chunk_data, separators=(',', ':'), ensure_ascii=False),
                encoding='utf-8'
            )

    # Initial Students (First 75 items = 3 pages for instant 0ms first render)
    initial_students = compact_students[:CHUNK_SIZE]

    # Overall Board Statistics
    gpa5_count = sum(1 for s in students if s['gpa'] == 5.0)
    meta_payload = {
        "districts": unique_districts,
        "upazilas": unique_upazilas,
        "district_upazilas": dist_upz_dict,
        "schools": unique_schools,
        "groups": unique_groups,
        "tiers": TIERS,
        "chunk_size": CHUNK_SIZE,
        "total_students": len(compact_students),
        "total_chunks": num_global_chunks,
        "scope_totals": {k.replace(' ', '_'): v for k, v in scope_totals.items()},
        "stats": {
            "total_students": len(compact_students),
            "total_schools": len(unique_schools),
            "total_gpa5": gpa5_count,
            "total_districts": len(unique_districts)
        },
        "initial_students": initial_students
    }

    print("Writing compressed leaderboard_meta.json...")
    meta_file = data_dir / "leaderboard_meta.json"
    meta_str = json.dumps(meta_payload, separators=(',', ':'), ensure_ascii=False)
    meta_file.write_text(meta_str, encoding="utf-8")
    meta_kb = len(meta_str.encode("utf-8")) / 1024
    print(f"leaderboard_meta.json created: {meta_kb:.1f} KB (Loads in ~15ms!)")

    # Also keep backward-compatible leaderboard.json as meta + initial chunks
    leaderboard_file = data_dir / "leaderboard.json"
    leaderboard_file.write_text(meta_str, encoding="utf-8")

    # Build Search Shards by 2-character prefixes for lightning-fast search
    print("Building instant search index shards...")
    search_shards = defaultdict(list)
    seen_in_shard = defaultdict(set)

    for s in students:
        c = s['compact']
        s_id = s['id']
        tokens = set()

        # Roll prefixes
        roll = s['roll']
        if roll:
            if len(roll) >= 2: tokens.add(roll[:2].lower())
            if len(roll) >= 3: tokens.add(roll[:3].lower())

        # Name tokens
        for word in tokenize(s['name']):
            if len(word) >= 2: tokens.add(word[:2])

        # School tokens
        for word in tokenize(s['school']):
            if len(word) >= 2: tokens.add(word[:2])

        # Upazila tokens
        for word in tokenize(s['upazila']):
            if len(word) >= 2: tokens.add(word[:2])

        for tok in tokens:
            if s_id not in seen_in_shard[tok]:
                seen_in_shard[tok].add(s_id)
                search_shards[tok].append(c)

    print(f"Exporting {len(search_shards):,} search shard files...")
    for prefix, rows in search_shards.items():
        # Sanitize filename
        safe_prefix = re.sub(r'[^a-zA-Z0-9_-]', '', prefix)
        if not safe_prefix: continue
        shard_path = search_dir / f"{safe_prefix}.json"
        shard_path.write_text(json.dumps(rows, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')

    # Export chunked transcripts (grouped by 3-digit roll prefix)
    print("Grouping transcripts by 3-digit roll prefix...")
    prefix_map = defaultdict(dict)
    for roll, sub_list in transcripts_map.items():
        prefix = roll[:3] if len(roll) >= 3 else 'other'
        prefix_map[prefix][roll] = sub_list

    print(f"Exporting {len(prefix_map)} transcript chunk files for {len(transcripts_map):,} examinees...")
    for prefix, rolls_dict in prefix_map.items():
        chunk_file = transcripts_dir / f"{prefix}.json"
        chunk_file.write_text(json.dumps(rolls_dict, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    print("All chunks, search shards, transcripts, and metadata generated successfully!")

if __name__ == "__main__":
    build()
