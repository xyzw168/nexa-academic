window.state = { 
    tasks: [], courses: [], habits: [], flashcards: [], expenses: [], 
    pomoCount: 0, pomoMinutes: 0, currentTaskFilterPriority: 'ALL', 
    xpPoints: 0, coursePomoMap: {}, budgetPlan: { balance: 1500000, days: 20, savings: 200000 }
};
const escapeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

const getTodayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
let calendarSelectedDate = getTodayLocal();
let calendarVisibleMonth = new Date(`${calendarSelectedDate}T12:00:00`);
let expenseSelectedDate = getTodayLocal();

function applyTheme(theme, persist = true) {
    const selected = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = selected;
    const themeColor = document.getElementById('themeColorMeta');
    if (themeColor) themeColor.content = selected === 'dark' ? '#151a17' : '#f4f2eb';
    document.querySelectorAll('[data-theme-icon]').forEach(icon => {
        icon.classList.toggle('fa-sun', selected === 'light');
        icon.classList.toggle('fa-moon', selected === 'dark');
    });
    document.querySelectorAll('[data-theme-label]').forEach(label => {
        label.textContent = selected === 'light' ? 'Mode gelap' : 'Mode terang';
    });
    const toggle = document.getElementById('themeToggleMobile');
    if (toggle) {
        toggle.setAttribute('aria-label', selected === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang');
        toggle.title = selected === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang';
        toggle.setAttribute('aria-pressed', String(selected === 'dark'));
    }
    const sidebarToggle = document.getElementById('themeToggleSidebar');
    if (sidebarToggle) {
        sidebarToggle.setAttribute('aria-label', selected === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang');
        sidebarToggle.setAttribute('aria-pressed', String(selected === 'dark'));
    }
    const desktopToggle = document.getElementById('themeToggleDesktop');
    if (desktopToggle) {
        desktopToggle.setAttribute('aria-label', selected === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang');
        desktopToggle.setAttribute('aria-pressed', String(selected === 'dark'));
    }
    if (persist) {
        try { localStorage.setItem('nexa_theme', selected); } catch (error) { console.warn('Preferensi tema tidak dapat disimpan.', error); }
    }
}

function toggleTheme() {
    const changeTheme = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    if (typeof document.startViewTransition === 'function') document.startViewTransition(changeTheme);
    else {
        document.documentElement.classList.add('theme-animating');
        changeTheme();
        setTimeout(() => document.documentElement.classList.remove('theme-animating'), 440);
    }
}

applyTheme(document.documentElement.dataset.theme || 'light', false);

function addXp(points) {
    window.state.xpPoints = Math.max(0, Number(window.state.xpPoints) || 0) + points;
    updateAnalytics();
}

function toggleMobileDrawer(forceOpen) {
    if (window.innerWidth >= 768) return;
    const drawer = document.getElementById('sidebarDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer || !overlay) return;
    const shouldOpen = typeof forceOpen === 'boolean'
        ? forceOpen
        : drawer.classList.contains('-translate-x-full');
    drawer.classList.toggle('-translate-x-full', !shouldOpen);
    overlay.classList.toggle('hidden', !shouldOpen);
    document.body.classList.toggle('overflow-hidden', shouldOpen);
}

function handleMobileAvatarClick() {
    if (window.auth?.currentUser) toggleMobileDrawer(true);
    else openAuthModal();
}

function handleGlobalSearch(query) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if (!dropdown) return;
    const q = query.trim().toLowerCase();
    if (!q) { dropdown.classList.add('hidden'); dropdown.innerHTML = ''; return; }
    const results = [
        ...(window.state.tasks || []).filter(item => item.title?.toLowerCase().includes(q)).map(item => ({ label: item.title, tab: 'tasks' })),
        ...(window.state.courses || []).filter(item => item.name?.toLowerCase().includes(q)).map(item => ({ label: item.name, tab: 'courses' })),
        ...(window.state.flashcards || []).filter(item => item.question?.toLowerCase().includes(q)).map(item => ({ label: item.question, tab: 'flashcards' }))
    ].slice(0, 8);
    dropdown.innerHTML = results.length
        ? results.map(item => `<button type="button" class="block w-full text-left p-2 rounded-lg hover:bg-white/10" onclick="switchTab('${item.tab}'); document.getElementById('searchResultsDropdown').classList.add('hidden')">${escapeHTML(item.label)}</button>`).join('')
        : '<div class="p-2 text-slate-400">Tidak ada hasil.</div>';
    dropdown.classList.remove('hidden');
}

window.onload = function() { 
    if (typeof window.renderAll === 'function') window.renderAll(); 
    calculateBudget(); 
    updateDashboardDate(); 
    registerNexaServiceWorker();
    initSpotifyEmbed();
    initializeGuidePrompt();
    const alarmToggle = document.getElementById('pomoAlarmEnabled');
    try { if (alarmToggle) alarmToggle.checked = localStorage.getItem('nexa_pomo_alarm') !== 'off'; } catch {}
};

const quickGuideSteps = [
    { tab: 'dashboard', icon: 'fa-house', title: 'Mulai dari Home', body: 'Home merangkum tugas, kebiasaan, sesi fokus, kalender akademik, dan pintasan menuju semua ruang belajar.' },
    { tab: 'tasks', icon: 'fa-list-check', title: 'Susun tugasmu', body: 'Catat tenggat, mata kuliah, dan prioritas. Pindahkan tugas sampai selesai agar progresmu ikut tercatat.' },
    { tab: 'courses', icon: 'fa-calendar-days', title: 'Atur jadwal kelas', body: 'Tambahkan mata kuliah beserta hari, jam, dan ruang. Jadwal berulang akan muncul di kalender Home.' },
    { tab: 'pomodoro', icon: 'fa-stopwatch', title: 'Belajar dengan fokus', body: 'Pilih target tugas, mulai Pomodoro, dan gunakan suara latar atau pemutar Spotify bila membantu.' },
    { tab: 'flashcards', icon: 'fa-layer-group', title: 'Ulangi materi berkala', body: 'Kelompokkan kartu dalam deck, pilih materi yang jatuh tempo, lalu nilai apakah kamu sulit, ragu, atau sudah ingat.' },
    { tab: 'budget', icon: 'fa-wallet', title: 'Jaga ritme harian', body: 'Catat pengeluaran per tanggal, cek batas aman harian, dan ekspor rekap kapan saja.' },
];
let quickGuideIndex = 0;
function initializeGuidePrompt() {
    const prompt = document.getElementById('guidePrompt');
    if (!prompt) return;
    try { prompt.classList.toggle('hidden', localStorage.getItem('nexa_guide_done') === 'yes' || sessionStorage.getItem('nexa_guide_dismissed') === 'yes'); } catch { prompt.classList.remove('hidden'); }
}
function dismissGuideOffer() {
    try { sessionStorage.setItem('nexa_guide_dismissed', 'yes'); } catch {}
    document.getElementById('guidePrompt')?.classList.add('hidden');
}
function startQuickGuide() {
    toggleMobileDrawer(false);
    quickGuideIndex = 0;
    document.getElementById('guidePrompt')?.classList.add('hidden');
    showQuickGuideStep();
}
function showQuickGuideStep() {
    const step = quickGuideSteps[quickGuideIndex];
    if (!step) return finishQuickGuide();
    switchTab(step.tab);
    const isLast = quickGuideIndex === quickGuideSteps.length - 1;
    const progress = ((quickGuideIndex + 1) / quickGuideSteps.length) * 100;
    openSheet(`
        <div class="guide-sheet-icon"><i class="fa-solid ${step.icon}"></i></div>
        <p class="guide-step-caption">PANDUAN NEXA · ${quickGuideIndex + 1} DARI ${quickGuideSteps.length}</p>
        <h2>${step.title}</h2><p class="guide-step-body">${step.body}</p>
        <div class="guide-step-progress"><span style="width:${progress}%"></span></div>
        <div class="guide-step-actions">
            <button type="button" onclick="finishQuickGuide()" class="btn">Lewati</button>
            ${quickGuideIndex ? '<button type="button" onclick="previousQuickGuideStep()" class="btn">Kembali</button>' : ''}
            <button type="button" onclick="nextQuickGuideStep()" class="btn pri">${isLast ? 'Selesai' : 'Lanjut'} <i class="fa-solid ${isLast ? 'fa-check' : 'fa-arrow-right'}"></i></button>
        </div>
    `);
}
function nextQuickGuideStep() { if (quickGuideIndex < quickGuideSteps.length - 1) { quickGuideIndex++; showQuickGuideStep(); } else finishQuickGuide(); }
function previousQuickGuideStep() { if (quickGuideIndex > 0) { quickGuideIndex--; showQuickGuideStep(); } }
function finishQuickGuide() {
    try { localStorage.setItem('nexa_guide_done', 'yes'); } catch {}
    closeSheet();
    showToast('Panduan selesai. Selamat menjelajah Nexa!');
}

let pendingInstallPrompt = null;
function setInstallButtonsVisible(visible) {
    ['installAppButton', 'installAppButtonSidebar'].forEach(id => document.getElementById(id)?.classList.toggle('hidden', !visible));
}
window.addEventListener?.('beforeinstallprompt', event => {
    event.preventDefault();
    pendingInstallPrompt = event;
    setInstallButtonsVisible(true);
});
window.addEventListener?.('appinstalled', () => {
    pendingInstallPrompt = null;
    setInstallButtonsVisible(false);
    showToast('Nexa berhasil dipasang.');
});
if (/iPad|iPhone|iPod/.test(navigator.userAgent || '') && !navigator.standalone) setInstallButtonsVisible(true);
async function installNexaApp() {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent || '') && !navigator.standalone) return showToast('Di Safari, buka Bagikan lalu pilih Tambahkan ke Layar Utama.');
    if (!pendingInstallPrompt) return showToast('Untuk memasang Nexa, buka versi web melalui HTTPS atau localhost di Chrome.');
    pendingInstallPrompt.prompt();
    await pendingInstallPrompt.userChoice;
    pendingInstallPrompt = null;
    setInstallButtonsVisible(false);
}
function registerNexaServiceWorker() {
    if (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        navigator.serviceWorker?.register('./sw.js').catch(error => console.warn('Service worker Nexa tidak dapat dipasang:', error));
    }
}

function updateDashboardDate() {
    const dateDisplay = document.getElementById('dashboardDateDisplay');
    if(dateDisplay) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateDisplay.innerText = new Date().toLocaleDateString('id-ID', options);
    }
}

