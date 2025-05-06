/**
 * Police Scheduling System - Core Functionality
 * This script handles the core functionality of the police scheduling system,
 * including calendar display, schedule management, and user interactions.
 */

// Verificar se o Firebase está disponível 
const checkFirebaseAvailability = () => {
    try {
        return window.isFirebaseAvailable && window.firebaseDB;
    } catch (error) {
        console.error('Erro ao verificar disponibilidade do Firebase:', error);
        return false;
    }
};

// Application state
const state = {
    militaries: [],           // Array of military personnel
    schedules: {},            // Object with dates as keys and arrays of scheduled militaries
    currentDate: new Date(),  // Current date
    selectedDay: null,        // Selected day for scheduling
    selectedMonth: new Date().getMonth(),      // Selected month (0-11)
    selectedYear: new Date().getFullYear(),    // Selected year
    isLoading: true           // Loading state
};

// Constants
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DUTY_REFERENCE_DATE = new Date(2025, 3, 3);  // Apr 3, 2025 - Reference for duty cycles
const MAX_OFFICERS_PER_DAY = 3;   // Maximum number of officers per day
const MAX_EXTRA_SHIFTS = 12;      // Maximum extra shifts per month

// Iniciar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado - aguardando inicialização do Firebase...');
    
    // Verificar se o Firebase já está disponível
    if (checkFirebaseAvailability()) {
        console.log('Firebase já disponível, inicializando aplicação...');
        initializeApp();
    } else {
        // Esperar pelo evento de Firebase pronto
        console.log('Aguardando Firebase estar pronto...');
        
        // Configurar listener para quando o Firebase estiver pronto
        document.addEventListener('firebase-ready', () => {
            console.log('Evento firebase-ready recebido, inicializando aplicação...');
            initializeApp();
        });
        
        // Configurar listener para erro do Firebase
        document.addEventListener('firebase-error', (e) => {
            console.warn('Evento firebase-error recebido, inicializando aplicação com localStorage apenas:', e.detail?.error);
            initializeApp();
        });
        
        // Timeout como fallback caso os eventos não sejam disparados
        setTimeout(() => {
            console.warn('Timeout de espera pelo Firebase, iniciando aplicação com disponibilidade atual:', checkFirebaseAvailability());
            initializeApp();
        }, 3000);
    }
});

/**
 * Initialize the application
 */
function initializeApp() {
    console.log('Initializing application...');
    
    // Show the loading screen
    showLoadingScreen();

    try {
        // Definir data atual 
        setCurrentDate();
        
        // Verificar explicitamente o Firebase
        const firebaseStatus = typeof firebase !== 'undefined' && firebase.database ? 'disponível' : 'indisponível';
        console.log(`Status do Firebase: ${firebaseStatus}`);
        
        // Forçar visualização dos cartões
        forceShowCards();
        
        // Load data (from localStorage or Firebase)
        loadData()
            .then(() => {
                console.log('Data loaded successfully');
                
                // Set up UI components
                setupUI();
                
                // Setup all event listeners
                setupEventListeners();
                
                // Generate initial calendar
                generateCalendar();
                
                // Update team statistics
                updateTeamStats();
                
                // Define global handler functions for military forms
                window.addMilitary = addMilitaryHandler;
                window.updateMilitary = updateMilitaryHandler;
                window.deleteMilitary = deleteMilitaryHandler;
                window.showEditForm = showEditFormHandler;
                window.showDeleteConfirmation = showDeleteConfirmationHandler;
                
                // Reaplicar UI após carregar dados
                updateMonthYearDisplay();
                
                // Forçar visualização dos cartões novamente após carregar os dados
                forceShowCards();
                
                // Hide loading screen
                hideLoadingScreen();
            })
            .catch(error => {
                console.error('Failed to load data:', error);
                showError('Erro ao carregar dados. Por favor, tente novamente.');
                hideLoadingScreen();
            });
    } catch (error) {
        console.error('Critical error during initialization:', error);
        showError('Erro crítico ao inicializar. Por favor, recarregue a página.');
        hideLoadingScreen();
    }
}

/**
 * Definir data atual corretamente
 */
function setCurrentDate() {
    const now = new Date();
    state.currentDate = now;
    state.selectedMonth = now.getMonth();
    state.selectedYear = now.getFullYear();
    console.log(`Data atual definida: ${now} (${MONTHS[state.selectedMonth]} ${state.selectedYear})`);
    
    // Atualizar select de mês e ano
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.value = state.selectedMonth;
        console.log('Mês selecionado:', state.selectedMonth);
    }
    
    if (yearSelect) {
        yearSelect.value = state.selectedYear;
        console.log('Ano selecionado:', state.selectedYear);
    }
}

/**
 * Força a exibição dos cards
 */
function forceShowCards() {
    console.log('Forçando exibição dos cards...');
    
    // Forçar exibição da grade de cards
    const scalesGrid = document.querySelector('.scales-grid');
    if (scalesGrid) {
        scalesGrid.style.display = 'grid';
        scalesGrid.style.visibility = 'visible';
        scalesGrid.style.opacity = '1';
        console.log('Grade de cards visível');
    } else {
        console.error('Elemento .scales-grid não encontrado');
    }
    
    // Forçar exibição de cada card
    const cards = document.querySelectorAll('.scale-card');
    console.log(`Encontrados ${cards.length} cards`);
    
    cards.forEach((card, index) => {
        card.style.display = 'flex';
        card.style.visibility = 'visible';
        card.style.opacity = '1';
        console.log(`Card #${index+1} visível`);
    });
    
    // Forçar atualização dos contadores
    updateTeamStats();
}

/**
 * Load application data from localStorage or Firebase
 */
function loadData() {
    console.log('Loading data...');
    
    try {
        // Tentar carregar do Firebase primeiro
        if (checkFirebaseAvailability()) {
            console.log('Trying to load data from Firebase...');
            return Promise.all([
                loadMilitaries(),
                loadSchedules()
            ]).then(([militaries, schedules]) => {
                console.log('Dados recebidos do Firebase:', militaries ? 'sim' : 'não', schedules ? 'sim' : 'não');
                
                if (militaries && militaries.length > 0) {
                    state.militaries = militaries;
                    console.log('Militares carregados do Firebase:', state.militaries.length);
                } else {
                    console.warn('Não foram encontrados militares no Firebase, carregando do localStorage');
                    loadMilitariesFromLocalStorage();
                }
                
                if (schedules && Object.keys(schedules).length > 0) {
                    state.schedules = schedules;
                    console.log('Escalas carregadas do Firebase:', Object.keys(state.schedules).length);
                } else {
                    console.warn('Não foram encontradas escalas no Firebase, carregando do localStorage');
                    loadSchedulesFromLocalStorage();
                }
                
                // Atualizar o localStorage com os dados do Firebase
                safeSaveToLocalStorage('militaries', state.militaries);
                safeSaveToLocalStorage('schedules', state.schedules);
                
                // Verificar se temos dados após o carregamento
                validateLoadedData();
                
                return true;
            }).catch(error => {
                console.error('Error loading from Firebase:', error);
                return loadFromLocalStorage();
            });
        } else {
            return loadFromLocalStorage();
        }
    } catch (error) {
        console.error('Error in loadData:', error);
        return loadFromLocalStorage();
    }
    
    // Função auxiliar para carregar do localStorage
    function loadFromLocalStorage() {
        console.log('Loading from localStorage...');
        
        loadMilitariesFromLocalStorage();
        loadSchedulesFromLocalStorage();
        
        // Validar dados e inicializar dados de amostra se necessário
        validateLoadedData();
        
        return Promise.resolve();
    }
    
    // Funções auxiliares para carregar dados específicos
    function loadMilitariesFromLocalStorage() {
        try {
            const localMilitaries = localStorage.getItem('militaries');
            console.log('Dados militares encontrados no localStorage:', localMilitaries ? 'sim' : 'não');
            
            if (localMilitaries) {
                try {
                    const parsed = JSON.parse(localMilitaries);
                    if (Array.isArray(parsed)) {
                        state.militaries = parsed;
                        console.log('Militares carregados do localStorage:', state.militaries.length);
                    } else {
                        console.error('Dados de militares no localStorage não são um array, reiniciando dados');
                        state.militaries = [];
                    }
                } catch (e) {
                    console.error('Erro ao analisar militares do localStorage:', e);
                    state.militaries = [];
                }
            } else {
                console.warn('Nenhum dado de militares encontrado no localStorage');
                state.militaries = [];
            }
        } catch (error) {
            console.error('Erro ao acessar localStorage para militares:', error);
            state.militaries = [];
        }
    }
    
    function loadSchedulesFromLocalStorage() {
        try {
            const localSchedules = localStorage.getItem('schedules');
            console.log('Dados de escalas encontrados no localStorage:', localSchedules ? 'sim' : 'não');
            
            if (localSchedules) {
                try {
                    const parsed = JSON.parse(localSchedules);
                    if (parsed && typeof parsed === 'object') {
                        state.schedules = parsed;
                        console.log('Escalas carregadas do localStorage:', Object.keys(state.schedules).length);
                    } else {
                        console.error('Dados de escalas no localStorage não são um objeto, reiniciando dados');
                        state.schedules = {};
                    }
                } catch (e) {
                    console.error('Erro ao analisar escalas do localStorage:', e);
                    state.schedules = {};
                }
            } else {
                console.warn('Nenhum dado de escalas encontrado no localStorage');
                state.schedules = {};
            }
        } catch (error) {
            console.error('Erro ao acessar localStorage para escalas:', error);
            state.schedules = {};
        }
    }
    
    // Validar dados e inicializar dados de amostra se necessário
    function validateLoadedData() {
        console.log('Validando dados carregados...');
        
        if (!state.militaries || !Array.isArray(state.militaries) || state.militaries.length === 0) {
            console.warn('Dados de militares inválidos ou vazios, inicializando dados de amostra');
            initializeSampleData();
        } else {
            console.log('Dados válidos: ' + state.militaries.length + ' militares, ' + 
                Object.keys(state.schedules).length + ' escalas');
        }
    }
}

