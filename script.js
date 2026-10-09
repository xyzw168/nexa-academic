window.state = { 
    tasks: [], courses: [], habits: [], flashcards: [], expenses: [], 
    pomoCount: 0, pomoMinutes: 0, currentTaskFilterPriority: 'ALL', 
    xpPoints: 0, coursePomoMap: {} 
};

let isRegisterMode = false;

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

function toggleMobileDrawer() {
    const drawer = document.getElementById('sidebarDrawer');
    const overlay = document.getElementById('drawerOverlay');
    drawer.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function handleMobileAvatarClick() {
    const userProfileCard = document.getElementById('userProfileCard');
    if (userProfileCard && !userProfileCard.classList.contains('hidden')) {
        toggleMobileDrawer();
    } else {
        openAuthModal();
    }
}

// --- AUTH & LOGIN FUNCTIONS ---
function openAuthModal() { 
    const drawer = document.getElementById('sidebarDrawer');
    if (drawer && !drawer.classList.contains('-translate-x-full')) {
        toggleMobileDrawer();
    }
    const modal = document.getElementById('modalAuth');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeAuthModal() { 
    const modal = document.getElementById('modalAuth');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    document.getElementById('registerFields').classList.toggle('hidden', !isRegisterMode);
    document.getElementById('authTitle').innerText = isRegisterMode ? 'Daftar ke Nexa' : 'Masuk ke Nexa';
    document.getElementById('authSubtitle').innerText = isRegisterMode ? 'Buat akun baru untuk melanjutkan' : 'Silakan masuk dengan akun kamu';
    document.getElementById('authSubmitBtn').innerText = isRegisterMode ? 'Daftar' : 'Masuk';
    document.getElementById('authToggleText').innerText = isRegisterMode ? 'Sudah punya akun?' : 'Belum punya akun?';
    document.getElementById('authToggleBtn').innerText = isRegisterMode ? 'Masuk di sini' : 'Daftar sekarang';
}

function toggleSchoolField() {
    const edu = document.getElementById('authEducation').value;
    const schoolWrapper = document.getElementById('schoolFieldWrapper');
    const schoolLabel = document.getElementById('authSchoolLabel');
    if(edu === 'Kuliah') {
        schoolLabel.innerText = 'Nama Universitas';
        schoolWrapper.classList.remove('hidden');
    } else if(edu) {
        schoolLabel.innerText = 'Nama Sekolah';
        schoolWrapper.classList.remove('hidden');
    } else {
        schoolWrapper.classList.add('hidden');
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pass = document.getElementById('authPassword').value;
    if (isRegisterMode) {
        const name = document.getElementById('authName').value;
        const edu = document.getElementById('authEducation').value;
        const school = document.getElementById('authSchool').value;
        if(window.fbRegister) window.fbRegister(email, pass, name, edu, school);
    } else {
        if(window.fbLogin) window.fbLogin(email, pass);
    }
}

// --- NAVIGATION FUNCTIONS ---
function switchTab(tabId) {
    document.querySelectorAll('.tab-page').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(el => { 
        el.classList.remove('text-sky-400', 'bg-white/10'); 
        el.classList.add('text-slate-400'); 
    });
    const activeNav = document.getElementById(`nav-${tabId}`);
    if (activeNav) {
        activeNav.classList.remove('text-slate-400');
        activeNav.classList.add('text-sky-400', 'bg-white/10');
    }

    document.querySelectorAll('.bnav-item').forEach(el => {
        el.classList.remove('text-sky-400', 'scale-110');
        el.classList.add('text-slate-500');
    });
    const activeBNav = document.getElementById(`bnav-${tabId}`);
    if (activeBNav) {
        activeBNav.classList.remove('text-slate-500');
        activeBNav.classList.add('text-sky-400', 'scale-110');
    }

    if(tabId === 'dashboard') renderDashboard();
    if(tabId === 'analytics') updateAnalytics();
    if(tabId === 'pomodoro') populatePomoTaskSelect();
}

function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission().then(permission => {
            if (permission === "granted") alert("Notifikasi browser berhasil diaktifkan!");
        });
    }
}

function sendBrowserNotif(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body });
    }
}