function showToast(msg) {
    let t = document.getElementById('toast');
    if(!t) return;
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) return showToast('Browser ini tidak mendukung notifikasi.');
    if (Notification.permission === 'granted') return showToast('Notifikasi sudah aktif.');
    const permission = await Notification.requestPermission();
    showToast(permission === 'granted' ? 'Notifikasi berhasil diaktifkan.' : 'Izin notifikasi belum diberikan.');
}

function openSheet(htmlContent) {
    const backdrop = document.getElementById('sheetBg');
    const content = document.getElementById('sheetContent');
    if (!backdrop || !content) return;
    content.innerHTML = `<button type="button" class="sheet-close-control" onclick="closeSheet()" aria-label="Tutup jendela"><i class="fa-solid fa-xmark"></i><span>Tutup</span></button>${htmlContent}`;
    backdrop.classList.add('show');
    backdrop.setAttribute('aria-hidden', 'false');
    content.setAttribute('role', 'dialog');
    content.setAttribute('aria-modal', 'true');
}

function closeSheet(e) {
    if (e && e.target && e.target.id !== 'sheetBg') return;
    const backdrop = document.getElementById('sheetBg');
    if (!backdrop) return;
    backdrop.classList.remove('show');
    backdrop.setAttribute('aria-hidden', 'true');
    document.getElementById('sheetContent').innerHTML = '';
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeSheet(); closeAuthModal(); }
});

// --- AUTH & CLOUD SYNC ---
function openAuthModal() {
    const modal = document.getElementById('modalAuth');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); modal.setAttribute('aria-hidden', 'false'); }
}

function closeAuthModal() {
    const modal = document.getElementById('modalAuth');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); modal.setAttribute('aria-hidden', 'true'); }
}

let authMode = 'login';
function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    const registering = authMode === 'register';
    const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    const fields = document.getElementById('registerFields');
    const school = document.getElementById('schoolFieldWrapper');
    const submit = document.getElementById('authSubmitBtn');
    const toggle = document.getElementById('authToggleBtn');
    if (fields) fields.classList.toggle('hidden', !registering);
    if (school) school.classList.toggle('hidden', !registering || document.getElementById('authEducation')?.value !== 'SMA');
    if (submit) submit.textContent = registering ? 'Buat Akun' : 'Masuk';
    if (toggle) toggle.textContent = registering ? 'Masuk sekarang' : 'Daftar sekarang';
    setText('authTitle', registering ? 'Buat akun Nexa' : 'Masuk ke Nexa');
    setText('authSubtitle', registering ? 'Isi data untuk membuat akun' : 'Silakan masuk dengan akun kamu');
    setText('authToggleText', registering ? 'Sudah punya akun?' : 'Belum punya akun?');
}

function toggleSchoolField() {
    const wrapper = document.getElementById('schoolFieldWrapper');
    const education = document.getElementById('authEducation');
    if (wrapper && education) wrapper.classList.toggle('hidden', education.value !== 'SMA');
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const email = document.getElementById('authEmail')?.value.trim();
    const pass = document.getElementById('authPassword')?.value;
    if (!email || !pass) return showToast('Email dan kata sandi harus diisi.');
    if (authMode === 'login') return window.fbLogin?.(email, pass);
    const name = document.getElementById('authName')?.value.trim();
    const education = document.getElementById('authEducation')?.value || '';
    const school = document.getElementById('authSchool')?.value.trim() || '';
    if (!name) return showToast('Nama harus diisi.');
    return window.fbRegister?.(email, pass, name, education, school);
}

function handleEmailLogin() {
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    if(window.fbLogin) window.fbLogin(email, pass);
}
function handleEmailRegister() {
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    if(window.fbRegister) window.fbRegister(email, pass, email.split('@')[0]);
}

// Debounce SaveData untuk menghemat kuota Firestore
let syncTimeout;
window.saveData = async () => {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        if (window.auth && window.auth.currentUser) {
            try { 
                await window.setDoc(window.doc(window.db, "users", window.auth.currentUser.uid), window.state, { merge: true }); 
            } catch(e) { console.error("Cloud sync error", e); }
        } else {
            localStorage.setItem('nexa_guest_data', JSON.stringify(window.state));
        }
    }, 500); // Jeda 500ms
};

// --- NAVIGATION ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-page').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('on'));
    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) activeNav.classList.add('on');

    document.querySelectorAll('.bnav-item').forEach(el => {
        el.classList.remove('on', 'text-sky-400', 'scale-110');
        el.classList.add('text-slate-500');
    });
    const activeBNav = document.getElementById(`bnav-${tabId}`);
    if (activeBNav) {
        activeBNav.classList.add('on', 'text-sky-400', 'scale-110');
        activeBNav.classList.remove('text-slate-500');
    }

    if(tabId === 'dashboard') renderDashboard();
    if(tabId === 'analytics') updateAnalytics();
    if(tabId === 'pomodoro') populatePomoTaskSelect();
}

function renderDashboard() {
    const tasks = window.state.tasks || [];
    const habits = window.state.habits || [];
    const todayStr = getTodayLocal();

    const pending = tasks.filter(t => t.status !== 'done').length;
    const dueToday = tasks.filter(t => t.dueDate === todayStr && t.status !== 'done').length;
    const focusMinutes = window.state.pomoMinutes || 0;
    const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

    document.getElementById('dashPendingTasks').innerText = pending;
    document.getElementById('dashTodayDue').innerText = dueToday;
    document.getElementById('dashHabitStreak').innerText = `🔥 ${maxStreak}`;
    document.getElementById('dashFocusTotal').innerText = `${focusMinutes}m`;

    const listEl = document.getElementById('dashUpcomingTasksList');
    listEl.innerHTML = '';
    const sortedPending = tasks.filter(t => t.status !== 'done').sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

    if(sortedPending.length === 0) {
        listEl.innerHTML = `<div class="empty">Yey! Tidak ada tugas mendesak.</div>`;
    } else {
        sortedPending.slice(0, 3).forEach(t => {
            const item = document.createElement('div');
            item.className = 'task';
            item.innerHTML = `
                <div style="font-weight:700;">${escapeHTML(t.title)}</div>
                <div class="sub">${escapeHTML(t.course || 'Umum')} · 📅 ${escapeHTML(t.dueDate || 'Tanpa Deadline')}</div>
            `;
            listEl.appendChild(item);
        });
    }
    renderAcademicCalendar();
}

const weekdayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function formatDateLong(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function shiftCalendarMonth(offset) {
    calendarVisibleMonth = new Date(calendarVisibleMonth.getFullYear(), calendarVisibleMonth.getMonth() + offset, 1, 12);
    renderAcademicCalendar();
}
function selectCalendarDate(date) {
    calendarSelectedDate = date;
    const selected = new Date(`${date}T12:00:00`);
    calendarVisibleMonth = new Date(selected.getFullYear(), selected.getMonth(), 1, 12);
    renderAcademicCalendar();
}
function getAcademicAgenda(date) {
    const weekday = new Date(`${date}T12:00:00`).getDay();
    const classes = (window.state.courses || []).filter(course => course.schedule && Number(course.schedule.day) === weekday)
        .map(course => ({ kind: 'class', title: course.name, time: course.schedule.time || '', detail: course.schedule.location || 'Ruang belum diisi' }));
    const tasks = (window.state.tasks || []).filter(task => task.status !== 'done' && task.dueDate === date)
        .map(task => ({ kind: 'task', title: task.title, time: task.dueTime || '', detail: `${task.course || 'Umum'} · Deadline` }));
    return [...classes, ...tasks].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}
function renderAcademicCalendar() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('calendarMonthLabel');
    if (!grid || !label) return;
    const year = calendarVisibleMonth.getFullYear(), month = calendarVisibleMonth.getMonth();
    label.textContent = calendarVisibleMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1, 12).getDay();
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const today = getTodayLocal();
    grid.innerHTML = '';
    for (let i = 0; i < firstDay; i++) grid.insertAdjacentHTML('beforeend', '<span class="calendar-blank" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const agenda = getAcademicAgenda(date);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `calendar-day${date === today ? ' is-today' : ''}${date === calendarSelectedDate ? ' is-selected' : ''}`;
        button.setAttribute('aria-label', `${formatDateLong(date)}${agenda.length ? `, ${agenda.length} agenda` : ''}`);
        button.setAttribute('aria-pressed', String(date === calendarSelectedDate));
        button.innerHTML = `<span>${day}</span>${agenda.length ? `<i class="calendar-markers">${agenda.some(item => item.kind === 'class') ? '<b class="has-class"></b>' : ''}${agenda.some(item => item.kind === 'task') ? '<b class="has-task"></b>' : ''}</i>` : ''}`;
        button.addEventListener('click', () => selectCalendarDate(date));
        grid.appendChild(button);
    }
    renderSelectedAgenda();
}
function renderSelectedAgenda() {
    const title = document.getElementById('agendaDateTitle');
    const count = document.getElementById('agendaCountLabel');
    const container = document.getElementById('selectedDayAgenda');
    if (!container) return;
    const agenda = getAcademicAgenda(calendarSelectedDate);
    if (title) title.textContent = calendarSelectedDate === getTodayLocal() ? 'Agenda Hari Ini' : formatDateLong(calendarSelectedDate);
    if (count) count.textContent = `${agenda.length} agenda · ${formatDateLong(calendarSelectedDate)}`;
    container.innerHTML = agenda.length ? agenda.map(item => `
        <div class="agenda-item ${item.kind}">
            <span class="agenda-time">${escapeHTML(item.time || '—')}</span><span class="agenda-line"></span>
            <div class="agenda-item-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.detail)}</small></div>
            <i class="fa-solid ${item.kind === 'class' ? 'fa-book-open' : 'fa-flag'}"></i>
        </div>`).join('') : '<div class="agenda-empty"><span class="agenda-empty-icon"><i class="fa-regular fa-calendar-check"></i></span><strong>Hari ini masih lapang</strong><small>Jadwal kelas dan deadline yang kamu tambahkan akan muncul di sini.</small></div>';
}