/**
 * Função auxiliar para salvar dados no localStorage com tratamento de erros
 */
function safeSaveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Dados '${key}' salvos no localStorage com sucesso`);
        return true;
    } catch (error) {
        console.error(`Erro ao salvar '${key}' no localStorage:`, error);
        return false;
    }
}

/**
 * Initialize UI components
 */
function setupUI() {
    console.log('Setting up UI components...');
    
    // Set month and year selectors to current values
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.value = state.selectedMonth;
        console.log('Set month select to:', state.selectedMonth, '(', MONTHS[state.selectedMonth], ')');
    } else {
        console.error('Month select element not found');
    }
    
    if (yearSelect) {
        yearSelect.value = state.selectedYear;
        console.log('Set year select to:', state.selectedYear);
    } else {
        console.error('Year select element not found');
    }
    
    // Update month/year display
    updateMonthYearDisplay();
    
    // Ensure the scales-grid visibility
    const scalesGrid = document.querySelector('.scales-grid');
    if (scalesGrid) {
        scalesGrid.style.display = 'grid';
        console.log('Ensured scales-grid visibility');
    } else {
        console.error('Scales grid element not found');
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    try {
        // Set up sidebar navigation
        setupNavigation();
        
        // Set up month navigation
        setupMonthNavigation();
        
        // Set up calendar view tabs
        setupCalendarViews();
        
        // Set up team cards
        setupTeamCards();
        
        // Set up add schedule button
        setupAddScheduleButton();
        
        // Set up header buttons (notifications, help, settings)
        setupHeaderButtons();
        
        // Set up logout button
        setupLogoutButton();
        
        console.log('All event listeners set up successfully');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        showError('Erro ao configurar interface. Por favor, recarregue a página.');
    }
}

/**
 * Set up sidebar navigation
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Skip if this is a link with href
            if (this.parentNode.tagName === 'A') {
                return;
            }
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Handle navigation based on ID
            const navId = this.id;
            console.log('Navigation clicked:', navId);
            
            if (navId === 'dashboard-nav') {
                // Already on dashboard, do nothing
            } else if (navId === 'escalas-nav') {
                openScheduleModal(state.currentDate.getDate(), state.selectedMonth, state.selectedYear);
            } else if (navId === 'guarnicoes-nav') {
                showTeamsReport();
            } else if (navId === 'cadastro-nav') {
                showMilitaryManagement();
            } else if (navId === 'relatorios-nav') {
                window.location.href = 'relatorios.html';
            } else if (navId === 'config-nav') {
                alert('Funcionalidade de Configurações em desenvolvimento');
            }
        });
    });
}

/**
 * Set up month navigation
 */
function setupMonthNavigation() {
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function(e) {
            state.selectedMonth--;
            if (state.selectedMonth < 0) {
                state.selectedMonth = 11;  // December
                state.selectedYear--;
            }
            updateMonthControls();
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function(e) {
            state.selectedMonth++;
            if (state.selectedMonth > 11) {
                state.selectedMonth = 0;  // January
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

/**
 * Update month controls (selects and display text)
 */
function updateMonthControls() {
    // Update select inputs
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) monthSelect.value = state.selectedMonth;
    if (yearSelect) yearSelect.value = state.selectedYear;
    
    // Update display text
    updateMonthYearDisplay();
    
    // Regenerate calendar
    generateCalendar();
    
    // Update team statistics
    updateTeamStats();
}

/**
 * Update month/year display text
 */
function updateMonthYearDisplay() {
    const monthYearElement = document.getElementById('currentMonthYear');
    const calendarTitle = document.querySelector('.calendar-title');
    
    const displayText = `${MONTHS[state.selectedMonth]} ${state.selectedYear}`;
    console.log('Atualizando exibição de mês/ano para:', displayText);
    
    // Atualizar o texto do mês/ano no topo
    if (monthYearElement) {
        monthYearElement.textContent = displayText;
        monthYearElement.style.display = 'block';
    } else {
        console.error('Elemento #currentMonthYear não encontrado');
    }
    
    // Atualizar o título do calendário
    if (calendarTitle) {
        calendarTitle.textContent = displayText;
        calendarTitle.style.display = 'block';
    } else {
        console.error('Elemento .calendar-title não encontrado');
    }
    
    // Atualizar os seletores de mês e ano
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    if (monthSelect) {
        monthSelect.value = state.selectedMonth;
    }
    
    if (yearSelect) {
        yearSelect.value = state.selectedYear;
    }
    
    // Forçar renderização do calendário após atualizar a data
    setTimeout(generateCalendar, 0);
}

/**
 * Populate military select dropdowns
 */
function populateMilitarySelects() {
    const editSelect = document.getElementById('selectMilitaryToEdit');
    const deleteSelect = document.getElementById('selectMilitaryToDelete');
    
    if (!editSelect || !deleteSelect) {
        console.error('Military select elements not found');
        return;
    }
    
    // Save current selected values
    const editSelectedValue = editSelect.value;
    const deleteSelectedValue = deleteSelect.value;
    
    // Clear existing options except the first one
    while (editSelect.options.length > 1) {
        editSelect.remove(1);
    }
    
    while (deleteSelect.options.length > 1) {
        deleteSelect.remove(1);
    }
    
    // Add all militaries to both selects
    state.militaries.forEach(military => {
        // Create option for edit select
        const editOption = document.createElement('option');
        editOption.value = military.id;
        editOption.textContent = `${military.rank} ${military.name} - ${military.team}`;
        editSelect.appendChild(editOption);
        
        // Create option for delete select
        const deleteOption = document.createElement('option');
        deleteOption.value = military.id;
        deleteOption.textContent = `${military.rank} ${military.name} - ${military.team}`;
        deleteSelect.appendChild(deleteOption);
    });
    
    // Restore selected values if they still exist
    if (editSelectedValue) {
        for (let i = 0; i < editSelect.options.length; i++) {
            if (editSelect.options[i].value === editSelectedValue) {
                editSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    if (deleteSelectedValue) {
        for (let i = 0; i < deleteSelect.options.length; i++) {
            if (deleteSelect.options[i].value === deleteSelectedValue) {
                deleteSelect.selectedIndex = i;
                break;
            }
        }
    }
    
    console.log('Military select dropdowns populated with', state.militaries.length, 'militaries');
}

/**
 * Set up calendar view tabs
 */
function setupCalendarViews() {
    // The tabs are now handled by the TabSystem class in tabs.js
    // We're only adding backup functionality here in case the TabSystem fails
    
    // Add click listeners to any tab elements that might not be handled by TabSystem
    const viewTabs = document.querySelectorAll('.tab[data-tab^="month-view"], .tab[data-tab^="week-view"], .tab[data-tab^="list-view"]');
    
    viewTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            const viewId = this.getAttribute('data-tab');
            console.log('Tab clicked:', viewId);
            
            if (viewId === 'month-view') {
                // If month view, regenerate calendar
                generateCalendar();
            }
        });
    });
}

/**
 * Set up team cards
 */
function setupTeamCards() {
    console.log('Setting up team cards');
    const teamCards = document.querySelectorAll('.scale-card');
    
    if (teamCards.length === 0) {
        console.error('No team cards found in the DOM');
        return;
    }
    
    console.log('Found', teamCards.length, 'team cards');
    
    teamCards.forEach(card => {
        card.addEventListener('click', function(e) {
            const cardId = this.id; // Example: 'alfa-card', 'bravo-card', etc.
            
            if (cardId) {
                const team = cardId.split('-')[0].toUpperCase();
                console.log('Team card clicked:', team);
                showTeamsReport(team);
            }
        });
    });
}

/**
 * Set up add schedule button
 */
function setupAddScheduleButton() {
    const addBtn = document.getElementById('addScheduleBtn');
    
    if (addBtn) {
        addBtn.addEventListener('click', function(e) {
            console.log('Add schedule button clicked');
            // Default to today's date
            openScheduleModal(state.currentDate.getDate(), state.currentDate.getMonth(), state.currentDate.getFullYear());
        });
    }
}

/**
 * Set up header buttons (notifications, help, settings)
 */
function setupHeaderButtons() {
    // Notifications button
    const notificationsBtn = document.getElementById('notifications-btn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', function() {
            alert('Sistema de notificações em desenvolvimento');
        });
    }
    
    // Help button
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
        helpBtn.addEventListener('click', function() {
            // Verificar a conexão com o Firebase
            const firebaseStatus = checkFirebaseAvailability() ? 'ATIVO' : 'INATIVO';
            
            alert(`Sistema de Escala Policial v1.0\n\n` +
                  `Status do Firebase: ${firebaseStatus}\n` +
                  `Militares cadastrados: ${state.militaries.length}\n` +
                  `Escalas cadastradas: ${Object.keys(state.schedules).length}\n\n` +
                  `Em caso de dúvidas, contate o suporte técnico.`);
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            alert('Sistema de personalização em desenvolvimento');
        });
    }
}

/**
 * Set up logout button
 */
function setupLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            // Perguntar ao usuário se deseja sincronizar antes de recarregar
            if (checkFirebaseAvailability() && confirm('Deseja sincronizar os dados com o Firebase antes de recarregar?')) {
                // Mostrar tela de carregamento durante a sincronização
                showLoadingScreen();
                
                // Forçar salvamento no Firebase
                Promise.all([
                    saveMilitaries(state.militaries),
                    saveSchedules(state.schedules)
                ])
                .then(() => {
                    console.log('Dados sincronizados com sucesso antes de recarregar');
                    hideLoadingScreen();
                    alert('Dados sincronizados com sucesso!');
                    window.location.reload();
                })
                .catch(error => {
                    console.error('Erro ao sincronizar dados:', error);
                    hideLoadingScreen();
                    alert('Erro ao sincronizar dados. Recarregando mesmo assim.');
                    window.location.reload();
                });
            } else {
                // Recarregar a página sem sincronizar
                window.location.reload();
            }
        });
    }
}

/**
 * Generate the calendar for the current month/year
 */
function generateCalendar() {
    console.log('Generating calendar for', MONTHS[state.selectedMonth], state.selectedYear);
    
    const calendarGrid = document.getElementById('calendarGrid');
    
    if (!calendarGrid) {
        console.error('Calendar grid element not found');
        return;
    }
    
    // Clear existing calendar
    calendarGrid.innerHTML = '';
    
    // Add day headers (Sun, Mon, etc.)
    DAYS_OF_WEEK.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Get the first and last day of the month
    const firstDay = new Date(state.selectedYear, state.selectedMonth, 1);
    const lastDay = new Date(state.selectedYear, state.selectedMonth + 1, 0);
    
    // Get the day of week the first day falls on (0 = Sunday)
    const startDay = firstDay.getDay();
    
    // Add empty cells for previous month days
    for (let i = 0; i < startDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day-cell empty';
        emptyDay.textContent = new Date(state.selectedYear, state.selectedMonth, -startDay + i + 1).getDate();
        calendarGrid.appendChild(emptyDay);
    }
    
    // Add days of current month
    const daysInMonth = lastDay.getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(state.selectedYear, state.selectedMonth, day);
        const dateString = formatDateString(date);
        
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        
        // Add day number in a separate element
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        dayCell.setAttribute('data-date', dateString);
        
        // Check if this day is today
        const today = new Date();
        if (date.getDate() === today.getDate() && 
            date.getMonth() === today.getMonth() && 
            date.getFullYear() === today.getFullYear()) {
            dayCell.classList.add('today');
        }
        
        // Add duty team class based on which team is on duty
        const dutyTeam = getDutyTeam(date);
        dayCell.classList.add(`duty-${dutyTeam.toLowerCase()}`);
        
        // Mark Thursdays as duty change days
        if (date.getDay() === 4) { // 4 is Thursday (0-indexed, 0 is Sunday)
            dayCell.classList.add('thursday');
            
            // If it's the first Thursday of a new duty cycle, mark it specially
            const prevDay = new Date(date);
            prevDay.setDate(prevDay.getDate() - 1);
            if (getDutyTeam(prevDay) !== dutyTeam) {
                dayCell.classList.add('duty-change');
            }
        }
        
        // Check if this day has scheduled militaries
        if (state.schedules[dateString] && state.schedules[dateString].length > 0) {
            dayCell.classList.add('event');
            
            // Create container for scheduled militaries
            const scheduledContainer = document.createElement('div');
            scheduledContainer.className = 'scheduled-militaries';
            
            // Add each scheduled military
            state.schedules[dateString].forEach(schedule => {
                const military = getMilitaryById(schedule.id);
                if (military) {
                    const militaryEl = document.createElement('div');
                    militaryEl.className = `military-badge ${military.team.toLowerCase()}`;
                    militaryEl.title = `${military.rank} ${military.name} (${military.team})`;
                    // Format the rank display
                    let displayRank = '';
                    if (military.rank.includes('SGT')) displayRank = 'SGT';
                    else if (military.rank.includes('CAP')) displayRank = 'CAP';
                    else if (military.rank.includes('TEN')) displayRank = 'TEN';
                    else if (military.rank.includes('SUB')) displayRank = 'SUB TEN';
                    else if (military.rank.includes('CB')) displayRank = 'CB';
                    else displayRank = 'SD';
                    
                    // Show first name (or first two names if short)
                    let displayName = military.name.split(' ')[0];
                    if (displayName.length <= 3 && military.name.split(' ').length > 1) {
                        displayName += ' ' + military.name.split(' ')[1];
                    }
                    
                    militaryEl.textContent = displayRank + ' ' + displayName;
                    scheduledContainer.appendChild(militaryEl);
                }
            });
            
            dayCell.appendChild(scheduledContainer);
        }
        
        // Add click event to each day
        dayCell.addEventListener('click', function() {
            console.log('Day cell clicked:', day, MONTHS[state.selectedMonth], state.selectedYear);
            openScheduleModal(day, state.selectedMonth, state.selectedYear);
        });
        
        calendarGrid.appendChild(dayCell);
    }
    
    // Add empty cells for next month
    const totalDays = startDay + daysInMonth;
    const remainingCells = (7 - (totalDays % 7)) % 7;
    
    for (let i = 1; i <= remainingCells; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'day-cell empty';
        emptyDay.textContent = i;
        calendarGrid.appendChild(emptyDay);
    }
    
    // Update report data if the report modal is active
    const reportModal = document.getElementById('reportModal');
    if (reportModal && reportModal.classList.contains('active')) {
        updateReports(document.getElementById('teamFilter')?.value || '');
    }
}

/**
 * Update team statistics
 */
function updateTeamStats() {
    console.log('Updating team statistics...');
    
    // Reset counters
    let alfaCount = 0;
    let bravoCount = 0;
    let charlieCount = 0;
    let expedienteCount = 0;
    
    // Get the current month as a string (YYYY-MM)
    const monthString = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    console.log('Counting schedules for month:', monthString);
    
    // Count schedules for each team in the current month
    for (const dateString in state.schedules) {
        if (dateString.startsWith(monthString)) {
            state.schedules[dateString].forEach(schedule => {
                const military = getMilitaryById(schedule.id);
                
                if (military) {
                    switch (military.team) {
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
    
    // Se não há escalas, inicializar com valores padrão para demonstração
    if (alfaCount === 0 && bravoCount === 0 && charlieCount === 0 && expedienteCount === 0) {
        // Valores de exemplo apenas para demonstrar o funcionamento
        alfaCount = 5;
        bravoCount = 8;
        charlieCount = 6;
        expedienteCount = 4;
        console.log('Sem escalas para o mês, usando valores de demonstração');
    }
    
    // Update UI with direct DOM manipulation for reliability
    document.getElementById('alfaCount').textContent = alfaCount;
    document.getElementById('bravoCount').textContent = bravoCount;
    document.getElementById('charlieCount').textContent = charlieCount;
    document.getElementById('expedienteCount').textContent = expedienteCount;
    
    console.log('Team stats updated:', {
        alfa: alfaCount,
        bravo: bravoCount,
        charlie: charlieCount,
        expediente: expedienteCount
    });
    
    // Se estamos atualizando as estatísticas mas os contadores não são exibidos,
    // pode haver problema de visibilidade dos cards
    window.setTimeout(() => {
        const alfaCountElem = document.getElementById('alfaCount');
        if (alfaCountElem && (alfaCountElem.offsetParent === null || alfaCountElem.offsetHeight === 0)) {
            console.warn('Cards parecem estar ocultos, forçando exibição...');
            forceShowCards();
        }
    }, 100);
}

/**
 * Open schedule modal for a specific date
 */
function openScheduleModal(day, month, year) {
    console.log('Opening schedule modal for', day, MONTHS[month], year);
    
    const modal = document.getElementById('scheduleModal');
    const selectedDateElem = document.getElementById('selectedDate');
    const modalContent = document.getElementById('modalContent');
    
    state.selectedDay = { day, month, year };
    
    if (!modal || !modalContent) {
        console.error('Schedule modal elements not found');
        return;
    }
    
    // Create date object
    const date = new Date(year, month, day);
    const dateString = formatDateString(date);
    
    // Format date for display
    const formattedDate = date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    if (selectedDateElem) {
        selectedDateElem.textContent = formattedDate;
    }
    
    // Get scheduled militaries for this date
    const scheduledMilitaries = state.schedules[dateString] || [];
    
    // Get duty team for this date
    const dutyTeam = getDutyTeam(date);
    
    // Generate modal content
    const content = `
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
                    ${generateMilitaryOptions(dutyTeam, scheduledMilitaries)}
                </select>
            </div>
            <button class="btn btn-primary" id="addMilitaryBtn">
                <i class="fas fa-plus"></i> ADICIONAR
            </button>
        </div>
        
        <div class="modal-section">
            <h4 class="modal-section-title">
                <i class="fas fa-clipboard-list"></i>
                Militares Escalados
            </h4>
            <div id="scheduledMilitariesList">
                ${generateScheduledMilitaryList(scheduledMilitaries)}
            </div>
        </div>
    `;
    
    modalContent.innerHTML = content;
    
    // Show the modal
    modal.classList.add('active');
    
    // Add event listener for add button
    const addMilitaryBtn = document.getElementById('addMilitaryBtn');
    if (addMilitaryBtn) {
        addMilitaryBtn.addEventListener('click', function() {
            addMilitaryToSchedule(dateString);
        });
    }
    
    // Add event listeners for remove buttons
    setupRemoveMilitaryButtons(dateString);
    
    // Add event listener for close button
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    // Close when clicking outside the modal
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

/**
 * Generate options for military select dropdown
 */
function generateMilitaryOptions(dutyTeam, scheduledMilitaries) {
    // Modificado para incluir todos os militares, independentemente da equipe
    // Remover apenas os que já estão escalados no mesmo dia
    const availableMilitaries = state.militaries.filter(m => 
        !scheduledMilitaries.some(s => s.id === m.id)
    );
    
    if (availableMilitaries.length === 0) {
        return '<option value="">Nenhum militar disponível</option>';
    }
    
    return availableMilitaries.map(m => {
        // Count how many schedules this military already has
        const scheduleCount = countMilitarySchedules(m.id);
        const disabled = scheduleCount >= MAX_EXTRA_SHIFTS ? 'disabled' : '';
        
        // Adicionando um indicador visual para militares da equipe de serviço atual
        const isInDutyTeam = m.team === dutyTeam;
        const teamLabel = isInDutyTeam ? `${m.team} ⚠️` : m.team;
        
        return `<option value="${m.id}" ${disabled} ${isInDutyTeam ? 'class="conflict-option"' : ''}>${m.rank} ${m.name} (${teamLabel}) - ${scheduleCount}/${MAX_EXTRA_SHIFTS} escalas</option>`;
    }).join('');
}

/**
 * Generate HTML for list of scheduled militaries
 */
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

/**
 * Setup event listeners for remove buttons
 */
function setupRemoveMilitaryButtons(dateString) {
    const buttons = document.querySelectorAll('.remove-military-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            const militaryId = this.getAttribute('data-id');
            removeMilitaryFromSchedule(dateString, militaryId);
        });
    });
}

/**
 * Add military to schedule
 */
function addMilitaryToSchedule(dateString) {
    const militarySelect = document.getElementById('militarySelect');
    const errorElement = document.getElementById('scheduleError');
    
    if (!militarySelect || militarySelect.value === '') {
        showScheduleError('Selecione um militar!');
        return;
    }
    
    const militaryId = militarySelect.value;
    const military = getMilitaryById(militaryId);
    
    if (!military) {
        showScheduleError('Militar não encontrado!');
        return;
    }
    
    // Check if already scheduled
    if (state.schedules[dateString] && state.schedules[dateString].some(s => s.id === militaryId)) {
        showScheduleError('Este militar já está escalado para esta data!');
        return;
    }
    
    // Get date from string
    const date = new Date(dateString);
    
    // Check for team on duty
    const dutyTeam = getDutyTeam(date);
    const isSameTeam = military.team === dutyTeam;
    const isOnScheduledDay = date.getDay() === 4; // Thursday (day of schedule rotation)
    
    console.log('Duty team:', dutyTeam, 'Military team:', military.team, 'Is Thursday:', isOnScheduledDay);
    
    // Init schedules array if not exists
    if (!state.schedules[dateString]) {
        state.schedules[dateString] = [];
    }
    
    // Check for conflicts
    let hasConflict = false;
    let conflictMessage = '';
    
    // Check if already at max
    if (state.schedules[dateString].length >= MAX_OFFICERS_PER_DAY) {
        conflictMessage = `Não é possível escalar mais de ${MAX_OFFICERS_PER_DAY} militares por dia.`;
    }
    // Check if from team on duty or scheduled day rotation
    else if (isSameTeam) {
        hasConflict = true;
        conflictMessage = `Atenção! O ${military.rank} ${military.name} é da equipe ${military.team} que está de serviço neste dia. Deseja continuar mesmo assim?`;
    }
    // Check if military already has maximum allowed schedules
    else if (countMilitarySchedules(militaryId) >= MAX_EXTRA_SHIFTS) {
        hasConflict = true;
        conflictMessage = `Atenção! O ${military.rank} ${military.name} já possui ${MAX_EXTRA_SHIFTS} escalas extras neste mês. Deseja continuar mesmo assim?`;
    }
    
    // If there's a conflict that requires confirmation
    if (hasConflict) {
        if (confirm(conflictMessage)) {
            // Add to schedule with conflict flag
            state.schedules[dateString].push({ 
                id: militaryId,
                hasConflict: true 
            });
            
            // Save to localStorage for fallback
            localStorage.setItem('schedules', JSON.stringify(state.schedules));
            
            // Save to Firebase if available
            if (checkFirebaseAvailability()) {
                saveSchedules(state.schedules)
                    .then(() => {
                        console.log('Schedule with conflict saved to Firebase:', dateString, militaryId);
                    })
                    .catch(error => {
                        console.error('Error saving schedule to Firebase:', error);
                    });
            }
            
            // Update UI
            updateScheduleUI(dateString);
        }
        return;
    }
    // If there's a blocking error
    else if (conflictMessage) {
        showScheduleError(conflictMessage);
        return;
    }
    
    // Add to schedule
    state.schedules[dateString].push({ id: militaryId });
    
    // Save to localStorage for fallback
    localStorage.setItem('schedules', JSON.stringify(state.schedules));
    
    // Save to Firebase if available
    if (checkFirebaseAvailability()) {
        saveSchedules(state.schedules)
            .then(() => {
                console.log('Schedule saved to Firebase:', dateString, militaryId);
            })
            .catch(error => {
                console.error('Error saving schedule to Firebase:', error);
            });
    }
    
    // Update UI
    updateScheduleUI(dateString);
    
    console.log('Military added to schedule:', dateString, military.rank, military.name);
}

/**
 * Remove military from schedule
 */
function removeMilitaryFromSchedule(dateString, militaryId) {
    if (!state.schedules[dateString]) {
        return;
    }
    
    // Find military
    const military = getMilitaryById(militaryId);
    
    // Remove from schedule
    state.schedules[dateString] = state.schedules[dateString].filter(s => s.id !== militaryId);
    
    // Remove date if no more militaries
    if (state.schedules[dateString].length === 0) {
        delete state.schedules[dateString];
    }
    
    // Save to localStorage for fallback
    localStorage.setItem('schedules', JSON.stringify(state.schedules));
    
    // Save to Firebase if available
    if (checkFirebaseAvailability()) {
        saveSchedules(state.schedules)
            .then(() => {
                console.log('Schedule updated in Firebase after removal:', dateString, militaryId);
            })
            .catch(error => {
                console.error('Error updating schedule in Firebase:', error);
            });
    }
    
    // Update calendar
    generateCalendar();
    
    // Update UI in modal if open
    updateScheduleUI(dateString);
    
    if (military) {
        console.log('Military removed from schedule:', dateString, military.rank, military.name);
    }
}

/**
 * Helper function to update schedule UI
 */
function updateScheduleUI(dateString) {
    // Update scheduled militaries list
    const scheduledList = document.getElementById('scheduledMilitariesList');
    if (scheduledList) {
        const scheduledMilitaries = state.schedules[dateString] || [];
        scheduledList.innerHTML = generateScheduledMilitaryList(scheduledMilitaries);
        setupRemoveMilitaryButtons(dateString);
    }

    // Regenerate dropdown of available militaries
    const militarySelect = document.getElementById('militarySelect');
    const date = new Date(dateString);
    const dutyTeam = getDutyTeam(date);
    const scheduledMilitaries = state.schedules[dateString] || [];
    
    if (militarySelect) {
        militarySelect.innerHTML = generateMilitaryOptions(dutyTeam, scheduledMilitaries);
    }
    
    // Update calendar
    generateCalendar();
    
    // Update team stats
    updateTeamStats();
}

/**
 * Show reports modal
 */
function showReports(filter = '') {
    console.log('Showing reports with filter:', filter || 'all teams');
    
    const modal = document.getElementById('reportModal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = document.getElementById('reportSubtitle');
    
    if (!modal) {
        console.error('Report modal elements not found');
        return;
    }
    
    // Set modal title and subtitle
    if (modalTitle) {
        modalTitle.textContent = filter ? `Relatórios - ${filter}` : 'Relatórios';
    }
    
    if (modalSubtitle) {
        modalSubtitle.textContent = filter 
            ? `Informações detalhadas da guarnição ${filter}` 
            : 'Informações detalhadas de todos os militares';
    }
    
    // Show the modal
    modal.classList.add('active');
    
    // Update the report content
    updateReports(filter);
    
    // Add event listeners for tabs
    setupReportTabs();
    
    // Add event listener for team filter
    setupTeamFilter(filter);
    
    // Add event listener for close button
    const closeBtn = document.getElementById('closeReportModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    // Close when clicking outside the modal
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

/**
 * Show teams report
 */
function showTeamsReport(team = '') {
    showReports(team);
}

/**
 * Generate report content
 */
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
        </div>
        
        <div class="report-tabs">
            <button class="report-tab active" data-tab="military-tab"><i class="fas fa-user-shield"></i> Militares</button>
            <button class="report-tab" data-tab="schedule-tab"><i class="fas fa-calendar-check"></i> Escalas</button>
            <button class="report-tab" data-tab="stats-tab"><i class="fas fa-chart-bar"></i> Estatísticas</button>
        </div>
        
        <div class="report-tab-contents">
            <div class="report-tab-content active" id="military-tab">
                <div style="overflow-x: auto;">
                    <table class="report-table" style="min-width: 650px;">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Posto/Grad</th>
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
            </div>
            
            <div class="report-tab-content" id="schedule-tab">
                <div class="schedule-stats" style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-around;">
                    <div class="stat-card" style="min-width: 150px; flex: 1;">
                        <div class="stat-number">${countTotalSchedules(filter)}</div>
                        <div class="stat-label">Total de Escalas</div>
                    </div>
                    <div class="stat-card" style="min-width: 150px; flex: 1;">
                        <div class="stat-number">${countCurrentMonthSchedules(filter)}</div>
                        <div class="stat-label">Escalas este mês</div>
                    </div>
                </div>
            </div>
            
            <div class="report-tab-content" id="stats-tab">
                <div class="team-distribution">
                    <h4>Distribuição por Guarnição</h4>
                    <div class="team-stats" style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-around;">
                        <div class="team-stat alfa-bg" style="min-width: 120px; flex: 1; padding: 15px; border-radius: 10px; text-align: center;">
                            <div class="team-name">ALFA</div>
                            <div class="team-count">${countTeamMembers('ALFA')}</div>
                        </div>
                        <div class="team-stat bravo-bg" style="min-width: 120px; flex: 1; padding: 15px; border-radius: 10px; text-align: center;">
                            <div class="team-name">BRAVO</div>
                            <div class="team-count">${countTeamMembers('BRAVO')}</div>
                        </div>
                        <div class="team-stat charlie-bg" style="min-width: 120px; flex: 1; padding: 15px; border-radius: 10px; text-align: center;">
                            <div class="team-name">CHARLIE</div>
                            <div class="team-count">${countTeamMembers('CHARLIE')}</div>
                        </div>
                        <div class="team-stat expediente-bg" style="min-width: 120px; flex: 1; padding: 15px; border-radius: 10px; text-align: center;">
                            <div class="team-name">EXPEDIENTE</div>
                            <div class="team-count">${countTeamMembers('EXPEDIENTE')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Update report data with real militaries and schedules information
 */
function updateReports(filter = '') {
    // Update summary report data
    updateSummaryReport();
    
    // Update team report data
    updateTeamReport(filter);
    
    // Update military report data
    updateMilitaryReport(filter);
    
    // Update schedule report data
    updateScheduleReport(filter);
}

/**
 * Update summary report card data
 */
function updateSummaryReport() {
    // Get elements
    const totalMilitariesElement = document.getElementById('totalMilitaries');
    const totalSchedulesElement = document.getElementById('totalSchedules');
    
    if (totalMilitariesElement) {
        // Count total militaries
        totalMilitariesElement.textContent = state.militaries.length;
    }
    
    if (totalSchedulesElement) {
        // Count total schedules
        let totalSchedules = 0;
        for (const dateString in state.schedules) {
            totalSchedules += state.schedules[dateString].length;
        }
        totalSchedulesElement.textContent = totalSchedules;
    }
}

/**
 * Update team report table
 */
function updateTeamReport(filter = '') {
    const teamReportBody = document.getElementById('team-report-body');
    
    if (!teamReportBody) return;
    
    // Clear existing rows
    teamReportBody.innerHTML = '';
    
    const teams = ['ALFA', 'BRAVO', 'CHARLIE', 'EXPEDIENTE'];
    
    // Filter teams if needed
    const filteredTeams = filter ? teams.filter(team => team === filter) : teams;
    
    // Generate rows for each team
    filteredTeams.forEach(team => {
        // Count team members
        const memberCount = countTeamMembers(team);
        
        // Count team schedules
        const scheduleCount = countCurrentMonthSchedules(team);
        
        // Find last schedule date
        const lastDate = getLastTeamScheduleDate(team);
        
        // Create row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="status-badge status-${team.toLowerCase()}">${team}</span></td>
            <td>${memberCount}</td>
            <td>${scheduleCount}</td>
            <td>${lastDate ? formatDisplayDate(lastDate) : '-'}</td>
        `;
        
        teamReportBody.appendChild(row);
    });
}

