/**
 * SMOKETRACK - Modern Cigarette Tracker
 */

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = 'smoketrack_data';
const SETTINGS_KEY = 'smoketrack_settings';

const defaultSettings = {
    dailyGoal: 10,
    darkMode: true
};

function getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { records: [] };
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getSettings() {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : { ...defaultSettings };
}

function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ============================================
// DATE UTILS
// ============================================

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatDate(d) {
    return new Date(d).toISOString().split('T')[0];
}

function formatTime(d) {
    return new Date(d).toTimeString().slice(0, 5);
}

function getToday() {
    return formatDate(new Date());
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getWeekDays(start) {
    const days = [];
    const s = new Date(start);
    for (let i = 0; i < 7; i++) {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        days.push(formatDate(d));
    }
    return days;
}

// ============================================
// RECORDS
// ============================================

function addRecord(date, time, note = '', amount = 1) {
    const data = getData();
    data.records.push({
        id: Date.now(),
        date,
        time,
        note,
        amount, // 1 = completo, 0.5 = medio
        ts: new Date(`${date}T${time}`).getTime()
    });
    data.records.sort((a, b) => b.ts - a.ts);
    saveData(data);
}

function deleteRecord(id) {
    const data = getData();
    data.records = data.records.filter(r => r.id !== id);
    saveData(data);
}

function getRecordsForDate(date) {
    return getData().records.filter(r => r.date === date).sort((a, b) => b.ts - a.ts);
}

function getCountForDate(date) {
    const records = getRecordsForDate(date);
    return records.reduce((sum, r) => sum + (r.amount || 1), 0);
}

function getTodayCount() {
    return getCountForDate(getToday());
}

function getWeekData(weekStart) {
    const days = getWeekDays(weekStart);
    const data = getData().records;
    const result = {};
    days.forEach(day => {
        const dayRecords = data.filter(r => r.date === day);
        result[day] = dayRecords.reduce((sum, r) => sum + (r.amount || 1), 0);
    });
    return result;
}

function getWeekTotal() {
    const weekData = getWeekData(getWeekStart(new Date()));
    return Object.values(weekData).reduce((a, b) => a + b, 0);
}

// ============================================
// STATS
// ============================================

function getStats() {
    const data = getData().records;
    if (data.length === 0) {
        return { total: 0, days: 0, avg: 0, best: null, worst: null };
    }

    const byDate = {};
    data.forEach(r => {
        byDate[r.date] = (byDate[r.date] || 0) + (r.amount || 1);
    });

    const dates = Object.keys(byDate).sort();
    const total = Object.values(byDate).reduce((a, b) => a + b, 0);
    const days = dates.length;
    const avg = (total / days).toFixed(1);

    let best = { date: dates[0], count: byDate[dates[0]] };
    let worst = { date: dates[0], count: byDate[dates[0]] };

    dates.forEach(date => {
        if (byDate[date] < best.count) best = { date, count: byDate[date] };
        if (byDate[date] > worst.count) worst = { date, count: byDate[date] };
    });

    return { total, days, avg, best, worst };
}

// ============================================
// UI
// ============================================

let weekOffset = 0;
let calendarDate = new Date();
let selectedCalDay = null;

function updateAll() {
    updateHero();
    updateStats();
    updateChart();
    updateLog();
}

function updateHero() {
    const today = new Date();
    const dayName = DAYS_FULL[today.getDay()];
    const dayNum = today.getDate();
    const month = MONTHS[today.getMonth()];

    document.getElementById('heroDate').textContent = `${dayName}, ${dayNum} ${month}`;

    const count = getTodayCount();
    document.getElementById('todayCount').textContent = count;

    const settings = getSettings();
    const goal = settings.dailyGoal;
    const goalEl = document.getElementById('heroGoal');
    const progress = goalEl.querySelector('.goal-progress');
    const text = goalEl.querySelector('.goal-text');

    text.textContent = `Meta: ${count}/${goal}`;

    progress.classList.remove('warning', 'danger');
    if (count >= goal) {
        progress.classList.add('danger');
    } else if (count >= goal * 0.8) {
        progress.classList.add('warning');
    }
}

function updateStats() {
    document.getElementById('weekCount').textContent = getWeekTotal();

    const stats = getStats();
    document.getElementById('avgCount').textContent = stats.avg || '0';
    document.getElementById('bestDay').textContent = stats.best ? stats.best.count : '-';
}

function updateChart() {
    const today = new Date();
    const adjusted = new Date(today);
    adjusted.setDate(today.getDate() + weekOffset * 7);

    const weekStart = getWeekStart(adjusted);
    const weekDays = getWeekDays(weekStart);
    const weekData = getWeekData(weekStart);
    const settings = getSettings();

    // Week label
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const label = weekOffset === 0 ? 'Actual' :
        `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
    document.getElementById('weekLabel').textContent = label;

    const maxCount = Math.max(settings.dailyGoal, ...Object.values(weekData));
    const todayStr = getToday();
    const chart = document.getElementById('weekChart');

    chart.innerHTML = weekDays.map((day, i) => {
        const count = weekData[day] || 0;
        const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const d = new Date(day);
        const isToday = day === todayStr;
        const isOver = count > settings.dailyGoal;

        let barClass = 'chart-bar';
        if (isToday) barClass += ' today';
        if (isOver) barClass += ' over';

        return `
            <div class="chart-day">
                <span class="chart-day-name">${DAYS[(i + 1) % 7]}</span>
                <div class="chart-bar-wrap">
                    <div class="${barClass}" style="height: ${height}%"></div>
                </div>
                <span class="chart-day-count">${count}</span>
                <span class="chart-day-date">${d.getDate()}</span>
            </div>
        `;
    }).join('');
}

function updateLog() {
    const records = getRecordsForDate(getToday());
    const list = document.getElementById('logList');
    const countEl = document.getElementById('logCount');

    countEl.textContent = `${records.length} registro${records.length !== 1 ? 's' : ''}`;

    if (records.length === 0) {
        list.innerHTML = `
            <div class="log-empty">
                <span>✨</span>
                <p>Sin registros hoy</p>
            </div>
        `;
        return;
    }

    list.innerHTML = records.map(r => {
        const amt = parseFloat(r.amount) || 1;
        const label = amt < 1 ? 'Medio Cigarro' : 'Un Cigarro';
        return `
        <div class="log-item" data-id="${r.id}">
            <div class="log-info">
                <span class="log-time">${r.time}</span>
                <span class="log-amount">${label}</span>
                ${r.note ? `<span class="log-note">${r.note}</span>` : ''}
            </div>
            <button class="btn-delete" onclick="handleDelete(${r.id})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
            </button>
        </div>
    `}).join('');
}

function handleDelete(id) {
    if (confirm('¿Eliminar este registro?')) {
        deleteRecord(id);
        updateAll();
        showToast('Eliminado');
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// ============================================
// MODALS
// ============================================

function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ============================================
// VIEWS
// ============================================

function showView(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.view === name);
    });

    if (name === 'calendar') {
        document.getElementById('viewCalendar').classList.add('active');
        renderCalendar();
    } else if (name === 'stats') {
        document.getElementById('viewStats').classList.add('active');
        renderStatsView();
    }
}

function renderCalendar() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    document.getElementById('monthLabel').textContent = `${MONTHS[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday first

    const today = getToday();
    const data = getData().records;

    let html = DAYS.slice(1).concat(DAYS[0]).map(d =>
        `<div class="cal-header">${d}</div>`
    ).join('');

    // Empty cells
    for (let i = 0; i < startDay; i++) {
        html += '<div class="cal-day empty"></div>';
    }

    // Days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayRecords = data.filter(r => r.date === dateStr);
        const count = dayRecords.reduce((sum, r) => sum + (r.amount || 1), 0);
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedCalDay;

        let cls = 'cal-day';
        if (isToday) cls += ' today';
        if (isSelected) cls += ' selected';

        html += `
            <div class="${cls}" onclick="selectCalDay('${dateStr}')">
                <span class="cal-day-num">${d}</span>
                ${count > 0 ? `<span class="cal-day-count">${count}</span>` : ''}
            </div>
        `;
    }

    document.getElementById('calendar').innerHTML = html;
    renderDayDetail();
}

function selectCalDay(date) {
    selectedCalDay = date;
    renderCalendar();
}

function renderDayDetail() {
    const detail = document.getElementById('dayDetail');

    if (!selectedCalDay) {
        detail.innerHTML = '<div class="day-detail-empty">Selecciona un día</div>';
        return;
    }

    const records = getRecordsForDate(selectedCalDay);
    const d = new Date(selectedCalDay);
    const dateStr = `${DAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

    if (records.length === 0) {
        detail.innerHTML = `
            <div class="day-detail-header">
                <span class="day-detail-date">${dateStr}</span>
            </div>
            <div class="day-detail-empty">Sin registros</div>
        `;
        return;
    }

    const totalAmount = records.reduce((sum, r) => sum + (r.amount || 1), 0);
    detail.innerHTML = `
        <div class="day-detail-header">
            <span class="day-detail-date">${dateStr}</span>
            <span class="day-detail-total">${totalAmount} cigarrillos</span>
        </div>
        ${records.map(r => {
            const amt = parseFloat(r.amount) || 1;
            const label = amt < 1 ? 'Medio Cigarro' : 'Un Cigarro';
            return `
            <div class="log-item">
                <div class="log-info">
                    <span class="log-time">${r.time}</span>
                    <span class="log-amount">${label}</span>
                    ${r.note ? `<span class="log-note">${r.note}</span>` : ''}
                </div>
            </div>
        `}).join('')}
    `;
}

function renderStatsView() {
    const stats = getStats();
    const settings = getSettings();
    const grid = document.getElementById('statsGrid');

    grid.innerHTML = `
        <div class="stats-card">
            <div class="stats-card-icon">🚬</div>
            <div class="stats-card-value">${stats.total}</div>
            <div class="stats-card-label">Total registrados</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-icon">📅</div>
            <div class="stats-card-value">${stats.days}</div>
            <div class="stats-card-label">Días con registros</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-icon">📊</div>
            <div class="stats-card-value">${stats.avg}</div>
            <div class="stats-card-label">Media diaria</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-icon">🎯</div>
            <div class="stats-card-value">${settings.dailyGoal}</div>
            <div class="stats-card-label">Meta diaria</div>
        </div>
        ${stats.best ? `
        <div class="stats-card">
            <div class="stats-card-icon">⭐</div>
            <div class="stats-card-value">${stats.best.count}</div>
            <div class="stats-card-label">Mejor día</div>
        </div>
        <div class="stats-card">
            <div class="stats-card-icon">📈</div>
            <div class="stats-card-value">${stats.worst.count}</div>
            <div class="stats-card-label">Máximo en un día</div>
        </div>
        ` : ''}
        <div class="stats-card wide">
            <div class="stats-card-icon">📆</div>
            <div class="stats-card-value">${getWeekTotal()}</div>
            <div class="stats-card-label">Esta semana</div>
        </div>
    `;
}

// ============================================
// SETTINGS
// ============================================

function loadSettings() {
    const s = getSettings();
    document.getElementById('inputGoal').value = s.dailyGoal;
    document.getElementById('toggleTheme').checked = s.darkMode;
    applyTheme(s.darkMode);
}

function applyTheme(dark) {
    if (dark) {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

function saveSettingsFromForm() {
    const s = {
        dailyGoal: parseInt(document.getElementById('inputGoal').value) || 10,
        darkMode: document.getElementById('toggleTheme').checked
    };
    saveSettings(s);
    applyTheme(s.darkMode);
    closeModal('modalSettings');
    updateAll();
    showToast('Guardado');
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    updateAll();

    // Amount for modal (1 = full, 0.5 = half)
    let currentAmount = 1;

    // Setup for both add buttons
    function setupAddButton(btn, amount) {
        let pressTimer;
        let longPress = false;

        btn.addEventListener('click', (e) => {
            if (longPress) {
                longPress = false;
                return;
            }
            const now = new Date();
            addRecord(formatDate(now), formatTime(now), '', amount);
            btn.classList.add('pulse');
            setTimeout(() => btn.classList.remove('pulse'), 200);
            updateAll();
            showToast(amount === 1 ? 'Registrado ✓' : '½ Registrado ✓');
        });

        // Long press for custom time
        btn.addEventListener('mousedown', startPress);
        btn.addEventListener('touchstart', startPress);
        btn.addEventListener('mouseup', cancelPress);
        btn.addEventListener('touchend', cancelPress);
        btn.addEventListener('mouseleave', cancelPress);

        function startPress(e) {
            longPress = false;
            pressTimer = setTimeout(() => {
                longPress = true;
                currentAmount = amount;
                const now = new Date();
                document.getElementById('inputDate').value = formatDate(now);
                document.getElementById('inputTime').value = formatTime(now);
                document.getElementById('inputNote').value = '';
                openModal('modalAdd');
            }, 400);
        }

        function cancelPress() {
            clearTimeout(pressTimer);
        }
    }

    // Setup both buttons
    const btnAddFull = document.getElementById('btnAddFull');
    const btnAddHalf = document.getElementById('btnAddHalf');
    setupAddButton(btnAddFull, 1);
    setupAddButton(btnAddHalf, 0.5);

    // Add modal
    document.getElementById('closeAdd').onclick = () => closeModal('modalAdd');
    document.getElementById('cancelAdd').onclick = () => closeModal('modalAdd');
    document.querySelector('#modalAdd .modal-bg').onclick = () => closeModal('modalAdd');

    document.getElementById('confirmAdd').onclick = () => {
        const date = document.getElementById('inputDate').value;
        const time = document.getElementById('inputTime').value;
        const note = document.getElementById('inputNote').value;
        if (date && time) {
            addRecord(date, time, note, currentAmount);
            closeModal('modalAdd');
            updateAll();
            showToast(currentAmount === 1 ? 'Registrado ✓' : '½ Registrado ✓');
        }
    };

    // Settings
    document.getElementById('btnSettings').onclick = () => {
        loadSettings();
        openModal('modalSettings');
    };
    document.getElementById('closeSettings').onclick = () => closeModal('modalSettings');
    document.querySelector('#modalSettings .modal-bg').onclick = () => closeModal('modalSettings');
    document.getElementById('saveSettings').onclick = saveSettingsFromForm;

    document.getElementById('toggleTheme').onchange = function() {
        applyTheme(this.checked);
    };

    document.getElementById('btnReset').onclick = () => {
        if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
            localStorage.removeItem(STORAGE_KEY);
            closeModal('modalSettings');
            updateAll();
            showToast('Datos borrados');
        }
    };

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = () => showView(btn.dataset.view);
    });

    // Back buttons
    document.getElementById('backCalendar').onclick = () => showView('home');
    document.getElementById('backStats').onclick = () => showView('home');

    // Week navigation
    document.getElementById('btnPrevWeek').onclick = () => {
        weekOffset--;
        updateChart();
    };
    document.getElementById('btnNextWeek').onclick = () => {
        if (weekOffset < 0) {
            weekOffset++;
            updateChart();
        }
    };

    // Calendar navigation
    document.getElementById('prevMonth').onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    };
    document.getElementById('nextMonth').onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    };
});

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