// --- COURSES ---
function renderCourses() {
    const container = document.getElementById('coursesContainer');
    if(!container) return;
    container.innerHTML = '';
    const courses = window.state.courses || [];

    if(courses.length === 0) {
        container.innerHTML = `<div class="empty" style="grid-column: 1/-1;">Belum ada matkul. Ketuk + untuk menambah.</div>`;
    }

    courses.forEach(c => {
        const card = document.createElement('div');
        card.className = 'glass card';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';
        card.innerHTML = `
            <div>
                <div style="font-weight:700;">${escapeHTML(c.name)}</div>
                <div class="sub">${c.schedule ? `${weekdayNames[Number(c.schedule.day)]} · ${escapeHTML(c.schedule.time || 'Jam belum diatur')}${c.schedule.location ? ` · ${escapeHTML(c.schedule.location)}` : ''}` : 'Jadwal belum ditambahkan'}</div>
            </div>
            <button aria-label="Atur jadwal ${escapeHTML(c.name)}" onclick="openCourseModal(${escapeHTML(JSON.stringify(c.id))})" class="btn sm"><i class="fa-solid fa-pen"></i></button>
            <button aria-label="Hapus matkul" onclick="deleteCourse(${escapeHTML(JSON.stringify(c.id))})" class="btn sm bad"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(card);
    });

    const selects = [document.getElementById('inputTaskCourseSelect'), document.getElementById('courseFilterSelect')];
    selects.forEach(sel => {
        if(!sel) return;
        const isFilter = sel.id === 'courseFilterSelect';
        sel.innerHTML = isFilter ? `<option value="ALL">Semua Mata Kuliah</option>` : `<option value="Umum">Umum</option>`;
        courses.forEach(c => {
            sel.innerHTML += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`;
        });
    });
}

function openCourseModal(courseId = null) {
    const existing = (window.state.courses || []).find(course => course.id === courseId);
    const dayOptions = weekdayNames.map((day, index) => `<option value="${index}" ${Number(existing?.schedule?.day) === index ? 'selected' : ''}>${day}</option>`).join('');
    openSheet(`
        <h2>${existing ? 'Atur Mata Kuliah' : 'Tambah Mata Kuliah'}</h2>
        <input type="hidden" id="inputCourseId" value="${escapeHTML(courseId || '')}">
        <div><label>Nama Mata Kuliah</label><input type="text" id="inputCourseName" value="${escapeHTML(existing?.name || '')}" class="in" style="margin-top:4px;" placeholder="Contoh: Pengantar Ekonomi"></div>
        <div class="course-schedule-fields"><p>Jadwal berulang setiap minggu <span>(opsional)</span></p>
            <label>Hari</label><select id="inputCourseDay" class="in" style="margin-top:4px;"><option value="">Belum ada jadwal</option>${dayOptions}</select>
            <div class="course-time-fields"><div><label>Mulai</label><input type="time" id="inputCourseTime" value="${escapeHTML(existing?.schedule?.time || '')}" class="in" style="margin-top:4px;"></div><div><label>Selesai</label><input type="time" id="inputCourseEndTime" value="${escapeHTML(existing?.schedule?.endTime || '')}" class="in" style="margin-top:4px;"></div></div>
            <label>Ruang / lokasi</label><input type="text" id="inputCourseLocation" value="${escapeHTML(existing?.schedule?.location || '')}" class="in" style="margin-top:4px;" placeholder="Contoh: Gedung B · 204">
        </div>
        <div class="sheet-action-row"><button type="button" onclick="closeSheet()" class="btn">Batal</button><button type="button" onclick="saveCourseModal()" class="btn pri">${existing ? 'Simpan Perubahan' : 'Simpan Mata Kuliah'}</button></div>
    `);
}
function saveCourseModal() {
    const name = document.getElementById('inputCourseName').value.trim(); if(!name) return showToast('Nama mata kuliah belum diisi.');
    if(!window.state.courses) window.state.courses = [];
    const id = document.getElementById('inputCourseId')?.value;
    const day = document.getElementById('inputCourseDay')?.value;
    const schedule = day === '' ? null : { day: Number(day), time: document.getElementById('inputCourseTime')?.value || '', endTime: document.getElementById('inputCourseEndTime')?.value || '', location: document.getElementById('inputCourseLocation')?.value.trim() || '' };
    const existing = window.state.courses.find(course => course.id === id);
    if (existing) Object.assign(existing, { name, schedule });
    else window.state.courses.push({ id: Date.now().toString(), name, schedule });
    if(window.saveData) window.saveData();
    renderCourses(); renderDashboard(); closeSheet();
}
function deleteCourse(id) {
    if(confirm("Yakin ingin menghapus mata kuliah ini?")) {
        window.state.courses = window.state.courses.filter(c => c.id !== id);
        if(window.saveData) window.saveData(); renderCourses(); renderDashboard();
    }
}