function handleGlobalSearch(query) {
    const dropdown = document.getElementById('searchResultsDropdown');
    if(!query.trim()) { dropdown.classList.add('hidden'); return; }

    const q = query.toLowerCase();
    let results = [];

    (window.state.tasks || []).forEach(t => {
        if(t.title.toLowerCase().includes(q)) results.push({ type: 'Task', title: t.title, tab: 'tasks' });
    });
    (window.state.courses || []).forEach(c => {
        if(c.name.toLowerCase().includes(q)) results.push({ type: 'Matkul', title: c.name, tab: 'courses' });
    });
    (window.state.flashcards || []).forEach(f => {
        if(f.question.toLowerCase().includes(q)) results.push({ type: 'Flashcard', title: f.question, tab: 'flashcards' });
    });

    dropdown.innerHTML = '';
    if(results.length === 0) {
        dropdown.innerHTML = `<div class="p-2 text-slate-400 text-center">Tidak ditemukan</div>`;
    } else {
        results.slice(0, 5).forEach(r => {
            const item = document.createElement('div');
            item.className = 'p-2 hover:bg-white/10 rounded-lg cursor-pointer flex justify-between items-center';
            item.innerHTML = `<span class="truncate font-semibold text-white">${r.title}</span><span class="text-[9px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-bold">${r.type}</span>`;
            item.onclick = () => { switchTab(r.tab); dropdown.classList.add('hidden'); };
            dropdown.appendChild(item);
        });
    }
    dropdown.classList.remove('hidden');
}

function renderDashboard() {
    const tasks = window.state.tasks || [];
    const habits = window.state.habits || [];
    const todayStr = new Date().toISOString().split('T')[0];

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

    const sortedPending = tasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => {
            const dateA = a.dueDate ? new Date(`${a.dueDate}T${a.dueTime || '23:59'}`) : new Date('9999-12-31');
            const dateB = b.dueDate ? new Date(`${b.dueDate}T${b.dueTime || '23:59'}`) : new Date('9999-12-31');
            return dateA - dateB;
        });

    if(sortedPending.length === 0) {
        listEl.innerHTML = `<div class="text-slate-500 italic">Tidak ada agenda tugas terdekat.</div>`;
    } else {
        sortedPending.slice(0, 3).forEach(t => {
            const item = document.createElement('div');
            item.className = 'bg-slate-900/60 p-2.5 rounded-xl border border-white/10 flex items-center justify-between';
            item.innerHTML = `
                <div>
                    <div class="font-bold text-white">${t.title}</div>
                    <div class="text-[10px] text-slate-400">${t.course} · 📅 ${t.dueDate || 'Tanpa Deadline'} ${t.dueTime ? t.dueTime : ''}</div>
                </div>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${t.dueDate === todayStr ? 'bg-red-500/20 text-red-300' : 'bg-sky-500/20 text-sky-300'}">${t.dueDate === todayStr ? 'Hari Ini' : 'Mendekati'}</span>
            `;
            listEl.appendChild(item);
        });
    }
}

function renderCourses() {
    const container = document.getElementById('coursesContainer');
    if(!container) return;
    container.innerHTML = '';
    const courses = window.state.courses || [];

    courses.forEach(c => {
        const card = document.createElement('div');
        card.className = 'liquid-glass p-4 rounded-2xl flex items-center justify-between';
        card.innerHTML = `
            <div>
                <h4 class="font-bold text-sm text-white">${c.name}</h4>
                <span class="text-[10px] text-slate-400">Aktif Semester Ini</span>
            </div>
            <button onclick="deleteCourse('${c.id}')" class="text-slate-500 hover:text-red-400"><i class="fa-solid fa-trash text-xs"></i></button>
        `;
        container.appendChild(card);
    });

    const selects = [document.getElementById('inputTaskCourseSelect'), document.getElementById('courseFilterSelect')];
    selects.forEach(sel => {
        if(!sel) return;
        const isFilter = sel.id === 'courseFilterSelect';
        sel.innerHTML = isFilter ? `<option value="ALL">Semua Mata Kuliah</option>` : `<option value="Umum">Umum</option>`;
        courses.forEach(c => {
            sel.innerHTML += `<option value="${c.name}">${c.name}</option>`;
        });
    });
}