/**
 * Update military report table
 */
function updateMilitaryReport(filter = '') {
    const militaryReportBody = document.getElementById('military-report-body');
    
    if (!militaryReportBody) return;
    
    // Clear existing rows
    militaryReportBody.innerHTML = '';
    
    // Filter militaries
    const filteredMilitaries = filter 
        ? state.militaries.filter(m => m.team === filter) 
        : state.militaries;
    
    // Generate rows for each military
    filteredMilitaries.forEach(military => {
        // Count schedules
        const scheduleCount = countMilitarySchedules(military.id);
        
        // Create row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${military.name}</td>
            <td>${military.rank}</td>
            <td><span class="status-badge status-${military.team.toLowerCase()}">${military.team}</span></td>
            <td>${scheduleCount}</td>
        `;
        
        militaryReportBody.appendChild(row);
    });
    
    // Setup search functionality
    setupMilitarySearch();
}

/**
 * Setup military search functionality
 */
function setupMilitarySearch() {
    const searchInput = document.getElementById('military-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#military-report-body tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

/**
 * Update schedule report table
 */
function updateScheduleReport(filter = '') {
    const scheduleReportBody = document.getElementById('schedule-report-body');
    const monthSelect = document.getElementById('month-select');
    
    if (!scheduleReportBody || !monthSelect) return;
    
    // Update month select options
    updateMonthSelectOptions(monthSelect);
    
    // Get current selected month
    const selectedMonth = monthSelect.value || `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    
    // Clear existing rows
    scheduleReportBody.innerHTML = '';
    
    // Get schedules for the selected month
    const schedules = [];
    
    for (const dateString in state.schedules) {
        if (dateString.startsWith(selectedMonth)) {
            // Create schedule objects with date and militaries
            state.schedules[dateString].forEach(schedule => {
                const military = getMilitaryById(schedule.id);
                
                if (military && (!filter || military.team === filter)) {
                    schedules.push({
                        date: dateString,
                        military: military
                    });
                }
            });
        }
    }
    
    // Sort schedules by date
    schedules.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Generate rows for each schedule
    schedules.forEach(schedule => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDisplayDate(schedule.date)}</td>
            <td><span class="status-badge status-${schedule.military.team.toLowerCase()}">${schedule.military.team}</span></td>
            <td>${schedule.military.rank} ${schedule.military.name}</td>
        `;
        
        scheduleReportBody.appendChild(row);
    });
    
    // Setup month select change handler
    setupMonthSelectHandler(monthSelect, filter);
    setupTeamSelectHandler(filter);
}

/**
 * Update month select options
 */
function updateMonthSelectOptions(monthSelect) {
    // Clear existing options
    monthSelect.innerHTML = '';
    
    // Get all unique months from schedules
    const months = new Set();
    for (const dateString in state.schedules) {
        const monthYear = dateString.substring(0, 7); // YYYY-MM format
        months.add(monthYear);
    }
    
    // If no schedules, add current month
    if (months.size === 0) {
        const currentMonth = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
        months.add(currentMonth);
    }
    
    // Sort months
    const sortedMonths = Array.from(months).sort().reverse();
    
    // Add options for each month
    sortedMonths.forEach(month => {
        const [year, monthNum] = month.split('-');
        const monthName = MONTHS[parseInt(monthNum) - 1];
        
        const option = document.createElement('option');
        option.value = month;
        option.textContent = `${monthName} ${year}`;
        
        // Set current month as selected
        if (month === `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`) {
            option.selected = true;
        }
        
        monthSelect.appendChild(option);
    });
}

/**
 * Setup month select change handler
 */
function setupMonthSelectHandler(monthSelect, filter) {
    monthSelect.addEventListener('change', function() {
        updateScheduleReport(filter);
    });
}

/**
 * Setup team select change handler
 */
function setupTeamSelectHandler(filter) {
    const teamSelect = document.getElementById('team-select');
    
    if (teamSelect) {
        // Set current filter as selected
        if (filter) {
            teamSelect.value = filter;
        }
        
        teamSelect.addEventListener('change', function() {
            updateScheduleReport(this.value);
        });
    }
}

/**
 * Get last schedule date for a team
 */
function getLastTeamScheduleDate(team) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastDate = null;
    let lastDateObj = null;
    
    for (const dateString in state.schedules) {
        // Check if any military in this schedule is from the specified team
        const hasTeamMilitary = state.schedules[dateString].some(schedule => {
            const military = getMilitaryById(schedule.id);
            return military && military.team === team;
        });
        
        if (hasTeamMilitary) {
            const scheduleDate = new Date(dateString);
            
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

/**
 * Setup report tabs
 */
function setupReportTabs() {
    const tabs = document.querySelectorAll('.tab[data-tab^="summary-report"], .tab[data-tab^="team-report"], .tab[data-tab^="military-report"], .tab[data-tab^="schedule-report"]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Get the tab id
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

/**
 * Setup team filter in reports
 */
function setupTeamFilter(currentFilter) {
    const teamFilter = document.getElementById('teamFilter');
    
    if (teamFilter) {
        // Set current filter as selected
        if (currentFilter) {
            teamFilter.value = currentFilter;
        }
        
        teamFilter.addEventListener('change', function() {
            showReports(this.value);
        });
    }
}

/**
 * Generate military table rows for reports
 */
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
            <tr>
                <td>${m.id}</td>
                <td>${m.rank}</td>
                <td>${m.name}</td>
                <td class="${m.team.toLowerCase()}-text">${m.team}</td>
                <td>${scheduleCount}</td>
                <td>${lastSchedule ? formatDisplayDate(lastSchedule) : '-'}</td>
                <td>${nextSchedule ? formatDisplayDate(nextSchedule) : '-'}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Show military management modal
 */
function showMilitaryManagement(editMilitary = null) {
    console.log('Showing military management modal', editMilitary ? 'for editing' : 'for listing');
    
    const modal = document.getElementById('militaryModal');
    
    if (!modal) {
        console.error('Military modal element not found');
        return;
    }
    
    // Set modal title and subtitle
    const modalTitle = modal.querySelector('.modal-title');
    const modalSubtitle = document.getElementById('militarySubtitle');
    
    if (modalTitle) {
        modalTitle.textContent = editMilitary ? 'Editar Militar' : 'Gerenciamento de Militares';
    }
    
    if (modalSubtitle) {
        modalSubtitle.textContent = editMilitary 
            ? `Editando: ${editMilitary.rank} ${editMilitary.name}` 
            : 'Adicionar, Editar ou Excluir';
    }
    
    // Populate military selects with current data
    populateMilitarySelects();
    
    // Show the modal
    modal.classList.add('active');
    
    // Add event listener for close button
    const closeBtn = document.getElementById('closeMilitaryModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }
    
    // Close when clicking outside the modal
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

/**
 * Generate military management content
 */
function generateMilitaryManagementContent() {
    return `
        <div class="management-tabs">
            <button class="management-tab active" data-tab="list-tab"><i class="fas fa-list"></i> Lista</button>
            <button class="management-tab" data-tab="add-tab"><i class="fas fa-plus-circle"></i> Adicionar</button>
        </div>
        
        <div class="management-tab-contents">
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
        </div>
    `;
}

/**
 * Generate edit military form
 */
function generateEditMilitaryForm(military) {
    return `
        <form id="editMilitaryForm" class="military-form">
            <input type="hidden" id="militaryId" value="${military.id}">
            
            <div class="form-group">
                <label for="militaryRank" class="form-label">Posto/Graduação:</label>
                <input type="text" id="militaryRank" class="form-control" value="${military.rank}" required>
            </div>
            
            <div class="form-group">
                <label for="militaryName" class="form-label">Nome:</label>
                <input type="text" id="militaryName" class="form-control" value="${military.name}" required>
            </div>
            
            <div class="form-group">
                <label for="militaryTeam" class="form-label">Guarnição:</label>
                <select id="militaryTeam" class="form-control" required>
                    <option value="ALFA" ${military.team === 'ALFA' ? 'selected' : ''}>ALFA</option>
                    <option value="BRAVO" ${military.team === 'BRAVO' ? 'selected' : ''}>BRAVO</option>
                    <option value="CHARLIE" ${military.team === 'CHARLIE' ? 'selected' : ''}>CHARLIE</option>
                    <option value="EXPEDIENTE" ${military.team === 'EXPEDIENTE' ? 'selected' : ''}>EXPEDIENTE</option>
                </select>
            </div>
            
            <div class="form-buttons">
                <button type="button" class="btn btn-secondary" id="cancelEditBtn">
                    <i class="fas fa-times"></i> CANCELAR
                </button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> SALVAR ALTERAÇÕES
                </button>
            </div>
        </form>
    `;
}

/**
 * Generate military list
 */
function generateMilitaryList() {
    if (state.militaries.length === 0) {
        return '<div class="no-data">Nenhum militar cadastrado.</div>';
    }
    
    return state.militaries.map(m => {
        return `
            <div class="military-item" style="display: flex; align-items: center; padding: 10px; margin-bottom: 10px; border-radius: 8px; background-color: #f8f9fa;">
                <div class="military-avatar ${m.team.toLowerCase()}-bg" style="width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold;">
                    ${m.name.charAt(0)}
                </div>
                <div class="military-info" style="flex: 1; min-width: 0;">
                    <div class="military-name" style="font-weight: bold;">${m.rank} ${m.name}</div>
                    <div class="military-team ${m.team.toLowerCase()}-text">${m.team}</div>
                </div>
                <div class="military-actions" style="display: flex; gap: 8px;">
                    <button class="btn btn-secondary edit-military-btn" data-id="${m.id}" style="padding: 5px 10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger delete-military-btn" data-id="${m.id}" style="padding: 5px 10px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Setup military management tabs
 */
function setupMilitaryManagementTabs(modal) {
    // Setup tabs
    const tabs = document.querySelectorAll('.management-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Get the tab id
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            const tabContents = document.querySelectorAll('.management-tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Setup search
    const searchBtn = document.getElementById('searchMilitaryBtn');
    const searchInput = document.getElementById('militarySearch');
    
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = searchInput.value.toLowerCase();
            const items = document.querySelectorAll('.military-item');
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
        
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
    
    // Setup add form
    const addForm = document.getElementById('addMilitaryForm');
    
    if (addForm) {
        addForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const rank = document.getElementById('newMilitaryRank').value;
            const name = document.getElementById('newMilitaryName').value;
            const team = document.getElementById('newMilitaryTeam').value;
            
            if (rank && name && team) {
                addMilitary(rank, name, team);
                
                // Reset form
                this.reset();
                
                // Show success message
                showSuccessMessage(`Militar ${rank} ${name} adicionado com sucesso!`);
                
                // Refresh military list
                tabs[0].click(); // Switch to list tab
                document.querySelector('.military-list').innerHTML = generateMilitaryList();
                setupMilitaryItemActions(modal);
            }
        });
    }
    
    // Setup edit/delete buttons
    setupMilitaryItemActions(modal);
}

/**
 * Setup military item actions (edit/delete)
 */
function setupMilitaryItemActions(modal) {
    // Edit buttons
    const editBtns = document.querySelectorAll('.edit-military-btn');
    
    editBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const militaryId = this.getAttribute('data-id');
            const military = getMilitaryById(militaryId);
            
            if (military) {
                showMilitaryManagement(military);
            }
        });
    });
    
    // Delete buttons
    const deleteBtns = document.querySelectorAll('.delete-military-btn');
    
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const militaryId = this.getAttribute('data-id');
            const military = getMilitaryById(militaryId);
            
            if (military && confirm(`Tem certeza que deseja excluir ${military.rank} ${military.name}?`)) {
                deleteMilitary(militaryId);
                
                // Remove from DOM
                const item = this.closest('.military-item');
                if (item) {
                    item.remove();
                }
                
                // Show success message
                showSuccessMessage(`Militar ${military.rank} ${military.name} excluído com sucesso!`);
                
                // Refresh calendar and stats
                generateCalendar();
                updateTeamStats();
            }
        });
    });
}

