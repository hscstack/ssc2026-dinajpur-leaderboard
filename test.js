const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/results.json')).students;
let rawData = data;

function setupData() {
    rawData.sort((a, b) => {
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      return b.mark - a.mark;
    });

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
      if (student.school) uniqueSchools.add(student.school.toUpperCase());
    }

    uniqueSchools.forEach(school => {
      const schoolStudents = rawData.filter(s => s.school && s.school.toUpperCase() === school);
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
let filteredData = rawData.filter(s => s.name.toLowerCase().includes('ab') && s.school.toUpperCase() === 'RZS');
filteredData.forEach(student => { student.displayRank = student.schoolRank; });
filteredData.sort((a, b) => a.schoolRank - b.schoolRank);

console.log(filteredData.map(s => ({name: s.name, displayRank: s.displayRank, schoolRank: s.schoolRank, mark: s.mark})));
