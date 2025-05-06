// App state
const state = {
    militaries: [],
    schedules: {},
    currentDate: new Date(),
    selectedDay: null,
    selectedMonth: new Date().getMonth(),
    selectedYear: new Date().getFullYear(),
    activeView: 'month',
    activeTab: 'dashboard', // Track active tab for navigation
    isLoading: true,
    dataInitialized: false
};

// Constants
const DUTY_REFERENCE_DATE = new Date(2025, 3, 3); // April 3, 2025
const MAX_OFFICERS_PER_DAY = 3;
const MAX_EXTRA_SHIFTS = 12;
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - initializing app directly');
    
    try {
        // Setup app without login
        setupApp();
        
        // Call initApp directly
        if (typeof initApp === 'function') {
            initApp();
        }
    } catch (error) {
        console.error('Critical error in app initialization:', error);
    }
    
    // Hide loading screen after a short delay to show loading animation
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
            console.log('Loading screen timeout - hiding');
            loadingScreen.classList.add('hidden');
        }
    }, 1500); // 1.5 second timeout to show loading animation
});

// Simplified initialization without login forms
function setupApp() {
    console.log('Setting up app without login');
    
    // Handle only the logout button for session reset
    const logoutButton = document.getElementById('logout-button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (confirm('Deseja realmente reinicializar a sessão?')) {
                // Just reload the page to "reset" without login
                window.location.reload();
            }
        });
    } else {
        console.warn('Logout button not found');
    }
}

// Initialize the app after successful authentication
function initApp() {
    console.log("Iniciando Aplicação...");
    
    // Show loading screen while data loads
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
    
    try {
        // Load data from Firebase
        loadData()
            .then(() => {
                // Set initial UI values
                const monthSelect = document.getElementById('monthSelect');
                const yearSelect = document.getElementById('yearSelect');
                
                if (monthSelect && yearSelect) {
                    monthSelect.value = state.selectedMonth;
                    yearSelect.value = state.selectedYear;
                }
                
                // Update header displays
                updateMonthYearDisplay();
                
                // Add event listeners
                setupEventListeners();
                
                // Generate calendar and stats
                generateCalendar();
                updateTeamStats();
                
                console.log("App initialized successfully");
                
                // Hide loading screen
                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.classList.add('hidden');
                    }
                }, 1000);
            })
            .catch(error => {
                console.error('Error initializing app:', error);
                showErrorAlert('Erro ao carregar dados! Tente novamente.');
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                }
            });
    } catch (e) {
        console.error("Critical error during initialization:", e);
        showErrorAlert("Erro crítico na inicialização. Verifique o console.");
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
}

// Load data from Firebase or localStorage
function loadData() {
    state.isLoading = true;
    
    return Promise.all([
        // Load militaries
        loadMilitaries().then(militaries => {
            state.militaries = militaries;
            
            // If no militaries exist, initialize sample data
            if (state.militaries.length === 0 && !state.dataInitialized) {
                return initializeSampleData();
            }
        }),
        
        // Load schedules
        loadSchedules().then(schedules => {
            state.schedules = schedules || {};
        })
    ]).then(() => {
        state.isLoading = false;
        state.dataInitialized = true;
    }).catch(error => {
        console.error("Error loading data:", error);
        state.isLoading = false;
        showErrorAlert("Erro ao carregar dados. Usando dados locais.");
    });
}

// Save data to Firebase or localStorage
function saveData() {
    if (state.isLoading) return Promise.resolve(); // Don't save while loading
    
    try {
        // Convert militaries array to object with IDs as keys for Firebase
        const militariesObject = {};
        state.militaries.forEach(military => {
            militariesObject[military.id] = military;
        });
        
        return Promise.all([
            saveMilitaries(militariesObject),
            saveSchedules(state.schedules)
        ]);
    } catch (error) {
        console.error("Error saving data:", error);
        showErrorAlert("Erro ao salvar dados. Verifique sua conexão.");
        return Promise.reject(error);
    }
}

// Setup all event listeners
function setupEventListeners() {
    try {
        // Navigation
        setupNavigation();
        
        // Month navigation
        setupMonthNavigation();
        
        // Calendar views
        setupCalendarViews();
        
        // Team cards
        setupTeamCards();
        
        // Add schedule button
        setupAddScheduleButton();
        
        // Header buttons
        setupHeaderButtons();
        
        // Theme toggle
        setupThemeToggle();
        
        // Modal close buttons
        setupModalCloseButtons();
        
        // Setup real-time listeners
        setupRealtimeListeners();
        
        console.log("All event listeners set up successfully");
    } catch (error) {
        console.error("Error setting up event listeners:", error);
        showErrorAlert("Erro ao configurar a interface. Recarregue a página.");
    }
}

// Setup Firebase real-time data listeners or local periodic refresh
function setupRealtimeListeners() {
    let militariesListenerActive = false;
    let schedulesListenerActive = false;
    
    // Try to setup Firebase real-time listeners first
    militariesListenerActive = setupMilitariesListener(militaries => {
        state.militaries = militaries;
        
        // Update UI if on relevant screens
        if (state.activeTab === 'dashboard' || state.activeTab === 'cadastro') {
            generateCalendar();
            updateTeamStats();
        }
    });
    
    schedulesListenerActive = setupSchedulesListener(schedules => {
        state.schedules = schedules;
        
        // Update UI if on relevant screens
        if (state.activeTab === 'dashboard' || state.activeTab === 'escalas') {
            generateCalendar();
            updateTeamStats();
        }
    });
    
    // If Firebase listeners aren't active, set up periodic refresh for localStorage
    if (!militariesListenerActive || !schedulesListenerActive) {
        console.log('Using periodic refresh for localStorage data');
        
        // Check for localStorage changes every 5 seconds
        setInterval(() => {
            // Only refresh if we're not currently loading or saving
            if (!state.isLoading) {
                // Load militaries from localStorage
                const localMilitaries = JSON.parse(localStorage.getItem('militaries') || '[]');
                if (JSON.stringify(localMilitaries) !== JSON.stringify(state.militaries)) {
                    state.militaries = localMilitaries;
                    
                    // Update UI if on relevant screens
                    if (state.activeTab === 'dashboard' || state.activeTab === 'cadastro') {
                        generateCalendar();
                        updateTeamStats();
                    }
                }
                
                // Load schedules from localStorage
                const localSchedules = JSON.parse(localStorage.getItem('schedules') || '{}');
                if (JSON.stringify(localSchedules) !== JSON.stringify(state.schedules)) {
                    state.schedules = localSchedules;
                    
                    // Update UI if on relevant screens
                    if (state.activeTab === 'dashboard' || state.activeTab === 'escalas') {
                        generateCalendar();
                        updateTeamStats();
                    }
                }
            }
        }, 5000);
    }
}