/**
 * Handler functions for the edit and delete forms
 */
function showEditFormHandler() {
    const selectElement = document.getElementById('selectMilitaryToEdit');
    
    if (selectElement && selectElement.value) {
        const militaryId = selectElement.value;
        const military = getMilitaryById(militaryId);
        
        if (military) {
            // Show the edit form
            const editForm = document.getElementById('editMilitaryForm');
            if (editForm) {
                editForm.style.display = 'block';
            
                // Populate form fields
                document.getElementById('editId').value = military.id;
                document.getElementById('editRank').value = military.rank;
                document.getElementById('editName').value = military.name;
                document.getElementById('editTeam').value = military.team;
            }
        }
    }
}

/**
 * Show delete confirmation
 */
function showDeleteConfirmationHandler() {
    const selectElement = document.getElementById('selectMilitaryToDelete');
    
    if (selectElement && selectElement.value) {
        const militaryId = selectElement.value;
        const military = getMilitaryById(militaryId);
        
        if (military) {
            // Show the delete confirmation
            const deleteInfo = document.getElementById('militaryToDelete');
            if (deleteInfo) {
                deleteInfo.style.display = 'block';
                
                // Update military info
                const avatar = document.getElementById('deleteAvatar');
                const name = document.getElementById('deleteName');
                const team = document.getElementById('deleteTeam');
                
                if (avatar) {
                    avatar.textContent = military.name.charAt(0);
                    avatar.className = `military-avatar ${military.team.toLowerCase()}-bg`;
                }
                
                if (name) {
                    name.textContent = `${military.rank} ${military.name}`;
                }
                
                if (team) {
                    team.textContent = military.team;
                    team.className = `military-team ${military.team.toLowerCase()}-text`;
                }
            }
        }
    }
}