function openCourseModal() { document.getElementById('modalCourse').classList.remove('hidden'); document.getElementById('modalCourse').classList.add('flex'); }
function closeCourseModal() { document.getElementById('modalCourse').classList.add('hidden'); document.getElementById('modalCourse').classList.remove('flex'); }
function saveCourseModal() {
    const name = document.getElementById('inputCourseName').value; if(!name) return;
    if(!window.state.courses) window.state.courses = [];
    window.state.courses.push({ id: Date.now().toString(), name });
    if(window.saveData) window.saveData();
    renderCourses(); closeCourseModal();
}
function deleteCourse(id) {
    window.state.courses = window.state.courses.filter(c => c.id !== id);
    if(window.saveData) window.saveData(); renderCourses();
}

function renderTasks() {
    const colTodo = document.getElementById('col-todo'), colInProgress = document.getElementById('col-inprogress'), colDone = document.getElementById('col-done');
    if(!colTodo) return;
    colTodo.innerHTML = ''; colInProgress.innerHTML = ''; colDone.innerHTML = '';
    let countTodo = 0, countInProgress = 0, countDone = 0;
    const courseFilter = document.getElementById('courseFilterSelect').value;

    const sortedTasks = [...(window.state.tasks || [])].sort((a,b) => {
        const dateA = a.dueDate ? new Date(`${a.dueDate}T${a.dueTime || '23:59'}`) : new Date('9999-12-31');
        const dateB = b.dueDate ? new Date(`${b.dueDate}T${b.dueTime || '23:59'}`) : new Date('9999-12-31');
        return dateA - dateB;
    });

    sortedTasks.forEach(task => {
        if(window.state.currentTaskFilterPriority !== 'ALL' && task.priority !== window.state.currentTaskFilterPriority) return;
        if(courseFilter !== 'ALL' && task.course !== courseFilter) return;

        const card = createTaskCardElement(task);
        if (task.status === 'todo') { colTodo.appendChild(card); countTodo++; }
        else if (task.status === 'inprogress') { colInProgress.appendChild(card); countInProgress++; }
        else if (task.status === 'done') { colDone.appendChild(card); countDone++; }
    });

    document.getElementById('count-todo').innerText = countTodo;
    document.getElementById('count-inprogress').innerText = countInProgress;
    document.getElementById('count-done').innerText = countDone;
}