// Setup site navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            // Set active nav item
            document.querySelectorAll('.nav-item').forEach(nav => 
                nav.classList.remove('active'));
            this.classList.add('active');
            
            // Handle navigation
            const navId = this.id;
            state.activeTab = navId.replace('-nav', '');
            
            switch(navId) {
                case 'dashboard-nav':
                    // Already on dashboard, just update UI
                    generateCalendar();
                    updateTeamStats();
                    break;
                case 'escalas-nav':
                    openScheduleModal(state.currentDate.getDate(), state.selectedMonth, state.selectedYear);
                    break;
                case 'guarnicoes-nav':
                    showTeamsReport();
                    break;
                case 'cadastro-nav':
                    showMilitaryManagement();
                    break;
                case 'relatorios-nav':
                    showReports();
                    break;
                case 'config-nav':
                    showConfigModal();
                    break;
            }
        });
    });
}

// Setup month navigation
function setupMonthNavigation() {
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            state.selectedMonth--;
            if (state.selectedMonth < 0) {
                state.selectedMonth = 11;
                state.selectedYear--;
            }
            updateMonthControls();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            state.selectedMonth++;
            if (state.selectedMonth > 11) {
                state.selectedMonth = 0;
                state.selectedYear++;
            }
            updateMonthControls();
        });
    }
    
    if (monthSelect) {
        monthSelect.addEventListener('change', function() {
            state.selectedMonth = parseInt(this.value);
            updateMonthControls();
        });
    }
    
    if (yearSelect) {
        yearSelect.addEventListener('change', function() {
            state.selectedYear = parseInt(this.value);
            updateMonthControls();
        });
    }
}

// Update month controls and redraw calendar
function updateMonthControls() {
    // Update selects
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) monthSelect.value = state.selectedMonth;
    if (yearSelect) yearSelect.value = state.selectedYear;
    
    // Update displays
    updateMonthYearDisplay();
    
    // Redraw calendar
    generateCalendar();
    updateTeamStats();
}

// Update month/year header displays
function updateMonthYearDisplay() {
    const monthYearElement = document.getElementById('currentMonthYear');
    const calendarTitle = document.querySelector('.calendar-title');
    
    const displayText = `${MONTHS[state.selectedMonth]} ${state.selectedYear}`;
    
    if (monthYearElement) monthYearElement.textContent = displayText;
    if (calendarTitle) calendarTitle.innerHTML = `<i class="fas fa-calendar-alt"></i> ${displayText}`;
}

// Setup calendar view buttons
function setupCalendarViews() {
    const viewButtons = document.querySelectorAll('.calendar-tab');
    
    viewButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            // Remove active class from all buttons
            viewButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Handle view change
            const viewId = this.id;
            
            switch(viewId) {
                case 'month-view':
                    state.activeView = 'month';
                    generateCalendar();
                    break;
                case 'week-view':
                    // Not implemented yet
                    showAlert('Vista semanal em desenvolvimento');
                    this.classList.remove('active');
                    document.getElementById('month-view').classList.add('active');
                    break;
                case 'list-view':
                    // Not implemented yet
                    showAlert('Vista em lista em desenvolvimento');
                    this.classList.remove('active');
                    document.getElementById('month-view').classList.add('active');
                    break;
            }
        });
    });
}

// Setup team card click events
function setupTeamCards() {
    const teamCards = document.querySelectorAll('.scale-card');
    
    teamCards.forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const cardId = this.id;
            const team = cardId.split('-')[0].toUpperCase();
            showTeamsReport(team);
        });
    });
}

// Setup add schedule button
function setupAddScheduleButton() {
    const addBtn = document.getElementById('addScheduleBtn');
    
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openScheduleModal(state.currentDate.getDate(), state.selectedMonth, state.selectedYear);
        });
    }
}

// Setup header buttons
function setupHeaderButtons() {
    const notificationsBtn = document.getElementById('notifications-btn');
    const helpBtn = document.getElementById('help-btn');
    
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            showAlert('Sistema de notificações em desenvolvimento');
        });
    }
    
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            showAlert('Sistema de ajuda em desenvolvimento');
        });
    }
}

// Setup theme toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            body.classList.toggle('dark-mode');
            localStorage.setItem('dark-mode', body.classList.contains('dark-mode'));
        });
        
        // Check saved preference
        if (localStorage.getItem('dark-mode') === 'true') {
            body.classList.add('dark-mode');
        }
    }
}