/**
 * Setup edit military form
 */
function setupEditMilitaryForm(military, modal) {
    const form = document.getElementById('editMilitaryForm');
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const id = document.getElementById('militaryId').value;
            const rank = document.getElementById('militaryRank').value;
            const name = document.getElementById('militaryName').value;
            const team = document.getElementById('militaryTeam').value;
            
            if (rank && name && team) {
                updateMilitary(id, { rank, name, team });
                
                // Show success message
                showSuccessMessage(`Militar ${rank} ${name} atualizado com sucesso!`);
                
                // Close modal
                modal.classList.remove('active');
                
                // Reopen military management
                setTimeout(() => {
                    showMilitaryManagement();
                }, 300);
                
                // Refresh calendar and stats
                generateCalendar();
                updateTeamStats();
            }
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.classList.remove('active');
            
            // Reopen military management
            setTimeout(() => {
                showMilitaryManagement();
            }, 300);
        });
    }
}

// CRUD OPERATIONS FOR MILITARIES

/**
 * Add a new military
 */
function addMilitary(rank, name, team) {
    const id = `mil_${Date.now()}`;
    const newMilitary = { id, rank, name, team };
    
    state.militaries.push(newMilitary);
    
    // Save to localStorage for fallback - usando a função segura
    safeSaveToLocalStorage('militaries', state.militaries);
    
    // Save to Firebase if available
    if (checkFirebaseAvailability()) {
        saveMilitaries(state.militaries)
            .then(() => {
                console.log('Military saved to Firebase:', rank, name, team);
            })
            .catch(error => {
                console.error('Error saving military to Firebase:', error);
            });
    }
    
    console.log('Military added:', rank, name, team);
    
    return newMilitary;
}