function createTaskCardElement(task) {
    const div = document.createElement('div');
    div.className = 'liquid-glass p-3.5 rounded-2xl space-y-2 text-xs relative border border-white/10';

    let deadlineBadge = '';

    if (task.dueDate) {
        const now = new Date();
        const dueDateTime = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);

        const diffMs = dueDateTime - now;
        const diffMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const remainingHours = diffHours % 24;
        const remainingMinutes = diffMinutes % 60;

        if (diffMs < 0 && task.status !== 'done') {
            let overdueText = '';
            if (diffDays > 0) overdueText = `${diffDays} hari lalu`;
            else if (diffHours > 0) overdueText = `${diffHours} jam lalu`;
            else overdueText = `${diffMinutes} menit lalu`;

            deadlineBadge = `
                <span class="text-[9px] bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded-md border border-red-500/30">
                    🔴 Overdue (${overdueText})
                </span>
            `;
        } 
        else if (task.status !== 'done' && diffMs >= 0) {
            if (diffDays > 0) {
                deadlineBadge = `<span class="text-[9px] bg-sky-500/10 text-sky-300 font-semibold px-2 py-0.5 rounded-md">📅 ${diffDays} hari ${remainingHours} jam lagi</span>`;
            } else if (diffHours > 0) {
                deadlineBadge = `<span class="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-500/30">⚡ ${diffHours} jam ${remainingMinutes} menit lagi</span>`;
            } else {
                deadlineBadge = `<span class="text-[9px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-md border border-red-500/30">🔥 ${remainingMinutes} menit lagi</span>`;
            }
        }
        else if (task.status === 'done') {
            deadlineBadge = `<span class="text-[9px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-md">✅ Selesai · ${task.dueDate}${task.dueTime ? ' ' + task.dueTime : ''}</span>`;
        }
    }

    div.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-slate-400 font-medium text-[11px]">${task.course || 'Umum'}</span>
            <span class="text-[10px] font-bold ${
                task.priority === 'HIGH' ? 'text-red-400' : task.priority === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
            }">${task.priority}</span>
        </div>
        <h4 class="font-bold text-xs text-white leading-snug">${task.title}</h4>
        <div class="flex items-center gap-1.5 pt-0.5">${deadlineBadge}</div>
        <div class="flex items-center justify-between pt-2 border-t border-white/10 mt-1">
            <select onchange="updateTaskStatus('${task.id}', this.value)" class="bg-slate-900 border border-white/10 text-slate-300 text-[10px] rounded p-1 outline-none">
                <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To-Do</option>
                <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>In Progress</option>
                <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
            </select>
            <div class="flex items-center gap-2">
                <button onclick="editTask('${task.id}')" class="text-slate-400 hover:text-sky-300"><i class="fa-solid fa-pen text-xs"></i></button>
                <button onclick="deleteTask('${task.id}')" class="text-slate-500 hover:text-red-400"><i class="fa-solid fa-trash text-xs"></i></button>
            </div>
        </div>
    `;
    return div;
}

function setTaskFilter(type, val, btn) {
    window.state.currentTaskFilterPriority = val;
    document.querySelectorAll('.task-filter-prio').forEach(b => b.classList.remove('bg-sky-500/20', 'text-sky-300'));
    btn.classList.add('bg-sky-500/20', 'text-sky-300');
    renderTasks();
}

function updateTaskStatus(id, newStatus) {
    const task = (window.state.tasks || []).find(t => t.id === id);
    if(task) { 
        if(task.status !== 'done' && newStatus === 'done') {
            window.state.xpPoints = (window.state.xpPoints || 0) + 50; 
        }
        task.status = newStatus; 
        if(window.saveData) window.saveData(); 
        renderTasks(); 
        renderDashboard();
    }
}

function openTaskModal() {
    document.getElementById('editTaskId').value = '';
    document.getElementById('modalTaskTitleHeader').innerText = 'Tambah Tugas Baru';
    document.getElementById('inputTaskTitle').value = '';
    document.getElementById('inputTaskDueDate').value = '';
    document.getElementById('inputTaskDueTime').value = '';
    document.getElementById('modalTask').classList.remove('hidden'); document.getElementById('modalTask').classList.add('flex');
}

function editTask(id) {
    const task = (window.state.tasks || []).find(t => t.id === id);
    if(!task) return;
    document.getElementById('editTaskId').value = task.id;
    document.getElementById('modalTaskTitleHeader').innerText = 'Edit Tugas';
    document.getElementById('inputTaskTitle').value = task.title;
    document.getElementById('inputTaskCourseSelect').value = task.course || 'Umum';
    document.getElementById('inputTaskDueDate').value = task.dueDate || '';
    document.getElementById('inputTaskDueTime').value = task.dueTime || '';
    document.getElementById('inputTaskPriority').value = task.priority || 'MEDIUM';
    document.getElementById('modalTask').classList.remove('hidden'); document.getElementById('modalTask').classList.add('flex');
}

function closeTaskModal() { document.getElementById('modalTask').classList.add('hidden'); document.getElementById('modalTask').classList.remove('flex'); }

function saveTaskModal() {
    const editId = document.getElementById('editTaskId').value;
    const title = document.getElementById('inputTaskTitle').value;
    const course = document.getElementById('inputTaskCourseSelect').value;
    const dueDate = document.getElementById('inputTaskDueDate').value;
    const dueTime = document.getElementById('inputTaskDueTime').value;
    const priority = document.getElementById('inputTaskPriority').value;

    if(!title) return;
    if(!window.state.tasks) window.state.tasks = [];

    if(editId) {
        const idx = window.state.tasks.findIndex(t => t.id === editId);
        if(idx !== -1) {
            window.state.tasks[idx] = { ...window.state.tasks[idx], title, course, dueDate, dueTime, priority };
        }
    } else {
        window.state.tasks.push({ id: Date.now().toString(), title, course, dueDate, dueTime, priority, status: 'todo' });
    }

    if(window.saveData) window.saveData(); 
    renderTasks(); 
    renderDashboard();
    closeTaskModal();
}

function deleteTask(id) { 
    window.state.tasks = window.state.tasks.filter(t => t.id !== id); 
    if(window.saveData) window.saveData(); renderTasks(); renderDashboard();
}

let pomoState = { mode: 'work', timeTotal: 25 * 60, timeLeft: 25 * 60, timerId: null, isRunning: false };

function populatePomoTaskSelect() {
    const sel = document.getElementById('pomoTaskSelect');
    if(!sel) return;
    sel.innerHTML = `<option value="">-- Fokus Umum (Tanpa Spesifik Tugas) --</option>`;
    (window.state.tasks || []).filter(t => t.status !== 'done').forEach(t => {
        sel.innerHTML += `<option value="${t.id}">${t.title} (${t.course || 'Umum'})</option>`;
    });
}

function setPomoMode(mode) {
    pomoState.mode = mode; pomoState.timeTotal = mode === 'work' ? 25*60 : (mode === 'shortBreak' ? 5*60 : 15*60);
    pomoState.timeLeft = pomoState.timeTotal; pausePomoTimer(); updatePomoDisplay();
}

function togglePomoTimer() { if(pomoState.isRunning) pausePomoTimer(); else startPomoTimer(); }

function startPomoTimer() {
    pomoState.isRunning = true;
    pomoState.timerId = setInterval(() => {
        pomoState.timeLeft--; updatePomoDisplay();
        if(pomoState.timeLeft <= 0) {
            pausePomoTimer();
            if(pomoState.mode === 'work') { 
                window.state.pomoCount = (window.state.pomoCount || 0) + 1; 
                window.state.pomoMinutes = (window.state.pomoMinutes || 0) + 25; 
                window.state.xpPoints = (window.state.xpPoints || 0) + 30; 
                
                const selectedTaskId = document.getElementById('pomoTaskSelect').value;
                if(selectedTaskId) {
                    const task = window.state.tasks.find(t => t.id === selectedTaskId);
                    if(task && task.course) {
                        if(!window.state.coursePomoMap) window.state.coursePomoMap = {};
                        window.state.coursePomoMap[task.course] = (window.state.coursePomoMap[task.course] || 0) + 25;
                    }
                }
                if(window.saveData) window.saveData(); 
                sendBrowserNotif("Sesi Fokus Selesai!", "Kerja bagus! Waktunya istirahat 5 menit.");
            }
            alert('Sesi Fokus Selesai! Kamu mendapatkan +30 XP.'); resetPomoTimer();
        }
    }, 1000);
}

function pausePomoTimer() { pomoState.isRunning = false; clearInterval(pomoState.timerId); }
function resetPomoTimer() { pausePomoTimer(); pomoState.timeLeft = pomoState.timeTotal; updatePomoDisplay(); }
function updatePomoDisplay() {
    const min = Math.floor(pomoState.timeLeft / 60), sec = pomoState.timeLeft % 60;
    document.getElementById('pomoTimeDisplay').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

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

function renderHabits() {
    const container = document.getElementById('habitsContainer');
    if (!container) return;
    container.innerHTML = '';

    (window.state.habits || []).forEach(habit => {
        const todayStr = new Date().toISOString().split('T')[0];
        const completedDates = habit.completedDates || [];
        const isDoneToday = completedDates.includes(todayStr);

        let streak = 0;
        let checkDate = new Date();

        while (true) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (completedDates.includes(dateStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        habit.streak = streak;

        const card = document.createElement('div');
        card.className = 'liquid-glass p-5 rounded-2xl flex flex-col justify-between space-y-3';
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <h4 class="font-bold text-xs text-white">${habit.name}</h4>
                <button onclick="deleteHabit('${habit.id}')" class="text-slate-500 hover:text-red-400 text-xs">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xl font-extrabold text-sky-400">🔥 ${streak}</span>
                <span class="text-[10px] text-slate-400">Hari Beruntun</span>
            </div>
            <button onclick="toggleHabitDone('${habit.id}')" class="w-full py-2.5 rounded-xl text-xs font-bold ${
                isDoneToday ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500 text-slate-950'
            }">
                ${isDoneToday ? '✅ Selesai Hari Ini' : 'Tandai Selesai'}
            </button>
        `;
        container.appendChild(card);
    });
}