// --- TASKS ---
function renderTasks() {
    const colTodo = document.getElementById('col-todo'), colInProgress = document.getElementById('col-inprogress'), colDone = document.getElementById('col-done');
    if(!colTodo) return;
    colTodo.innerHTML = ''; colInProgress.innerHTML = ''; colDone.innerHTML = '';
    let countTodo = 0, countInProgress = 0, countDone = 0;
    const courseFilter = document.getElementById('courseFilterSelect').value;

    const sortedTasks = [...(window.state.tasks || [])].sort((a,b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

    sortedTasks.forEach(task => {
        if(window.state.currentTaskFilterPriority !== 'ALL' && task.priority !== window.state.currentTaskFilterPriority) return;
        if(courseFilter !== 'ALL' && task.course !== courseFilter) return;

        const card = document.createElement('div');
        card.className = `task ${task.status === 'done' ? 'done' : ''}`;
        card.innerHTML = `
            <div class="row">
                <span class="chip">${escapeHTML(task.course || 'Umum')}</span>
                <span class="sp"></span>
                <span class="sub" style="font-weight:700; color:${task.priority === 'HIGH' ? 'var(--bad)' : 'var(--warn)'}">${task.priority}</span>
            </div>
            <div class="t" style="font-weight:700;">${escapeHTML(task.title)}</div>
            <div class="sub">📅 ${escapeHTML(task.dueDate || 'Tanpa Deadline')}${task.dueTime ? ` · ${escapeHTML(task.dueTime)}` : ''}</div>
            <div class="row" style="margin-top:4px;">
                <select aria-label="Status tugas" onchange="updateTaskStatus('${task.id}', this.value)" class="in" style="padding:6px; font-size:12px;">
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To-Do</option>
                    <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
                </select>
                <button aria-label="Edit tugas ${escapeHTML(task.title)}" onclick="editTask(${escapeHTML(JSON.stringify(task.id))})" class="task-action-button"><i class="fa-solid fa-pen"></i></button>
                <button aria-label="Hapus tugas ${escapeHTML(task.title)}" onclick="deleteTask(${escapeHTML(JSON.stringify(task.id))})" class="btn sm bad"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        if (task.status === 'todo') { colTodo.appendChild(card); countTodo++; }
        else if (task.status === 'inprogress') { colInProgress.appendChild(card); countInProgress++; }
        else if (task.status === 'done') { colDone.appendChild(card); countDone++; }
    });

    document.getElementById('count-todo').innerText = countTodo;
    document.getElementById('count-inprogress').innerText = countInProgress;
    document.getElementById('count-done').innerText = countDone;
}

function setTaskFilter(type, val, btn) {
    window.state.currentTaskFilterPriority = val;
    btn.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('on', 'active'));
    btn.classList.add('on');
    renderTasks();
}

function updateTaskStatus(id, newStatus) {
    const task = (window.state.tasks || []).find(t => t.id === id);
    if(task) { 
        if(task.status !== 'done' && newStatus === 'done') {
            if (!task.xpAwarded) addXp(50);
            task.xpAwarded = true;
            task.doneAt = getTodayLocal(); // Simpan tanggal selesai untuk statistik
        }
        task.status = newStatus; 
        if(window.saveData) window.saveData(); 
        renderTasks(); renderDashboard();
    }
}

function openTaskModal(taskId = '') {
    const task = (window.state.tasks || []).find(item => item.id === taskId);
    let courseOptions = '<option value="Umum">Umum</option>';
    (window.state.courses || []).forEach(c => courseOptions += `<option value="${escapeHTML(c.name)}" ${task?.course === c.name ? 'selected' : ''}>${escapeHTML(c.name)}</option>`);

    openSheet(`
        <h2>${task ? 'Edit Tugas' : 'Tambah Tugas Baru'}</h2>
        <input type="hidden" id="editTaskId" value="${task ? escapeHTML(task.id) : ''}">
        <div><label>Judul Tugas</label><input type="text" id="inputTaskTitle" value="${task ? escapeHTML(task.title) : ''}" class="in" style="margin-top:4px;"></div>
        <div><label>Mata Kuliah</label><select id="inputTaskCourseSelect" class="in" style="margin-top:4px;">${courseOptions}</select></div>
        <div class="grid grid-cols-2 gap-2"><div><label>Tanggal Deadline</label><input type="date" id="inputTaskDueDate" value="${task ? escapeHTML(task.dueDate || '') : ''}" class="in" style="margin-top:4px;"></div><div><label>Jam Deadline</label><input type="time" id="inputTaskDueTime" value="${task ? escapeHTML(task.dueTime || '') : ''}" class="in" style="margin-top:4px;"></div></div>
        <div><label>Prioritas</label>
            <select id="inputTaskPriority" class="in" style="margin-top:4px;">
                <option value="HIGH" ${task?.priority === 'HIGH' ? 'selected' : ''}>Tinggi</option>
                <option value="MEDIUM" ${!task || task.priority === 'MEDIUM' ? 'selected' : ''}>Sedang</option>
                <option value="LOW" ${task?.priority === 'LOW' ? 'selected' : ''}>Rendah</option>
            </select>
        </div>
        <div class="flex gap-2"><button onclick="closeSheet()" class="btn flex-1">Batal</button><button onclick="saveTaskModal()" class="btn pri flex-1">${task ? 'Simpan Perubahan' : 'Simpan Tugas'}</button></div>
    `);
}

function editTask(taskId) { openTaskModal(taskId); }

function saveTaskModal() {
    const title = document.getElementById('inputTaskTitle').value;
    const course = document.getElementById('inputTaskCourseSelect').value;
    const dueDate = document.getElementById('inputTaskDueDate').value;
    const dueTime = document.getElementById('inputTaskDueTime')?.value || '';
    const priority = document.getElementById('inputTaskPriority').value;
    const editId = document.getElementById('editTaskId')?.value;

    if(!title.trim()) return showToast('Judul tugas harus diisi.');
    if(!window.state.tasks) window.state.tasks = [];
    const existingTask = editId ? window.state.tasks.find(task => task.id === editId) : null;
    if (existingTask) Object.assign(existingTask, { title: title.trim(), course, dueDate, dueTime, priority });
    else window.state.tasks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: title.trim(), course, dueDate, dueTime, priority, status: 'todo' });

    if(window.saveData) window.saveData(); 
    renderTasks(); renderDashboard(); closeSheet();
    showToast(existingTask ? 'Tugas berhasil diperbarui.' : 'Tugas berhasil ditambahkan.');
}

function deleteTask(id) { 
    if(confirm("Hapus tugas ini?")) {
        window.state.tasks = window.state.tasks.filter(t => t.id !== id); 
        if(window.saveData) window.saveData(); renderTasks(); renderDashboard();
    }
}

// --- POMODORO ---
// Perbaikan Timer: Dihitung berdasarkan EndTime agar tetap presisi meski tab browser tertidur
let pomoState = { mode: 'work', timeTotal: 25 * 60, timeLeft: 25 * 60, timerId: null, isRunning: false, endTime: 0, sessionTaskId: null };

function populatePomoTaskSelect() {
    const sel = document.getElementById('pomoTaskSelect');
    if(!sel) return;
    sel.innerHTML = `<option value="">-- Fokus Umum --</option>`;
    (window.state.tasks || []).filter(t => t.status !== 'done').forEach(t => {
        sel.innerHTML += `<option value="${t.id}">${escapeHTML(t.title)}</option>`;
    });
    updatePomoTaskFocus();
}

function updatePomoTaskFocus() {
    const select = document.getElementById('pomoTaskSelect');
    const status = document.getElementById('pomoStatusText');
    const task = (window.state.tasks || []).find(item => item.id === select?.value);
    if (status && !pomoState.isRunning) status.textContent = task ? `Fokus · ${task.title}` : (pomoState.mode === 'work' ? 'Mode Fokus' : 'Waktu Istirahat');
}

function setPomoMode(mode) {
    pomoState.mode = mode; pomoState.timeTotal = mode === 'work' ? 25*60 : (mode === 'shortBreak' ? 5*60 : 15*60);
    pomoState.timeLeft = pomoState.timeTotal; pomoState.sessionTaskId = null; pausePomoTimer(); updatePomoDisplay();
    document.querySelectorAll('#tab-pomodoro [id^="pomo-mode-"]').forEach(b => {
        b.classList.remove('bg-sky-500', 'text-slate-950'); b.classList.add('text-slate-400');
    });
    const modeButton = document.getElementById(`pomo-mode-${mode}`);
    if (modeButton) { modeButton.classList.add('bg-sky-500', 'text-slate-950'); modeButton.classList.remove('text-slate-400'); }
    const status = document.getElementById('pomoStatusText');
    if (status) status.textContent = mode === 'work' ? 'Mode Fokus' : 'Waktu Istirahat';
    if (mode === 'work') updatePomoTaskFocus();
}

function togglePomoTimer() { if(pomoState.isRunning) pausePomoTimer(); else startPomoTimer(); }

function startPomoTimer() {
    try { getAudioContext().resume?.(); } catch (error) { console.warn('Audio belum dapat diaktifkan:', error); }
    pomoState.isRunning = true;
    if (pomoState.mode === 'work' && !pomoState.sessionTaskId) pomoState.sessionTaskId = document.getElementById('pomoTaskSelect')?.value || null;
    const focusedTask = (window.state.tasks || []).find(task => task.id === pomoState.sessionTaskId);
    const status = document.getElementById('pomoStatusText');
    if (status) status.textContent = focusedTask ? `Fokus · ${focusedTask.title}` : (pomoState.mode === 'work' ? 'Mode Fokus' : 'Waktu Istirahat');
    document.getElementById('pomoStartBtn').innerText = 'Jeda';
    
    // Set target waktu selesai di masa depan
    pomoState.endTime = Date.now() + (pomoState.timeLeft * 1000);

    pomoState.timerId = setInterval(() => {
        // Kurangi waktu berdasarkan selisih waktu asli, bukan per detik interval
        pomoState.timeLeft = Math.max(0, Math.round((pomoState.endTime - Date.now()) / 1000));
        updatePomoDisplay();

        if(pomoState.timeLeft <= 0) {
            pausePomoTimer();
            if (isPomoAlarmEnabled()) playPomoAlarm();
            if(pomoState.mode === 'work') { 
                window.state.pomoCount = (Number(window.state.pomoCount) || 0) + 1;
                window.state.pomoMinutes = (Number(window.state.pomoMinutes) || 0) + 25;
                const focusedTask = (window.state.tasks || []).find(task => task.id === pomoState.sessionTaskId);
                if (focusedTask) {
                    focusedTask.focusMinutes = (Number(focusedTask.focusMinutes) || 0) + 25;
                    window.state.coursePomoMap ||= {};
                    const course = focusedTask.course || 'Umum';
                    window.state.coursePomoMap[course] = (Number(window.state.coursePomoMap[course]) || 0) + 25;
                }
                addXp(30);
                if(window.saveData) window.saveData(); 
                showToast("Sesi Fokus Selesai! +30 XP");
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Sesi fokus selesai', { body: 'Bagus! Kamu mendapat 30 XP.' });
                }
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // Haptic
            }
            resetPomoTimer();
        }
    }, 1000);
}

function pausePomoTimer() { 
    pomoState.isRunning = false; 
    const btn = document.getElementById('pomoStartBtn');
    if(btn) btn.innerText = 'Lanjutkan';
    clearInterval(pomoState.timerId); 
}
function resetPomoTimer() { 
    pausePomoTimer(); 
    pomoState.sessionTaskId = null;
    document.getElementById('pomoStartBtn').innerText = 'Mulai Sesi';
    pomoState.timeLeft = pomoState.timeTotal; 
    updatePomoDisplay(); 
}

function updatePomoDisplay() {
    const min = Math.floor(pomoState.timeLeft / 60), sec = pomoState.timeLeft % 60;
    const disp = document.getElementById('pomoTimeDisplay');
    if(disp) disp.innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    
    const ring = document.getElementById('pomoProgressRing');
    if(ring) {
        const circumference = 2 * Math.PI * 100;
        ring.style.strokeDasharray = circumference;
        const offset = circumference * (1 - pomoState.timeLeft / pomoState.timeTotal);
        ring.style.strokeDashoffset = offset;
    }
}

function setPomoAlarmEnabled(enabled) {
    try { localStorage.setItem('nexa_pomo_alarm', enabled ? 'on' : 'off'); } catch (error) { console.warn('Preferensi alarm tidak dapat disimpan:', error); }
}
function isPomoAlarmEnabled() {
    try { return localStorage.getItem('nexa_pomo_alarm') !== 'off'; } catch { return true; }
}
function playPomoAlarm(testOnly = false) {
    try {
        const ctx = getAudioContext();
        ctx.resume?.();
        const now = ctx.currentTime;
        [880, 660, 880].forEach((frequency, index) => {
            const start = now + index * 0.32;
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, start);
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
            oscillator.connect(gain); gain.connect(ctx.destination);
            oscillator.start(start); oscillator.stop(start + 0.26);
        });
        if (testOnly) showToast('Contoh suara alarm diputar.');
    } catch (error) {
        if (testOnly) showToast('Audio belum tersedia di browser ini.');
        console.warn('Alarm fokus tidak dapat diputar:', error);
    }
}

// Audio Latar
let audioCtx = null, ambientNodes = { rain: null, binaural: null };
function getAudioContext() { if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function toggleAmbientSound(type) {
    const ctx = getAudioContext(), btn = document.getElementById(`btn-sound-${type}`);
    if(ambientNodes[type]) { ambientNodes[type].stop(); ambientNodes[type] = null; btn.innerText = 'Aktifkan'; }
    else {
        if(type === 'rain') {
            const bufferSize = ctx.sampleRate * 2, buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate), output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
            const whiteNoise = ctx.createBufferSource(); whiteNoise.buffer = buffer; whiteNoise.loop = true;
            const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800;
            const gainNode = ctx.createGain(); gainNode.gain.value = 0.3;
            whiteNoise.connect(filter); filter.connect(gainNode); gainNode.connect(ctx.destination); whiteNoise.start();
            ambientNodes.rain = { stop: () => whiteNoise.stop() };
        } else {
            const oscL = ctx.createOscillator(), oscR = ctx.createOscillator(); oscL.frequency.value = 200; oscR.frequency.value = 210;
            const merger = ctx.createChannelMerger(2), gainNode = ctx.createGain(); gainNode.gain.value = 0.2;
            oscL.connect(merger, 0, 0); oscR.connect(merger, 0, 1); merger.connect(gainNode); gainNode.connect(ctx.destination);
            oscL.start(); oscR.start(); ambientNodes.binaural = { stop: () => { oscL.stop(); oscR.stop(); } };
        }
        btn.innerText = 'Matikan';
    }
}

function initSpotifyEmbed() {
    let saved = null;
    try { saved = localStorage.getItem('nexa_spotify_embed'); } catch {}
    const input = document.getElementById('spotifyLinkInput');
    if (saved && input) { input.value = saved; loadSpotifyEmbed(saved, false); }
}
function parseSpotifyEntity(input) {
    const value = String(input || '').trim();
    const uriMatch = value.match(/^spotify:(playlist|album|track|artist|show|episode):([A-Za-z0-9]+)$/i);
    if (uriMatch) return { type: uriMatch[1].toLowerCase(), id: uriMatch[2] };
    let url;
    try { url = new URL(value); } catch { return null; }
    if (url.protocol !== 'https:' || !['open.spotify.com', 'www.open.spotify.com'].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const typeIndex = parts.findIndex(part => ['playlist', 'album', 'track', 'artist', 'show', 'episode'].includes(part.toLowerCase()));
    if (typeIndex < 0 || !parts[typeIndex + 1]) return null;
    const type = parts[typeIndex].toLowerCase(), id = parts[typeIndex + 1];
    return /^[A-Za-z0-9]+$/.test(id) ? { type, id } : null;
}
function loadSpotifyEmbed(value, persist = true) {
    const input = document.getElementById('spotifyLinkInput');
    const rawValue = value || input?.value;
    const entity = parseSpotifyEntity(rawValue);
    if (!entity) {
        if (persist) showToast('Tautan belum valid. Tempel URL playlist, album, track, atau podcast Spotify.');
        return false;
    }
    const canonical = `https://open.spotify.com/${entity.type}/${entity.id}`;
    const frame = document.getElementById('spotifyEmbed');
    const wrap = document.getElementById('spotifyEmbedWrap');
    const empty = document.getElementById('spotifyEmptyState');
    if (!frame || !wrap) return false;
    frame.src = `https://open.spotify.com/embed/${entity.type}/${entity.id}?utm_source=generator`;
    wrap.classList.remove('hidden');
    empty?.classList.add('hidden');
    if (input) input.value = canonical;
    if (persist) {
        try { localStorage.setItem('nexa_spotify_embed', canonical); } catch (error) { console.warn('Tautan Spotify tidak dapat disimpan:', error); }
    }
    return true;
}

// --- HABITS ---
function renderHabits() {
    const container = document.getElementById('habitsContainer');
    if (!container) return;
    container.innerHTML = '';

    if((window.state.habits || []).length === 0) {
        container.innerHTML = `<div class="empty" style="grid-column: 1/-1;">Belum ada kebiasaan. Mulai dengan hal kecil!</div>`;
    }

    (window.state.habits || []).forEach(habit => {
        const todayStr = getTodayLocal();
        const completedDates = habit.completedDates || [];
        const isDoneToday = completedDates.includes(todayStr);

        let streak = 0, checkDate = new Date();
        while (true) {
            const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
            if (completedDates.includes(dateStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
            else break;
        }
        habit.streak = streak;

        const weekDays = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(12, 0, 0, 0);
            date.setDate(date.getDate() - 6 + index);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return { dateKey, complete: completedDates.includes(dateKey), label: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) };
        });

        const card = document.createElement('div');
        card.id = `habit-card-${habit.id}`;
        card.className = 'habit-card liquid-glass';
        card.innerHTML = `
            <div class="habit-card-top">
                <span class="habit-icon"><i class="fa-solid fa-seedling"></i></span>
                <div class="habit-title-group"><strong>${escapeHTML(habit.name)}</strong><span>${isDoneToday ? 'Selesai untuk hari ini' : 'Kebiasaan harian'}</span></div>
                <button type="button" class="habit-delete-button" title="Hapus kebiasaan" aria-label="Hapus kebiasaan ${escapeHTML(habit.name)}" onclick="deleteHabit(${escapeHTML(JSON.stringify(habit.id))})"><i class="fa-solid fa-ellipsis"></i></button>
            </div>
            <div class="habit-streak-row">
                <div class="habit-streak-badge"><span class="habit-streak-fire"><i class="fa-solid fa-fire"></i><i class="fa-solid fa-fire"></i></span><span class="habit-streak-copy"><strong>${streak}</strong><small>hari beruntun</small></span><i class="streak-spark spark-one"></i><i class="streak-spark spark-two"></i><i class="streak-spark spark-three"></i></div>
                <div class="habit-week-progress"><span>7 hari terakhir</span><div>${weekDays.map(day => `<i class="habit-week-dot${day.complete ? ' completed' : ''}" title="${escapeHTML(day.label)}" aria-label="${escapeHTML(day.label)}${day.complete ? ' selesai' : ' belum selesai'}"></i>`).join('')}</div></div>
            </div>
            <button type="button" onclick="toggleHabitDone(${escapeHTML(JSON.stringify(habit.id))})" class="habit-check-button${isDoneToday ? ' is-done' : ''}">
                <i class="fa-solid ${isDoneToday ? 'fa-check' : 'fa-circle-check'}"></i><span>${isDoneToday ? 'Selesai hari ini' : 'Tandai selesai'}</span>${isDoneToday ? '' : '<i class="fa-solid fa-arrow-right"></i>'}
            </button>
        `;
        container.appendChild(card);
    });
}

function toggleHabitDone(id) {
    const habit = (window.state.habits || []).find(h => h.id === id);
    if (!habit) return;
    const todayStr = getTodayLocal();
    if (!habit.completedDates) habit.completedDates = [];

    const index = habit.completedDates.indexOf(todayStr);
    const markedDone = index === -1;
    if (!markedDone) habit.completedDates.splice(index, 1);
    else {
        habit.completedDates.push(todayStr);
        habit.xpAwardedDates ||= [];
        if (!habit.xpAwardedDates.includes(todayStr)) {
            habit.xpAwardedDates.push(todayStr);
            addXp(20);
        }
    }

    if (window.saveData) window.saveData();
    renderHabits(); renderDashboard();
    if (markedDone) celebrateHabitStreak(habit);
}

function celebrateHabitStreak(habit) {
    const card = document.getElementById(`habit-card-${habit.id}`);
    if (card) {
        card.classList.remove('streak-celebration');
        void card.offsetWidth;
        card.classList.add('streak-celebration');
        setTimeout(() => card.classList.remove('streak-celebration'), 1500);
    }
    showToast(habit.streak > 1 ? `Streak ${habit.streak} hari terjaga! Teruskan!` : 'Awal streak yang bagus! Satu hari konsisten.');
}

function openHabitModal() {
    openSheet(`
        <h2>Kebiasaan Baru</h2>
        <div><label>Nama Kebiasaan</label><input type="text" id="inputHabitName" class="in" style="margin-top:4px;"></div>
        <div class="sheet-action-row"><button type="button" onclick="closeSheet()" class="btn">Batal</button><button type="button" onclick="saveHabitModal()" class="btn pri">Simpan Kebiasaan</button></div>
    `);
}
function saveHabitModal() {
    const name = document.getElementById('inputHabitName').value.trim();
    if (!name) return;
    if (!window.state.habits) window.state.habits = [];
    window.state.habits.push({ id: Date.now().toString(), name, streak: 0, completedDates: [] });
    if (window.saveData) window.saveData();
    renderHabits(); renderDashboard(); closeSheet();
}
function deleteHabit(id) { 
    if(confirm("Hapus kebiasaan ini? Riwayat juga akan hilang.")) {
        window.state.habits = window.state.habits.filter(h => h.id !== id); 
        if(window.saveData) window.saveData(); renderHabits(); renderDashboard();
    }
}

// --- FLASHCARDS ---
let currentFlashcardIdx = 0, isCardFlipped = false;
function getFlashcardDeckCards() {
    const filter = document.getElementById('flashcardDeckFilter')?.value || 'ALL';
    return (window.state.flashcards || []).filter(card => filter === 'ALL' || (card.deck || 'Umum') === filter);
}
function getFlashcardReviewPool() {
    const cards = getFlashcardDeckCards();
    const dueCards = cards.filter(card => !card.nextReviewAt || new Date(card.nextReviewAt) <= new Date());
    return document.getElementById('flashcardReviewMode')?.value === 'all' ? cards : dueCards;
}

function renderFlashcards() {
    const cards = window.state.flashcards || [];
    const meta = document.getElementById('flashcardProgressMeta');
    const deckFilter = document.getElementById('flashcardDeckFilter');
    if (deckFilter) {
        const selectedDeck = deckFilter.value || 'ALL';
        const decks = [...new Set(cards.map(card => card.deck || 'Umum'))].sort((a, b) => a.localeCompare(b, 'id'));
        deckFilter.innerHTML = `<option value="ALL">Semua deck · ${cards.length}</option>${decks.map(deck => `<option value="${escapeHTML(deck)}">${escapeHTML(deck)} · ${cards.filter(card => (card.deck || 'Umum') === deck).length}</option>`).join('')}`;
        deckFilter.value = selectedDeck === 'ALL' || decks.includes(selectedDeck) ? selectedDeck : 'ALL';
    }
    const reviewPool = getFlashcardReviewPool();
    const deckCards = getFlashcardDeckCards();
    const dueCount = deckCards.filter(item => !item.nextReviewAt || new Date(item.nextReviewAt) <= new Date()).length;
    const isDueMode = document.getElementById('flashcardReviewMode')?.value !== 'all';
    const sessionTitle = document.getElementById('flashcardSessionTitle');
    const sessionMeta = document.getElementById('flashcardSessionMeta');
    const progressBar = document.getElementById('flashcardProgressBar');
    const position = document.getElementById('flashcardPosition');
    const manageActions = document.getElementById('flashcardManageActions');
    const reviewControls = document.getElementById('flashcardReviewControls');
    const cardEl = document.getElementById('flashcardCard');
    const prev = document.getElementById('flashcardPrevButton'), next = document.getElementById('flashcardNextButton');
    if (meta) meta.textContent = `${cards.length} kartu tersimpan · ${dueCount} perlu diulang hari ini`;
    if (sessionTitle) sessionTitle.textContent = isDueMode ? 'Sesi pengulangan' : 'Latihan bebas';
    if (sessionMeta) sessionMeta.textContent = isDueMode ? `${reviewPool.length} kartu menunggu untuk diulang` : `${reviewPool.length} kartu di deck terpilih`;
    if (!reviewPool.length) {
        isCardFlipped = false;
        cardEl?.classList.remove('f');
        document.getElementById('cardDeckTag').textContent = deckCards.length ? 'Selesai untuk hari ini' : 'Deck kosong';
        document.getElementById('cardQuestionText').textContent = deckCards.length ? 'Semua kartu sudah kamu ulang hari ini. Pilih “Semua kartu” untuk latihan tambahan.' : 'Belum ada kartu di deck ini. Tambahkan kartu baru untuk mulai belajar.';
        document.getElementById('cardAnswerText').textContent = 'Gunakan menu mode belajar atau tambahkan materi baru.';
        if (position) position.textContent = '0 / 0';
        if (progressBar) progressBar.style.width = '0%';
        manageActions?.classList.add('hidden');
        reviewControls?.classList.add('hidden');
        if (prev) prev.disabled = true;
        if (next) next.disabled = true;
        return;
    }
    currentFlashcardIdx = ((currentFlashcardIdx % reviewPool.length) + reviewPool.length) % reviewPool.length;
    const card = reviewPool[currentFlashcardIdx];
    document.getElementById('cardDeckTag').textContent = card.deck || 'Umum';
    document.getElementById('cardQuestionText').textContent = card.question;
    document.getElementById('cardAnswerText').textContent = card.answer;
    if (position) position.textContent = `${currentFlashcardIdx + 1} / ${reviewPool.length}`;
    if (progressBar) progressBar.style.width = `${((currentFlashcardIdx + 1) / reviewPool.length) * 100}%`;
    if (sessionMeta) sessionMeta.textContent = isDueMode ? `${dueCount} kartu jatuh tempo · ketuk kartu untuk melihat jawaban` : `${reviewPool.length} kartu · ketuk kartu untuk melihat jawaban`;
    manageActions?.classList.remove('hidden');
    if (prev) prev.disabled = reviewPool.length < 2;
    if (next) next.disabled = reviewPool.length < 2;
    if (meta) {
        const nextReview = card.nextReviewAt ? new Date(card.nextReviewAt) : null;
        const nextLabel = nextReview && nextReview > new Date() ? ` · berikutnya ${nextReview.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}` : '';
        meta.textContent = `${cards.length} kartu · ${dueCount} perlu diulang${nextLabel} · diulas ${Number(card.reviewCount) || 0}×`;
    }
}
function onFlashcardFilterChange() { currentFlashcardIdx = 0; isCardFlipped = false; document.getElementById('flashcardCard')?.classList.remove('f'); document.getElementById('flashcardReviewControls')?.classList.add('hidden'); renderFlashcards(); }
function changeFlashcard(offset) { const pool = getFlashcardReviewPool(); if (!pool.length) return; currentFlashcardIdx = (currentFlashcardIdx + offset + pool.length) % pool.length; isCardFlipped = false; document.getElementById('flashcardCard')?.classList.remove('f'); document.getElementById('flashcardReviewControls')?.classList.add('hidden'); renderFlashcards(); }
function shuffleFlashcards() {
    const cards = getFlashcardDeckCards();
    if (cards.length < 2) return showToast('Tambahkan setidaknya dua kartu untuk mengacak deck.');
    const deckSet = new Set(cards);
    const indices = window.state.flashcards.map((card, index) => deckSet.has(card) ? index : -1).filter(index => index >= 0);
    for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [window.state.flashcards[indices[i]], window.state.flashcards[indices[j]]] = [window.state.flashcards[indices[j]], window.state.flashcards[indices[i]]]; }
    currentFlashcardIdx = 0; renderFlashcards(); if (window.saveData) window.saveData(); showToast('Urutan kartu berhasil diacak.');
}
function handleFlashcardKey(event) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flipCard(); } }
function flipCard() {
    if(!getFlashcardReviewPool().length) return;
    const cardEl = document.getElementById('flashcardCard'); 
    isCardFlipped = !isCardFlipped;
    cardEl.classList.toggle('f', isCardFlipped);
    document.getElementById('flashcardReviewControls').classList.toggle('hidden', !isCardFlipped);
}
function rateFlashcard(difficulty) {
    const reviewPool = getFlashcardReviewPool();
    const card = reviewPool[currentFlashcardIdx % reviewPool.length];
    if (!card) return;
    const intervals = { HARD: 1, MEDIUM: 3, EASY: 7 };
    if (!intervals[difficulty]) return;
    const wasDue = !card.nextReviewAt || new Date(card.nextReviewAt) <= new Date();
    const reviewedAt = new Date();
    const nextReview = new Date(reviewedAt);
    nextReview.setDate(nextReview.getDate() + intervals[difficulty]);
    card.reviewCount = (Number(card.reviewCount) || 0) + 1;
    card.lastReviewedAt = reviewedAt.toISOString();
    card.lastDifficulty = difficulty;
    card.nextReviewAt = nextReview.toISOString();
    card.reviewHistory ||= [];
    card.reviewHistory.push({ date: card.lastReviewedAt, difficulty });
    if (card.reviewHistory.length > 20) card.reviewHistory = card.reviewHistory.slice(-20);
    isCardFlipped = false;
    document.getElementById('flashcardCard').classList.remove('f');
    document.getElementById('flashcardReviewControls').classList.add('hidden');
    const dueMode = document.getElementById('flashcardReviewMode')?.value !== 'all';
    currentFlashcardIdx = dueMode && wasDue ? currentFlashcardIdx : currentFlashcardIdx + 1;
    renderFlashcards();
    if (window.saveData) window.saveData();
}
function currentFlashcard() { const pool = getFlashcardReviewPool(); return pool[currentFlashcardIdx % (pool.length || 1)] || null; }
function editCurrentFlashcard() { const card = currentFlashcard(); if (card) openFlashcardModal(card.id); }
function deleteCurrentFlashcard() {
    const card = currentFlashcard();
    if (!card || !confirm(`Hapus kartu “${card.deck || 'Umum'}”?`)) return;
    window.state.flashcards = (window.state.flashcards || []).filter(item => item.id !== card.id);
    currentFlashcardIdx = 0; isCardFlipped = false;
    if (window.saveData) window.saveData(); renderFlashcards(); showToast('Kartu berhasil dihapus.');
}
function openFlashcardModal(cardId = '') {
    const existing = (window.state.flashcards || []).find(card => card.id === cardId);
    openSheet(`
        <h2>${existing ? 'Edit Flashcard' : 'Buat Flashcard'}</h2>
        <p class="flashcard-modal-hint">Pisahkan pertanyaan dan jawaban. Pilih deck supaya materi mudah dikelompokkan.</p>
        <input id="inputFlashId" type="hidden" value="${escapeHTML(cardId)}">
        <div><label for="inputFlashDeck">Nama deck</label><input type="text" id="inputFlashDeck" maxlength="60" value="${escapeHTML(existing?.deck || '')}" class="in" style="margin-top:4px;" placeholder="Contoh: Anatomi · Bab 1"></div>
        <div><label for="inputFlashQuestion">Pertanyaan / istilah</label><textarea id="inputFlashQuestion" maxlength="1200" class="in flashcard-editor-area" style="margin-top:4px;" oninput="updateFlashcardLength()" placeholder="Tulis pertanyaan yang membantu kamu mengingat, bukan sekadar menyalin paragraf.">${escapeHTML(existing?.question || '')}</textarea><small id="flashQuestionLength" class="field-character-count">0 / 1200</small></div>
        <div><label for="inputFlashAnswer">Jawaban / penjelasan</label><textarea id="inputFlashAnswer" maxlength="2400" class="in flashcard-editor-area" style="margin-top:4px;" oninput="updateFlashcardLength()" placeholder="Tambahkan jawaban ringkas, contoh, atau rumus penting.">${escapeHTML(existing?.answer || '')}</textarea><small id="flashAnswerLength" class="field-character-count">0 / 2400</small></div>
        <div class="sheet-action-row"><button type="button" onclick="closeSheet()" class="btn">Batal</button><button type="button" onclick="saveFlashcardModal()" class="btn pri">${existing ? 'Simpan Perubahan' : 'Simpan Kartu'}</button></div>
    `);
    updateFlashcardLength();
}
function updateFlashcardLength() {
    const question = document.getElementById('inputFlashQuestion'), answer = document.getElementById('inputFlashAnswer');
    const questionCount = document.getElementById('flashQuestionLength'), answerCount = document.getElementById('flashAnswerLength');
    if (questionCount && question) questionCount.textContent = `${question.value.length} / 1200`;
    if (answerCount && answer) answerCount.textContent = `${answer.value.length} / 2400`;
}
function saveFlashcardModal() {
    const deck = document.getElementById('inputFlashDeck').value.trim() || 'Umum';
    const question = document.getElementById('inputFlashQuestion').value.trim();
    const answer = document.getElementById('inputFlashAnswer').value.trim();
    if (!question || !answer) return showToast('Isi pertanyaan dan jawaban terlebih dahulu.');
    if(!window.state.flashcards) window.state.flashcards = [];
    const id = document.getElementById('inputFlashId')?.value;
    const existing = window.state.flashcards.find(card => card.id === id);
    if (existing) Object.assign(existing, { deck, question, answer });
    else { window.state.flashcards.push({ id: Date.now().toString(), deck, question, answer }); currentFlashcardIdx = 0; }
    if(window.saveData) window.saveData(); renderFlashcards(); closeSheet(); showToast(existing ? 'Flashcard berhasil diperbarui.' : 'Flashcard ditambahkan ke deck.');
}

