// Initialize data
let militaries = JSON.parse(localStorage.getItem('militaries')) || [];
let schedules = JSON.parse(localStorage.getItem('schedules')) || {};
let currentDate = new Date();
let selectedDay = null;
let selectedMonth = currentDate.getMonth();
let selectedYear = currentDate.getFullYear();
let currentFilter = 'all';

// Add CSS variables that might be missing from the initial CSS
document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        :root {
            --radius-md: 10px;
            --radius-lg: 15px;
            --radius-full: 50%;
            --spacing-xs: 5px;
            --spacing-sm: 8px;
            --spacing-md: 15px;
            --spacing-lg: 20px;
            --spacing-xl: 25px;
            --shadow-md: 0 5px 15px rgba(0, 0, 0, 0.1);
            --gradient-blue: linear-gradient(135deg, #3e78b2, #2a3990);
            --white: #fff;
            --gray-100: #f8fafc;
            --gray-200: #e2e8f0;
            --gray-300: #cbd5e1;
            --gray-400: #94a3b8;
            --gray-500: #64748b;
            --gray-600: #475569;
            --gray-700: #334155;
            --gray-800: #1e293b;
            --gray-900: #0f172a;
            --accent-blue: #3e78b2;
            --transition-fast: 0.2s ease;
            --transition-normal: 0.3s ease;
            
            /* Team gradients */
            --gradient-alfa: linear-gradient(135deg, #ff6b6b, #ee5253);
            --gradient-bravo: linear-gradient(135deg, #1dd1a1, #10ac84);
            --gradient-charlie: linear-gradient(135deg, #546de5, #3742fa);
            --gradient-expediente: linear-gradient(135deg, #ff9f43, #f0932b);
        }
    `;
    document.head.appendChild(style);
});

// Duty schedule reference date (April 3, 2025 when BRAVO takes over)
const dutyReferenceDate = new Date(2025, 3, 3); // April 3, 2025
const dutyTeams = ['CHARLIE', 'BRAVO', 'ALFA']; // Order of teams (CHARLIE is before the reference date)

// Constants
const MAX_OFFICERS_PER_DAY = 3;
const MAX_EXTRA_SHIFTS = 12;
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', function() {
    // Make sure all CSS variables are loaded first
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Initialize the application
function initializeApp() {
    // Initialize pre-filled data if it doesn't exist
    if (militaries.length === 0) {
        initializeSampleMilitaries();
    }
    
    // Set the current month and year in selectors
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if(monthSelect && yearSelect) {
        monthSelect.value = currentDate.getMonth();
        yearSelect.value = currentDate.getFullYear();
    }
    
    // Update current month/year display
    updateMonthYearDisplay();
    
    // Register all event handlers
    registerEventHandlers();
    
    // Generate the calendar
    generateCalendar();
    
    // Initialize team stats
    updateTeamStats();
}

// Register all event handlers
function registerEventHandlers() {
    // Theme toggle is already handled in the inline script
    
    // Nav items
    const navItems = document.querySelectorAll('.nav-item');
    if(navItems.length) {
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                // Get nav ID
                const navId = this.id;
                
                // Handle navigation based on ID
                if (navId === 'dashboard-nav') {
                    // Already on dashboard, do nothing
                } else if (navId === 'escalas-nav') {
                    openScheduleModal(currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear());
                } else if (navId === 'guarnicoes-nav') {
                    showTeamsReport();
                } else if (navId === 'cadastro-nav') {
                    showMilitaryManagementModal();
                } else if (navId === 'relatorios-nav') {
                    showReportsModal();
                } else if (navId === 'config-nav') {
                    alert('Funcionalidade de Configurações em desenvolvimento');
                }
            });
        });
    }
    
    // Month navigation
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if(prevMonthBtn) prevMonthBtn.addEventListener('click', goToPrevMonth);
    if(nextMonthBtn) nextMonthBtn.addEventListener('click', goToNextMonth);
    if(monthSelect) monthSelect.addEventListener('change', function() {
        selectedMonth = parseInt(this.value);
        updateMonthYearDisplay();
        updateCalendar();
    });
    if(yearSelect) yearSelect.addEventListener('change', function() {
        selectedYear = parseInt(this.value);
        updateMonthYearDisplay();
        updateCalendar();
    });
    
    // View options in calendar
    const viewOptions = document.querySelectorAll('.calendar-tab');
    if(viewOptions.length) {
        viewOptions.forEach(option => {
            option.addEventListener('click', function() {
                viewOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Change calendar view based on ID
                const viewId = this.id;
                if (viewId === 'month-view') {
                    // Already in month view
                } else if (viewId === 'week-view') {
                    alert('Vista semanal em desenvolvimento');
                } else if (viewId === 'list-view') {
                    alert('Vista em lista em desenvolvimento');
                }
            });
        });
    }

    // Header buttons
    const headerBtns = document.querySelectorAll('.header-icon');
    if(headerBtns.length) {
        headerBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const icon = this.querySelector('i').className;
                if (icon.includes('bell')) {
                    alert('Notificações em desenvolvimento');
                } else if (icon.includes('question')) {
                    alert('Ajuda em desenvolvimento');
                } else if (icon.includes('cog')) {
                    alert('Configurações em desenvolvimento');
                }
            });
        });
    }
    
    // Team cards
    const teamCards = document.querySelectorAll('.scale-card');
    if(teamCards.length) {
        teamCards.forEach(card => {
            card.addEventListener('click', function() {
                const cardId = this.id; // Example: 'alfa-card'
                if (cardId) {
                    const team = cardId.split('-')[0].toUpperCase();
                    showTeamsReport(team);
                }
            });
        });
    }
    
    // Calendar days
    attachCalendarDayListeners();
    
    // Add schedule button
    const addScheduleBtn = document.getElementById('addScheduleBtn');
    if(addScheduleBtn) {
        addScheduleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Open modal with current date selected
            const today = new Date();
            openScheduleModal(today.getDate(), today.getMonth(), today.getFullYear());
        });
    }

    // Modal close buttons
    const closeButtons = [
        {id: 'closeModal', modal: 'scheduleModal'},
        {id: 'closeReportModal', modal: 'reportModal'},
        {id: 'closeMilitaryModal', modal: 'militaryModal'}
    ];

    closeButtons.forEach(btn => {
        const closeBtn = document.getElementById(btn.id);
        const modal = document.getElementById(btn.modal);
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', function() {
                modal.classList.remove('active');
            });

            // Click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }
    });
}

// Attach click listeners to calendar days
function attachCalendarDayListeners() {
    const calendarDays = document.querySelectorAll('.day-cell:not(.empty)');
    if(calendarDays.length) {
        calendarDays.forEach(day => {
            day.addEventListener('click', function() {
                const dayNumber = this.textContent.trim();
                openScheduleModal(parseInt(dayNumber), selectedMonth, selectedYear);
            });
        });
    } else {
        console.warn('No calendar day cells found to attach listeners to');
    }
}

// Update the displayed month and year
function updateMonthYearDisplay() {
    const monthYearElement = document.getElementById('currentMonthYear');
    const calendarTitle = document.querySelector('.calendar-title');
    
    if(monthYearElement) {
        monthYearElement.textContent = `${MONTHS[selectedMonth]} ${selectedYear}`;
    }
    
    if(calendarTitle) {
        calendarTitle.innerHTML = `<i class="fas fa-calendar-alt"></i> ${MONTHS[selectedMonth]} ${selectedYear}`;
    }
}

// Navigate to previous month
function goToPrevMonth() {
    selectedMonth--;
    if (selectedMonth < 0) {
        selectedMonth = 11;
        selectedYear--;
    }
    
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if(monthSelect) monthSelect.value = selectedMonth;
    if(yearSelect) yearSelect.value = selectedYear;
    
    updateMonthYearDisplay();
    updateCalendar();
}

// Navigate to next month
function goToNextMonth() {
    selectedMonth++;
    if (selectedMonth > 11) {
        selectedMonth = 0;
        selectedYear++;
    }
    
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if(monthSelect) monthSelect.value = selectedMonth;
    if(yearSelect) yearSelect.value = selectedYear;
    
    updateMonthYearDisplay();
    updateCalendar();
}

// Update calendar when month or year changes
function updateCalendar() {
    generateCalendar();
    updateTeamStats();
}

// Generate the calendar for the current month/year
function generateCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    
    if (!calendarGrid) {
        return;
    }
    
    // Clear existing calendar
    calendarGrid.innerHTML = '';
    
    // Create date object for the first day of the month
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get the day of the week the first day falls on (0-6, 0 is Sunday)
    let startDay = firstDay.getDay();
    
    // Add empty days for the previous month
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day inactive';
        
        // Add the day number from the previous month
        const prevMonthDate = new Date(selectedYear, selectedMonth, 0 - (startDay - i - 1));
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = prevMonthDate.getDate();
        emptyDay.appendChild(dayNumber);
        
        calendarGrid.appendChild(emptyDay);
    }
    
    // Create days for the current month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(selectedYear, selectedMonth, day);
        const dateString = formatDateString(dayDate);
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day';
        dayDiv.dataset.date = dateString;
        
        // Check if this is today
        const today = new Date();
        if (dayDate.getDate() === today.getDate() && 
            dayDate.getMonth() === today.getMonth() && 
            dayDate.getFullYear() === today.getFullYear()) {
            dayDiv.classList.add('today');
        }
        
        // Add the duty team style
        const dutyTeam = getDutyTeam(dayDate);
        if (dutyTeam) {
            dayDiv.classList.add(dutyTeam.toLowerCase() + '-day');
        }
        
        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayDiv.appendChild(dayNumber);
        
        // Create day content container
        const dayContent = document.createElement('div');
        dayContent.className = 'day-content';
        dayDiv.appendChild(dayContent);
        
        // Add scheduled militaries
        if(schedules[dateString] && schedules[dateString].length > 0) {
            schedules[dateString].forEach(schedule => {
                const military = getMilitaryById(schedule.id);
                if(military) {
                    const eventDiv = document.createElement('div');
                    eventDiv.className = `day-event ${military.team.toLowerCase()}`;
                    eventDiv.innerHTML = `<i class="fas fa-user-shield"></i> ${military.rank} ${military.name}`;
                    dayContent.appendChild(eventDiv);
                }
            });
        }
        
        // Add change indicator for Thursdays (rendição)
        if(dayDate.getDay() === 4) { // Thursday
            const changeIndicator = document.createElement('div');
            changeIndicator.className = 'change-indicator';
            changeIndicator.innerHTML = '<i class="fas fa-sync-alt"></i> 19:30';
            dayDiv.appendChild(changeIndicator);
        }
        
        calendarGrid.appendChild(dayDiv);
    }
    
    // Add empty days for the next month to complete the grid
    const totalDays = startDay + daysInMonth;
    const remainingCells = 7 - (totalDays % 7);
    
    if (remainingCells < 7) {
        for (let i = 1; i <= remainingCells; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day inactive';
            
            // Add the day number from the next month
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = i;
            emptyDay.appendChild(dayNumber);
            
            calendarGrid.appendChild(emptyDay);
        }
    }
    
    // Reattach event listeners for calendar days
    attachCalendarDayListeners();
}

// Format date consistently for storage - YYYY-MM-DD
function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Get military by ID
function getMilitaryById(id) {
    return militaries.find(m => m.id === id);
}

// Determine which team is on duty for a given date
function getDutyTeam(date) {
    // DAY_MS is milliseconds in a day
    const DAY_MS = 24 * 60 * 60 * 1000;
    
    // Clone reference date to avoid mutation
    const refDate = new Date(dutyReferenceDate);
    
    // Calculate days between reference and current date
    const diffDays = Math.round((date.getTime() - refDate.getTime()) / DAY_MS);
    
    // Duty cycle is 21 days (7 days for each team)
    const cycle = 21;
    
    // Normalize to positive number within cycle
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

// Open schedule modal
function openScheduleModal(day, month, year) {
    const modal = document.getElementById('scheduleModal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = modal.querySelector('.modal-subtitle');
    const modalContent = document.getElementById('modalContent');
    
    // Set selected day for later reference
    selectedDay = {
        day: day,
        month: month,
        year: year
    };
    
    const date = new Date(year, month, day);
    const dateString = formatDateString(date);
    const formattedDate = date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Update modal title and date
    if(modalTitle) modalTitle.textContent = "Escalar Militar";
    if(modalSubtitle) modalSubtitle.textContent = formattedDate;
    
    // Clear and populate modal content
    if(modalContent) {
        // Get current schedules for this day
        const daySchedules = schedules[dateString] || [];
        const dutyTeam = getDutyTeam(date);
        
        // Create content HTML
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
                    <i class="fas fa-plus"></i>
                    Adicionar
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
        
        // Add event listener for the add button
        const addBtn = document.getElementById('addMilitaryToScheduleBtn');
        if(addBtn) {
            addBtn.addEventListener('click', function() {
                addMilitaryToSchedule(dateString);
            });
        }
        
        // Add event listeners for remove buttons
        const removeButtons = modalContent.querySelectorAll('.remove-military-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const militaryId = this.getAttribute('data-id');
                removeMilitaryFromSchedule(dateString, militaryId);
            });
        });
    }
    
    // Show modal
    modal.classList.add('active');
}

// Generate options for military select dropdown
function generateMilitaryOptionsForDuty(dutyTeam, scheduledMilitaries) {
    // Filter militaries by duty team (and include EXPEDIENTE)
    const availableMilitaries = militaries.filter(m => 
        (m.team === dutyTeam || m.team === 'EXPEDIENTE') && 
        !scheduledMilitaries.some(s => s.id === m.id)
    );
    
    if (availableMilitaries.length === 0) {
        return '<option value="">Nenhum militar disponível</option>';
    }
    
    // Generate options HTML
    return availableMilitaries.map(m => {
        const count = countMilitarySchedules(m.id);
        const disabled = count >= MAX_EXTRA_SHIFTS ? 'disabled' : '';
        return `<option value="${m.id}" ${disabled}>${m.rank} ${m.name} (${m.team}) - ${count}/${MAX_EXTRA_SHIFTS} escalas</option>`;
    }).join('');
}

// Generate HTML for scheduled militaries
function generateScheduledMilitaryList(scheduledMilitaries) {
    if (scheduledMilitaries.length === 0) {
        return '<div class="no-militaries">Nenhum militar escalado para esta data.</div>';
    }
    
    return scheduledMilitaries.map(schedule => {
        const military = getMilitaryById(schedule.id);
        if (!military) return '';
        
        return `
            <div class="scheduled-item">
                <div class="scheduled-avatar ${military.team.toLowerCase()}-bg">
                    ${military.name.charAt(0)}
                </div>
                <div class="scheduled-info">
                    <div class="scheduled-name">${military.rank} ${military.name}</div>
                    <div class="scheduled-team ${military.team.toLowerCase()}-text">${military.team}</div>
                </div>
                <button class="remove-military-btn" data-id="${military.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Add a military to schedule
function addMilitaryToSchedule(dateString) {
    const militarySelect = document.getElementById('militarySelect');
    const errorElement = document.getElementById('scheduleError');
    
    if (!militarySelect || militarySelect.value === "") {
        if(errorElement) {
            errorElement.querySelector('span').textContent = "Selecione um militar!";
            errorElement.style.display = "flex";
            setTimeout(() => { errorElement.style.display = "none"; }, 3000);
        }
        return;
    }
    
    const militaryId = militarySelect.value;
    const military = getMilitaryById(militaryId);
    
    if (!military) {
        return;
    }
    
    // Check if already scheduled for this day
    if (schedules[dateString] && schedules[dateString].some(s => s.id === militaryId)) {
        if(errorElement) {
            errorElement.querySelector('span').textContent = "Este militar já está escalado para esta data!";
            errorElement.style.display = "flex";
            setTimeout(() => { errorElement.style.display = "none"; }, 3000);
        }
        return;
    }
    
    // Check officer limit
    if (military.rank.includes('CAP') || military.rank.includes('TEN')) {
        const currentOfficers = schedules[dateString] 
            ? schedules[dateString].filter(s => {
                const m = getMilitaryById(s.id);
                return m && (m.rank.includes('CAP') || m.rank.includes('TEN'));
            }).length 
            : 0;
            
        if (currentOfficers >= MAX_OFFICERS_PER_DAY) {
            if(errorElement) {
                errorElement.querySelector('span').textContent = `Máximo de ${MAX_OFFICERS_PER_DAY} oficiais por dia atingido!`;
                errorElement.style.display = "flex";
                setTimeout(() => { errorElement.style.display = "none"; }, 3000);
            }
            return;
        }
    }
    
    // Check monthly limit
    const monthString = dateString.substring(0, 7); // YYYY-MM format
    const count = countMilitarySchedulesInMonth(militaryId, monthString);
    
    if (count >= MAX_EXTRA_SHIFTS) {
        if(errorElement) {
            errorElement.querySelector('span').textContent = `Este militar já atingiu o limite de ${MAX_EXTRA_SHIFTS} escalas extras no mês!`;
            errorElement.style.display = "flex";
            setTimeout(() => { errorElement.style.display = "none"; }, 3000);
        }
        return;
    }
    
    // Add military to schedule
    if (!schedules[dateString]) {
        schedules[dateString] = [];
    }
    
    schedules[dateString].push({ id: militaryId });
    
    // Save to localStorage
    localStorage.setItem('schedules', JSON.stringify(schedules));
    
    // Update UI
    const scheduledList = document.getElementById('scheduledMilitariesList');
    if(scheduledList) {
        scheduledList.innerHTML = generateScheduledMilitaryList(schedules[dateString]);
        
        // Re-add event listeners for remove buttons
        const removeButtons = scheduledList.querySelectorAll('.remove-military-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const militaryId = this.getAttribute('data-id');
                removeMilitaryFromSchedule(dateString, militaryId);
            });
        });
    }
    
    // Update military select
    const selectContainer = document.getElementById('militarySelect');
    if(selectContainer) {
        selectContainer.innerHTML = generateMilitaryOptionsForDuty(
            getDutyTeam(new Date(dateString)), 
            schedules[dateString]
        );
    }
    
    // Update calendar and team stats
    generateCalendar();
    updateTeamStats();
}

// Remove military from schedule
function removeMilitaryFromSchedule(dateString, militaryId) {
    if (!schedules[dateString]) return;
    
    // Filter out the military
    schedules[dateString] = schedules[dateString].filter(s => s.id !== militaryId);
    
    // Clean up empty dates
    if (schedules[dateString].length === 0) {
        delete schedules[dateString];
    }
    
    // Save to localStorage
    localStorage.setItem('schedules', JSON.stringify(schedules));
    
    // Update UI
    const scheduledList = document.getElementById('scheduledMilitariesList');
    if(scheduledList) {
        scheduledList.innerHTML = generateScheduledMilitaryList(schedules[dateString] || []);
        
        // Re-add event listeners for remove buttons
        const removeButtons = scheduledList.querySelectorAll('.remove-military-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const milId = this.getAttribute('data-id');
                removeMilitaryFromSchedule(dateString, milId);
            });
        });
    }
    
    // Update military select
    const selectContainer = document.getElementById('militarySelect');
    if(selectContainer) {
        selectContainer.innerHTML = generateMilitaryOptionsForDuty(
            getDutyTeam(new Date(dateString)), 
            schedules[dateString] || []
        );
    }
    
    // Update calendar and team stats
    generateCalendar();
    updateTeamStats();
}

