document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const btnSelectDistrict = document.getElementById('btn-select-district');
  const btnSelectSchool = document.getElementById('btn-select-school');
  const btnSelectGroup = document.getElementById('btn-select-group');
  
  const labelDistrict = document.getElementById('label-district');
  const labelSchool = document.getElementById('label-school');
  const labelGroup = document.getElementById('label-group');

  // Selection Modal Elements
  const selectionModal = document.getElementById('selection-modal');
  const selectionModalInner = document.getElementById('selection-modal-inner');
  const selectionModalClose = document.getElementById('selection-modal-close');
  const selectionModalTitle = document.getElementById('selection-modal-title');
  const selectionModalSearchContainer = document.getElementById('selection-modal-search-container');
  const selectionModalSearch = document.getElementById('selection-modal-search');
  const selectionModalBody = document.getElementById('selection-modal-body');

  const leaderboardBody = document.getElementById('leaderboard-body');
  const leaderboardContainer = document.getElementById('leaderboard-container');
  
  const loadingState = document.getElementById('loading-state');
  const errorState = document.getElementById('error-state');
  const emptyState = document.getElementById('empty-state');
  
  const statStudents = document.getElementById('stat-students');
  const statSchools = document.getElementById('stat-schools');
  const statGpa5 = document.getElementById('stat-gpa5');
  const statDistricts = document.getElementById('stat-districts');
  const statSchoolsContainer = document.getElementById('stat-schools-container');
  const statDistrictsContainer = document.getElementById('stat-districts-container');

  
  const paginationContainer = document.getElementById('pagination-container');
  const pageSizeSelect = document.getElementById('page-size');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const pageNumbersContainer = document.getElementById('page-numbers');
  
  // Modal Elements
  const modal = document.getElementById('student-modal');
  const modalContentInner = document.getElementById('modal-content-inner');
  const modalClose = document.getElementById('modal-close');
  const modalName = document.getElementById('modal-name');
  const modalStatus = document.getElementById('modal-status');
  const modalSchool = document.getElementById('modal-school');
  const modalRollRow = document.getElementById('modal-roll-row');
  const modalRoll = document.getElementById('modal-roll');
  const modalGpa = document.getElementById('modal-gpa');
  const modalMarks = document.getElementById('modal-marks');
  const modalGradesSection = document.getElementById('modal-grades-section');
  const modalGrades = document.getElementById('modal-grades');
  const modalStudentHeader = document.getElementById('modal-student-header');
  const modalSchoolsHeader = document.getElementById('modal-schools-header');
  const modalStudentBody = document.getElementById('modal-student-body');
  const modalSchoolsBody = document.getElementById('modal-schools-body');

  const pageTitleText = document.getElementById('page-title-text');

  const takedownBtn = document.getElementById('takedown-btn');
  const takedownModal = document.getElementById('takedown-modal');
  const takedownModalInner = document.getElementById('takedown-modal-inner');
  const takedownClose = document.getElementById('takedown-close');

  const newSchoolBtn = document.getElementById('new-school-btn');
  const newSchoolModal = document.getElementById('new-school-modal');
  const newSchoolModalInner = document.getElementById('new-school-modal-inner');
  const newSchoolClose = document.getElementById('new-school-close');

  // State
  let rawData = [];
  let filteredData = [];
  let currentPage = 1;
  let itemsPerPage = 25;

  let selectedDistrict = 'all';
  let selectedSchool = 'all';
  let selectedGroup = 'all';

  let districtsList = [];
  let schoolsList = [];
  let groupsList = [];

  // Initialization
  init();

  async function init() {
    try {
      const manifestResponse = await fetch('data/manifest.json');
      if (!manifestResponse.ok) throw new Error('Failed to fetch manifest');
      const files = await manifestResponse.json();
      
      const requests = files.map(file => fetch(`data/${file}`).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch data/${file}`);
        return res.json();
      }));
      
      const results = await Promise.all(requests);
      rawData = results.flat();
      
      const entityDiv = document.createElement('div');
      rawData.forEach(s => {
        if (s.school) {
          entityDiv.innerHTML = s.school;
          s.school = entityDiv.textContent;
        }
        if (s.name) {
          entityDiv.innerHTML = s.name;
          s.name = entityDiv.textContent;
        }
      });

      if (rawData.length === 0) {
        showState('empty');
        return;
      }
      
      setupData();
      applyFilters();
      
      // Event Listeners
      searchInput.addEventListener('input', handleFilterChange);
      btnSelectDistrict.addEventListener('click', () => openSelectionModal('district'));
      btnSelectSchool.addEventListener('click', () => openSelectionModal('school'));
      btnSelectGroup.addEventListener('click', () => openSelectionModal('group'));

      selectionModalClose.addEventListener('click', closeSelectionModal);
      selectionModal.addEventListener('click', (e) => {
        if (e.target === selectionModal) closeSelectionModal();
      });
      pageSizeSelect.addEventListener('change', handlePageSizeChange);
      btnPrev.addEventListener('click', () => changePage(-1));
      btnNext.addEventListener('click', () => changePage(1));
      statSchoolsContainer.addEventListener('click', showSchoolsModal);
      statDistrictsContainer.addEventListener('click', showDistrictsModal);

      
      // Modal Close
      modalClose.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (!modal.classList.contains('hidden')) closeModal();
          if (!takedownModal.classList.contains('hidden')) closeTakedownModal();
          if (!newSchoolModal.classList.contains('hidden')) closeNewSchoolModal();
          if (!selectionModal.classList.contains('hidden')) closeSelectionModal();
        }
      });

      // Takedown Modal
      if (takedownBtn) {
        takedownBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openTakedownModal();
        });
      }
      if (takedownClose) {
        takedownClose.addEventListener('click', closeTakedownModal);
      }
      if (takedownModal) {
        takedownModal.addEventListener('click', (e) => {
          if (e.target === takedownModal) closeTakedownModal();
        });
      }

      // New School Modal
      if (newSchoolBtn) {
        newSchoolBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openNewSchoolModal();
        });
      }
      if (newSchoolClose) {
        newSchoolClose.addEventListener('click', closeNewSchoolModal);
      }
      if (newSchoolModal) {
        newSchoolModal.addEventListener('click', (e) => {
          if (e.target === newSchoolModal) closeNewSchoolModal();
        });
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      showState('error');
    }
  }

  function setupData() {
    // 1. Sort the entire dataset by GPA (desc) then Marks (desc)
    rawData.sort((a, b) => {
      if (b.gpa !== a.gpa) return b.gpa - a.gpa;
      return b.mark - a.mark;
    });

    // 2. Assign global rank and extract unique schools, districts, groups
    const uniqueSchools = new Set();
    const uniqueDistricts = new Set();
    const uniqueGroups = new Set();
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
      if (student.district) uniqueDistricts.add(student.district.toUpperCase());
      if (student.group) uniqueGroups.add(student.group.toUpperCase());
    }

    // 3. Assign school-specific rank
    uniqueSchools.forEach(school => {
      // Get all students for this school
      const schoolStudents = rawData.filter(s => s.school && s.school.toUpperCase() === school);
      
      // Sort them by GPA and Mark
      schoolStudents.sort((a, b) => {
        if (b.gpa !== a.gpa) return b.gpa - a.gpa;
        return b.mark - a.mark;
      });
      
      // Assign ranks based on the sorted array, but mutate the original objects in rawData
      let currentSchoolRank = 1;
      for (let i = 0; i < schoolStudents.length; i++) {
        const student = schoolStudents[i];
        if (i > 0) {
          const prev = schoolStudents[i - 1];
          if (student.gpa !== prev.gpa || student.mark !== prev.mark) {
            currentSchoolRank = i + 1;
          }
        }
        
        // Find the actual object in rawData and mutate it so the rank persists
        const originalStudent = rawData.find(s => s === student);
        if (originalStudent) {
          originalStudent.schoolRank = currentSchoolRank;
        }
      }
    });

    // 4. Save sorted lists for modal selection
    districtsList = Array.from(uniqueDistricts).sort();
    schoolsList = Array.from(uniqueSchools).sort();
    groupsList = Array.from(uniqueGroups).sort();
  }

  function handleFilterChange() {
    currentPage = 1;
    applyFilters();
  }

  function handlePageSizeChange() {
    itemsPerPage = parseInt(pageSizeSelect.value, 10);
    currentPage = 1;
    renderLeaderboard();
  }

  function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    filteredData = rawData.filter(student => {
      const matchName = !searchTerm || (student.name && student.name.toLowerCase().includes(searchTerm));
      const matchSchool = selectedSchool === 'all' || 
                         (student.school && student.school.toUpperCase() === selectedSchool);
      const matchDistrict = selectedDistrict === 'all' ||
                           (student.district && student.district.toUpperCase() === selectedDistrict);
      const matchGroup = selectedGroup === 'all' ||
                        (student.group && student.group.toUpperCase() === selectedGroup);
      return matchName && matchSchool && matchDistrict && matchGroup;
    });

    if (selectedSchool !== 'all') {
      // Use pre-calculated school rank
      filteredData.forEach(student => {
        student.displayRank = student.schoolRank;
      });
      filteredData.sort((a, b) => a.schoolRank - b.schoolRank);
      
      if (pageTitleText) {
        const displayName = selectedSchool.length > 25 ? selectedSchool.substring(0, 25) + '...' : selectedSchool;
        pageTitleText.textContent = `${displayName} Leaderboard`;
      }
    } else {
      // Use pre-calculated global rank
      filteredData.forEach(student => {
        student.displayRank = student.globalRank;
      });
      filteredData.sort((a, b) => a.globalRank - b.globalRank);
      
      if (pageTitleText) {
        let titleParts = [];
        if (selectedDistrict !== 'all') titleParts.push(selectedDistrict);
        if (selectedGroup !== 'all') titleParts.push(selectedGroup);
        if (titleParts.length > 0) {
          pageTitleText.textContent = `${titleParts.join(' - ')} Leaderboard`;
        } else {
          pageTitleText.textContent = `Dinajpur Board Leaderboard`;
        }
      }
    }

    updateStats();
    
    if (filteredData.length === 0) {
      showState('empty');
    } else {
      renderLeaderboard();
    }
  }

  function updateStats() {
    animateValue(statStudents, 0, filteredData.length, 1000);
    
    const currentSchools = new Set();
    const currentDistricts = new Set();
    let gpa5Count = 0;
    
    filteredData.forEach(s => {
      if (s.school) currentSchools.add(s.school.toUpperCase());
      if (s.district) currentDistricts.add(s.district.toUpperCase());
      if (parseFloat(s.gpa) === 5.0) gpa5Count++;
    });
    
    animateValue(statSchools, 0, currentSchools.size, 1000);
    animateValue(statGpa5, 0, gpa5Count, 1000);
    animateValue(statDistricts, 0, currentDistricts.size, 1000);
  }

  // Animation for stat numbers
  function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const current = Math.floor(progress * (end - start) + start);
      obj.innerHTML = current.toLocaleString();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }

  function renderLeaderboard() {
    showState('leaderboard');
    
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    leaderboardBody.innerHTML = '';
    
    pageData.forEach((student, index) => {
      const row = document.createElement('div');
      
      let rankColor = 'text-slate-600 bg-slate-100 group-hover:bg-white group-hover:shadow-sm border border-transparent';
      let mobileRankBadge = 'bg-slate-100 text-slate-700';
      if (student.displayRank === 1) {
        rankColor = 'text-amber-700 bg-amber-50 border-amber-200 shadow-sm';
        mobileRankBadge = 'bg-amber-100 text-amber-800 border border-amber-200';
      } else if (student.displayRank === 2) {
        rankColor = 'text-slate-700 bg-slate-100 border-slate-200 shadow-sm';
        mobileRankBadge = 'bg-slate-200 text-slate-800 border border-slate-300';
      } else if (student.displayRank === 3) {
        rankColor = 'text-orange-800 bg-orange-50 border-orange-200 shadow-sm';
        mobileRankBadge = 'bg-orange-100 text-orange-800 border border-orange-200';
      }
      
      const safeSchool = student.school ? student.school.toUpperCase() : 'N/A';
      const isRZS = safeSchool === 'RANGPUR ZILA SCHOOL, RANGPUR';
      const safeGpa = typeof student.gpa === 'number' ? student.gpa.toFixed(2) : student.gpa;
      
      // Mobile-friendly card format for small screens, table row for large screens
      row.className = 'group flex flex-col sm:flex-row sm:items-center bg-white border border-slate-200 sm:border-0 sm:border-b sm:border-slate-100 rounded-xl sm:rounded-none p-4 sm:p-4 cursor-pointer hover:bg-slate-50 hover:border-indigo-200 sm:hover:border-transparent transition-all shadow-sm sm:shadow-none';
      
      row.innerHTML = `
        <!-- Mobile View (visible block sm:hidden) -->
        <div class="flex sm:hidden flex-col gap-3 w-full">
          <div class="flex justify-between items-start w-full">
            <div class="flex flex-col gap-1 pr-2">
              <div class="font-bold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors break-words">${escapeHTML(student.name)}</div>
              <div class="text-xs uppercase leading-tight line-clamp-2 ${isRZS ? 'font-extrabold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 rounded shadow-sm inline-block w-max tracking-wide' : 'font-semibold text-slate-500'}">
                ${escapeHTML(safeSchool)}
              </div>
            </div>
            <div class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${mobileRankBadge}">
              #${student.displayRank}
            </div>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-100 w-full mt-1">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">GPA</span>
              <span class="font-black text-slate-800 text-sm">${safeGpa}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Marks</span>
              <span class="font-black text-indigo-700 text-sm">${student.mark}</span>
            </div>
          </div>
        </div>

        <!-- Desktop View (visible sm:flex hidden) -->
        <div class="hidden sm:flex w-full items-center w-full">
          <div class="w-16 flex justify-center shrink-0">
            <div class="flex items-center justify-center w-10 h-10 rounded-xl font-bold text-base transition-all ${rankColor}">
              ${student.displayRank}
            </div>
          </div>
          <div class="flex-1 px-4 min-w-0">
            <div class="font-bold text-slate-800 mb-0.5 text-base truncate group-hover:text-indigo-600 transition-colors">${escapeHTML(student.name)}</div>
            <div class="text-sm uppercase truncate ${isRZS ? 'font-extrabold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-0.5 rounded shadow-sm w-max inline-block tracking-wide' : 'font-semibold text-slate-500'}">
              ${escapeHTML(safeSchool)}
            </div>
          </div>
          <div class="w-20 text-right font-bold text-slate-700 text-base shrink-0">${safeGpa}</div>
          <div class="w-20 text-right font-black text-slate-900 text-base shrink-0">${student.mark}</div>
          <div class="w-8 flex justify-end shrink-0 pl-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-300 transition-all duration-200 group-hover:translate-x-1 group-hover:text-indigo-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          </div>
        </div>
      `;
      
      row.addEventListener('click', () => openModal(student));
      leaderboardBody.appendChild(row);
    });
    
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationContainer.classList.add('hidden');
      return;
    }
    
    paginationContainer.classList.remove('hidden');
    paginationContainer.classList.add('flex');
    btnPrev.disabled = currentPage === 1;
    btnNext.disabled = currentPage === totalPages;
    
    pageNumbersContainer.innerHTML = '';
    
    // Simple logic for page numbers (show max 5)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('div');
      btn.className = `w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl cursor-pointer font-bold shrink-0 transition-all ${currentPage === i ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;
      btn.textContent = i;
      btn.addEventListener('click', () => {
        currentPage = i;
        renderLeaderboard();
        scrollToTop();
      });
      pageNumbersContainer.appendChild(btn);
    }
  }

  function changePage(delta) {
    currentPage += delta;
    renderLeaderboard();
    scrollToTop();
  }

  function scrollToTop() {
    const offset = leaderboardContainer.getBoundingClientRect().top + window.scrollY - 20;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }

  function showSchoolsModal() {
    const uniqueSchools = new Set();
    filteredData.forEach(s => {
      if (s.school) uniqueSchools.add(s.school.toUpperCase());
    });
    const sortedSchools = Array.from(uniqueSchools).sort();

    modalSchoolsHeader.querySelector('h3').textContent = 'Participating Schools';
    modalSchoolsHeader.querySelector('span').textContent = 'List of Schools';
    modalSchoolsBody.innerHTML = '';
    sortedSchools.forEach(school => {
      const el = document.createElement('div');
      el.className = 'py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-semibold text-sm';
      el.textContent = school;
      modalSchoolsBody.appendChild(el);
    });

    modalStudentHeader.classList.add('hidden');
    modalStudentBody.classList.add('hidden');
    modalSchoolsHeader.classList.remove('hidden');
    modalSchoolsBody.classList.remove('hidden');

    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.add('opacity-100');
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modalContentInner.classList.remove('scale-95', 'translate-y-8');
      modalContentInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function showDistrictsModal() {
    const uniqueDistricts = new Set();
    filteredData.forEach(s => {
      if (s.district) uniqueDistricts.add(s.district.toUpperCase());
    });
    const sortedDistricts = Array.from(uniqueDistricts).sort();

    modalSchoolsHeader.querySelector('h3').textContent = 'Participating Districts';
    modalSchoolsHeader.querySelector('span').textContent = 'List of Districts';
    modalSchoolsBody.innerHTML = '';
    sortedDistricts.forEach(district => {
      const el = document.createElement('div');
      el.className = 'py-2 px-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-800 font-semibold text-sm';
      el.textContent = district;
      modalSchoolsBody.appendChild(el);
    });

    modalStudentHeader.classList.add('hidden');
    modalStudentBody.classList.add('hidden');
    modalSchoolsHeader.classList.remove('hidden');
    modalSchoolsBody.classList.remove('hidden');

    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.add('opacity-100');
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modalContentInner.classList.remove('scale-95', 'translate-y-8');
      modalContentInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  let currentSelectionType = '';

  function openSelectionModal(type) {
    currentSelectionType = type;
    let list = [];
    let title = '';
    
    if (type === 'district') {
      title = 'Select District';
      list = districtsList;
      selectionModalSearchContainer.classList.remove('hidden');
    } else if (type === 'school') {
      title = 'Select School';
      list = schoolsList;
      selectionModalSearchContainer.classList.remove('hidden');
    } else if (type === 'group') {
      title = 'Select Group';
      list = groupsList;
      selectionModalSearchContainer.classList.add('hidden');
    }
    
    selectionModalTitle.textContent = title;
    selectionModalSearch.value = '';
    renderSelectionList(list);
    
    // Search functionality inside modal
    selectionModalSearch.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = list.filter(item => item.toLowerCase().includes(q));
      renderSelectionList(filtered);
    };

    selectionModal.classList.remove('hidden');
    setTimeout(() => {
      selectionModal.classList.add('opacity-100');
      selectionModal.classList.remove('opacity-0', 'pointer-events-none');
      selectionModalInner.classList.remove('scale-95', 'translate-y-8');
      selectionModalInner.classList.add('scale-100', 'translate-y-0');
      if (type !== 'group') selectionModalSearch.focus();
    }, 10);
  }

  function renderSelectionList(list) {
    selectionModalBody.innerHTML = '';
    
    // Add "All" option
    const allBtn = document.createElement('button');
    allBtn.className = 'w-full text-left py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 font-bold text-sm hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/20';
    allBtn.textContent = `All ${currentSelectionType.charAt(0).toUpperCase() + currentSelectionType.slice(1)}s`;
    allBtn.onclick = () => selectOption('all');
    selectionModalBody.appendChild(allBtn);
    
    list.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left py-3 px-4 bg-white border border-slate-100 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20 truncate';
      btn.textContent = item;
      btn.title = item;
      btn.onclick = () => selectOption(item);
      selectionModalBody.appendChild(btn);
    });
  }

  function selectOption(value) {
    if (currentSelectionType === 'district') {
      selectedDistrict = value;
      labelDistrict.textContent = value === 'all' ? 'All Districts' : value;
      labelDistrict.title = value === 'all' ? 'All Districts' : value;
      if (value !== 'all') labelDistrict.classList.add('text-teal-700');
      else labelDistrict.classList.remove('text-teal-700');
    } else if (currentSelectionType === 'school') {
      selectedSchool = value;
      labelSchool.textContent = value === 'all' ? 'All Schools' : value;
      labelSchool.title = value === 'all' ? 'All Schools' : value;
      if (value !== 'all') labelSchool.classList.add('text-teal-700');
      else labelSchool.classList.remove('text-teal-700');
    } else if (currentSelectionType === 'group') {
      selectedGroup = value;
      labelGroup.textContent = value === 'all' ? 'All Groups' : value;
      labelGroup.title = value === 'all' ? 'All Groups' : value;
      if (value !== 'all') labelGroup.classList.add('text-teal-700');
      else labelGroup.classList.remove('text-teal-700');
    }
    
    closeSelectionModal();
    handleFilterChange();
  }

  function closeSelectionModal() {
    selectionModal.classList.remove('opacity-100');
    selectionModal.classList.add('opacity-0', 'pointer-events-none');
    selectionModalInner.classList.add('scale-95', 'translate-y-8');
    selectionModalInner.classList.remove('scale-100', 'translate-y-0');
    
    setTimeout(() => {
      selectionModal.classList.add('hidden');
    }, 300);
  }

  function openModal(student) {
    modalStudentHeader.classList.remove('hidden');
    modalStudentBody.classList.remove('hidden');
    modalSchoolsHeader.classList.add('hidden');
    modalSchoolsBody.classList.add('hidden');

    modalName.textContent = student.name;
    const schoolName = student.school ? student.school.toUpperCase() : 'N/A';
    const isRZS = schoolName === 'RANGPUR ZILA SCHOOL, RANGPUR';

    
    modalSchool.textContent = schoolName;
    if (isRZS) {
      modalSchool.className = 'font-extrabold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1 rounded shadow-sm uppercase tracking-wider text-sm inline-block break-words text-right max-w-[70%]';
    } else {
      modalSchool.className = 'text-slate-500 font-semibold uppercase tracking-wider text-sm break-words text-right max-w-[70%]';
    }
    
    modalGpa.textContent = typeof student.gpa === 'number' ? student.gpa.toFixed(2) : student.gpa;
    modalMarks.textContent = student.mark;
    
    modalStatus.textContent = student.status || 'UNKNOWN';
    if (student.status && student.status.toUpperCase() !== 'PASSED') {
      modalStatus.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-red-100 text-red-700';
    } else {
      modalStatus.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700';
    }
    
    if (student.roll) {
      modalRoll.textContent = student.roll;
      modalRollRow.classList.remove('hidden');
      modalRollRow.classList.add('flex');
    } else {
      modalRollRow.classList.add('hidden');
      modalRollRow.classList.remove('flex');
    }
    
    if (student.grades && Object.keys(student.grades).length > 0) {
      modalGrades.innerHTML = '';
      for (const [subject, grade] of Object.entries(student.grades)) {
        let gradeColor = 'text-slate-700 bg-slate-100';
        if (grade === 'A+') gradeColor = 'text-emerald-700 bg-emerald-100';
        else if (grade === 'A') gradeColor = 'text-teal-700 bg-teal-100';
        else if (grade === 'A-') gradeColor = 'text-cyan-700 bg-cyan-100';
        else if (grade === 'F') gradeColor = 'text-red-700 bg-red-100';
        
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-100';
        row.innerHTML = `
          <span class="text-xs font-semibold text-slate-600 truncate mr-2" title="${escapeHTML(subject)}">${escapeHTML(subject)}</span>
          <span class="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold shrink-0 ${gradeColor}">${grade}</span>
        `;
        modalGrades.appendChild(row);
      }
      modalGradesSection.classList.remove('hidden');
    } else {
      modalGradesSection.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    // small delay to allow display:block to apply before animating opacity/transform
    setTimeout(() => {
      modal.classList.add('opacity-100');
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modalContentInner.classList.remove('scale-95', 'translate-y-8');
      modalContentInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function closeModal() {
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modalContentInner.classList.add('scale-95', 'translate-y-8');
    modalContentInner.classList.remove('scale-100', 'translate-y-0');
    
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }

  function openTakedownModal() {
    takedownModal.classList.remove('hidden');
    setTimeout(() => {
      takedownModal.classList.add('opacity-100');
      takedownModal.classList.remove('opacity-0', 'pointer-events-none');
      takedownModalInner.classList.remove('scale-95', 'translate-y-8');
      takedownModalInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function closeTakedownModal() {
    takedownModal.classList.remove('opacity-100');
    takedownModal.classList.add('opacity-0', 'pointer-events-none');
    takedownModalInner.classList.add('scale-95', 'translate-y-8');
    takedownModalInner.classList.remove('scale-100', 'translate-y-0');
    
    setTimeout(() => {
      takedownModal.classList.add('hidden');
    }, 300);
  }

  function openNewSchoolModal() {
    newSchoolModal.classList.remove('hidden');
    setTimeout(() => {
      newSchoolModal.classList.add('opacity-100');
      newSchoolModal.classList.remove('opacity-0', 'pointer-events-none');
      newSchoolModalInner.classList.remove('scale-95', 'translate-y-8');
      newSchoolModalInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function closeNewSchoolModal() {
    newSchoolModal.classList.remove('opacity-100');
    newSchoolModal.classList.add('opacity-0', 'pointer-events-none');
    newSchoolModalInner.classList.add('scale-95', 'translate-y-8');
    newSchoolModalInner.classList.remove('scale-100', 'translate-y-0');
    
    setTimeout(() => {
      newSchoolModal.classList.add('hidden');
    }, 300);
  }

  function showState(state) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    leaderboardContainer.classList.add('hidden');
    paginationContainer.classList.add('hidden');
    paginationContainer.classList.remove('flex');
    
    switch (state) {
      case 'loading':
        loadingState.classList.remove('hidden');
        break;
      case 'error':
        errorState.classList.remove('hidden');
        break;
      case 'empty':
        emptyState.classList.remove('hidden');
        break;
      case 'leaderboard':
        leaderboardContainer.classList.remove('hidden');
        leaderboardContainer.classList.add('flex');
        break;
    }
  }

  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});