// Setup modal close buttons
function setupModalCloseButtons() {
    const closeButtons = document.querySelectorAll('.close-modal');
    
    closeButtons.forEach(btn => {
        const modal = btn.closest('.modal-overlay');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Also close when clicking outside modal
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Generate calendar
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    
    if (!calendarGrid) return;
    
    // Clear existing calendar
    calendarGrid.innerHTML = '';
    
    // Add day headers first
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    daysOfWeek.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get first day and last day of month
    const firstDay = new Date(state.selectedYear, state.selectedMonth, 1);
    const lastDay = new Date(state.selectedYear, state.selectedMonth + 1, 0);
    
    // Get the day of week the first day falls on (0 = Sunday)
    const startDay = firstDay.getDay();
    
    // Add empty days for the previous month
    for (let i = 0; i < startDay; i++) {
        const prevMonthDate = new Date(state.selectedYear, state.selectedMonth, 0 - (startDay - i - 1));
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-cell empty';
        dayDiv.textContent = prevMonthDate.getDate();
        calendarGrid.appendChild(dayDiv);
    }
    
    // Create days for current month
    const daysInMonth = lastDay.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(state.selectedYear, state.selectedMonth, day);
        const dateString = formatDateString(date);
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-cell';
        dayDiv.textContent = day;
        dayDiv.setAttribute('data-date', dateString);
        
        // Check if this is today
        const today = new Date();
        if (date.getDate() === today.getDate() && 
            date.getMonth() === today.getMonth() && 
            date.getFullYear() === today.getFullYear()) {
            dayDiv.classList.add('today');
        }
        
        // Check if this day has schedules
        if (state.schedules[dateString] && state.schedules[dateString].length > 0) {
            dayDiv.classList.add('event');
            // Add dot indicator for events
            const dot = document.createElement('div');
            dot.className = 'dot';
            dayDiv.appendChild(dot);
        }
        
        // Add click event
        dayDiv.addEventListener('click', () => {
            openScheduleModal(day, state.selectedMonth, state.selectedYear);
        });
        
        calendarGrid.appendChild(dayDiv);
    }
    
    // Add empty days for next month
    const totalDays = startDay + daysInMonth;
    const remainingCells = 7 - (totalDays % 7);
    
    if (remainingCells < 7) {
        for (let i = 1; i <= remainingCells; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-cell empty';
            dayDiv.textContent = i;
            calendarGrid.appendChild(dayDiv);
        }
    }
}

// Update team statistics
function updateTeamStats() {
    // Reset counters
    let alfaCount = 0;
    let bravoCount = 0;
    let charlieCount = 0;
    let expedienteCount = 0;
    
    // Get the current month as a string (YYYY-MM)
    const monthString = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    
    // Count schedules by team
    for (const dateString in state.schedules) {
        if (dateString.startsWith(monthString)) {
            state.schedules[dateString].forEach(schedule => {
                const military = getMilitaryById(schedule.id);
                if (military) {
                    switch(military.team) {
                        case 'ALFA':
                            alfaCount++;
                            break;
                        case 'BRAVO':
                            bravoCount++;
                            break;
                        case 'CHARLIE':
                            charlieCount++;
                            break;
                        case 'EXPEDIENTE':
                            expedienteCount++;
                            break;
                    }
                }
            });
        }
    }
    
    // Update UI
    document.getElementById('alfaCount').textContent = alfaCount;
    document.getElementById('bravoCount').textContent = bravoCount;
    document.getElementById('charlieCount').textContent = charlieCount;
    document.getElementById('expedienteCount').textContent = expedienteCount;
}

// Get military by ID
function getMilitaryById(id) {
    return state.militaries.find(m => m.id === id) || null;
}

// Format date string: YYYY-MM-DD
function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calculate duty team based on date
function getDutyTeam(date) {
    const dayMs = 24 * 60 * 60 * 1000;
    const refDate = new Date(DUTY_REFERENCE_DATE);
    
    // Calculate days between reference and current date
    const diffDays = Math.round((date.getTime() - refDate.getTime()) / dayMs);
    
    // Duty cycle is 21 days (7 days per team)
    const cycle = 21;
    
    // Normalize to positive number
    let dayInCycle = ((diffDays % cycle) + cycle) % cycle;
    
    // Determine team based on day in cycle
    if (dayInCycle < 7) {
        return 'BRAVO';  // First 7 days
    } else if (dayInCycle < 14) {
        return 'ALFA';   // Next 7 days
    } else {
        return 'CHARLIE'; // Last 7 days
    }
}

// Count militaries scheduled in current month
function countMilitarySchedules(militaryId) {
    const monthString = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    return countMilitarySchedulesInMonth(militaryId, monthString);
}

// Count militaries scheduled in specific month
function countMilitarySchedulesInMonth(militaryId, monthString) {
    let count = 0;
    
    for (const dateString in state.schedules) {
        if (dateString.startsWith(monthString)) {
            if (state.schedules[dateString].some(s => s.id === militaryId)) {
                count++;
            }
        }
    }
    
    return count;
}

// Get last schedule date for a military
function getLastScheduleDate(militaryId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastDate = null;
    let lastDateObj = null;
    
    for (const dateString in state.schedules) {
        if (state.schedules[dateString].some(s => s.id === militaryId)) {
            const scheduleDate = new Date(dateString);
            scheduleDate.setHours(0, 0, 0, 0);
            
            if (scheduleDate <= today) {
                if (!lastDateObj || scheduleDate > lastDateObj) {
                    lastDate = dateString;
                    lastDateObj = scheduleDate;
                }
            }
        }
    }
    
    return lastDate;
}

// Get next schedule date for a military
function getNextScheduleDate(militaryId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextDate = null;
    let nextDateObj = null;
    
    for (const dateString in state.schedules) {
        if (state.schedules[dateString].some(s => s.id === militaryId)) {
            const scheduleDate = new Date(dateString);
            scheduleDate.setHours(0, 0, 0, 0);
            
            if (scheduleDate > today) {
                if (!nextDateObj || scheduleDate < nextDateObj) {
                    nextDate = dateString;
                    nextDateObj = scheduleDate;
                }
            }
        }
    }
    
    return nextDate;
}

// Open Schedule Modal
function openScheduleModal(day, month, year) {
    const modal = document.getElementById('scheduleModal');
    if (!modal) {
        showErrorAlert("Erro ao abrir o modal de escalas");
        return;
    }

    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = modal.querySelector('#selectedDate');
    const modalContent = document.getElementById('modalContent');
    
    // Set selected day
    state.selectedDay = { day, month, year };
    
    const date = new Date(year, month, day);
    const dateString = formatDateString(date);
    const formattedDate = date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Update modal title
    if (modalTitle) modalTitle.textContent = "Escalar Militar";
    if (modalSubtitle) modalSubtitle.textContent = formattedDate;
    
    // Generate modal content
    if (modalContent) {
        const daySchedules = state.schedules[dateString] || [];
        const dutyTeam = getDutyTeam(date);
        
        let html = `
            <div id="scheduleError" class="alert alert-danger" style="display:none">
                <i class="fas fa-exclamation-circle"></i>
                <span>Erro ao escalar militar!</span>
            </div>
            
            <div class="modal-section">
                <h4 class="modal-section-title">
                    <i class="fas fa-user-plus"></i>
                    Adicionar Militar
                </h4>
                <p class="modal-section-subtitle">Guarnição de serviço: <strong class="${dutyTeam.toLowerCase()}-text">${dutyTeam}</strong></p>
                <div class="form-group">
                    <label for="militarySelect" class="form-label">Selecione o Militar:</label>
                    <select id="militarySelect" class="form-control">
                        ${generateMilitaryOptionsForDuty(dutyTeam, daySchedules)}
                    </select>
                </div>
                <button class="btn btn-primary" id="addMilitaryToScheduleBtn">
                    <i class="fas fa-plus"></i> ADICIONAR
                </button>
            </div>
            
            <div class="modal-section">
                <h4 class="modal-section-title">
                    <i class="fas fa-clipboard-list"></i>
                    Militares Escalados
                </h4>
                <div id="scheduledMilitariesList">
                    ${generateScheduledMilitaryList(daySchedules)}
                </div>
            </div>
        `;
        
        modalContent.innerHTML = html;
        
        // Add event listeners
        const addBtn = document.getElementById('addMilitaryToScheduleBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => addMilitaryToSchedule(dateString));
        }
        
        // Add remove button listeners
        setupRemoveScheduleButtons(dateString);
    }
    
    // Show modal
    modal.classList.add('active');
}

// Setup remove buttons for scheduled militaries
function setupRemoveScheduleButtons(dateString) {
    const removeButtons = document.querySelectorAll('.remove-military-btn');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const militaryId = this.getAttribute('data-id');
            removeMilitaryFromSchedule(dateString, militaryId);
        });
    });
}

// Generate military options for dropdown
function generateMilitaryOptionsForDuty(dutyTeam, scheduledMilitaries) {
    // Modificado para incluir todos os militares, independentemente da equipe
    // Remover apenas os que já estão escalados no mesmo dia
    const availableMilitaries = state.militaries.filter(m => 
        !scheduledMilitaries.some(s => s.id === m.id)
    );
    
    if (availableMilitaries.length === 0) {
        return '<option value="">Nenhum militar disponível</option>';
    }
    
    // Generate options HTML
    return availableMilitaries.map(m => {
        const count = countMilitarySchedules(m.id);
        const disabled = count >= MAX_EXTRA_SHIFTS ? 'disabled' : '';
        // Adicionando um indicador visual para militares da equipe de serviço atual
        const isInDutyTeam = m.team === dutyTeam;
        const teamLabel = isInDutyTeam ? `${m.team} ⚠️` : m.team;
        return `<option value="${m.id}" ${disabled} ${isInDutyTeam ? 'class="conflict-option"' : ''}>${m.rank} ${m.name} (${teamLabel}) - ${count}/${MAX_EXTRA_SHIFTS} escalas</option>`;
    }).join('');
}