/**
 * Handler for the addMilitary form submission
 */
function addMilitaryHandler() {
    const rankElement = document.getElementById('addRank');
    const nameElement = document.getElementById('addName');
    const teamElement = document.getElementById('addTeam');
    
    if (rankElement && nameElement && teamElement) {
        const rank = rankElement.value.trim();
        const name = nameElement.value.trim();
        const team = teamElement.value;
        
        if (rank && name && team) {
            addMilitary(rank, name, team);
            
            // Show success message
            const successElement = document.getElementById('addSuccess');
            if (successElement) {
                successElement.style.display = 'block';
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 3000);
            }
            
            // Clear form
            rankElement.selectedIndex = 0;
            nameElement.value = '';
            teamElement.selectedIndex = 0;
            
            // Update the select dropdowns with the new military
            populateMilitarySelects();
            
            // Update calendar and stats
            generateCalendar();
            updateTeamStats();
            
            return false; // Prevent form submission
        }
    }
    
    return false; // Prevent form submission
}

/**
 * Update a military
 */
function updateMilitary(id, data) {
    const index = state.militaries.findIndex(m => m.id === id);
    
    if (index !== -1) {
        state.militaries[index] = { ...state.militaries[index], ...data };
        
        // Save to localStorage for fallback
        localStorage.setItem('militaries', JSON.stringify(state.militaries));
        
        // Save to Firebase if available
        if (checkFirebaseAvailability()) {
            saveMilitaries(state.militaries)
                .then(() => {
                    console.log('Military updated in Firebase:', id, data);
                })
                .catch(error => {
                    console.error('Error updating military in Firebase:', error);
                });
        }
        
        console.log('Military updated:', id, data);
        
        return state.militaries[index];
    }
    
    return null;
}

