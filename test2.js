const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/results.json')).students;
let rawData = data;

function setupData() {
    // 1. Sort the entire dataset by GPA (desc) then Marks (desc)
    rawData.sort((a, b) => {
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      return b.mark - a.mark;
    });

    // 2. Assign global rank and extract unique schools
    const uniqueSchools = new Set();
    let currentGlobalRank = 1;
    for (let i = 0; i < rawData.length; i++) {
      const student = rawData[i];
      if (i > 0) {
        const prev = rawData[i - 1];
        if (student.gpa !== prev.gpa || student.mark !== prev.mark) {
          currentGlobalRank = i + 1;
        }
      }
      student.globalRank = currentGlobalRank;
      
      if (student.school) {
        uniqueSchools.add(student.school.toUpperCase());
      }
    }

    // 3. Assign school-specific rank
    uniqueSchools.forEach(school => {
      const schoolStudents = rawData.filter(s => s.school && s.school.toUpperCase() === school);
      // Ensure sorted by GPA/Marks before ranking
      schoolStudents.sort((a, b) => {
        if (b.gpa !== a.gpa) return b.gpa - a.gpa;
        return b.mark - a.mark;
      });
      let currentSchoolRank = 1;
      for (let i = 0; i < schoolStudents.length; i++) {
        const student = schoolStudents[i];
        if (i > 0) {
          const prev = schoolStudents[i - 1];
          if (student.gpa !== prev.gpa || student.mark !== prev.mark) {
            currentSchoolRank = i + 1;
          }
        }
        student.schoolRank = currentSchoolRank;
      }
    });
}

setupData();
let rzsData = rawData.filter(s => s.school === 'rzs');
console.log("RZS sample:");
console.log(rzsData.slice(0, 5).map(s => ({name: s.name, schoolRank: s.schoolRank})));