// Generate scheduled militaries list
function generateScheduledMilitaryList(scheduledMilitaries) {
    if (scheduledMilitaries.length === 0) {
        return '<div class="no-militaries">Nenhum militar escalado para esta data.</div>';
    }
    
    return scheduledMilitaries.map(schedule => {
        const military = getMilitaryById(schedule.id);
        if (!military) return '';
        
        // Verificar se é um militar com conflito
        const hasConflict = schedule.hasConflict === true;
        
        return `
            <div class="scheduled-item ${hasConflict ? 'conflict-item' : ''}">
                <div class="scheduled-avatar ${military.team.toLowerCase()}-bg">
                    ${military.name.charAt(0)}
                </div>
                <div class="scheduled-info">
                    <div class="scheduled-name">${military.rank} ${military.name}</div>
                    <div class="scheduled-team ${military.team.toLowerCase()}-text">
                        ${military.team}
                        ${hasConflict ? '<span class="conflict-badge"><i class="fas fa-exclamation-triangle"></i> Conflito</span>' : ''}
                    </div>
                </div>
                <button class="remove-military-btn" data-id="${military.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Add military to schedule
function addMilitaryToSchedule(dateString) {
    try {
        const militarySelect = document.getElementById('militarySelect');
        const errorElement = document.getElementById('scheduleError');
        
        if (!militarySelect || militarySelect.value === "") {
            showScheduleError("Selecione um militar!");
            return;
        }
        
        const militaryId = militarySelect.value;
        const military = getMilitaryById(militaryId);
        
        if (!military) {
            showScheduleError("Militar não encontrado!");
            return;
        }
        
        // Check if already scheduled
        if (state.schedules[dateString] && state.schedules[dateString].some(s => s.id === militaryId)) {
            showScheduleError("Este militar já está escalado para esta data!");
            return;
        }
        
        // Check officer limit
        if (military.rank.includes('CAP') || military.rank.includes('TEN')) {
            const currentOfficers = state.schedules[dateString] 
                ? state.schedules[dateString].filter(s => {
                    const m = getMilitaryById(s.id);
                    return m && (m.rank.includes('CAP') || m.rank.includes('TEN'));
                }).length 
                : 0;
                
            if (currentOfficers >= MAX_OFFICERS_PER_DAY) {
                showScheduleError(`Máximo de ${MAX_OFFICERS_PER_DAY} oficiais por dia atingido!`);
                return;
            }
        }
        
        // Check monthly limit
        const monthString = dateString.substring(0, 7); // YYYY-MM format
        const count = countMilitarySchedulesInMonth(militaryId, monthString);
        
        if (count >= MAX_EXTRA_SHIFTS) {
            showScheduleError(`Este militar já atingiu o limite de ${MAX_EXTRA_SHIFTS} escalas extras no mês!`);
            return;
        }
        
        // Verificar se o militar está na equipe de serviço do dia (CONFLITO!)
        const date = new Date(dateString);
        const dutyTeam = getDutyTeam(date);
        let hasConflict = false;

        if (military.team === dutyTeam) {
            hasConflict = true;
            
            // Mostrar alerta de confirmação para o conflito
            showAlert(`ATENÇÃO: ${military.rank} ${military.name} é da equipe ${dutyTeam} que está de serviço neste dia!\nO militar será registrado na página de Conflitos.`)
                .then(() => {
                    // Usuário confirmou, prosseguir com a escalação
                    proceedWithScheduling(dateString, militaryId, military, hasConflict);
                })
                .catch(error => {
                    // Usuário cancelou a operação
                    console.log("Escalação cancelada pelo usuário:", error.message);
                    return;
                });
        } else {
            // Sem conflito, prosseguir normalmente
            proceedWithScheduling(dateString, militaryId, military, hasConflict);
        }
    } catch (error) {
        console.error("Critical error adding military:", error);
        showErrorAlert("Erro crítico ao adicionar militar. Verifique o console.");
    }
}

// Função auxiliar para prosseguir com a escalação após verificação de conflitos
function proceedWithScheduling(dateString, militaryId, military, hasConflict) {
    // Add military to schedule com flag de conflito se aplicável
    if (!state.schedules[dateString]) {
        state.schedules[dateString] = [];
    }
    
    state.schedules[dateString].push({ 
        id: militaryId,
        hasConflict: hasConflict
    });
    
    console.log("Adding military to schedule:", military.name, hasConflict ? "(CONFLITO!)" : "");
    
    // Save data to Firebase
    saveData()
        .then(() => {
            // Update UI
            const scheduledList = document.getElementById('scheduledMilitariesList');
            if (scheduledList) {
                scheduledList.innerHTML = generateScheduledMilitaryList(state.schedules[dateString]);
                
                // Re-add event listeners
                setupRemoveScheduleButtons(dateString);
            }
            
            // Update military select
            const selectContainer = document.getElementById('militarySelect');
            if (selectContainer) {
                selectContainer.innerHTML = generateMilitaryOptionsForDuty(
                    getDutyTeam(new Date(dateString)), 
                    state.schedules[dateString]
                );
            }
            
            // Update calendar and stats
            generateCalendar();
            updateTeamStats();
            
            // Show success message
            showSuccessMessage(`Militar escalado com sucesso!${hasConflict ? ' (Conflito registrado)' : ''}`);
        })
        .catch(error => {
            console.error("Erro ao adicionar militar:", error);
            showErrorAlert("Erro ao salvar escala. Tente novamente.");
        });
}

// Remove military from schedule
function removeMilitaryFromSchedule(dateString, militaryId) {
    if (!state.schedules[dateString]) return;
    
    // Remove from schedule
    state.schedules[dateString] = state.schedules[dateString].filter(s => s.id !== militaryId);
    
    // Clean up empty dates
    if (state.schedules[dateString].length === 0) {
        delete state.schedules[dateString];
    }
    
    // Save data to Firebase
    saveData()
        .then(() => {
            // Update UI
            const scheduledList = document.getElementById('scheduledMilitariesList');
            if (scheduledList) {
                scheduledList.innerHTML = generateScheduledMilitaryList(state.schedules[dateString] || []);
                
                // Re-add event listeners
                setupRemoveScheduleButtons(dateString);
            }
            
            // Update military select
            const selectContainer = document.getElementById('militarySelect');
            if (selectContainer) {
                selectContainer.innerHTML = generateMilitaryOptionsForDuty(
                    getDutyTeam(new Date(dateString)), 
                    state.schedules[dateString] || []
                );
            }
            
            // Update calendar and stats
            generateCalendar();
            updateTeamStats();
            
            // Show success message
            showSuccessMessage("Militar removido com sucesso!");
        })
        .catch(error => {
            console.error("Erro ao remover militar:", error);
            showErrorAlert("Erro ao salvar alterações. Tente novamente.");
        });
}

// Show schedule error
function showScheduleError(message) {
    const errorElement = document.getElementById('scheduleError');
    if (errorElement) {
        errorElement.querySelector('span').textContent = message;
        errorElement.style.display = "flex";
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            errorElement.style.display = "none";
        }, 3000);
    } else {
        showErrorAlert(message);
    }
}

// Show general error alert
function showErrorAlert(message) {
    // Create a error message div
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    errorDiv.style.animation = 'fadeInRight 0.5s ease-out';
    
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transform = 'translateX(20px)';
        errorDiv.style.transition = 'all 0.5s ease-out';
        
        setTimeout(() => {
            errorDiv.remove();
        }, 500);
    }, 3000);
}

// Show alert with confirmation
function showAlert(message) {
    return new Promise((resolve, reject) => {
        const alertOverlay = document.createElement('div');
        alertOverlay.className = 'alert-overlay';
        
        const alertBox = document.createElement('div');
        alertBox.className = 'alert-box';
        
        alertBox.innerHTML = `
            <div class="alert-icon warning">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-content">
                <h3>Atenção!</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="alert-actions">
                <button class="alert-btn cancel">Cancelar</button>
                <button class="alert-btn confirm">Continuar mesmo assim</button>
            </div>
        `;
        
        alertOverlay.appendChild(alertBox);
        document.body.appendChild(alertOverlay);
        
        // Handle buttons
        const cancelBtn = alertBox.querySelector('.alert-btn.cancel');
        const confirmBtn = alertBox.querySelector('.alert-btn.confirm');
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(alertOverlay);
            reject(new Error('Operação cancelada pelo usuário'));
        });
        
        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(alertOverlay);
            resolve(true);
        });
        
        // Fade in animation
        setTimeout(() => {
            alertOverlay.classList.add('visible');
        }, 10);
    });
}

// Show success message
function showSuccessMessage(message) {
    // Create a success message div
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.style.backgroundColor = '#ECFDF5';
    successDiv.style.color = '#047857';
    successDiv.style.borderLeft = '4px solid #047857';
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.zIndex = '9999';
    successDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    successDiv.style.animation = 'fadeInRight 0.5s ease-out';
    
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(successDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        successDiv.style.opacity = '0';
        successDiv.style.transform = 'translateX(20px)';
        successDiv.style.transition = 'all 0.5s ease-out';
        
        setTimeout(() => {
            successDiv.remove();
        }, 500);
    }, 3000);
}

// Show Reports Modal
function showReports(filter = '') {
    const modal = document.getElementById('reportModal');
    if (!modal) {
        showErrorAlert("Erro ao abrir o modal de relatórios!");
        return;
    }
    
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = modal.querySelector('#reportSubtitle');
    const modalContent = document.getElementById('reportContent');
    
    // Set title based on filter
    if (modalTitle) {
        modalTitle.textContent = filter ? `Relatórios - ${filter}` : 'Relatórios';
    }
    
    // Set subtitle
    if (modalSubtitle) {
        modalSubtitle.textContent = filter 
            ? `Informações detalhadas da guarnição ${filter}` 
            : 'Informações detalhadas de todos os militares';
    }
    
    // Generate content
    if (modalContent) {
        modalContent.innerHTML = generateReportContent(filter);
        
        // Add tab switching
        const tabs = modalContent.querySelectorAll('.report-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // Deactivate all tabs
                tabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.report-tab-content').forEach(c => c.classList.remove('active'));
                
                // Activate clicked tab
                this.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Add team filter change handler
        const teamFilter = document.getElementById('teamFilter');
        if (teamFilter) {
            teamFilter.addEventListener('change', function() {
                showReports(this.value);
            });
        }
        
        // Add search functionality
        setupReportSearch();
        
        // Add export button handler
        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                showAlert('Funcionalidade de exportação em desenvolvimento');
            });
        }
    }
    
    // Show modal
    modal.classList.add('active');
}

// Team-specific reports
function showTeamsReport(team = '') {
    showReports(team);
}

// Generate report content
function generateReportContent(filter = '') {
    return `
        <div class="report-controls">
            <div class="search-control">
                <input type="text" id="reportSearch" class="form-control" placeholder="Buscar militar...">
                <button class="btn btn-primary" id="searchReportBtn">
                    <i class="fas fa-search"></i>
                </button>
            </div>
            <div class="filter-controls">
                <select id="teamFilter" class="form-control">
                    <option value="">Todas as Guarnições</option>
                    <option value="ALFA" ${filter === 'ALFA' ? 'selected' : ''}>ALFA</option>
                    <option value="BRAVO" ${filter === 'BRAVO' ? 'selected' : ''}>BRAVO</option>
                    <option value="CHARLIE" ${filter === 'CHARLIE' ? 'selected' : ''}>CHARLIE</option>
                    <option value="EXPEDIENTE" ${filter === 'EXPEDIENTE' ? 'selected' : ''}>EXPEDIENTE</option>
                </select>
            </div>
            <button class="btn btn-primary" id="exportReportBtn">
                <i class="fas fa-file-export"></i> EXPORTAR
            </button>
        </div>
        
        <div class="report-tabs">
            <button class="report-tab active" data-tab="military-tab">Militares</button>
            <button class="report-tab" data-tab="schedule-tab">Escalas</button>
            <button class="report-tab" data-tab="stats-tab">Estatísticas</button>
        </div>
        
        <div class="report-tab-content active" id="military-tab">
            <table class="report-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Patente</th>
                        <th>Nome</th>
                        <th>Guarnição</th>
                        <th>Escalas</th>
                        <th>Última Escala</th>
                        <th>Próxima Escala</th>
                    </tr>
                </thead>
                <tbody id="militaryTableBody">
                    ${generateMilitaryTableRows(filter)}
                </tbody>
            </table>
        </div>
        
        <div class="report-tab-content" id="schedule-tab">
            <div class="schedule-stats">
                <div class="stat-card">
                    <div class="stat-number">${getTotalSchedules(filter)}</div>
                    <div class="stat-label">Total de Escalas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${getCurrentMonthSchedules(filter)}</div>
                    <div class="stat-label">Escalas no mês</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${getAverageSchedulesPerMilitary(filter).toFixed(1)}</div>
                    <div class="stat-label">Média por militar</div>
                </div>
            </div>
            
            <h4 class="section-title">Distribuição Por Guarnição</h4>
            <div class="team-stats">
                <div class="team-stat-item" style="background: var(--gradient-alfa);">
                    <div class="team-stat-name">ALFA</div>
                    <div class="team-stat-count">${getTeamScheduleCount('ALFA', filter)}</div>
                </div>
                <div class="team-stat-item" style="background: var(--gradient-bravo);">
                    <div class="team-stat-name">BRAVO</div>
                    <div class="team-stat-count">${getTeamScheduleCount('BRAVO', filter)}</div>
                </div>
                <div class="team-stat-item" style="background: var(--gradient-charlie);">
                    <div class="team-stat-name">CHARLIE</div>
                    <div class="team-stat-count">${getTeamScheduleCount('CHARLIE', filter)}</div>
                </div>
                <div class="team-stat-item" style="background: var(--gradient-expediente);">
                    <div class="team-stat-name">EXPEDIENTE</div>
                    <div class="team-stat-count">${getTeamScheduleCount('EXPEDIENTE', filter)}</div>
                </div>
            </div>
        </div>
        
        <div class="report-tab-content" id="stats-tab">
            <div class="team-distribution">
                <h4 class="section-title">Distribuição de Militares por Guarnição</h4>
                <div class="team-stats">
                    <div class="team-stat-item" style="background: var(--gradient-alfa);">
                        <div class="team-stat-name">ALFA</div>
                        <div class="team-stat-count">${getTeamMemberCount('ALFA')}</div>
                    </div>
                    <div class="team-stat-item" style="background: var(--gradient-bravo);">
                        <div class="team-stat-name">BRAVO</div>
                        <div class="team-stat-count">${getTeamMemberCount('BRAVO')}</div>
                    </div>
                    <div class="team-stat-item" style="background: var(--gradient-charlie);">
                        <div class="team-stat-name">CHARLIE</div>
                        <div class="team-stat-count">${getTeamMemberCount('CHARLIE')}</div>
                    </div>
                    <div class="team-stat-item" style="background: var(--gradient-expediente);">
                        <div class="team-stat-name">EXPEDIENTE</div>
                        <div class="team-stat-count">${getTeamMemberCount('EXPEDIENTE')}</div>
                    </div>
                </div>
            </div>
            
            <h4 class="section-title">Militares Mais Escalados</h4>
            <div class="top-militaries">
                ${generateTopMilitariesList(filter)}
            </div>
        </div>
    `;
}

// Setup report search
function setupReportSearch() {
    const searchInput = document.getElementById('reportSearch');
    const searchBtn = document.getElementById('searchReportBtn');
    
    if (searchInput && searchBtn) {
        const performSearch = () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const rows = document.querySelectorAll('#militaryTableBody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = searchTerm === '' || text.includes(searchTerm) ? '' : 'none';
            });
        };
        
        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') performSearch();
        });
        
        searchBtn.addEventListener('click', performSearch);
    }
}

// Generate military report table rows
function generateMilitaryTableRows(filter = '') {
    const filteredMilitaries = filter 
        ? state.militaries.filter(m => m.team === filter) 
        : state.militaries;
    
    if (filteredMilitaries.length === 0) {
        return '<tr><td colspan="7" class="no-data">Nenhum militar encontrado</td></tr>';
    }
    
    return filteredMilitaries.map(m => {
        const scheduleCount = countMilitarySchedules(m.id);
        const lastSchedule = getLastScheduleDate(m.id);
        const nextSchedule = getNextScheduleDate(m.id);
        
        return `
            <tr class="${m.team.toLowerCase()}-row">
                <td>${m.id}</td>
                <td>${m.rank}</td>
                <td>${m.name}</td>
                <td class="${m.team.toLowerCase()}-text">${m.team}</td>
                <td>${scheduleCount}</td>
                <td>${lastSchedule ? formatDisplayDate(new Date(lastSchedule)) : '-'}</td>
                <td>${nextSchedule ? formatDisplayDate(new Date(nextSchedule)) : '-'}</td>
            </tr>
        `;
    }).join('');
}

// Format display date
function formatDisplayDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Get total schedules
function getTotalSchedules(filter = '') {
    let count = 0;
    
    for (const dateString in state.schedules) {
        if (filter) {
            count += state.schedules[dateString].filter(s => {
                const military = getMilitaryById(s.id);
                return military && military.team === filter;
            }).length;
        } else {
            count += state.schedules[dateString].length;
        }
    }
    
    return count;
}

// Get current month schedules
function getCurrentMonthSchedules(filter = '') {
    const monthString = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    let count = 0;
    
    for (const dateString in state.schedules) {
        if (dateString.startsWith(monthString)) {
            if (filter) {
                count += state.schedules[dateString].filter(s => {
                    const military = getMilitaryById(s.id);
                    return military && military.team === filter;
                }).length;
            } else {
                count += state.schedules[dateString].length;
            }
        }
    }
    
    return count;
}

// Get average schedules per military
function getAverageSchedulesPerMilitary(filter = '') {
    const totalSchedules = getTotalSchedules(filter);
    const militaryCount = filter
        ? state.militaries.filter(m => m.team === filter).length
        : state.militaries.length;
    
    if (militaryCount === 0) return 0;
    
    return totalSchedules / militaryCount;
}

// Get team schedule count
function getTeamScheduleCount(team, filter = '') {
    // If filter is set and it's not this team, return 0
    if (filter && filter !== team) return 0;
    
    let count = 0;
    
    for (const dateString in state.schedules) {
        count += state.schedules[dateString].filter(s => {
            const military = getMilitaryById(s.id);
            return military && military.team === team;
        }).length;
    }
    
    return count;
}

// Get member count for a team
function getTeamMemberCount(team) {
    return state.militaries.filter(m => m.team === team).length;
}

// Generate top militaries list
function generateTopMilitariesList(filter = '') {
    // Get militaries with schedule count
    const militarySchedules = state.militaries
        .filter(m => !filter || m.team === filter)
        .map(m => ({
            ...m,
            scheduleCount: countMilitarySchedules(m.id)
        }))
        .sort((a, b) => b.scheduleCount - a.scheduleCount)
        .slice(0, 5); // Top 5
    
    if (militarySchedules.length === 0) {
        return '<div class="no-data">Nenhum militar encontrado</div>';
    }
    
    return militarySchedules.map((m, index) => {
        return `
            <div class="top-military-item">
                <div class="rank-number">${index + 1}</div>
                <div class="military-avatar ${m.team.toLowerCase()}-bg">
                    ${m.name.charAt(0)}
                </div>
                <div class="military-info">
                    <div class="military-name">${m.rank} ${m.name}</div>
                    <div class="military-team ${m.team.toLowerCase()}-text">${m.team}</div>
                </div>
                <div class="schedule-count">${m.scheduleCount}</div>
            </div>
        `;
    }).join('');
}

// Show Military Management
function showMilitaryManagement(editMilitary = null) {
    const modal = document.getElementById('militaryModal');
    if (!modal) {
        showErrorAlert("Erro ao abrir modal de gerenciamento de militares!");
        return;
    }
    
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = modal.querySelector('.modal-subtitle');
    const modalContent = document.getElementById('militaryContent');
    
    // Set title
    if (modalTitle) {
        modalTitle.textContent = editMilitary ? 'Editar Militar' : 'Gerenciamento de Militares';
    }
    
    // Set subtitle
    if (modalSubtitle) {
        modalSubtitle.textContent = editMilitary 
            ? `Editando: ${editMilitary.rank} ${editMilitary.name}` 
            : 'Adicionar, Editar ou Excluir';
    }
    
    // Generate content
    if (modalContent) {
        if (editMilitary) {
            // Show edit form for specific military
            modalContent.innerHTML = `
                <form id="editMilitaryForm" class="military-form">
                    <input type="hidden" id="militaryId" value="${editMilitary.id}">
                    
                    <div class="form-group">
                        <label for="militaryRank" class="form-label">Posto/Graduação:</label>
                        <input type="text" id="militaryRank" class="form-control" value="${editMilitary.rank}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="militaryName" class="form-label">Nome:</label>
                        <input type="text" id="militaryName" class="form-control" value="${editMilitary.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="militaryTeam" class="form-label">Guarnição:</label>
                        <select id="militaryTeam" class="form-control" required>
                            <option value="ALFA" ${editMilitary.team === 'ALFA' ? 'selected' : ''}>ALFA</option>
                            <option value="BRAVO" ${editMilitary.team === 'BRAVO' ? 'selected' : ''}>BRAVO</option>
                            <option value="CHARLIE" ${editMilitary.team === 'CHARLIE' ? 'selected' : ''}>CHARLIE</option>
                            <option value="EXPEDIENTE" ${editMilitary.team === 'EXPEDIENTE' ? 'selected' : ''}>EXPEDIENTE</option>
                        </select>
                    </div>
                    
                    <div class="form-buttons">
                        <button type="button" class="btn btn-secondary" id="cancelEditBtn">
                            <i class="fas fa-times"></i> CANCELAR
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> SALVAR
                        </button>
                    </div>
                </form>
            `;
            
            // Add form submission handler
            const form = document.getElementById('editMilitaryForm');
            form.addEventListener('submit', e => {
                e.preventDefault();
                
                const id = document.getElementById('militaryId').value;
                const rank = document.getElementById('militaryRank').value;
                const name = document.getElementById('militaryName').value;
                const team = document.getElementById('militaryTeam').value;
                
                // Update military
                updateMilitary(id, { rank, name, team })
                    .then(() => {
                        // Show success message
                        showSuccessMessage('Militar atualizado com sucesso!');
                        
                        // Close modal
                        modal.classList.remove('active');
                    })
                    .catch(error => {
                        showErrorAlert("Erro ao atualizar militar. Tente novamente.");
                    });
            });
            
            // Add cancel button handler
            const cancelBtn = document.getElementById('cancelEditBtn');
            cancelBtn.addEventListener('click', () => {
                showMilitaryManagement();
            });
            
        } else {
            // Show main management interface
            modalContent.innerHTML = `
                <div class="management-tabs">
                    <button class="management-tab active" data-tab="list-tab">Lista</button>
                    <button class="management-tab" data-tab="add-tab">Adicionar</button>
                </div>
                
                <div class="management-tab-content active" id="list-tab">
                    <div class="search-control">
                        <input type="text" id="militarySearch" class="form-control" placeholder="Buscar militar...">
                        <button class="btn btn-primary" id="searchMilitaryBtn">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                    
                    <div class="military-list">
                        ${generateMilitaryList()}
                    </div>
                </div>
                
                <div class="management-tab-content" id="add-tab">
                    <form id="addMilitaryForm" class="military-form">
                        <div class="form-group">
                            <label for="newMilitaryRank" class="form-label">Posto/Graduação:</label>
                            <input type="text" id="newMilitaryRank" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="newMilitaryName" class="form-label">Nome:</label>
                            <input type="text" id="newMilitaryName" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="newMilitaryTeam" class="form-label">Guarnição:</label>
                            <select id="newMilitaryTeam" class="form-control" required>
                                <option value="ALFA">ALFA</option>
                                <option value="BRAVO">BRAVO</option>
                                <option value="CHARLIE">CHARLIE</option>
                                <option value="EXPEDIENTE">EXPEDIENTE</option>
                            </select>
                        </div>
                        
                        <button type="submit" class="btn btn-primary btn-block">
                            <i class="fas fa-plus"></i> ADICIONAR MILITAR
                        </button>
                    </form>
                </div>
            `;
            
            // Setup management tabs
            const tabButtons = modalContent.querySelectorAll('.management-tab');
            tabButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Deactivate all tabs
                    tabButtons.forEach(b => b.classList.remove('active'));
                    modalContent.querySelectorAll('.management-tab-content').forEach(c => c.classList.remove('active'));
                    
                    // Activate clicked tab
                    this.classList.add('active');
                    const tabId = this.getAttribute('data-tab');
                    document.getElementById(tabId).classList.add('active');
                });
            });
            
            // Setup military search
            const searchInput = document.getElementById('militarySearch');
            const searchBtn = document.getElementById('searchMilitaryBtn');
            
            if (searchInput && searchBtn) {
                const performSearch = () => {
                    const searchTerm = searchInput.value.trim().toLowerCase();
                    const items = document.querySelectorAll('.military-item');
                    
                    items.forEach(item => {
                        const text = item.textContent.toLowerCase();
                        item.style.display = searchTerm === '' || text.includes(searchTerm) ? '' : 'none';
                    });
                };
                
                searchInput.addEventListener('keypress', e => {
                    if (e.key === 'Enter') performSearch();
                });
                
                searchBtn.addEventListener('click', performSearch);
            }
            
            // Setup add military form
            const addForm = document.getElementById('addMilitaryForm');
            if (addForm) {
                addForm.addEventListener('submit', e => {
                    e.preventDefault();
                    
                    const rank = document.getElementById('newMilitaryRank').value;
                    const name = document.getElementById('newMilitaryName').value;
                    const team = document.getElementById('newMilitaryTeam').value;
                    
                    // Add new military
                    addNewMilitary(rank, name, team)
                        .then(() => {
                            // Reset form
                            addForm.reset();
                            
                            // Show success message
                            showSuccessMessage(`Militar ${rank} ${name} adicionado com sucesso!`);
                            
                            // Switch to list tab
                            document.querySelector('.management-tab[data-tab="list-tab"]').click();
                            
                            // Update list
                            document.querySelector('.military-list').innerHTML = generateMilitaryList();
                            setupMilitaryItemActions();
                        })
                        .catch(error => {
                            showErrorAlert("Erro ao adicionar militar. Tente novamente.");
                        });
                });
            }
            
            // Setup edit and delete buttons
            setupMilitaryItemActions();
        }
    }
    
    // Show modal
    modal.classList.add('active');
}

// Generate military list for management
function generateMilitaryList() {
    if (state.militaries.length === 0) {
        return '<div class="no-data">Nenhum militar cadastrado.</div>';
    }
    
    return state.militaries.map(m => `
        <div class="military-item" data-id="${m.id}">
            <div class="military-avatar ${m.team.toLowerCase()}-bg">
                ${m.name.charAt(0)}
            </div>
            <div class="military-info">
                <div class="military-name">${m.rank} ${m.name}</div>
                <div class="military-team ${m.team.toLowerCase()}-text">${m.team}</div>
            </div>
            <div class="military-actions">
                <button class="btn btn-secondary edit-military-btn" data-id="${m.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger delete-military-btn" data-id="${m.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Setup military item actions (edit/delete)
function setupMilitaryItemActions() {
    // Setup edit buttons
    const editButtons = document.querySelectorAll('.edit-military-btn');
    editButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const military = getMilitaryById(id);
            
            if (military) {
                showMilitaryManagement(military);
            }
        });
    });
    
    // Setup delete buttons
    const deleteButtons = document.querySelectorAll('.delete-military-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            const military = getMilitaryById(id);
            
            if (military && confirm(`Tem certeza que deseja excluir ${military.rank} ${military.name}?`)) {
                // Delete military
                deleteMilitary(id)
                    .then(() => {
                        // Remove from list
                        const item = document.querySelector(`.military-item[data-id="${id}"]`);
                        if (item) item.remove();
                        
                        // Show success message
                        showSuccessMessage(`Militar ${military.rank} ${military.name} excluído com sucesso!`);
                    })
                    .catch(error => {
                        showErrorAlert("Erro ao excluir militar. Tente novamente.");
                    });
            }
        });
    });
}