function toggleHabitDone(id) {
    const habit = (window.state.habits || []).find(h => h.id === id);
    if (!habit) return;
    const todayStr = new Date().toISOString().split('T')[0];
    if (!habit.completedDates) habit.completedDates = [];

    const index = habit.completedDates.indexOf(todayStr);
    if (index !== -1) {
        habit.completedDates.splice(index, 1);
    } else {
        habit.completedDates.push(todayStr);
        window.state.xpPoints = (window.state.xpPoints || 0) + 20;
    }

    let streak = 0;
    let checkDate = new Date();
    while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (habit.completedDates.includes(dateStr)) {
            streak++; checkDate.setDate(checkDate.getDate() - 1);
        } else break;
    }
    habit.streak = streak;
    if (window.saveData) window.saveData();
    renderHabits(); renderDashboard();
}

function openHabitModal() { document.getElementById('modalHabit').classList.remove('hidden'); document.getElementById('modalHabit').classList.add('flex'); }
function closeHabitModal() { document.getElementById('modalHabit').classList.add('hidden'); document.getElementById('modalHabit').classList.remove('flex'); }

function saveHabitModal() {
    const name = document.getElementById('inputHabitName').value.trim();
    if (!name) return;
    if (!window.state.habits) window.state.habits = [];
    window.state.habits.push({ id: Date.now().toString(), name, streak: 0, lastDone: '', completedDates: [] });
    if (window.saveData) window.saveData();
    renderHabits(); renderDashboard(); closeHabitModal();
}
function deleteHabit(id) { 
    window.state.habits = window.state.habits.filter(h => h.id !== id); 
    if(window.saveData) window.saveData(); renderHabits(); renderDashboard();
}