// --- BUDGET ---
function hydrateBudgetPlan() {
    const plan = window.state.budgetPlan || { balance: 1500000, days: 20, savings: 200000 };
    const fields = [['bgBalance', 'balance'], ['bgDays', 'days'], ['bgSavings', 'savings']];
    fields.forEach(([id, key]) => {
        const input = document.getElementById(id);
        if (input && document.activeElement !== input && plan[key] != null) input.value = plan[key];
    });
    const expenseDate = document.getElementById('expenseEntryDate');
    if (expenseDate && !expenseDate.value) expenseDate.value = getTodayLocal();
}

function calculateBudget(persist = false) {
    const balanceInput = document.getElementById('bgBalance');
    const daysInput = document.getElementById('bgDays');
    const savingsInput = document.getElementById('bgSavings');
    if (!balanceInput || !daysInput || !savingsInput) return;
    const balance = Math.max(0, Number(balanceInput.value) || 0);
    const days = Math.max(1, Math.floor(Number(daysInput.value) || 1));
    const savings = Math.max(0, Number(savingsInput.value) || 0);
    window.state.budgetPlan = { balance, days, savings };
    const todayStr = getTodayLocal();
    const todayExpenses = (window.state.expenses || []).filter(e => e.date && e.date === todayStr).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const dailyAllowance = Math.floor(Math.max(0, balance - savings) / days);
    const remainingToday = Math.max(0, dailyAllowance - todayExpenses);
    const limitDisplay = document.getElementById('bgSafeSpendDisplay');
    const spentDisplay = document.getElementById('todaySpentDisplay');
    if (limitDisplay) limitDisplay.innerText = `Rp ${remainingToday.toLocaleString('id-ID')}`;
    if (spentDisplay) spentDisplay.innerText = `Rp ${todayExpenses.toLocaleString('id-ID')}`;
    const safeToSpend = document.getElementById('safeToSpendStatus');
    if (safeToSpend) {
        safeToSpend.textContent = todayExpenses > dailyAllowance
            ? `Kamu melewati batas harian sebesar Rp ${(todayExpenses - dailyAllowance).toLocaleString('id-ID')}.`
            : `Alokasi hari ini Rp ${dailyAllowance.toLocaleString('id-ID')} · tersisa Rp ${remainingToday.toLocaleString('id-ID')}.`;
        safeToSpend.classList.toggle('over-budget', todayExpenses > dailyAllowance);
    }
    renderExpenses();
    if (persist && window.saveData) window.saveData();
}
function addExpense() {
    const nameInput = document.getElementById('expenseName');
    const amountInput = document.getElementById('expenseAmount');
    const categoryInput = document.getElementById('expenseCategory');
    const dateInput = document.getElementById('expenseEntryDate');
    const name = nameInput.value.trim();
    const amount = Math.round(Number(amountInput.value) || 0);
    if(!name || amount <= 0) return showToast('Isi nama dan nominal pengeluaran yang valid.');
    if(!window.state.expenses) window.state.expenses = [];
    window.state.expenses.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name, amount, category: categoryInput?.value || 'Lainnya',
        date: dateInput?.value || getTodayLocal(), createdAt: new Date().toISOString()
    });
    nameInput.value = '';
    amountInput.value = '';
    if (dateInput) dateInput.value = getTodayLocal();
    if(window.saveData) window.saveData(); calculateBudget(false);
    showToast('Pengeluaran berhasil dicatat.');
}

