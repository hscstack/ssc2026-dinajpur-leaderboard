#!/usr/bin/env python3
import json
import os
import glob
from pathlib import Path

ROOT_DIR = Path(__file__).parent
DATA_DIR = ROOT_DIR / "data"
LEADERBOARD_FILE = DATA_DIR / "leaderboard.json"

import argparse

def main():
    if not LEADERBOARD_FILE.exists():
        print(f"Error: {LEADERBOARD_FILE} does not exist.")
        return

    parser = argparse.ArgumentParser(description="Find and update a student mark in SSC 2026 leaderboard.")
    parser.add_argument("--roll", type=str, help="Student Roll Number")
    parser.add_argument("--mark", type=int, help="New Total Mark")
    parser.add_argument("--gpa", type=float, help="New GPA")
    args = parser.parse_args()

    print("=" * 60)
    print("  SSC 2026 Student Mark & Result Update Tool")
    print("=" * 60)

    # 1. Ask for roll number if not provided via CLI
    roll_input = (args.roll or input("Enter Student Roll Number: ")).strip()
    if not roll_input:
        print("No roll number entered. Exiting.")
        return

    print("\nLoading leaderboard data...")
    with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    districts = data.get("districts", [])
    upazilas = data.get("upazilas", [])
    schools = data.get("schools", [])
    groups = data.get("groups", [])
    students = data.get("students", [])

    # Student row format:
    # [id, name, school_idx, upz_idx, dist_idx, grp_idx, gpa, mark, globalRank, is_passed, roll, is_result_changed]
    target_idx = None
    target_student = None

    for i, s in enumerate(students):
        if str(s[10]).strip() == roll_input:
            target_idx = i
            target_student = s
            break

    if target_student is None:
        print(f"\n[!] Student with roll '{roll_input}' was not found in leaderboard.")
        return

    school_name = schools[target_student[2]] if 0 <= target_student[2] < len(schools) else "Unknown"
    upazila_name = upazilas[target_student[3]] if 0 <= target_student[3] < len(upazilas) else "Unknown"
    district_name = districts[target_student[4]] if 0 <= target_student[4] < len(districts) else "Unknown"
    group_name = groups[target_student[5]] if 0 <= target_student[5] < len(groups) else "Unknown"
    curr_gpa = target_student[6]
    curr_mark = target_student[7]
    curr_rank = target_student[8]
    curr_status = "Passed" if target_student[9] == 1 else "Failed"
    curr_changed = bool(target_student[11]) if len(target_student) > 11 else False

    print("\n" + "-" * 40)
    print(" Current Student Details:")
    print("-" * 40)
    print(f" Roll Number    : {target_student[10]}")
    print(f" Name           : {target_student[1]}")
    print(f" School         : {school_name}")
    print(f" Location       : {upazila_name}, {district_name}")
    print(f" Group          : {group_name}")
    print(f" Current Mark   : {curr_mark}")
    print(f" Current GPA    : {curr_gpa:.2f}")
    print(f" Global Rank    : #{curr_rank:,}")
    print(f" Status         : {curr_status}")
    print(f" Result Changed : {'Yes' if curr_changed else 'No'}")
    print("-" * 40)

    # 2. Prompt for new values
    if args.mark is not None:
        new_mark = args.mark
    else:
        new_mark_str = input(f"\nEnter new Total Mark [current: {curr_mark}]: ").strip()
        if new_mark_str:
            try:
                new_mark = int(new_mark_str)
            except ValueError:
                print("Invalid mark format. Must be an integer.")
                return
        else:
            new_mark = curr_mark

    if args.gpa is not None:
        new_gpa = args.gpa
    else:
        new_gpa_str = input(f"Enter new GPA [current: {curr_gpa:.2f}]: ").strip()
        if new_gpa_str:
            try:
                new_gpa = float(new_gpa_str)
            except ValueError:
                print("Invalid GPA format. Must be a decimal number.")
                return
        else:
            new_gpa = curr_gpa

    # Apply changes to student row
    target_student[6] = new_gpa
    target_student[7] = new_mark
    
    # Mark is_result_changed_after_board_challenge as 1 (True)
    if len(target_student) > 11:
        target_student[11] = 1
    else:
        target_student.append(1)

    print("\nRecalculating global ranks for all students...")

    # Sort descending: GPA first, then Mark, then Roll ascending
    students.sort(
        key=lambda x: (
            float(x[6]),
            int(x[7]),
            -int(x[10]) if str(x[10]).isdigit() else 0
        ),
        reverse=True
    )

    # Re-assign ranks and IDs
    current_rank = 1
    updated_new_rank = None
    for i, s in enumerate(students):
        if i > 0:
            prev = students[i - 1]
            if s[6] != prev[6] or s[7] != prev[7]:
                current_rank = i + 1
        s[8] = current_rank
        s[0] = i
        if str(s[10]).strip() == roll_input:
            updated_new_rank = current_rank

    data["students"] = students

    print("Saving updated leaderboard...")
    with open(LEADERBOARD_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)

    # 3. Check and update school json files if any
    matched_school_files = 0
    for school_file in DATA_DIR.glob("*_results.json"):
        try:
            with open(school_file, "r", encoding="utf-8") as sf:
                school_data = json.load(sf)
            file_modified = False
            for item in school_data:
                # Some school files have roll or match on name & school
                if item.get("name") == target_student[1] and (str(item.get("roll", "")).strip() == roll_input or not item.get("roll")):
                    item["mark"] = new_mark
                    item["gpa"] = new_gpa
                    item["is_result_changed_after_board_challenge"] = True
                    file_modified = True
            if file_modified:
                with open(school_file, "w", encoding="utf-8") as sf:
                    json.dump(school_data, sf, indent=2, ensure_ascii=False)
                matched_school_files += 1
        except Exception:
            pass

    print("\n" + "=" * 60)
    print(" [✓] Update Complete!")
    print(f" Student        : {target_student[1]} (Roll: {roll_input})")
    print(f" Updated Mark   : {new_mark} (was {curr_mark})")
    print(f" Updated GPA    : {new_gpa:.2f} (was {curr_gpa:.2f})")
    print(f" New Global Rank: #{updated_new_rank:,} (was #{curr_rank:,})")
    print(f" Result Changed : Set to True (1)")
    if matched_school_files > 0:
        print(f" Updated in {matched_school_files} school result file(s).")
    print("=" * 60)

if __name__ == "__main__":
    main()