let currentFlashcardIdx = 0, isCardFlipped = false;
function renderFlashcards() {
    const cards = window.state.flashcards || [];
    if(cards.length === 0) return;
    const card = cards[currentFlashcardIdx % cards.length];
    document.getElementById('cardDeckTag').innerText = card.deck || 'Umum';
    document.getElementById('cardQuestionText').innerText = card.question;
    document.getElementById('cardAnswerText').innerText = card.answer;
}
function flipCard() {
    const cardEl = document.getElementById('flashcardCard'); isCardFlipped = !isCardFlipped;
    if(isCardFlipped) {
        cardEl.classList.add('rotate-y-180'); document.getElementById('flashcardReviewControls').classList.remove('hidden');
    } else {
        cardEl.classList.remove('rotate-y-180'); document.getElementById('flashcardReviewControls').classList.add('hidden');
    }
}
function rateFlashcard(difficulty) {
    const cards = window.state.flashcards || [];
    if (cards.length === 0) return;
    const card = cards[currentFlashcardIdx % cards.length];
    card.lastReviewed = new Date().toISOString();
    card.lastDifficulty = difficulty;
    if (!card.reviewCount) card.reviewCount = 0;
    card.reviewCount++;
    if (difficulty === 'HARD') card.nextReviewDays = 1;
    else if (difficulty === 'MEDIUM') card.nextReviewDays = 3;
    else if (difficulty === 'EASY') card.nextReviewDays = 7;
    if (window.saveData) window.saveData();
    isCardFlipped = false;
    const cardEl = document.getElementById('flashcardCard');
    if (cardEl) cardEl.classList.remove('rotate-y-180');
    document.getElementById('flashcardReviewControls').classList.add('hidden');
    currentFlashcardIdx++; renderFlashcards();
}
function openFlashcardModal() { document.getElementById('modalFlashcard').classList.remove('hidden'); document.getElementById('modalFlashcard').classList.add('flex'); }
function closeFlashcardModal() { document.getElementById('modalFlashcard').classList.add('hidden'); document.getElementById('modalFlashcard').classList.remove('flex'); }
function saveFlashcardModal() {
    const deck = document.getElementById('inputFlashDeck').value, question = document.getElementById('inputFlashQuestion').value, answer = document.getElementById('inputFlashAnswer').value;
    if(!question || !answer) return;
    if(!window.state.flashcards) window.state.flashcards = [];
    window.state.flashcards.push({ id: Date.now().toString(), deck, question, answer });
    if(window.saveData) window.saveData(); renderFlashcards(); closeFlashcardModal();
}