function setExpenseDate(date) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    expenseSelectedDate = date;
    const filter = document.getElementById('expenseDateFilter');
    if (filter) filter.value = date;
    renderExpenses();
}

function setExpenseDateToToday() { setExpenseDate(getTodayLocal()); }

function shiftExpenseDate(offset) {
    const base = new Date(`${expenseSelectedDate}T12:00:00`);
    base.setDate(base.getDate() + offset);
    const selected = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
    setExpenseDate(selected);
}

function deleteExpense(id) {
    if (!confirm('Hapus catatan pengeluaran ini?')) return;
    window.state.expenses = (window.state.expenses || []).filter(expense => expense.id !== id);
    if (window.saveData) window.saveData();
    calculateBudget(false);
    showToast('Catatan pengeluaran dihapus.');
}

function formatRupiah(value) { return `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`; }

function getExpensesForDate(date) {
    return (window.state.expenses || []).filter(expense => expense.date === date)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function getExpenseDateRange() {
    const dates = (window.state.expenses || []).map(expense => expense.date).filter(Boolean).sort();
    return dates.length ? `${dates[0]} — ${dates[dates.length - 1]}` : 'Belum ada data';
}

function renderExpenses() {
    const listEl = document.getElementById('expenseList');
    if (!listEl) return;
    const filter = document.getElementById('expenseDateFilter');
    if (filter) {
        if (!expenseSelectedDate) expenseSelectedDate = getTodayLocal();
        filter.value = expenseSelectedDate;
    }
    const selectedExpenses = getExpensesForDate(expenseSelectedDate);
    const selectedTotal = selectedExpenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const totalDisplay = document.getElementById('selectedDayTotal');
    const countDisplay = document.getElementById('selectedDayCount');
    if (totalDisplay) totalDisplay.textContent = formatRupiah(selectedTotal);
    if (countDisplay) countDisplay.textContent = selectedExpenses.length.toLocaleString('id-ID');
    listEl.innerHTML = '';
    if (!selectedExpenses.length) {
        listEl.innerHTML = `<div class="empty expense-empty"><i class="fa-solid fa-receipt"></i><span>Belum ada pengeluaran pada tanggal ini.</span></div>`;
    }
    selectedExpenses.forEach(expense => {
        const item = document.createElement('div');
        item.className = 'expense-row';
        const timeLabel = expense.createdAt ? new Date(expense.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
        item.innerHTML = `
            <div class="expense-row-icon"><i class="fa-solid fa-${expense.category === 'Transportasi' ? 'bus-simple' : expense.category === 'Akademik' ? 'book-open' : expense.category === 'Makan' ? 'utensils' : expense.category === 'Kebutuhan' ? 'basket-shopping' : 'receipt'}"></i></div>
            <div class="expense-row-main"><strong>${escapeHTML(expense.name)}</strong><span>${escapeHTML(expense.category || 'Lainnya')}${timeLabel ? ` · ${timeLabel}` : ''}</span></div>
            <strong class="expense-amount">− ${formatRupiah(expense.amount)}</strong>
            <button type="button" class="expense-delete" aria-label="Hapus pengeluaran ${escapeHTML(expense.name)}" onclick="deleteExpense(${escapeHTML(JSON.stringify(expense.id))})"><i class="fa-solid fa-trash-can"></i></button>`;
        listEl.appendChild(item);
    });
    renderExpenseWeek();
}

function renderExpenseWeek() {
    const container = document.getElementById('expenseWeekSummary');
    if (!container) return;
    const days = [];
    for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(`${expenseSelectedDate}T12:00:00`);
        date.setDate(date.getDate() - offset);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const total = getExpensesForDate(key).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
        days.push({ date: key, total, label: date.toLocaleDateString('id-ID', { weekday: 'short' }), day: date.getDate() });
    }
    const maxTotal = Math.max(...days.map(day => day.total), 1);
    container.innerHTML = days.map(day => `
        <button type="button" class="expense-day ${day.date === expenseSelectedDate ? 'selected' : ''}" onclick="setExpenseDate('${day.date}')" aria-label="${day.date}, ${formatRupiah(day.total)}">
            <span class="expense-day-total">${day.total ? formatCompactRupiah(day.total) : '—'}</span>
            <span class="expense-bar-track"><span class="expense-bar-fill" style="height:${day.total ? Math.max(8, Math.round((day.total / maxTotal) * 100)) : 4}%"></span></span>
            <span class="expense-day-label">${escapeHTML(day.label)} ${day.day}</span>
        </button>`).join('');
}

function formatCompactRupiah(value) {
    const amount = Number(value) || 0;
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
    if (amount >= 1000) return `Rp ${(amount / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
    return formatRupiah(amount);
}

function csvSafe(value) {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function exportExpensesCsv() {
    const expenses = [...(window.state.expenses || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
    const dayTotals = new Map();
    expenses.forEach(expense => dayTotals.set(expense.date, (dayTotals.get(expense.date) || 0) + (Number(expense.amount) || 0)));
    const rows = [
        ['Tanggal', 'Jam', 'Nama', 'Kategori', 'Nominal (Rp)', 'Total hari itu (Rp)'],
        ...expenses.map(expense => [
            expense.date || '',
            expense.createdAt ? new Date(expense.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '',
            expense.name || '', expense.category || 'Lainnya', Number(expense.amount) || 0, dayTotals.get(expense.date) || 0
        ])
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvSafe).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexa-pengeluaran-${getTodayLocal()}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('File CSV kompatibel Excel berhasil diunduh.');
}

function printExpenseReport() {
    const expenses = [...(window.state.expenses || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.createdAt || '').localeCompare(b.createdAt || ''));
    const total = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
    const dayTotals = new Map();
    expenses.forEach(expense => dayTotals.set(expense.date, (dayTotals.get(expense.date) || 0) + (Number(expense.amount) || 0)));
    const report = window.open('', '_blank');
    if (!report) return showToast('Izinkan pop-up untuk mencetak laporan PDF.');
    const summaryRows = [...dayTotals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) =>
        `<tr><td>${escapeHTML(date)}</td><td>${expenses.filter(expense => expense.date === date).length}</td><td class="money">${formatRupiah(amount)}</td></tr>`).join('');
    const detailRows = expenses.map(expense => `<tr><td>${escapeHTML(expense.date || '')}</td><td>${escapeHTML(expense.createdAt ? new Date(expense.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—')}</td><td>${escapeHTML(expense.name || '')}</td><td>${escapeHTML(expense.category || 'Lainnya')}</td><td class="money">${formatRupiah(expense.amount)}</td></tr>`).join('');
    report.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laporan Pengeluaran Nexa</title>
        <style>
          @page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{font:10pt/1.5 Arial,sans-serif;color:#30372f;margin:0;background:#fff}header{padding:0 0 18px;border-bottom:2px solid #687c62;margin-bottom:20px}.brand{font-size:10pt;color:#61765b;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.title{font-size:25pt;line-height:1.15;margin:8px 0 4px;letter-spacing:-.04em}.subtitle{color:#747b70;font-size:9pt}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0 24px}.stat{padding:13px;border:1px solid #e3e7dc;border-radius:10px;background:#fafbf7}.stat span{display:block;color:#747b70;font-size:8pt}.stat strong{display:block;margin-top:5px;font-size:15pt}.section{margin:22px 0}.section h2{font-size:12pt;margin:0 0 9px}.section p{font-size:8pt;color:#747b70;margin:0 0 10px}table{width:100%;border-collapse:collapse;font-size:8.5pt}thead{display:table-header-group}th{background:#eef2e9;color:#485b44;text-align:left;font-weight:700}th,td{padding:7px 8px;border-bottom:1px solid #e9ece5}tbody tr:nth-child(even){background:#fafbf8}.money{text-align:right;white-space:nowrap}.empty{padding:20px;text-align:center;color:#747b70;border:1px dashed #d8ded2;border-radius:10px}.foot{margin-top:28px;padding-top:10px;border-top:1px solid #e3e7dc;color:#899084;font-size:8pt;display:flex;justify-content:space-between}.keep{break-inside:avoid}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.section{break-inside:auto}tr{break-inside:avoid}}
        </style></head><body><header><div class="brand">Nexa · Academic Focus Hub</div><h1 class="title">Laporan Pengeluaran</h1><div class="subtitle">Periode ${escapeHTML(getExpenseDateRange())} · Dibuat ${escapeHTML(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }))}</div></header>
        <div class="stats"><div class="stat"><span>Total pengeluaran</span><strong>${formatRupiah(total)}</strong></div><div class="stat"><span>Jumlah transaksi</span><strong>${expenses.length.toLocaleString('id-ID')}</strong></div><div class="stat"><span>Hari tercatat</span><strong>${dayTotals.size.toLocaleString('id-ID')}</strong></div></div>
        <section class="section"><h2>Ringkasan per hari</h2>${summaryRows ? `<table><thead><tr><th>Tanggal</th><th>Transaksi</th><th class="money">Total</th></tr></thead><tbody>${summaryRows}</tbody></table>` : '<div class="empty">Belum ada pengeluaran yang tercatat.</div>'}</section>
        <section class="section"><h2>Rincian transaksi</h2><p>Catatan diurutkan dari tanggal paling awal.</p>${detailRows ? `<table><thead><tr><th>Tanggal</th><th>Jam</th><th>Catatan</th><th>Kategori</th><th class="money">Nominal</th></tr></thead><tbody>${detailRows}</tbody></table>` : '<div class="empty">Belum ada rincian transaksi.</div>'}</section>
        <footer class="foot"><span>Dibuat dengan Nexa</span><span>Dokumen pribadi · ${escapeHTML(new Date().toLocaleDateString('id-ID'))}</span></footer>
        <script>window.addEventListener('load',()=>setTimeout(()=>{window.focus();window.print()},350));<\/script></body></html>`);
    report.document.close();
}

function updateAnalytics() {
    const tasksCompleted = document.getElementById('analyticsTasksCompleted');
    const pomoMinutes = document.getElementById('analyticsPomoMinutes');
    const score = document.getElementById('scoreValue');
    if (tasksCompleted) tasksCompleted.innerText = (window.state.tasks || []).filter(t => t.status === 'done').length;
    if (pomoMinutes) pomoMinutes.innerText = (window.state.pomoMinutes || 0) + 'm';
    if (score) score.innerText = window.state.xpPoints || 0;
    
    const breakdownEl = document.getElementById('courseFocusBreakdown');
    if(breakdownEl) {
        const courses = Object.entries(window.state.coursePomoMap || {})
            .map(([name, minutes]) => ({ name, minutes: Number(minutes) || 0 }))
            .filter(course => course.minutes > 0)
            .sort((a, b) => b.minutes - a.minutes);
        if (!courses.length) {
            breakdownEl.innerHTML = `<div class="empty">Pilih tugas pada Focus Station saat memulai sesi agar waktu fokus tercatat per mata kuliah.</div>`;
        } else {
            const maxMinutes = courses[0].minutes;
            breakdownEl.innerHTML = courses.map(course => `
                <div class="course-focus-row">
                    <div class="course-focus-label"><strong>${escapeHTML(course.name)}</strong><span>${course.minutes} menit</span></div>
                    <div class="course-focus-track"><span style="width:${Math.max(4, (course.minutes / maxMinutes) * 100)}%"></span></div>
                </div>`).join('');
        }
    }
}

window.renderAll = function() {
    window.state = { ...{
        tasks: [], courses: [], habits: [], flashcards: [], expenses: [],
        pomoCount: 0, pomoMinutes: 0, currentTaskFilterPriority: 'ALL', xpPoints: 0, coursePomoMap: {},
        budgetPlan: { balance: 1500000, days: 20, savings: 200000 }
    }, ...(window.state || {}) };
    for (const key of ['tasks', 'courses', 'habits', 'flashcards', 'expenses']) {
        if (!Array.isArray(window.state[key])) window.state[key] = [];
    }
    window.state.xpPoints = Math.max(0, Number(window.state.xpPoints) || 0);
    window.state.pomoMinutes = Math.max(0, Number(window.state.pomoMinutes) || 0);
    window.state.pomoCount = Math.max(0, Number(window.state.pomoCount) || 0);
    window.state.coursePomoMap = window.state.coursePomoMap && typeof window.state.coursePomoMap === 'object' && !Array.isArray(window.state.coursePomoMap) ? window.state.coursePomoMap : {};
    window.state.budgetPlan = {
        balance: Math.max(0, Number(window.state.budgetPlan?.balance) || 0),
        days: Math.max(1, Math.floor(Number(window.state.budgetPlan?.days) || 1)),
        savings: Math.max(0, Number(window.state.budgetPlan?.savings) || 0)
    };
    hydrateBudgetPlan();
    renderCourses(); renderTasks(); renderHabits(); renderFlashcards(); calculateBudget(false); updatePomoDisplay(); renderDashboard(); updateAnalytics();
};