// Count the number of schedules for a military in the current month
function countMilitarySchedules(militaryId) {
    const monthString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    return countMilitarySchedulesInMonth(militaryId, monthString);
}

// Count schedules for a military in a specific month
function countMilitarySchedulesInMonth(militaryId, monthString) {
    let count = 0;
    
    for (const dateString in schedules) {
        if (dateString.startsWith(monthString)) {
            if (schedules[dateString].some(s => s.id === militaryId)) {
                count++;
            }
        }
    }
    
    return count;
}

// Update team statistics
function updateTeamStats() {
    // Reset counters
    let alfaCount = 0;
    let bravoCount = 0;
    let charlieCount = 0;
    let expedienteCount = 0;
    
    // Get the current month as a string (YYYY-MM)
    const monthString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    
    // Count schedules by team
    for (const dateString in schedules) {
        if (dateString.startsWith(monthString)) {
            schedules[dateString].forEach(schedule => {
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
    const alfaCountElement = document.getElementById('alfaCount');
    const bravoCountElement = document.getElementById('bravoCount');
    const charlieCountElement = document.getElementById('charlieCount');
    const expedienteCountElement = document.getElementById('expedienteCount');
    
    if(alfaCountElement) alfaCountElement.textContent = alfaCount;
    if(bravoCountElement) bravoCountElement.textContent = bravoCount;
    if(charlieCountElement) charlieCountElement.textContent = charlieCount;
    if(expedienteCountElement) expedienteCountElement.textContent = expedienteCount;
}

// Show Reports Modal
function showReportsModal(filter = '') {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = modal.querySelector('#reportSubtitle');
    const modalContent = document.getElementById('reportContent');
    
    // Update modal title based on filter
    if (modalTitle) {
        modalTitle.textContent = filter ? `Relatórios - ${filter}` : 'Relatórios';
    }
    
    // Update subtitle
    if (modalSubtitle) {
        modalSubtitle.textContent = filter 
            ? `Informações detalhadas da guarnição ${filter}` 
            : 'Informações detalhadas de todos os militares';
    }
    
    // Generate report content
    if (modalContent) {
        let html = generateReportHTML(filter);
        modalContent.innerHTML = html;
        
        // Add event listeners to report elements
        setupReportEventListeners(modalContent, filter);
    }
    
    // Show modal
    modal.classList.add('active');
}

// Show team-specific report
function showTeamsReport(team = '') {
    showReportsModal(team);
}

// Generate report HTML
function generateReportHTML(filter = '') {
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
        </div>
        
        <div class="report-tabs">
            <button class="report-tab active" data-tab="military-tab">Militares</button>
            <button class="report-tab" data-tab="schedule-tab">Escalas</button>
            <button class="report-tab" data-tab="stats-tab">Estatísticas</button>
        </div>
        
        <div class="report-content">
            <div class="report-tab-content active" id="military-tab">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Rank</th>
                            <th>Nome</th>
                            <th>Guarnição</th>
                            <th>Escalas</th>
                            <th>Última Escala</th>
                            <th>Próxima Escala</th>
                        </tr>
                    </thead>
                    <tbody>
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
                        <div class="stat-label">Escalas neste mês</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">${getAverageSchedulesPerMilitary(filter).toFixed(1)}</div>
                        <div class="stat-label">Média por militar</div>
                    </div>
                </div>
            </div>
            
            <div class="report-tab-content" id="stats-tab">
                <div class="team-distribution">
                    <h4 class="section-title">Distribuição por Guarnição</h4>
                    <div class="team-stats">
                        <div class="team-stat-item alfa-bg">
                            <div class="team-stat-name">ALFA</div>
                            <div class="team-stat-count">${getTeamCount('ALFA')}</div>
                        </div>
                        <div class="team-stat-item bravo-bg">
                            <div class="team-stat-name">BRAVO</div>
                            <div class="team-stat-count">${getTeamCount('BRAVO')}</div>
                        </div>
                        <div class="team-stat-item charlie-bg">
                            <div class="team-stat-name">CHARLIE</div>
                            <div class="team-stat-count">${getTeamCount('CHARLIE')}</div>
                        </div>
                        <div class="team-stat-item expediente-bg">
                            <div class="team-stat-name">EXPEDIENTE</div>
                            <div class="team-stat-count">${getTeamCount('EXPEDIENTE')}</div>
                        </div>
                    </div>
                </div>
                
                <h4 class="section-title">Militares Mais Escalados</h4>
                <div class="top-militaries">
                    ${generateTopMilitariesList(filter)}
                </div>
            </div>
        </div>
    `;
}

// Setup event listeners for report elements
function setupReportEventListeners(modalContent, filter) {
    // Handle tab switching
    const reportTabs = modalContent.querySelectorAll('.report-tab');
    reportTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            reportTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabId = this.getAttribute('data-tab');
            const tabContents = modalContent.querySelectorAll('.report-tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Team filter change
    const teamFilter = modalContent.querySelector('#teamFilter');
    if (teamFilter) {
        teamFilter.addEventListener('change', function() {
            showReportsModal(this.value);
        });
    }
    
    // Search functionality
    const searchInput = modalContent.querySelector('#reportSearch');
    const searchBtn = modalContent.querySelector('#searchReportBtn');
    
    if (searchInput && searchBtn) {
        const handleSearch = function() {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const tableRows = modalContent.querySelectorAll('.report-table tbody tr');
            
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (searchTerm === '' || text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        };
        
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        searchBtn.addEventListener('click', handleSearch);
    }
}

// Generate military table rows
function generateMilitaryTableRows(filter = '') {
    const filteredMilitaries = filter 
        ? militaries.filter(m => m.team === filter) 
        : militaries;
    
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
                <td class="${m.team.toLowerCase()}-text"><strong>${m.team}</strong></td>
                <td>${scheduleCount}</td>
                <td>${lastSchedule ? formatDisplayDate(lastSchedule) : '-'}</td>
                <td>${nextSchedule ? formatDisplayDate(nextSchedule) : '-'}</td>
            </tr>
        `;
    }).join('');
}

// Format date for display
function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Get last schedule date for a military
function getLastScheduleDate(militaryId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastDate = null;
    let lastDateObj = null;
    
    for (const dateString in schedules) {
        if (schedules[dateString].some(s => s.id === militaryId)) {
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
    
    for (const dateString in schedules) {
        if (schedules[dateString].some(s => s.id === militaryId)) {
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

// Count total schedules
function getTotalSchedules(filter = '') {
    let count = 0;
    
    for (const dateString in schedules) {
        if (filter) {
            // Only count schedules for the specified team
            count += schedules[dateString].filter(s => {
                const military = getMilitaryById(s.id);
                return military && military.team === filter;
            }).length;
        } else {
            count += schedules[dateString].length;
        }
    }
    
    return count;
}

// Count current month schedules
function getCurrentMonthSchedules(filter = '') {
    const currentMonth = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    let count = 0;
    
    for (const dateString in schedules) {
        if (dateString.startsWith(currentMonth)) {
            if (filter) {
                count += schedules[dateString].filter(s => {
                    const military = getMilitaryById(s.id);
                    return military && military.team === filter;
                }).length;
            } else {
                count += schedules[dateString].length;
            }
        }
    }
    
    return count;
}

// Calculate average schedules per military
function getAverageSchedulesPerMilitary(filter = '') {
    const totalSchedules = getTotalSchedules(filter);
    const militaryCount = filter 
        ? militaries.filter(m => m.team === filter).length 
        : militaries.length;
    
    if (militaryCount === 0) return 0;
    
    return totalSchedules / militaryCount;
}

// Get team count
function getTeamCount(team) {
    return militaries.filter(m => m.team === team).length;
}

// Generate top militaries list
function generateTopMilitariesList(filter = '') {
    // Get militaries with schedule count
    const militarySchedules = militaries
        .filter(m => !filter || m.team === filter)
        .map(m => {
            return {
                ...m,
                scheduleCount: countMilitarySchedules(m.id)
            };
        })
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

// Show Military Management Modal
function showMilitaryManagementModal(editMilitary = null) {
    const modal = document.getElementById('militaryModal');
    if (!modal) return;
    
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = modal.querySelector('.modal-subtitle');
    const modalContent = document.getElementById('militaryContent');
    
    // Update modal title based on action
    if (modalTitle) {
        modalTitle.textContent = editMilitary ? 'Editar Militar' : 'Gerenciamento de Militares';
    }
    
    // Update subtitle
    if (modalSubtitle) {
        modalSubtitle.textContent = editMilitary 
            ? `Editando: ${editMilitary.rank} ${editMilitary.name}`
            : 'Adicionar, Editar ou Excluir';
    }
    
    // Generate content
    if (modalContent) {
        if (editMilitary) {
            // Edit form for a specific military
            let html = `
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
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Salvar Alterações
                        </button>
                    </div>
                </form>
            `;
            
            modalContent.innerHTML = html;
            
            // Form submission
            const form = document.getElementById('editMilitaryForm');
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const id = document.getElementById('militaryId').value;
                    const rank = document.getElementById('militaryRank').value;
                    const name = document.getElementById('militaryName').value;
                    const team = document.getElementById('militaryTeam').value;
                    
                    updateMilitary(id, { rank, name, team });
                    modal.classList.remove('active');
                    
                    // Refresh the calendar and stats
                    generateCalendar();
                    updateTeamStats();
                });
            }
            
            // Cancel button
            const cancelBtn = document.getElementById('cancelEditBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    showMilitaryManagementModal();
                });
            }
        } else {
            // Main military management interface
            let html = `
                <div class="management-tabs">
                    <button class="management-tab active" data-tab="list-tab">Lista</button>
                    <button class="management-tab" data-tab="add-tab">Adicionar</button>
                </div>
                
                <div class="management-content">
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
                                <i class="fas fa-plus"></i> Adicionar Militar
                            </button>
                        </form>
                    </div>
                </div>
            `;
            
            modalContent.innerHTML = html;
            
            // Set up tab switching
            setupManagementTabSwitching(modalContent);
            
            // Setup search
            setupMilitarySearch(modalContent);
            
            // Setup add form
            setupAddMilitaryForm(modalContent, modal);
            
            // Setup edit and delete buttons
            setupMilitaryItemActions(modal);
        }
    }
    
    // Show modal
    modal.classList.add('active');
}

// Setup tab switching for management
function setupManagementTabSwitching(modalContent) {
    const managementTabs = modalContent.querySelectorAll('.management-tab');
    managementTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            managementTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabId = this.getAttribute('data-tab');
            const tabContents = modalContent.querySelectorAll('.management-tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// Setup military search
function setupMilitarySearch(modalContent) {
    const searchInput = modalContent.querySelector('#militarySearch');
    const searchBtn = modalContent.querySelector('#searchMilitaryBtn');
    
    if (searchInput && searchBtn) {
        const handleSearch = function() {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const militaryItems = modalContent.querySelectorAll('.military-item');
            
            militaryItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (searchTerm === '' || text.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        };
        
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
        
        searchBtn.addEventListener('click', handleSearch);
    }
}

// Setup add military form
function setupAddMilitaryForm(modalContent, modal) {
    const addForm = modalContent.querySelector('#addMilitaryForm');
    if (addForm) {
        addForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const rank = document.getElementById('newMilitaryRank').value;
            const name = document.getElementById('newMilitaryName').value;
            const team = document.getElementById('newMilitaryTeam').value;
            
            addNewMilitary(rank, name, team);
            
            // Clear form
            this.reset();
            
            // Show success message
            alert(`Militar ${rank} ${name} adicionado com sucesso!`);
            
            // Refresh the military list
            const militaryList = modalContent.querySelector('.military-list');
            if (militaryList) {
                militaryList.innerHTML = generateMilitaryList();
                setupMilitaryItemActions(modal);
            }
            
            // Switch to list tab
            const listTab = modalContent.querySelector('.management-tab[data-tab="list-tab"]');
            if (listTab) listTab.click();
            
            // Refresh the calendar and stats
            generateCalendar();
            updateTeamStats();
        });
    }
}

// Setup military item actions (edit/delete)
function setupMilitaryItemActions(modal) {
    const editBtns = document.querySelectorAll('.edit-military-btn');
    const deleteBtns = document.querySelectorAll('.delete-military-btn');
    
    editBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const militaryId = this.closest('.military-item').getAttribute('data-id');
            const military = getMilitaryById(militaryId);
            if (military) {
                showMilitaryManagementModal(military);
            }
        });
    });
    
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const militaryItem = this.closest('.military-item');
            const militaryId = militaryItem.getAttribute('data-id');
            const military = getMilitaryById(militaryId);
            
            if (military && confirm(`Tem certeza que deseja excluir ${military.rank} ${military.name}?`)) {
                deleteMilitary(militaryId);
                militaryItem.remove();
                
                // Refresh the calendar and stats
                generateCalendar();
                updateTeamStats();
            }
        });
    });
}

