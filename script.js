let tasks = JSON.parse(localStorage.getItem('nexa_tasks')) || [];
let currentFilter = 'All';
let timerInterval = null;
let timeLeft = 25 * 60;
const totalTime = 25 * 60;
let isTimerRunning = false;
let completedPomodoros = parseInt(localStorage.getItem('nexa_pomo')) || 0;

document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    updateStats();
    setupCircle();
    document.getElementById('pomoCount').innerText = completedPomodoros;
});

/* Pindah Tab Navigasi iOS */
function switchTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`${tabName}Tab`).classList.add('active');
    btn.classList.add('active');
}

/* Kelola Tugas */
function handleAddTask(e) {
    e.preventDefault();
    const title = document.getElementById('taskTitle').value.trim();
    const course = document.getElementById('taskCourse').value.trim();
    const priority = document.getElementById('taskPriority').value;

    tasks.push({ id: Date.now(), title, course, priority, completed: false });
    saveTasks();
    renderTasks();
    updateStats();
    document.getElementById('taskForm').reset();
}

function toggleTask(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    saveTasks();
    renderTasks();
    updateStats();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateStats();
}

function filterTasks(priority, btn) {
    currentFilter = priority;
    document.querySelectorAll('.pill').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    renderTasks();
}

function saveTasks() {
    localStorage.setItem('nexa_tasks', JSON.stringify(tasks));
}

function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    const filtered = currentFilter === 'All' ? tasks : tasks.filter(t => t.priority === currentFilter);

    if (filtered.length === 0) {
        list.innerHTML = `<p style="color:#64748b; text-align:center; padding: 20px;">Belum ada tugas.</p>`;
        return;
    }

    filtered.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-item ${task.priority} ${task.completed ? 'completed' : ''}`;
        div.innerHTML = `
            <div>
                <h4 style="font-size: 0.95rem;">${task.title}</h4>
                <p style="font-size: 0.75rem; color:#94a3b8; margin-top:2px;">${task.course}</p>
            </div>
            <div class="task-actions">
                <button onclick="toggleTask(${task.id})" class="icon-btn">
                    <i class="fa-solid ${task.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
                </button>
                <button onclick="deleteTask(${task.id})" class="icon-btn" style="color:#ef4444;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const rate = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statCompleted').innerText = completed;
    document.getElementById('statRate').innerText = `${rate}%`;
}

/* Circular Timer (Pomodoro) */
const circle = document.getElementById('timerCircle');
let circumference = 2 * Math.PI * 90;

function setupCircle() {
    if(!circle) return;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = 0;
}

function setProgress(percent) {
    if(!circle) return;
    const offset = circumference - (percent / 100 * circumference);
    circle.style.strokeDashoffset = offset;
}

function toggleTimer() {
    const btn = document.getElementById('startTimerBtn');
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Lanjutkan';
    } else {
        isTimerRunning = true;
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Jeda';
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            setProgress((timeLeft / totalTime) * 100);
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                isTimerRunning = false;
                completedPomodoros++;
                localStorage.setItem('nexa_pomo', completedPomodoros);
                document.getElementById('pomoCount').innerText = completedPomodoros;
                alert('Sesi Pomodoro Selesai!');
                resetTimer();
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timeLeft = totalTime;
    updateTimerDisplay();
    setProgress(100);
    document.getElementById('startTimerBtn').innerHTML = '<i class="fa-solid fa-play"></i> Mulai Fokus';
}

function updateTimerDisplay() {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    document.getElementById('timerDisplay').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}