/**
 * Handler for the updateMilitary form submission
 */
function updateMilitaryHandler() {
    const idElement = document.getElementById('editId');
    const rankElement = document.getElementById('editRank');
    const nameElement = document.getElementById('editName');
    const teamElement = document.getElementById('editTeam');
    
    if (idElement && rankElement && nameElement && teamElement) {
        const id = idElement.value;
        const rank = rankElement.value.trim();
        const name = nameElement.value.trim();
        const team = teamElement.value;
        
        if (id && rank && name && team) {
            updateMilitary(id, { rank, name, team });
            
            // Show success message
            const successElement = document.getElementById('editSuccess');
            if (successElement) {
                successElement.style.display = 'block';
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 3000);
            }
            
            // Update calendar and stats
            generateCalendar();
            updateTeamStats();
            
            return false; // Prevent form submission
        }
    }
    
    return false; // Prevent form submission
}

/**
 * Delete a military
 */
function deleteMilitary(id) {
    const military = getMilitaryById(id);
    
    if (military) {
        console.log('Deleting military:', military.rank, military.name);
    }
    
    // Remove from militaries array
    state.militaries = state.militaries.filter(m => m.id !== id);
    
    // Remove from schedules
    for (const dateString in state.schedules) {
        state.schedules[dateString] = state.schedules[dateString].filter(s => s.id !== id);
        
        // Remove empty dates
        if (state.schedules[dateString].length === 0) {
            delete state.schedules[dateString];
        }
    }
    
    // Save to localStorage for fallback - usando a função segura
    safeSaveToLocalStorage('militaries', state.militaries);
    safeSaveToLocalStorage('schedules', state.schedules);
    
    // Save to Firebase if available
    if (checkFirebaseAvailability()) {
        Promise.all([
            saveMilitaries(state.militaries),
            saveSchedules(state.schedules)
        ])
            .then(() => {
                console.log('Military and schedules updated in Firebase after deletion');
            })
            .catch(error => {
                console.error('Error updating Firebase after military deletion:', error);
            });
    }
    
    return true;
}