// Generate the list of militaries for management
function generateMilitaryList() {
    if (militaries.length === 0) {
        return '<div class="no-data">Nenhum militar cadastrado.</div>';
    }
    
    return militaries.map(m => {
        return `
            <div class="military-item ${m.team.toLowerCase()}-row" data-id="${m.id}">
                <div class="military-avatar ${m.team.toLowerCase()}-bg">
                    ${m.name.charAt(0)}
                </div>
                <div class="military-info">
                    <div class="military-name">${m.rank} ${m.name}</div>
                    <div class="military-team ${m.team.toLowerCase()}-text">${m.team}</div>
                </div>
                <div class="military-actions">
                    <button class="btn btn-secondary edit-military-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger delete-military-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// CRUD operations for military personnel
function addNewMilitary(rank, name, team) {
    const newId = 'mil_' + (militaries.length + 1);
    const newMilitary = {
        id: newId,
        rank: rank,
        name: name,
        team: team
    };
    
    militaries.push(newMilitary);
    localStorage.setItem('militaries', JSON.stringify(militaries));
    
    return newMilitary;
}

function updateMilitary(id, data) {
    const index = militaries.findIndex(m => m.id === id);
    if (index !== -1) {
        militaries[index] = {
            ...militaries[index],
            ...data
        };
        
        localStorage.setItem('militaries', JSON.stringify(militaries));
        
        return militaries[index];
    }
    return null;
}

function deleteMilitary(id) {
    // Remove from militaries array
    militaries = militaries.filter(m => m.id !== id);
    localStorage.setItem('militaries', JSON.stringify(militaries));
    
    // Remove from schedules
    for (const dateString in schedules) {
        schedules[dateString] = schedules[dateString].filter(s => s.id !== id);
        // Clean up empty dates
        if (schedules[dateString].length === 0) {
            delete schedules[dateString];
        }
    }
    localStorage.setItem('schedules', JSON.stringify(schedules));
    
    return true;
}

// Initialize with sample militaries
function initializeSampleMilitaries() {
    // Sample military personnel from 20ªCIPM
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
    
    // Save to localStorage
    militaries = sampleMilitaries;
    localStorage.setItem('militaries', JSON.stringify(militaries));
    
    // Create some sample schedules
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    // Add sample schedules for demonstration
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
        const teamMilitaries = militaries.filter(m => m.team === team);
        
        if (teamMilitaries.length > 0) {
            // Add 1-2 militaries for each sample date
            const numMilitaries = Math.floor(Math.random() * 2) + 1;
            schedules[dateString] = [];
            
            for (let i = 0; i < numMilitaries; i++) {
                if (i < teamMilitaries.length) {
                    schedules[dateString].push({ id: teamMilitaries[i].id });
                }
            }
        }
    });
    
    localStorage.setItem('schedules', JSON.stringify(schedules));
}

// Add CSS for the new components
document.addEventListener('DOMContentLoaded', function() {
    // Add styles for various components
    const style = document.createElement('style');
    style.textContent = `
        /* Modal Section Styling */
        .modal-section {
            margin-bottom: var(--spacing-xl);
            border-bottom: 1px solid var(--gray-200);
            padding-bottom: var(--spacing-lg);
        }
        
        body.dark-mode .modal-section {
            border-color: var(--gray-700);
        }
        
        .modal-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        
        .modal-section-title {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            margin-bottom: var(--spacing-sm);
            font-size: 1.125rem;
            color: var(--gray-900);
        }
        
        body.dark-mode .modal-section-title {
            color: var(--white);
        }
        
        .modal-section-title i {
            color: var(--accent-blue);
        }
        
        .modal-section-subtitle {
            font-size: 0.875rem;
            margin-bottom: var(--spacing-md);
            color: var(--gray-600);
        }
        
        body.dark-mode .modal-section-subtitle {
            color: var(--gray-400);
        }
        
        /* Team text colors */
        .alfa-text { color: var(--alfa-main); }
        .bravo-text { color: var(--bravo-main); }
        .charlie-text { color: var(--charlie-main); }
        .expediente-text { color: var(--expediente-main); }
        
        /* Team background colors */
        .alfa-bg { background-color: var(--alfa-bg); color: var(--alfa-dark); }
        .bravo-bg { background-color: var(--bravo-bg); color: var(--bravo-dark); }
        .charlie-bg { background-color: var(--charlie-bg); color: var(--charlie-dark); }
        .expediente-bg { background-color: var(--expediente-bg); color: var(--expediente-dark); }
        
        /* Form Elements */
        .form-group {
            margin-bottom: var(--spacing-md);
        }
        
        .form-label {
            display: block;
            margin-bottom: var(--spacing-xs);
            font-weight: 600;
            color: var(--gray-800);
        }
        
        body.dark-mode .form-label {
            color: var(--gray-200);
        }
        
        .form-control {
            width: 100%;
            padding: 10px var(--spacing-md);
            border-radius: var(--radius-md);
            border: 1px solid var(--gray-300);
            background-color: var(--white);
            color: var(--gray-900);
            font-family: inherit;
            font-size: 0.938rem;
            transition: all var(--transition-normal);
        }
        
        body.dark-mode .form-control {
            background-color: var(--gray-700);
            border-color: var(--gray-600);
            color: var(--white);
        }
        
        .form-control:focus {
            outline: none;
            border-color: var(--accent-blue);
            box-shadow: 0 0 0 2px rgba(62, 120, 178, 0.2);
        }
        
        /* Button Styles */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px var(--spacing-md);
            border-radius: var(--radius-md);
            font-weight: 600;
            font-size: 0.938rem;
            cursor: pointer;
            transition: all var(--transition-normal);
            border: none;
        }
        
        .btn i {
            font-size: 1rem;
        }
        
        .btn-primary {
            background: var(--gradient-blue);
            color: var(--white);
            box-shadow: 0 4px 8px rgba(62, 120, 178, 0.2);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(62, 120, 178, 0.3);
        }
        
        .btn-primary:active {
            transform: translateY(0);
        }
        
        .btn-secondary {
            background-color: var(--gray-200);
            color: var(--gray-700);
        }
        
        body.dark-mode .btn-secondary {
            background-color: var(--gray-700);
            color: var(--gray-200);
        }
        
        .btn-secondary:hover {
            background-color: var(--gray-300);
        }
        
        body.dark-mode .btn-secondary:hover {
            background-color: var(--gray-600);
        }
        
        .btn-danger {
            background-color: #B91C1C;
            color: var(--white);
        }
        
        .btn-danger:hover {
            background-color: #991B1B;
        }
        
        .btn-block {
            width: 100%;
            margin-top: var(--spacing-lg);
        }
        
        /* Alert Styles */
        .alert {
            padding: var(--spacing-md);
            border-radius: var(--radius-md);
            margin-bottom: var(--spacing-md);
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .alert i {
            font-size: 1.125rem;
        }
        
        .alert-danger {
            background-color: #FEE2E2;
            color: #B91C1C;
        }
        
        body.dark-mode .alert-danger {
            background-color: rgba(185, 28, 28, 0.2);
            color: #FCA5A5;
        }
        
        /* Scheduled Items */
        .scheduled-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            background-color: var(--gray-100);
            padding: var(--spacing-md);
            border-radius: var(--radius-md);
            margin-bottom: var(--spacing-sm);
            transition: all var(--transition-normal);
        }
        
        body.dark-mode .scheduled-item {
            background-color: var(--gray-700);
        }
        
        .scheduled-item:hover {
            transform: translateX(4px);
        }
        
        .scheduled-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
        }
        
        .scheduled-info {
            flex: 1;
        }
        
        .scheduled-name {
            font-weight: 600;
            font-size: 0.938rem;
        }
        
        .scheduled-team {
            font-size: 0.813rem;
            font-weight: 600;
        }
        
        .remove-military-btn {
            width: 32px;
            height: 32px;
            border-radius: var(--radius-full);
            border: none;
            background-color: #B91C1C;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all var(--transition-fast);
        }
        
        .remove-military-btn:hover {
            transform: rotate(90deg);
            background-color: #991B1B;
        }
        
        .no-militaries {
            text-align: center;
            padding: var(--spacing-lg);
            color: var(--gray-500);
            font-style: italic;
            background-color: var(--gray-100);
            border-radius: var(--radius-md);
        }
        
        body.dark-mode .no-militaries {
            background-color: var(--gray-700);
            color: var(--gray-400);
        }
        
        /* Reports Styling */
        .report-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--spacing-lg);
            gap: var(--spacing-md);
            flex-wrap: wrap;
        }
        
        .search-control {
            display: flex;
            align-items: center;
            gap: var(--spacing-xs);
            flex: 1;
        }
        
        .report-tabs,
        .management-tabs {
            display: flex;
            border-bottom: 1px solid var(--gray-200);
            margin-bottom: var(--spacing-lg);
        }
        
        body.dark-mode .report-tabs,
        body.dark-mode .management-tabs {
            border-color: var(--gray-700);
        }
        
        .report-tab,
        .management-tab {
            padding: var(--spacing-sm) var(--spacing-lg);
            border: none;
            background: none;
            font-weight: 600;
            color: var(--gray-600);
            cursor: pointer;
            position: relative;
        }
        
        body.dark-mode .report-tab,
        body.dark-mode .management-tab {
            color: var(--gray-400);
        }
        
        .report-tab.active,
        .management-tab.active {
            color: var(--accent-blue);
        }
        
        .report-tab.active::after,
        .management-tab.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 100%;
            height: 2px;
            background-color: var(--accent-blue);
        }
        
        .report-tab-content,
        .management-tab-content {
            display: none;
            padding: var(--spacing-md) 0;
        }
        
        .report-tab-content.active,
        .management-tab-content.active {
            display: block;
        }
        
        .report-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: var(--spacing-lg);
        }
        
        .report-table th,
        .report-table td {
            padding: var(--spacing-sm) var(--spacing-md);
            text-align: left;
            border-bottom: 1px solid var(--gray-200);
        }
        
        body.dark-mode .report-table th,
        body.dark-mode .report-table td {
            border-color: var(--gray-700);
        }
        
        .report-table th {
            background-color: var(--gray-100);
            font-weight: 600;
            color: var(--gray-800);
        }
        
        body.dark-mode .report-table th {
            background-color: var(--gray-800);
            color: var(--gray-200);
        }
        
        .report-table tr:hover td {
            background-color: rgba(62, 120, 178, 0.05);
        }
        
        body.dark-mode .report-table tr:hover td {
            background-color: rgba(62, 120, 178, 0.1);
        }
        
        .alfa-row td { border-left: 3px solid var(--alfa-main); }
        .bravo-row td { border-left: 3px solid var(--bravo-main); }
        .charlie-row td { border-left: 3px solid var(--charlie-main); }
        .expediente-row td { border-left: 3px solid var(--expediente-main); }
        
        .schedule-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-xl);
        }
        
        .stat-card {
            padding: var(--spacing-lg);
            background-color: var(--white);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        body.dark-mode .stat-card {
            background-color: var(--gray-800);
        }
        
        .stat-number {
            font-size: 3rem;
            font-weight: 800;
            color: var(--accent-blue);
            line-height: 1;
            margin-bottom: var(--spacing-xs);
        }
        
        .stat-label {
            font-size: 0.938rem;
            color: var(--gray-600);
            text-align: center;
        }
        
        body.dark-mode .stat-label {
            color: var(--gray-400);
        }
        
        .section-title {
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--gray-900);
            margin-bottom: var(--spacing-md);
        }
        
        body.dark-mode .section-title {
            color: var(--white);
        }
        
        .team-stats {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-xl);
        }
        
        .team-stat-item {
            padding: var(--spacing-lg);
            border-radius: var(--radius-md);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
        }
        
        .team-stat-name {
            font-weight: 700;
            margin-bottom: var(--spacing-sm);
            font-size: 1.25rem;
        }
        
        .team-stat-count {
            font-size: 2.5rem;
            font-weight: 800;
        }
        
        .top-militaries {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
        }
        
        .top-military-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            background-color: var(--white);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-sm);
        }
        
        body.dark-mode .top-military-item {
            background-color: var(--gray-800);
        }
        
        .rank-number {
            width: 28px;
            height: 28px;
            border-radius: var(--radius-full);
            background-color: var(--accent-blue);
            color: var(--white);
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .schedule-count {
            margin-left: auto;
            font-weight: 700;
            font-size: 1.125rem;
            color: var(--accent-blue);
        }
        
        .no-data {
            text-align: center;
            padding: var(--spacing-lg);
            color: var(--gray-500);
            background-color: var(--gray-100);
            border-radius: var(--radius-md);
            font-style: italic;
        }
        
        body.dark-mode .no-data {
            background-color: var(--gray-700);
            color: var(--gray-400);
        }
        
        /* Military Management Styles */
        .military-list {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
            margin-top: var(--spacing-md);
        }
        
        .military-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            background-color: var(--white);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-sm);
            transition: all var(--transition-normal);
        }
        
        body.dark-mode .military-item {
            background-color: var(--gray-800);
        }
        
        .military-item:hover {
            transform: translateX(4px);
            box-shadow: var(--shadow-md);
        }
        
        .military-avatar {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-full);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1rem;
        }
        
        .military-info {
            flex: 1;
            overflow: hidden;
        }
        
        .military-name {
            font-weight: 600;
            font-size: 0.938rem;
            color: var(--gray-900);
        }
        
        body.dark-mode .military-name {
            color: var(--white);
        }
        
        .military-team {
            font-size: 0.813rem;
            font-weight: 600;
        }
        
        .military-actions {
            display: flex;
            gap: var(--spacing-sm);
        }
        
        .military-form {
            max-width: 500px;
            margin: 0 auto;
        }
        
        .form-buttons {
            display: flex;
            justify-content: flex-end;
            gap: var(--spacing-md);
            margin-top: var(--spacing-lg);
        }
    `;
    
    document.head.appendChild(style);
});