// Add new military
function addNewMilitary(rank, name, team) {
    const id = `mil_${Date.now()}`; // Use timestamp for unique ID
    const newMilitary = { id, rank, name, team };
    
    state.militaries.push(newMilitary);
    return saveData();
}

// Update military
function updateMilitary(id, data) {
    const index = state.militaries.findIndex(m => m.id === id);
    if (index === -1) return Promise.reject("Militar não encontrado");
    
    state.militaries[index] = {
        ...state.militaries[index],
        ...data
    };
    
    return saveData();
}

// Delete military
function deleteMilitary(id) {
    // Remove from militaries array
    state.militaries = state.militaries.filter(m => m.id !== id);
    
    // Remove from schedules
    for (const dateString in state.schedules) {
        state.schedules[dateString] = state.schedules[dateString].filter(s => s.id !== id);
        
        // Clean up empty dates
        if (state.schedules[dateString].length === 0) {
            delete state.schedules[dateString];
        }
    }
    
    return saveData();
}

// Show Config Modal
function showConfigModal() {
    showAlert('Funcionalidade de Configurações em desenvolvimento');
}

// Initialize sample data
function initializeSampleData() {
    // Sample military personnel
    const sampleMilitaries = [
        // ALFA Team
        { id: 'mil_1', name: 'PEIXOTO', rank: '2° SGT PM', team: 'ALFA' },
        { id: 'mil_2', name: 'RODRIGO', rank: '3° SGT PM', team: 'ALFA' },
        { id: 'mil_3', name: 'LEDO', rank: '3° SGT PM', team: 'ALFA' },
        { id: 'mil_4', name: 'NUNES', rank: '3° SGT PM', team: 'ALFA' },
        { id: 'mil_5', name: 'AMARAL', rank: '3° SGT', team: 'ALFA' },
        { id: 'mil_6', name: 'CARLA', rank: 'CB', team: 'ALFA' },
        { id: 'mil_7', name: 'FELIPE', rank: 'CB PM', team: 'ALFA' },
        { id: 'mil_8', name: 'BARROS', rank: 'CB PM', team: 'ALFA' },
        { id: 'mil_9', name: 'A. SILVA', rank: 'CB PM', team: 'ALFA' },
        { id: 'mil_10', name: 'LUAN', rank: 'SD PM', team: 'ALFA' },
        { id: 'mil_11', name: 'NAVARRO', rank: 'SD PM', team: 'ALFA' },
        
        // BRAVO Team
        { id: 'mil_12', name: 'OLIMAR', rank: '1° SGT PM', team: 'BRAVO' },
        { id: 'mil_13', name: 'FÁBIO', rank: '2° SGT PM', team: 'BRAVO' },
        { id: 'mil_14', name: 'ANA CLEIDE', rank: '3° SGT PM', team: 'BRAVO' },
        { id: 'mil_15', name: 'GLEIDSON', rank: '3° SGT PM', team: 'BRAVO' },
        { id: 'mil_16', name: 'CARLOS EDUARDO', rank: '3° SGT PM', team: 'BRAVO' },
        { id: 'mil_17', name: 'NEGRÃO', rank: '3° SGT PM', team: 'BRAVO' },
        { id: 'mil_18', name: 'BRASIL', rank: 'CB PM', team: 'BRAVO' },
        { id: 'mil_19', name: 'MARVÃO', rank: 'SD PM', team: 'BRAVO' },
        { id: 'mil_20', name: 'IDELVAN', rank: 'SD PM', team: 'BRAVO' },
        { id: 'mil_21', name: 'ALAX', rank: 'CB PM', team: 'BRAVO' },
        { id: 'mil_22', name: 'VELOSO', rank: 'CB PM', team: 'BRAVO' },
        
        // CHARLIE Team
        { id: 'mil_23', name: 'PINHEIRO', rank: '2° SGT PM', team: 'CHARLIE' },
        { id: 'mil_24', name: 'RAFAEL', rank: '3° SGT PM', team: 'CHARLIE' },
        { id: 'mil_25', name: 'MIQUEIAS', rank: 'CB PM', team: 'CHARLIE' },
        { id: 'mil_26', name: 'M. PAIXÃO', rank: 'CB PM', team: 'CHARLIE' },
        { id: 'mil_27', name: 'CHAGAS', rank: 'SD PM', team: 'CHARLIE' },
        { id: 'mil_28', name: 'CARVALHO', rank: 'SD PM', team: 'CHARLIE' },
        { id: 'mil_29', name: 'GOVEIA', rank: 'SD PM', team: 'CHARLIE' },
        { id: 'mil_30', name: 'ALMEIDA', rank: 'SD PM', team: 'CHARLIE' },
        { id: 'mil_31', name: 'PATRIK', rank: 'SD PM', team: 'CHARLIE' },
        { id: 'mil_32', name: 'GUIMARÃES', rank: 'SD PM', team: 'CHARLIE' },
        
        // EXPEDIENTE Team
        { id: 'mil_33', name: 'MUNIZ', rank: 'CAP QOPM', team: 'EXPEDIENTE' },
        { id: 'mil_34', name: 'MONTEIRO', rank: '1° TEN QOPM', team: 'EXPEDIENTE' },
        { id: 'mil_35', name: 'VANILSON', rank: 'TEN', team: 'EXPEDIENTE' },
        { id: 'mil_36', name: 'ANDRÉ', rank: 'SUB TEN', team: 'EXPEDIENTE' },
        { id: 'mil_37', name: 'CUNHA', rank: '3° SGT PM', team: 'EXPEDIENTE' },
        { id: 'mil_38', name: 'CARAVELAS', rank: '3° SGT PM', team: 'EXPEDIENTE' },
        { id: 'mil_39', name: 'TONI', rank: 'CB PM', team: 'EXPEDIENTE' },
        { id: 'mil_40', name: 'S. CORREA', rank: 'SD PM', team: 'EXPEDIENTE' },
        { id: 'mil_41', name: 'RODRIGUES', rank: 'SD PM', team: 'EXPEDIENTE' },
        { id: 'mil_42', name: 'A. TAVARES', rank: '2° SGT PM', team: 'EXPEDIENTE' }
    ];
    
    state.militaries = sampleMilitaries;
    
    // Create sample schedules
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    const sampleDates = [
        new Date(year, month, 1),
        new Date(year, month, 2),
        new Date(year, month, 5),
        new Date(year, month, 8),
        new Date(year, month, 10),
        new Date(year, month, 15)
    ];
    
    sampleDates.forEach(date => {
        const dateString = formatDateString(date);
        const team = getDutyTeam(date);
        const teamMilitaries = state.militaries.filter(m => m.team === team);
        
        if (teamMilitaries.length > 0) {
            // Add 1-2 militaries for each sample date
            const numMilitaries = Math.floor(Math.random() * 2) + 1;
            state.schedules[dateString] = [];
            
            for (let i = 0; i < numMilitaries; i++) {
                if (i < teamMilitaries.length) {
                    state.schedules[dateString].push({ id: teamMilitaries[i].id });
                }
            }
        }
    });
    
    // Save the initial data sets to Firebase
    return saveData();
}