/**
 * Handler for the delete military button
 */
function deleteMilitaryHandler() {
    const selectElement = document.getElementById('selectMilitaryToDelete');
    
    if (selectElement && selectElement.value) {
        const militaryId = selectElement.value;
        const military = getMilitaryById(militaryId);
        
        if (military) {
            deleteMilitary(militaryId);
            
            // Show success message
            const successElement = document.getElementById('deleteSuccess');
            if (successElement) {
                successElement.style.display = 'block';
                setTimeout(() => {
                    successElement.style.display = 'none';
                }, 3000);
            }
            
            // Clear the military info display
            const infoDisplay = document.getElementById('militaryToDelete');
            if (infoDisplay) {
                infoDisplay.style.display = 'none';
            }
            
            // Reset select element
            selectElement.selectedIndex = 0;
            
            // Update the select dropdowns
            populateMilitarySelects();
            
            // Update calendar and stats
            generateCalendar();
            updateTeamStats();
        }
    }
}

// UTILITY FUNCTIONS

/**
 * Get military by ID
 */
function getMilitaryById(id) {
    return state.militaries.find(m => m.id === id);
}

/**
 * Format date string as YYYY-MM-DD
 */
function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Format date for display
 */
function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Get duty team for a date
 */
function getDutyTeam(date) {
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((date.getTime() - DUTY_REFERENCE_DATE.getTime()) / dayMs);
    
    // Duty cycle is 21 days (7 days per team)
    const cycle = 21;
    
    // Normalize to positive number
    const dayInCycle = ((diffDays % cycle) + cycle) % cycle;
    
    if (dayInCycle < 7) {
        return 'BRAVO';    // First 7 days
    } else if (dayInCycle < 14) {
        return 'ALFA';     // Next 7 days
    } else {
        return 'CHARLIE';  // Last 7 days
    }
}

/**
 * Count scheduled dates for a military
 */
function countMilitarySchedules(militaryId) {
    const monthString = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}`;
    return countMilitarySchedulesInMonth(militaryId, monthString);
}

/**
 * Count scheduled dates for a military in a specific month
 */
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

/**
 * Get last schedule date for a military
 */
function getLastScheduleDate(militaryId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let lastDate = null;
    let lastDateObj = null;
    
    for (const dateString in state.schedules) {
        if (state.schedules[dateString].some(s => s.id === militaryId)) {
            const scheduleDate = new Date(dateString);
            
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

/**
 * Get next schedule date for a military
 */
function getNextScheduleDate(militaryId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let nextDate = null;
    let nextDateObj = null;
    
    for (const dateString in state.schedules) {
        if (state.schedules[dateString].some(s => s.id === militaryId)) {
            const scheduleDate = new Date(dateString);
            
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

/**
 * Count total schedules
 */
function countTotalSchedules(filter = '') {
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

/**
 * Count current month schedules
 */
function countCurrentMonthSchedules(filter = '') {
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

/**
 * Count team members
 */
function countTeamMembers(team) {
    return state.militaries.filter(m => m.team === team).length;
}

/**
 * Show a schedule error
 */
function showScheduleError(message) {
    const errorElement = document.getElementById('scheduleError');
    
    if (errorElement) {
        const errorText = errorElement.querySelector('span');
        if (errorText) {
            errorText.textContent = message;
        }
        
        errorElement.style.display = 'flex';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 3000);
    } else {
        console.error('Schedule error:', message);
    }
}

/**
 * Show a success message
 */
function showSuccessMessage(message) {
    // Create success message element
    const successElement = document.createElement('div');
    successElement.style.position = 'fixed';
    successElement.style.top = '20px';
    successElement.style.right = '20px';
    successElement.style.background = '#ECFDF5';
    successElement.style.color = '#047857';
    successElement.style.padding = '15px';
    successElement.style.borderRadius = '10px';
    successElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    successElement.style.zIndex = '9999';
    successElement.style.display = 'flex';
    successElement.style.alignItems = 'center';
    successElement.style.gap = '10px';
    successElement.style.borderLeft = '4px solid #047857';
    
    successElement.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(successElement);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        successElement.style.opacity = '0';
        successElement.style.transform = 'translateX(20px)';
        successElement.style.transition = 'all 0.5s ease';
        
        // Remove from DOM after animation
        setTimeout(() => {
            document.body.removeChild(successElement);
        }, 500);
    }, 3000);
}

/**
 * Show an error message
 */
function showError(message) {
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.style.position = 'fixed';
    errorElement.style.top = '20px';
    errorElement.style.right = '20px';
    errorElement.style.background = '#FEE2E2';
    errorElement.style.color = '#B91C1C';
    errorElement.style.padding = '15px';
    errorElement.style.borderRadius = '10px';
    errorElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    errorElement.style.zIndex = '9999';
    errorElement.style.display = 'flex';
    errorElement.style.alignItems = 'center';
    errorElement.style.gap = '10px';
    errorElement.style.borderLeft = '4px solid #B91C1C';
    
    errorElement.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(errorElement);
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorElement.style.opacity = '0';
        errorElement.style.transform = 'translateX(20px)';
        errorElement.style.transition = 'all 0.5s ease';
        
        // Remove from DOM after animation
        setTimeout(() => {
            document.body.removeChild(errorElement);
        }, 500);
    }, 5000);
}

/**
 * Show loading screen
 */
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    
    if (loadingScreen) {
        loadingScreen.classList.remove('hidden');
    }
}

/**
 * Hide loading screen
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

/**
 * Initialize sample data
 */
function initializeSampleData() {
    // Sample military personnel
    state.militaries = [
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
    
    // Create sample schedules
    const today = new Date();
    
    // Create schedules for a few days in the current month
    for (let day = 1; day <= 20; day += 3) {
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        const dateString = formatDateString(date);
        const dutyTeam = getDutyTeam(date);
        
        const teamMembers = state.militaries.filter(m => m.team === dutyTeam);
        
        if (teamMembers.length > 0) {
            // Randomly assign 1-2 militaries to each date
            const numMilitaries = Math.min(2, teamMembers.length);
            state.schedules[dateString] = [];
            
            for (let i = 0; i < numMilitaries; i++) {
                const randomIndex = Math.floor(Math.random() * teamMembers.length);
                state.schedules[dateString].push({ id: teamMembers[randomIndex].id });
                teamMembers.splice(randomIndex, 1);
            }
        }
    }
    
    // Save to localStorage
    localStorage.setItem('militaries', JSON.stringify(state.militaries));
    localStorage.setItem('schedules', JSON.stringify(state.schedules));
    
    console.log('Sample data initialized');
}