function calculateBudget() {
    const balance = parseFloat(document.getElementById('bgBalance').value) || 0;
    const days = parseFloat(document.getElementById('bgDays').value) || 1;
    const savings = parseFloat(document.getElementById('bgSavings').value) || 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayExpenses = (window.state.expenses || []).filter(e => e.date && e.date.split('T')[0] === todayStr).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netBalance = Math.max(0, balance - savings - todayExpenses);
    const dailyLimit = Math.floor(netBalance / days);
    document.getElementById('bgSafeSpendDisplay').innerText = `Rp ${dailyLimit.toLocaleString('id-ID')} / hari`;
    renderExpenses();
}
function addExpense() {
    const name = document.getElementById('expenseName').value;
    const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
    if(!name || amount <= 0) return;
    if(!window.state.expenses) window.state.expenses = [];
    window.state.expenses.push({ id: Date.now().toString(), name, amount, date: new Date().toISOString() });
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
        listEl.innerHTML = `<div class="text-slate-500 italic text-xs">Belum ada pengeluaran.</div>`;
        return;
    }
    [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(e => {
        const date = e.date ? new Date(e.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
        const item = document.createElement('div');
        item.className = 'bg-slate-900/60 p-2 rounded-xl border border-white/10 flex justify-between items-center';
        item.innerHTML = `<div><div class="text-slate-300 font-medium">${e.name}</div><div class="text-[9px] text-slate-500">${date}</div></div><span class="text-red-400 font-bold">- Rp ${Number(e.amount || 0).toLocaleString('id-ID')}</span>`;
        listEl.appendChild(item);
    });
}

function updateAnalytics() {
    const completedTasks = (window.state.tasks || []).filter(t => t.status === 'done').length;
    document.getElementById('analyticsTasksCompleted').innerText = completedTasks;
    document.getElementById('analyticsPomoMinutes').innerText = (window.state.pomoMinutes || 0) + 'm';
    document.getElementById('scoreValue').innerText = window.state.xpPoints || 0;
    const breakdownEl = document.getElementById('courseFocusBreakdown');
    if(breakdownEl) {
        breakdownEl.innerHTML = '';
        const map = window.state.coursePomoMap || {};
        if(Object.keys(map).length === 0) {
            breakdownEl.innerHTML = `<div class="text-slate-500 italic">Belum ada durasi fokus tercatat per mata kuliah.</div>`;
        } else {
            Object.keys(map).forEach(cName => {
                const mins = map[cName];
                const item = document.createElement('div');
                item.className = 'bg-slate-900/60 p-2.5 rounded-xl border border-white/10 flex justify-between items-center';
                item.innerHTML = `<span class="font-bold text-white">${cName}</span><span class="text-sky-400 font-bold">${mins} Menit Fokus</span>`;
                breakdownEl.appendChild(item);
            });
        }
    }
}

window.renderAll = function() {
    renderCourses(); renderTasks(); renderHabits(); renderFlashcards(); renderExpenses(); updatePomoDisplay(); renderDashboard(); updateAnalytics();
};
