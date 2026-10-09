window.state = { 
    tasks: [], courses: [], habits: [], flashcards: [], expenses: [], 
    pomoCount: 0, pomoMinutes: 0, currentTaskFilterPriority: 'ALL', 
    xpPoints: 0, coursePomoMap: {} 
};


const escapeHTML = (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
};

const getTodayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
};

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
    content.innerHTML = htmlContent;
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
                <div class="sub">Aktif Semester Ini</div>
            </div>
            <button aria-label="Hapus matkul" onclick="deleteCourse('${c.id}')" class="btn sm bad"><i class="fa-solid fa-trash"></i></button>
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

function openCourseModal() {
    openSheet(`
        <h2>Tambah Mata Kuliah</h2>
        <div><label>Nama Mata Kuliah</label><input type="text" id="inputCourseName" class="in" style="margin-top:4px;"></div>
        <button onclick="saveCourseModal()" class="btn pri" style="width:100%;">Simpan</button>
    `);
}
function saveCourseModal() {
    const name = document.getElementById('inputCourseName').value; if(!name) return;
    if(!window.state.courses) window.state.courses = [];
    window.state.courses.push({ id: Date.now().toString(), name });
    if(window.saveData) window.saveData();
    renderCourses(); closeSheet();
}
function deleteCourse(id) {
    if(confirm("Yakin ingin menghapus mata kuliah ini?")) {
        window.state.courses = window.state.courses.filter(c => c.id !== id);
        if(window.saveData) window.saveData(); renderCourses();
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
                <button aria-label="Hapus tugas" onclick="deleteTask('${task.id}')" class="btn sm bad"><i class="fa-solid fa-trash"></i></button>
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

function openTaskModal() {
    let courseOptions = '<option value="Umum">Umum</option>';
    (window.state.courses || []).forEach(c => courseOptions += `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`);

    openSheet(`
        <h2>Tambah Tugas Baru</h2>
        <div><label>Judul Tugas</label><input type="text" id="inputTaskTitle" class="in" style="margin-top:4px;"></div>
        <div><label>Mata Kuliah</label><select id="inputTaskCourseSelect" class="in" style="margin-top:4px;">${courseOptions}</select></div>
        <div class="grid grid-cols-2 gap-2"><div><label>Tanggal Deadline</label><input type="date" id="inputTaskDueDate" class="in" style="margin-top:4px;"></div><div><label>Jam Deadline</label><input type="time" id="inputTaskDueTime" class="in" style="margin-top:4px;"></div></div>
        <div><label>Prioritas</label>
            <select id="inputTaskPriority" class="in" style="margin-top:4px;">
                <option value="HIGH">Tinggi</option>
                <option value="MEDIUM" selected>Sedang</option>
                <option value="LOW">Rendah</option>
            </select>
        </div>
        <button onclick="saveTaskModal()" class="btn pri" style="width:100%;">Simpan</button>
    `);
}

function saveTaskModal() {
    const title = document.getElementById('inputTaskTitle').value;
    const course = document.getElementById('inputTaskCourseSelect').value;
    const dueDate = document.getElementById('inputTaskDueDate').value;
    const dueTime = document.getElementById('inputTaskDueTime')?.value || '';
    const priority = document.getElementById('inputTaskPriority').value;

    if(!title.trim()) return showToast('Judul tugas harus diisi.');
    if(!window.state.tasks) window.state.tasks = [];
    window.state.tasks.push({ id: Date.now().toString(), title: title.trim(), course, dueDate, dueTime, priority, status: 'todo' });

    if(window.saveData) window.saveData(); 
    renderTasks(); renderDashboard(); closeSheet();
}

function deleteTask(id) { 
    if(confirm("Hapus tugas ini?")) {
        window.state.tasks = window.state.tasks.filter(t => t.id !== id); 
        if(window.saveData) window.saveData(); renderTasks(); renderDashboard();
    }
}

// --- POMODORO ---
// Perbaikan Timer: Dihitung berdasarkan EndTime agar tetap presisi meski tab browser tertidur
let pomoState = { mode: 'work', timeTotal: 25 * 60, timeLeft: 25 * 60, timerId: null, isRunning: false, endTime: 0 };

function populatePomoTaskSelect() {
    const sel = document.getElementById('pomoTaskSelect');
    if(!sel) return;
    sel.innerHTML = `<option value="">-- Fokus Umum --</option>`;
    (window.state.tasks || []).filter(t => t.status !== 'done').forEach(t => {
        sel.innerHTML += `<option value="${t.id}">${escapeHTML(t.title)}</option>`;
    });
}

function setPomoMode(mode) {
    pomoState.mode = mode; pomoState.timeTotal = mode === 'work' ? 25*60 : (mode === 'shortBreak' ? 5*60 : 15*60);
    pomoState.timeLeft = pomoState.timeTotal; pausePomoTimer(); updatePomoDisplay();
    document.querySelectorAll('#tab-pomodoro [id^="pomo-mode-"]').forEach(b => {
        b.classList.remove('bg-sky-500', 'text-slate-950'); b.classList.add('text-slate-400');
    });
    const modeButton = document.getElementById(`pomo-mode-${mode}`);
    if (modeButton) { modeButton.classList.add('bg-sky-500', 'text-slate-950'); modeButton.classList.remove('text-slate-400'); }
    const status = document.getElementById('pomoStatusText');
    if (status) status.textContent = mode === 'work' ? 'Mode Fokus' : 'Waktu Istirahat';
}

function togglePomoTimer() { if(pomoState.isRunning) pausePomoTimer(); else startPomoTimer(); }

function startPomoTimer() {
    pomoState.isRunning = true;
    document.getElementById('pomoStartBtn').innerText = 'Jeda';
    
    // Set target waktu selesai di masa depan
    pomoState.endTime = Date.now() + (pomoState.timeLeft * 1000);

    pomoState.timerId = setInterval(() => {
        // Kurangi waktu berdasarkan selisih waktu asli, bukan per detik interval
        pomoState.timeLeft = Math.max(0, Math.round((pomoState.endTime - Date.now()) / 1000));
        updatePomoDisplay();

        if(pomoState.timeLeft <= 0) {
            pausePomoTimer();
            if(pomoState.mode === 'work') { 
                window.state.pomoCount++; 
                window.state.pomoMinutes = (Number(window.state.pomoMinutes) || 0) + 25;
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

        const card = document.createElement('div');
        card.className = 'glass card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '10px';
        card.innerHTML = `
            <div class="row">
                <div style="font-weight:700;" class="sp">${escapeHTML(habit.name)}</div>
                <button aria-label="Hapus habit" onclick="deleteHabit('${habit.id}')" class="btn sm bad"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div style="font-size:22px; font-weight:800; color:var(--accent);">🔥 ${streak} Hari</div>
            <button onclick="toggleHabitDone('${habit.id}')" class="btn sm ${isDoneToday ? '' : 'pri'}" style="${isDoneToday ? 'background:var(--ok); color:#fff;' : ''}">
                ${isDoneToday ? '✅ Selesai Hari Ini' : 'Tandai Selesai'}
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
    if (index !== -1) habit.completedDates.splice(index, 1);
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
}

function openHabitModal() {
    openSheet(`
        <h2>Kebiasaan Baru</h2>
        <div><label>Nama Kebiasaan</label><input type="text" id="inputHabitName" class="in" style="margin-top:4px;"></div>
        <button onclick="saveHabitModal()" class="btn pri" style="width:100%;">Simpan</button>
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
function renderFlashcards() {
    const cards = window.state.flashcards || [];
    if(cards.length === 0) return;
    const card = cards[currentFlashcardIdx % cards.length];
    document.getElementById('cardDeckTag').innerText = card.deck || 'Umum';
    document.getElementById('cardQuestionText').innerText = card.question; // Sanitasi opsional jika butuh HTML
    document.getElementById('cardAnswerText').innerText = card.answer;
}
function flipCard() {
    if((window.state.flashcards || []).length === 0) return;
    const cardEl = document.getElementById('flashcardCard'); 
    isCardFlipped = !isCardFlipped;
    cardEl.classList.toggle('f', isCardFlipped);
    document.getElementById('flashcardReviewControls').classList.toggle('hidden', !isCardFlipped);
}
function rateFlashcard(difficulty) {
    isCardFlipped = false;
    document.getElementById('flashcardCard').classList.remove('f');
    document.getElementById('flashcardReviewControls').classList.add('hidden');
    currentFlashcardIdx++; renderFlashcards();
}
function openFlashcardModal() {
    openSheet(`
        <h2>Flashcard Baru</h2>
        <div><label>Kategori</label><input type="text" id="inputFlashDeck" class="in" style="margin-top:4px;"></div>
        <div><label>Pertanyaan</label><textarea id="inputFlashQuestion" class="in" style="margin-top:4px;"></textarea></div>
        <div><label>Jawaban</label><textarea id="inputFlashAnswer" class="in" style="margin-top:4px;"></textarea></div>
        <button onclick="saveFlashcardModal()" class="btn pri" style="width:100%;">Simpan</button>
    `);
}
function saveFlashcardModal() {
    const deck = document.getElementById('inputFlashDeck').value;
    const question = document.getElementById('inputFlashQuestion').value;
    const answer = document.getElementById('inputFlashAnswer').value;
    if(!question || !answer) return;
    if(!window.state.flashcards) window.state.flashcards = [];
    window.state.flashcards.push({ id: Date.now().toString(), deck, question, answer });
    if(window.saveData) window.saveData(); renderFlashcards(); closeSheet();
}

// --- BUDGET ---
function calculateBudget() {
    const balance = parseFloat(document.getElementById('bgBalance').value) || 0;
    const days = parseFloat(document.getElementById('bgDays').value) || 1;
    const savings = parseFloat(document.getElementById('bgSavings').value) || 0;
    const todayStr = getTodayLocal();
    const todayExpenses = (window.state.expenses || []).filter(e => e.date && e.date === todayStr).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netBalance = Math.max(0, balance - savings - todayExpenses);
    const dailyLimit = Math.floor(netBalance / days);
    document.getElementById('bgSafeSpendDisplay').innerText = `Rp ${dailyLimit.toLocaleString('id-ID')}`;
    renderExpenses();
}
function addExpense() {
    const name = document.getElementById('expenseName').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    if(!name || amount <= 0) return;
    if(!window.state.expenses) window.state.expenses = [];
    window.state.expenses.push({ id: Date.now().toString(), name, amount, date: getTodayLocal() });
    document.getElementById('expenseName').value = '';
    document.getElementById('expenseAmount').value = '';
    if(window.saveData) window.saveData(); calculateBudget();
}
function renderExpenses() {
    const listEl = document.getElementById('expenseList');
    if (!listEl) return;
    listEl.innerHTML = '';
    const expenses = window.state.expenses || [];
    if (expenses.length === 0) {
        listEl.innerHTML = `<div class="empty">Belum ada pengeluaran hari ini.</div>`;
        return;
    }
    expenses.forEach(e => {
        const item = document.createElement('div');
        item.className = 'task';
        item.innerHTML = `<div class="row"><span>${escapeHTML(e.name)}</span><span class="sp"></span><span style="color:var(--bad); font-weight:700;">- Rp ${Number(e.amount).toLocaleString('id-ID')}</span></div>`;
        listEl.appendChild(item);
    });
}

function updateAnalytics() {
    document.getElementById('analyticsTasksCompleted').innerText = (window.state.tasks || []).filter(t => t.status === 'done').length;
    document.getElementById('analyticsPomoMinutes').innerText = (window.state.pomoMinutes || 0) + 'm';
    document.getElementById('scoreValue').innerText = window.state.xpPoints || 0;
    
    const breakdownEl = document.getElementById('courseFocusBreakdown');
    if(breakdownEl) {
        breakdownEl.innerHTML = `<div class="empty">Belum ada durasi fokus tercatat per mata kuliah.</div>`;
    }
}

window.renderAll = function() {
    window.state = { ...{
        tasks: [], courses: [], habits: [], flashcards: [], expenses: [],
        pomoCount: 0, pomoMinutes: 0, currentTaskFilterPriority: 'ALL', xpPoints: 0, coursePomoMap: {}
    }, ...(window.state || {}) };
    for (const key of ['tasks', 'courses', 'habits', 'flashcards', 'expenses']) {
        if (!Array.isArray(window.state[key])) window.state[key] = [];
    }
    window.state.xpPoints = Math.max(0, Number(window.state.xpPoints) || 0);
    window.state.pomoMinutes = Math.max(0, Number(window.state.pomoMinutes) || 0);
    window.state.pomoCount = Math.max(0, Number(window.state.pomoCount) || 0);
    renderCourses(); renderTasks(); renderHabits(); renderFlashcards(); calculateBudget(); updatePomoDisplay(); renderDashboard(); updateAnalytics();
};
