document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const btnSelectDistrict = document.getElementById('btn-select-district');
  const btnSelectUpazila = document.getElementById('btn-select-upazila');
  const btnSelectGroup = document.getElementById('btn-select-group');
  
  const labelDistrict = document.getElementById('label-district');
  const labelUpazila = document.getElementById('label-upazila');
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
  const modalTypeBadge = document.getElementById('modal-type-badge');
  const modalGenderBadge = document.getElementById('modal-gender-badge');
  
  const modalScholarshipCard = document.getElementById('modal-scholarship-card');
  const modalScholarshipBadge = document.getElementById('modal-scholarship-badge');
  const modalScholarshipDescBn = document.getElementById('modal-scholarship-desc-bn');
  const modalScholarshipDescEn = document.getElementById('modal-scholarship-desc-en');

  const modalSchool = document.getElementById('modal-school');
  const modalUpazila = document.getElementById('modal-upazila');
  const modalDistrict = document.getElementById('modal-district');
  const modalGroup = document.getElementById('modal-group');
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

  const toggleScholarshipBtn = document.getElementById('toggle-scholarship-btn');
  const toggleScholarshipSwitch = document.getElementById('toggle-scholarship-switch');
  const toggleScholarshipThumb = document.getElementById('toggle-scholarship-thumb');
  const toggleScholarshipIcon = document.getElementById('toggle-scholarship-icon');
  const thScholarship = document.getElementById('th-scholarship');

  const welcomeModal = document.getElementById('welcome-modal');
  const welcomeClose = document.getElementById('welcome-close');

  const authModal = document.getElementById('auth-modal');
  const authModalInner = document.getElementById('auth-modal-inner');
  const authModalClose = document.getElementById('auth-modal-close');
  const authLoginBtn = document.getElementById('auth-login-btn');

  const AUTH_STORAGE_KEY = 'hscstack_auth_user';

  const transcriptCache = new Map();

  let activeModalsCount = 0;

  function lockBodyScroll() {
    activeModalsCount++;
    if (activeModalsCount === 1) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('overflow-hidden');
      document.documentElement.classList.add('overflow-hidden');
    }
  }

  function unlockBodyScroll() {
    activeModalsCount = Math.max(0, activeModalsCount - 1);
    if (activeModalsCount === 0) {
      document.body.style.overflow = '';
      document.body.classList.remove('overflow-hidden');
      document.documentElement.classList.remove('overflow-hidden');
    }
  }

  function getGradeBadgeStyle(grade) {
    const g = (grade || '').trim().toUpperCase();
    if (g === 'A+') return 'bg-emerald-500 text-white font-black shadow-2xs';
    if (g === 'A') return 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300';
    if (g === 'A-') return 'bg-teal-100 text-teal-800 font-bold border border-teal-200';
    if (g === 'B') return 'bg-blue-100 text-blue-800 font-bold border border-blue-200';
    if (g === 'C') return 'bg-amber-100 text-amber-800 font-bold border border-amber-200';
    if (g === 'D') return 'bg-orange-100 text-orange-800 font-bold border border-orange-200';
    if (g === 'F') return 'bg-red-500 text-white font-black shadow-2xs';
    return 'bg-slate-100 text-slate-700 font-bold border border-slate-200';
  }

  async function loadStudentTranscript(roll) {
    if (!roll) return null;
    const prefix = roll.length >= 3 ? roll.slice(0, 3) : 'other';

    if (transcriptCache.has(prefix)) {
      const chunk = transcriptCache.get(prefix);
      return chunk ? chunk[roll] || null : null;
    }

    try {
      const res = await fetch(`data/transcripts/${prefix}.json`);
      if (!res.ok) return null;
      const chunk = await res.json();
      transcriptCache.set(prefix, chunk);
      return chunk ? chunk[roll] || null : null;
    } catch (e) {
      return null;
    }
  }

  // State
  let isLoggedIn = null;
  let currentUser = null;
  let inFlightAuthPromise = null;

  // Restore authenticated session instantly from localStorage
  try {
    const cachedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (cachedAuth) {
      const parsed = JSON.parse(cachedAuth);
      if (parsed && parsed.authenticated && parsed.user) {
        isLoggedIn = true;
        currentUser = parsed.user;
      }
    }
  } catch (e) {
    // Ignore JSON parse errors
  }

  // Render initial profile state immediately
  renderUserProfileWidget();

  let rawData = [];
  let filteredData = [];
  let currentPage = 1;
  let itemsPerPage = 25;

  let selectedDistrict = 'all';
  let selectedUpazila = 'all';
  let selectedGroup = 'all';

  let showScholarship = localStorage.getItem('show_scholarship') !== 'false';

  function updateScholarshipToggleUI() {
    if (showScholarship) {
      if (toggleScholarshipSwitch) {
        toggleScholarshipSwitch.className = 'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-indigo-600 transition-colors duration-200 ease-in-out';
      }
      if (toggleScholarshipThumb) {
        toggleScholarshipThumb.className = 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-4';
      }
      if (toggleScholarshipIcon) {
        toggleScholarshipIcon.className = 'text-amber-500 shrink-0';
      }
      if (thScholarship) {
        thScholarship.classList.remove('hidden');
      }
    } else {
      if (toggleScholarshipSwitch) {
        toggleScholarshipSwitch.className = 'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-300 transition-colors duration-200 ease-in-out';
      }
      if (toggleScholarshipThumb) {
        toggleScholarshipThumb.className = 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out translate-x-0';
      }
      if (toggleScholarshipIcon) {
        toggleScholarshipIcon.className = 'text-slate-400 shrink-0';
      }
      if (thScholarship) {
        thScholarship.classList.add('hidden');
      }
    }
  }

  let districtsList = [];
  let upazilasList = [];
  let districtUpazilasMap = {};
  let schoolsList = [];
  let groupsList = [];
  let tiersList = [];

  // Helper for Scholarship Details
  function getScholarshipInfo(student) {
    const tier = student.scholarshipTier || 'INELIGIBLE';
    const prob = student.scholarshipProb || 0;
    const isRegular = student.candidateType === 'REGULAR';
    const isPassed = student.status === 'PASSED';

    if (!isPassed) {
      return {
        prob: 0,
        tier: 'INELIGIBLE',
        label: 'Ineligible (Failed)',
        badgeStyle: 'bg-red-50 text-red-700 border-red-200',
        descBn: 'অকৃতকার্য পরীক্ষার্থী সরকারি বৃত্তির আওতাভুক্ত নয়।',
        descEn: 'Only passed candidates are eligible.'
      };
    }

    if (!isRegular) {
      return {
        prob: 0,
        tier: 'INELIGIBLE',
        label: 'Ineligible (Irregular)',
        badgeStyle: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        descBn: 'শিক্ষা মন্ত্রণালয়ের নীতিমালা অনুযায়ী অনিয়মিত প্রার্থীরা বৃত্তির আওতাভুক্ত নয়।',
        descEn: 'Irregular/Improvement candidates are excluded per Ministry policy.'
      };
    }

    if (tier === 'TALENTPOOL') {
      return {
        prob: 98,
        tier: 'TALENTPOOL',
        label: '98% Talentpool',
        badgeStyle: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold ring-1 ring-amber-300/60 shadow-2xs',
        descBn: 'দিনাজপুর শিক্ষা বোর্ডের কেন্দ্রীয় মেধাবৃত্তি (ট্যালেন্টপুল) ৫০% কোটায় পাওয়ার নিশ্চিত সম্ভাবনা।',
        descEn: 'Strong candidate for Board Central Talentpool Scholarship (50% Male : 50% Female Quota).'
      };
    }

    if (tier === 'UPAZILA_GENERAL') {
      return {
        prob: 95,
        tier: 'UPAZILA_GENERAL',
        label: '95% Upazila Quota',
        badgeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold shadow-2xs',
        descBn: 'উপজেলায় মেধা তালিকায় জেন্ডার কোটা সাপেক্ষে শীর্ষে থাকার কারণে সরাসরি সাধারণ বৃত্তির নিশ্চিত সম্ভাবনা।',
        descEn: 'Top ranked in Upazila within direct government 50% gender quota allocation.'
      };
    }

    if (tier === 'BUBBLE') {
      return {
        prob: 75,
        tier: 'BUBBLE',
        label: '75% Probable',
        badgeStyle: 'bg-teal-100 text-teal-900 border-teal-300 font-bold shadow-2xs',
        descBn: 'শীর্ষ শিক্ষার্থীরা মেধাবৃত্তিতে স্থানান্তরিত হলে উপজেলা কোটায় প্রাপ্তির জোরালো সুযোগ রয়েছে।',
        descEn: 'High likelihood of securing scholarship upon Talentpool upward shift.'
      };
    }

    if (tier === 'DISTRICT_GENERAL') {
      return {
        prob: 80,
        tier: 'DISTRICT_GENERAL',
        label: '80% District Pool',
        badgeStyle: 'bg-blue-100 text-blue-900 border-blue-300 font-bold shadow-2xs',
        descBn: 'জেলার কেন্দ্রীয় মেধা কোটায় ৫০% জেন্ডার সাপেক্ষে সাধারণ বৃত্তির জোরালো সম্ভাবনা।',
        descEn: 'Qualifies within District central merit 50% quota pool.'
      };
    }

    if (tier === 'COMPETITIVE') {
      return {
        prob: 55,
        tier: 'COMPETITIVE',
        label: '55% Competitive',
        badgeStyle: 'bg-sky-100 text-sky-900 border-sky-200 font-semibold',
        descBn: 'জেলা মেধা তালিকায় অপেক্ষমান অবস্থানে রয়েছে (সম্ভাবনা প্রতিযোগিতামূলক)।',
        descEn: 'In competitive standing within district merit pool.'
      };
    }

    if (tier === 'LOW') {
      return {
        prob: 35,
        tier: 'LOW',
        label: '35% Low Chance',
        badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
        descBn: 'উচ্চ জিপিএ প্রাপ্ত তবে বর্তমান কোটা কাট-অফ থেকে কিছুটা দূরে।',
        descEn: 'Good GPA but outside primary quota rank cut-offs.'
      };
    }

    return {
      prob: 0,
      tier: 'INELIGIBLE',
      label: 'Low / Ineligible',
      badgeStyle: 'bg-slate-50 text-slate-400 border-slate-200',
      descBn: 'মেধা তালিকায় কোটার কাট-অফ সীমার বাইরে রয়েছে।',
      descEn: 'Below cutoff for government scholarship quotas.'
    };
  }

  // Initialization
  init();

  async function init() {
    try {
      showState('loading');

      // Check auth and fetch leaderboard data in parallel
      const [, response] = await Promise.all([
        checkUserAuth(),
        fetch('data/leaderboard.json')
      ]);

      if (!response.ok) throw new Error('Failed to fetch leaderboard index');
      const indexData = await response.json();
      
      districtsList = indexData.districts || [];
      upazilasList = indexData.upazilas || [];
      districtUpazilasMap = indexData.district_upazilas || {};
      schoolsList = indexData.schools || [];
      groupsList = indexData.groups || [];
      tiersList = indexData.tiers || [];

      // Unpack compact rows:
      // [id, name, school_idx, upz_idx, dist_idx, grp_idx, gpa, mark, globalRank, is_passed, roll, scholarship_prob, tier_idx, gender_code, is_regular, has_transcript]
      rawData = (indexData.students || []).map(row => {
        const schoolName = row[2] >= 0 ? schoolsList[row[2]] : '';
        const upazilaName = row[3] >= 0 ? upazilasList[row[3]] : '';
        const districtName = row[4] >= 0 ? districtsList[row[4]] : '';
        const groupName = row[5] >= 0 ? groupsList[row[5]] : 'SCIENCE';
        const tierName = row[12] >= 0 ? tiersList[row[12]] : 'INELIGIBLE';

        return {
          id: row[0],
          name: row[1],
          school: schoolName,
          upazila: upazilaName,
          district: districtName,
          group: groupName,
          gpa: row[6],
          mark: row[7],
          globalRank: row[8],
          status: row[9] === 1 ? 'PASSED' : 'FAILED',
          roll: row[10] || '',
          scholarshipProb: row[11] || 0,
          scholarshipTier: tierName,
          gender: row[13] === 2 ? 'FEMALE' : 'MALE',
          candidateType: row[14] === 1 ? 'REGULAR' : 'IRREGULAR',
          hasTranscript: row[15] === 1
        };
      });

      updateScholarshipToggleUI();
      applyFilters();
      
      // Event Listeners
      if (toggleScholarshipBtn) {
        toggleScholarshipBtn.addEventListener('click', () => {
          showScholarship = !showScholarship;
          localStorage.setItem('show_scholarship', showScholarship);
          updateScholarshipToggleUI();
          renderLeaderboard();
        });
      }

      searchInput.addEventListener('click', handleSearchFocusOrClick);
      searchInput.addEventListener('focus', handleSearchFocusOrClick);
      searchInput.addEventListener('input', handleSearchInput);
      
      btnSelectDistrict.addEventListener('click', () => {
        if (isLoggedIn === false) return openAuthModal();
        openSelectionModal('district');
      });
      
      btnSelectUpazila.addEventListener('click', () => {
        if (isLoggedIn === false) return openAuthModal();
        openSelectionModal('upazila');
      });
      
      btnSelectGroup.addEventListener('click', () => openSelectionModal('group'));

      if (authModalClose) {
        authModalClose.addEventListener('click', closeAuthModal);
      }
      if (authModal) {
        authModal.addEventListener('click', (e) => {
          if (e.target === authModal) closeAuthModal();
        });
      }
      if (authLoginBtn) {
        authLoginBtn.addEventListener('click', () => {
          window.location.href = 'https://hscstack.site/login?redirect=' + encodeURIComponent(window.location.href);
        });
      }

      selectionModalClose.addEventListener('click', closeSelectionModal);
      selectionModal.addEventListener('click', (e) => {
        if (e.target === selectionModal) closeSelectionModal();
      });
      pageSizeSelect.addEventListener('change', handlePageSizeChange);
      btnPrev.addEventListener('click', () => changePage(-1));
      btnNext.addEventListener('click', () => changePage(1));
      
      if (statSchoolsContainer) statSchoolsContainer.addEventListener('click', showSchoolsModal);
      if (statDistrictsContainer) statDistrictsContainer.addEventListener('click', showDistrictsModal);

      // Modal Close
      modalClose.addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (!modal.classList.contains('hidden')) closeModal();
          if (takedownModal && !takedownModal.classList.contains('hidden')) closeTakedownModal();
          if (selectionModal && !selectionModal.classList.contains('hidden')) closeSelectionModal();
          if (welcomeModal && !welcomeModal.classList.contains('hidden')) closeWelcomeModal();
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

      // Welcome Modal
      if (!sessionStorage.getItem('welcome_seen')) {
        openWelcomeModal();
      }
      if (welcomeClose) {
        welcomeClose.addEventListener('click', closeWelcomeModal);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
      showState('error');
    }
  }

  async function checkUserAuth() {
    if (isLoggedIn === true) return true;
    if (inFlightAuthPromise) return inFlightAuthPromise;

    inFlightAuthPromise = (async () => {
      let serverErrorOrTimeout = false;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const res = await fetch('https://hscstack.site/api/auth/status', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            isLoggedIn = true;
            currentUser = data.user || { name: 'User' };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ authenticated: true, user: currentUser }));
          } else {
            isLoggedIn = false;
            currentUser = null;
          }
        } else {
          serverErrorOrTimeout = true;
        }
      } catch (e) {
        serverErrorOrTimeout = true;
      } finally {
        inFlightAuthPromise = null;
        renderUserProfileWidget();
      }

      if (serverErrorOrTimeout) return true;
      return Boolean(isLoggedIn);
    })();

    return inFlightAuthPromise;
  }

  function renderUserProfileWidget() {
    const container = document.getElementById('user-profile-widget');
    if (!container) return;

    if (!isLoggedIn || !currentUser) {
      container.innerHTML = `
        <button
          type="button"
          id="top-profile-login-btn"
          class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800 hover:shadow-md active:scale-95"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <span>Login</span>
        </button>
      `;
      const btn = document.getElementById('top-profile-login-btn');
      if (btn) {
        btn.addEventListener('click', () => openAuthModal());
      }
      return;
    }

    const name = currentUser.name || 'User';
    const email = currentUser.email || '';
    const rawImage = currentUser.image_url || currentUser.avatar || '';
    let imageUrl = '';
    if (rawImage) {
      imageUrl = rawImage.startsWith('http') ? rawImage : `https://hscstack.site${rawImage}`;
    }
    const profileUrl = currentUser.username
      ? `https://hscstack.site/u/${encodeURIComponent(currentUser.username)}`
      : 'https://hscstack.site/profile';
    const initial = name.trim().charAt(0).toUpperCase() || 'U';

    const avatarHtml = imageUrl
      ? `<img src="${imageUrl}" alt="${name}" class="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200" onerror="this.outerHTML='<span class=\\'flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white\\'>${initial}</span>'" />`
      : `<span class="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-black text-white">${initial}</span>`;

    container.innerHTML = `
      <div class="relative" id="profile-widget-root">
        <button
          type="button"
          id="profile-card-toggle"
          class="flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white py-1 pr-3 pl-1 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-98"
        >
          ${avatarHtml}
          <span class="max-w-[130px] truncate text-xs font-bold text-slate-800 hidden sm:inline-block">
            ${name}
          </span>
          <svg class="h-3.5 w-3.5 text-slate-400 transition-transform duration-200" id="profile-card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        <div
          id="profile-dropdown-menu"
          class="hidden absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl text-left z-50 transition-all duration-150"
        >
          <div class="border-b border-slate-100 p-2.5">
            <p class="truncate text-xs font-bold text-slate-900">${name}</p>
            <p class="truncate text-[11px] font-medium text-slate-400">${email}</p>
          </div>
          <div class="py-1">
            <a
              href="${profileUrl}"
              target="_blank"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <svg class="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile</span>
            </a>
          </div>
        </div>
      </div>
    `;

    const toggle = document.getElementById('profile-card-toggle');
    const menu = document.getElementById('profile-dropdown-menu');
    const chevron = document.getElementById('profile-card-chevron');

    if (toggle && menu) {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !menu.classList.contains('hidden');
        if (isOpen) {
          menu.classList.add('hidden');
          if (chevron) chevron.classList.remove('rotate-180');
        } else {
          menu.classList.remove('hidden');
          if (chevron) chevron.classList.add('rotate-180');
        }
      });

      document.addEventListener('click', (e) => {
        const root = document.getElementById('profile-widget-root');
        if (root && !root.contains(e.target)) {
          menu.classList.add('hidden');
          if (chevron) chevron.classList.remove('rotate-180');
        }
      });
    }
  }

  function openAuthModal() {
    if (!authModal) return;
    lockBodyScroll();
    authModal.classList.remove('hidden');
    setTimeout(() => {
      authModal.classList.add('opacity-100');
      authModal.classList.remove('opacity-0', 'pointer-events-none');
      authModalInner.classList.remove('scale-95', 'translate-y-8');
      authModalInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function closeAuthModal() {
    if (!authModal) return;
    unlockBodyScroll();
    authModal.classList.remove('opacity-100');
    authModal.classList.add('opacity-0', 'pointer-events-none');
    authModalInner.classList.add('scale-95', 'translate-y-8');
    authModalInner.classList.remove('scale-100', 'translate-y-0');
    setTimeout(() => {
      authModal.classList.add('hidden');
    }, 300);
  }

  function handleSearchFocusOrClick() {
    if (isLoggedIn === false) {
      searchInput.blur();
      openAuthModal();
    }
  }

  function handleSearchInput() {
    if (isLoggedIn === false) {
      searchInput.value = '';
      searchInput.blur();
      openAuthModal();
      return;
    }
    handleFilterChange();
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
    const rawSearch = searchInput.value.trim();
    const searchTerm = rawSearch.toLowerCase();
    const isRollSearch = /^\d{6,}$/.test(rawSearch);

    let contextData = rawData.filter(student => {
      const matchDistrict = selectedDistrict === 'all' ||
                           (student.district && student.district.toUpperCase() === selectedDistrict);
      const matchUpazila = selectedUpazila === 'all' ||
                          (student.upazila && student.upazila.toUpperCase() === selectedUpazila);
      const matchGroup = selectedGroup === 'all' ||
                        (student.group && student.group.toUpperCase() === selectedGroup);
      return matchDistrict && matchUpazila && matchGroup;
    });

    const hasContextFilter = selectedDistrict !== 'all' || selectedUpazila !== 'all' || selectedGroup !== 'all';

    if (hasContextFilter) {
      contextData.sort((a, b) => {
        if (b.gpa !== a.gpa) return b.gpa - a.gpa;
        if (b.mark !== a.mark) return b.mark - a.mark;
        return (parseInt(a.roll) || 0) - (parseInt(b.roll) || 0);
      });

      let currentRank = 1;
      for (let i = 0; i < contextData.length; i++) {
        const student = contextData[i];
        if (i > 0) {
          const prev = contextData[i - 1];
          if (student.gpa !== prev.gpa || student.mark !== prev.mark) {
            currentRank = i + 1;
          }
        }
        student.displayRank = currentRank;
      }
    } else {
      contextData.forEach(student => {
        student.displayRank = student.globalRank;
      });
      contextData.sort((a, b) => a.globalRank - b.globalRank);
    }

    // Apply text / roll search
    if (isRollSearch) {
      filteredData = contextData.filter(student => student.roll === rawSearch);
    } else if (searchTerm) {
      filteredData = contextData.filter(student => {
        return (student.name && student.name.toLowerCase().includes(searchTerm)) ||
               (student.school && student.school.toLowerCase().includes(searchTerm)) ||
               (student.upazila && student.upazila.toLowerCase().includes(searchTerm)) ||
               (student.roll && student.roll.includes(searchTerm));
      });
    } else {
      filteredData = contextData;
    }

    if (pageTitleText) {
      let titleParts = [];
      if (selectedUpazila !== 'all') {
        titleParts.push(selectedUpazila);
      } else if (selectedDistrict !== 'all') {
        titleParts.push(selectedDistrict);
      }
      if (selectedGroup !== 'all') {
        titleParts.push(selectedGroup);
      }
      
      if (titleParts.length > 0) {
        pageTitleText.textContent = `${titleParts.join(' - ')} Leaderboard`;
      } else {
        pageTitleText.textContent = `Dinajpur Board Leaderboard`;
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

  function animateValue(obj, start, end, duration) {
    if (!obj) return;
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
    
    pageData.forEach((student) => {
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
      const safeUpazila = student.upazila ? student.upazila.toUpperCase() : '';
      const safeGpa = typeof student.gpa === 'number' ? student.gpa.toFixed(2) : student.gpa;
      const schInfo = getScholarshipInfo(student);

      row.className = 'group flex flex-col sm:flex-row sm:items-center bg-white border border-slate-200 sm:border-0 sm:border-b sm:border-slate-100 rounded-2xl sm:rounded-none p-4 cursor-pointer hover:bg-slate-50/80 hover:border-indigo-200 sm:hover:border-transparent transition-all shadow-xs sm:shadow-none';
      
      row.innerHTML = `
        <!-- Mobile View -->
        <div class="flex sm:hidden flex-col gap-2.5 w-full">
          <div class="flex justify-between items-start w-full gap-2">
            <div class="flex flex-col gap-1 min-w-0 flex-1">
              <div class="font-bold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors break-words">
                ${escapeHTML(student.name)}
              </div>
              <div class="text-xs text-slate-500 font-semibold uppercase leading-tight line-clamp-1">
                ${escapeHTML(safeSchool)}
              </div>
              <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
                ${safeUpazila ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">${escapeHTML(safeUpazila)}</span>` : ''}
                ${showScholarship ? `
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${schInfo.badgeStyle}">
                  ${schInfo.label}
                </span>` : ''}
              </div>
            </div>
            <div class="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl font-black text-sm ${mobileRankBadge}">
              #${student.displayRank}
            </div>
          </div>
          <div class="flex justify-between items-center pt-2 border-t border-slate-100 w-full">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">GPA</span>
              <span class="font-black text-slate-800 text-sm">${safeGpa}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Marks</span>
              <span class="font-black text-indigo-700 text-sm">${student.mark > 0 ? student.mark : '-'}</span>
            </div>
          </div>
        </div>

        <!-- Desktop View -->
        <div class="hidden sm:flex w-full items-center">
          <div class="w-16 flex justify-center shrink-0">
            <div class="flex items-center justify-center w-10 h-10 rounded-xl font-black text-base transition-all ${rankColor}">
              ${student.displayRank}
            </div>
          </div>
          <div class="flex-1 px-4 min-w-0">
            <div class="font-bold text-slate-800 mb-0.5 text-base truncate group-hover:text-indigo-600 transition-colors">
              ${escapeHTML(student.name)}
            </div>
            <div class="text-xs uppercase text-slate-500 font-semibold truncate flex items-center gap-2">
              <span>${escapeHTML(safeSchool)}</span>
              ${safeUpazila ? `<span class="text-slate-300">•</span><span class="text-slate-600 font-bold">${escapeHTML(safeUpazila)}</span>` : ''}
            </div>
          </div>
          ${showScholarship ? `
          <div class="w-40 flex justify-center shrink-0 px-1">
            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full border text-center truncate ${schInfo.badgeStyle}">
              ${schInfo.label}
            </span>
          </div>` : ''}
          <div class="w-16 text-right font-black text-slate-700 text-base shrink-0">${safeGpa}</div>
          <div class="w-16 text-right font-black text-slate-900 text-base shrink-0">${student.mark > 0 ? student.mark : '-'}</div>
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

    const titleEl = document.getElementById('modal-schools-header-title');
    const badgeEl = document.getElementById('modal-schools-header-badge');
    if (titleEl) titleEl.textContent = 'Participating Schools';
    if (badgeEl) badgeEl.textContent = `${sortedSchools.length.toLocaleString()} Schools`;
    
    modalSchoolsBody.innerHTML = '';
    sortedSchools.forEach(sch => {
      const el = document.createElement('div');
      el.className = 'py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 font-bold text-xs flex justify-between items-center';
      el.innerHTML = `<span class="truncate pr-2">${escapeHTML(sch)}</span>`;
      modalSchoolsBody.appendChild(el);
    });

    modalStudentHeader.classList.add('hidden');
    modalStudentBody.classList.add('hidden');
    modalSchoolsHeader.classList.remove('hidden');
    modalSchoolsBody.classList.remove('hidden');

    lockBodyScroll();
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

    const titleEl = document.getElementById('modal-schools-header-title');
    const badgeEl = document.getElementById('modal-schools-header-badge');
    if (titleEl) titleEl.textContent = 'Participating Districts';
    if (badgeEl) badgeEl.textContent = 'List of Districts';
    
    modalSchoolsBody.innerHTML = '';
    sortedDistricts.forEach(district => {
      const el = document.createElement('div');
      el.className = 'py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 font-bold text-sm flex justify-between items-center';
      el.innerHTML = `<span>${district}</span><span class="text-xs text-teal-600 font-semibold">Select District</span>`;
      el.onclick = () => {
        closeModal();
        selectedDistrict = district;
        labelDistrict.textContent = district;
        labelDistrict.classList.add('text-teal-700');
        // Reset upazila if not in district
        selectedUpazila = 'all';
        labelUpazila.textContent = 'All Upazilas';
        labelUpazila.classList.remove('text-teal-700');
        handleFilterChange();
      };
      modalSchoolsBody.appendChild(el);
    });

    modalStudentHeader.classList.add('hidden');
    modalStudentBody.classList.add('hidden');
    modalSchoolsHeader.classList.remove('hidden');
    modalSchoolsBody.classList.remove('hidden');

    lockBodyScroll();
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
    } else if (type === 'upazila') {
      title = selectedDistrict !== 'all' ? `Select Upazila (${selectedDistrict})` : 'Select Upazila';
      if (selectedDistrict !== 'all' && districtUpazilasMap[selectedDistrict]) {
        list = districtUpazilasMap[selectedDistrict];
      } else {
        list = upazilasList;
      }
      selectionModalSearchContainer.classList.remove('hidden');
    } else if (type === 'group') {
      title = 'Select Group';
      list = groupsList;
      selectionModalSearchContainer.classList.add('hidden');
    }
    
    selectionModalTitle.textContent = title;
    selectionModalSearch.value = '';
    renderSelectionList(list);
    
    selectionModalSearch.oninput = (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = list.filter(item => item.toLowerCase().includes(q));
      renderSelectionList(filtered);
    };

    lockBodyScroll();
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
    
    const allBtn = document.createElement('button');
    allBtn.className = 'w-full text-left py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-800 font-bold text-sm hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/20';
    allBtn.textContent = `All ${currentSelectionType.charAt(0).toUpperCase() + currentSelectionType.slice(1)}s`;
    allBtn.onclick = () => selectOption('all');
    selectionModalBody.appendChild(allBtn);
    
    list.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left py-3 px-4 bg-white border border-slate-100 rounded-xl text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
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

      // Reset upazila filter if the current upazila does not belong to newly selected district
      if (selectedDistrict !== 'all' && selectedUpazila !== 'all') {
        const allowedUpzs = districtUpazilasMap[selectedDistrict] || [];
        if (!allowedUpzs.includes(selectedUpazila)) {
          selectedUpazila = 'all';
          labelUpazila.textContent = 'All Upazilas';
          labelUpazila.classList.remove('text-teal-700');
        }
      }
    } else if (currentSelectionType === 'upazila') {
      selectedUpazila = value;
      labelUpazila.textContent = value === 'all' ? 'All Upazilas' : value;
      labelUpazila.title = value === 'all' ? 'All Upazilas' : value;
      if (value !== 'all') labelUpazila.classList.add('text-teal-700');
      else labelUpazila.classList.remove('text-teal-700');
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
    unlockBodyScroll();
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
    
    modalSchool.textContent = schoolName;
    if (modalUpazila) modalUpazila.textContent = student.upazila || '-';
    if (modalDistrict) modalDistrict.textContent = student.district || '-';
    if (modalGroup) modalGroup.textContent = student.group || 'SCIENCE';

    if (modalTypeBadge) {
      modalTypeBadge.textContent = student.candidateType || 'REGULAR';
      if (student.candidateType === 'IRREGULAR') {
        modalTypeBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200';
      } else {
        modalTypeBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200';
      }
    }

    if (modalGenderBadge) {
      modalGenderBadge.textContent = student.gender || 'MALE';
      if (student.gender === 'FEMALE') {
        modalGenderBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-pink-50 text-pink-700 border border-pink-200';
      } else {
        modalGenderBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200';
      }
    }
    
    modalGpa.textContent = typeof student.gpa === 'number' ? student.gpa.toFixed(2) : student.gpa;
    modalMarks.textContent = student.mark > 0 ? student.mark : '-';
    
    modalStatus.textContent = student.status || 'UNKNOWN';
    if (student.status && student.status.toUpperCase() !== 'PASSED') {
      modalStatus.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-red-100 text-red-700';
    } else {
      modalStatus.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700';
    }

    // Scholarship Evaluation in Modal
    if (modalScholarshipCard) {
      if (showScholarship) {
        modalScholarshipCard.classList.remove('hidden');
        const schInfo = getScholarshipInfo(student);
        if (modalScholarshipBadge) {
          modalScholarshipBadge.textContent = schInfo.label;
          modalScholarshipBadge.className = `px-3 py-1 rounded-full text-xs font-black shadow-2xs border ${schInfo.badgeStyle}`;
        }
        if (modalScholarshipDescBn) modalScholarshipDescBn.textContent = schInfo.descBn;
        if (modalScholarshipDescEn) modalScholarshipDescEn.textContent = schInfo.descEn;
      } else {
        modalScholarshipCard.classList.add('hidden');
      }
    }
    
    if (student.roll) {
      modalRoll.textContent = student.roll;
      modalRollRow.classList.remove('hidden');
      modalRollRow.classList.add('flex');
    } else {
      modalRollRow.classList.add('hidden');
      modalRollRow.classList.remove('flex');
    }

    // Subject Grades / Transcript Section
    if (modalGradesSection) {
      if (student.hasTranscript && student.roll) {
        modalGradesSection.classList.remove('hidden');
        modalGrades.innerHTML = `
          <div class="py-4 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
            <span class="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <span>Loading subject marks & grades...</span>
          </div>
        `;
        
        loadStudentTranscript(student.roll).then(grades => {
          if (!grades || grades.length === 0) {
            modalGrades.innerHTML = `<p class="text-xs text-slate-400 italic py-2">Subject marks not available.</p>`;
            return;
          }
          
          modalGrades.innerHTML = grades.map(sub => {
            const name = sub.subject_name || sub.subject || 'Subject';
            const grade = sub.grade || '-';
            const code = sub.sub_code ? `<span class="text-[10px] text-slate-400 font-mono">(${sub.sub_code})</span> ` : '';
            return `
              <div class="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/70 transition-colors">
                <span class="text-xs font-bold text-slate-700 uppercase truncate mr-2">${code}${escapeHTML(name)}</span>
                <span class="text-xs px-2.5 py-0.5 rounded-lg shrink-0 ${getGradeBadgeStyle(grade)}">${escapeHTML(grade)}</span>
              </div>
            `;
          }).join('');
        });
      } else {
        modalGradesSection.classList.add('hidden');
      }
    }

    lockBodyScroll();
    modal.classList.remove('hidden');
    setTimeout(() => {
      modal.classList.add('opacity-100');
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modalContentInner.classList.remove('scale-95', 'translate-y-8');
      modalContentInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function closeModal() {
    unlockBodyScroll();
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0', 'pointer-events-none');
    modalContentInner.classList.add('scale-95', 'translate-y-8');
    modalContentInner.classList.remove('scale-100', 'translate-y-0');
    
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }

  function openTakedownModal() {
    lockBodyScroll();
    takedownModal.classList.remove('hidden');
    setTimeout(() => {
      takedownModal.classList.add('opacity-100');
      takedownModal.classList.remove('opacity-0', 'pointer-events-none');
      takedownModalInner.classList.remove('scale-95', 'translate-y-8');
      takedownModalInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function closeTakedownModal() {
    unlockBodyScroll();
    takedownModal.classList.remove('opacity-100');
    takedownModal.classList.add('opacity-0', 'pointer-events-none');
    takedownModalInner.classList.add('scale-95', 'translate-y-8');
    takedownModalInner.classList.remove('scale-100', 'translate-y-0');
    
    setTimeout(() => {
      takedownModal.classList.add('hidden');
    }, 300);
  }

  function openWelcomeModal() {
    lockBodyScroll();
    welcomeModal.classList.remove('hidden');
    setTimeout(() => {
      welcomeModal.classList.add('opacity-100');
      welcomeModal.classList.remove('opacity-0', 'pointer-events-none');
      welcomeModalInner.classList.remove('scale-95', 'translate-y-8');
      welcomeModalInner.classList.add('scale-100', 'translate-y-0');
    }, 10);
  }

  function closeWelcomeModal() {
    unlockBodyScroll();
    welcomeModal.classList.remove('opacity-100');
    welcomeModal.classList.add('opacity-0', 'pointer-events-none');
    welcomeModalInner.classList.add('scale-95', 'translate-y-8');
    welcomeModalInner.classList.remove('scale-100', 'translate-y-0');
    sessionStorage.setItem('welcome_seen', 'true');
    
    setTimeout(() => {
      welcomeModal.classList.add('hidden');
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
