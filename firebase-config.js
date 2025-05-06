// Firebase configuration - Updated with new credentials
const firebaseConfig = {
  apiKey: "AIzaSyAorbz8PzwQH-ieYjfcQMdePPx0h5o9eto",
  authDomain: "extranew-8d885.firebaseapp.com",
  databaseURL: "https://extranew-8d885-default-rtdb.firebaseio.com",
  projectId: "extranew-8d885",
  storageBucket: "extranew-8d885.firebasestorage.app",
  messagingSenderId: "992132989313",
  appId: "1:992132989313:web:f70a711cd6b335234ea880"
};

// Expor variáveis para o escopo global para que outros scripts possam acessá-las
window.isFirebaseAvailable = false;
window.firebaseDB = null;
let localUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
let currentUser = null;

// Initialize Firebase with error handling
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  window.isFirebaseAvailable = true;
  window.firebaseDB = firebase.database();
  console.log('Firebase inicializado com sucesso');
  
  // Test database connection
  window.firebaseDB.ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true) {
      console.log('Conectado ao banco de dados Firebase');
      // Disparar evento de Firebase pronto
      document.dispatchEvent(new Event('firebase-ready'));
    } else {
      console.warn('Desconectado do banco de dados Firebase, utilizando localStorage como fallback');
    }
  });
} catch (error) {
  console.error('Falha na inicialização do Firebase. Utilizando localStorage como fallback:', error);
  // Não mostrar alerta para não interromper o usuário
  window.isFirebaseAvailable = false;
  window.firebaseDB = null;
  
  // Disparar evento de erro do Firebase
  const errorEvent = new CustomEvent('firebase-error', { 
    detail: { error: error.message } 
  });
  document.dispatchEvent(errorEvent);
}

// Auth and Database references (if available)
const auth = window.isFirebaseAvailable ? firebase.auth() : null;
const db = window.isFirebaseAvailable ? window.firebaseDB : null;

// Data references (will be null if Firebase unavailable)
const militariesRef = window.isFirebaseAvailable ? db.ref('militaries') : null;
const schedulesRef = window.isFirebaseAvailable ? db.ref('schedules') : null;

// Skip authentication and show app directly
console.log('Autenticação desativada - mostrando aplicativo diretamente');
// Create a dummy user to satisfy app requirements
const dummyUser = { 
  id: 'dummy_user',
  email: 'admin@exemplo.com', 
  name: 'Administrador',
  isLocalUser: true
};
currentUser = dummyUser;

// Iniciar o aplicativo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  handleAuthStateChange(dummyUser);
});

// Unified auth state change handler
function handleAuthStateChange(user) {
  currentUser = user;
  
  // Ensure loading screen is hidden
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }
  
  // Always show app regardless of auth state - login screen is removed
  const loginPanel = document.getElementById('login-panel');
  const appContainer = document.getElementById('app-container');
  
  if (loginPanel) loginPanel.style.display = 'none';
  if (appContainer) appContainer.style.display = 'block';
  
  // Initialize the app
  if (typeof initApp === 'function') {
    try {
      initApp();
    } catch (error) {
      console.error('Erro ao inicializar o aplicativo:', error);
    }
  } else {
    console.warn('Função initApp não disponível, o aplicativo pode não inicializar corretamente');
  }
}

// User authentication methods - handling both Firebase and local fallback
function loginUser(email, password) {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.remove('hidden');
  }

  console.log('Attempting login with email:', email);
  
  if (window.isFirebaseAvailable) {
    console.log('Using Firebase auth');
    return auth.signInWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log('Firebase login successful', userCredential.user);
        return userCredential.user;
      })
      .catch((error) => {
        console.error('Login error:', error);
        showLoginError(error.message || 'Erro de autenticação');
        // Hide loading screen on error
        if (loadingScreen) {
          loadingScreen.classList.add('hidden');
        }
        throw error; // Re-throw the error so it propagates
      });
  } else {
    console.log('Using local auth fallback');
    // Local fallback login
    const user = localUsers.find(u => u.email === email && u.password === password);
    if (user) {
      const localUser = { 
        email: user.email, 
        localEmail: user.email,
        uid: user.uid,
        isLocalUser: true
      };
      console.log('Local login successful', localUser);
      localStorage.setItem('currentUser', JSON.stringify(localUser));
      
      // Simulate async behavior for consistent flow
      setTimeout(() => {
        handleAuthStateChange(localUser);
      }, 500);
      
      return Promise.resolve(localUser);
    } else {
      console.log('Local login failed: user not found or wrong password');
      showLoginError('Usuário não encontrado ou senha incorreta');
      // Hide loading screen on error
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
      return Promise.reject(new Error('Usuário não encontrado ou senha incorreta'));
    }
  }
}

function registerUser(email, password) {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.remove('hidden');
  }

  console.log('Attempting registration with email:', email);
  
  if (window.isFirebaseAvailable) {
    console.log('Using Firebase auth for registration');
    return auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        console.log('Firebase registration successful', userCredential.user);
        return userCredential.user;
      })
      .catch((error) => {
        console.error('Registration error:', error);
        showLoginError(error.message || 'Erro ao registrar usuário');
        // Hide loading screen on error
        if (loadingScreen) {
          loadingScreen.classList.add('hidden');
        }
        throw error; // Re-throw the error so it propagates
      });
  } else {
    console.log('Using local auth fallback for registration');
    // Local fallback registration
    if (localUsers.some(u => u.email === email)) {
      console.log('Registration failed: email already exists');
      showLoginError('Este email já está cadastrado');
      // Hide loading screen on error
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
      return Promise.reject(new Error('Este email já está cadastrado'));
    } else {
      // Create local user
      const newUser = { 
        email: email, 
        password: password, 
        uid: 'local_' + Date.now()
      };
      localUsers.push(newUser);
      localStorage.setItem('localUsers', JSON.stringify(localUsers));
      console.log('Local registration successful, created user:', newUser.email);
      
      // Auto login
      const localUser = { 
        email: newUser.email, 
        localEmail: newUser.email,
        uid: newUser.uid,
        isLocalUser: true
      };
      localStorage.setItem('currentUser', JSON.stringify(localUser));
      
      // Simulate async behavior for consistent flow
      setTimeout(() => {
        handleAuthStateChange(localUser);
      }, 500);
      
      return Promise.resolve(localUser);
    }
  }
}

function logoutUser() {
  if (window.isFirebaseAvailable) {
    return auth.signOut()
      .catch((error) => {
        console.error('Logout error:', error);
      });
  } else {
    // Local fallback logout
    localStorage.removeItem('currentUser');
    handleAuthStateChange(null);
    return Promise.resolve();
  }
}

function showLoginError(message) {
  const errorElement = document.getElementById('login-error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 3000);
  }
}

// Firebase database operations with localStorage fallback
// These functions can be called from app.js and will automatically use the appropriate storage mechanism

// Load militaries data
function loadMilitaries() {
  if (window.isFirebaseAvailable && militariesRef) {
    console.log('Carregando militares do Firebase...');
    return militariesRef.once('value')
      .then(snapshot => {
        const data = snapshot.val();
        console.log('Dados de militares carregados do Firebase:', data ? Object.keys(data).length : 0, 'registros');
        
        // Garantir que retornamos um array, mesmo que não haja dados
        const militaries = data ? Object.values(data) : [];
        
        // Verificar se o resultado é realmente um array
        if (!Array.isArray(militaries)) {
          console.error('Dados do Firebase não estão no formato esperado (array)');
          return loadMilitariesFromLocalStorage();
        }
        
        // Verificar se existem militares
        if (militaries.length === 0) {
          console.warn('Nenhum militar encontrado no Firebase, tentando localStorage');
          return loadMilitariesFromLocalStorage();
        }
        
        console.log('Retornando', militaries.length, 'militares do Firebase');
        return militaries;
      })
      .catch(error => {
        console.error('Erro ao carregar militares do Firebase:', error);
        // Fallback to localStorage if Firebase fails
        return loadMilitariesFromLocalStorage();
      });
  } else {
    // Local fallback
    console.log('Firebase indisponível, carregando militares do localStorage...');
    return Promise.resolve(loadMilitariesFromLocalStorage());
  }
  
  // Função auxiliar para carregar militares do localStorage com segurança
  function loadMilitariesFromLocalStorage() {
    try {
      const localMilitariesStr = localStorage.getItem('militaries');
      if (!localMilitariesStr) {
        console.warn('Nenhum dado de militares encontrado no localStorage');
        return [];
      }
      
      const localMilitaries = JSON.parse(localMilitariesStr);
      if (!Array.isArray(localMilitaries)) {
        console.error('Dados de militares no localStorage não são um array válido');
        return [];
      }
      
      console.log('Dados de militares carregados do localStorage:', localMilitaries.length, 'registros');
      return localMilitaries;
    } catch (error) {
      console.error('Erro ao processar militares do localStorage:', error);
      return [];
    }
  }
}

// Load schedules data
function loadSchedules() {
  if (window.isFirebaseAvailable && schedulesRef) {
    console.log('Carregando escalas do Firebase...');
    return schedulesRef.once('value')
      .then(snapshot => {
        const data = snapshot.val() || {};
        console.log('Dados de escalas carregados do Firebase:', Object.keys(data).length, 'datas');
        
        // Verificar se o resultado é realmente um objeto
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.error('Dados de escalas do Firebase não estão no formato esperado (objeto)');
          return loadSchedulesFromLocalStorage();
        }
        
        return data;
      })
      .catch(error => {
        console.error('Erro ao carregar escalas do Firebase:', error);
        // Fallback to localStorage if Firebase fails
        return loadSchedulesFromLocalStorage();
      });
  } else {
    // Local fallback
    console.log('Firebase indisponível, carregando escalas do localStorage...');
    return Promise.resolve(loadSchedulesFromLocalStorage());
  }
  
  // Função auxiliar para carregar escalas do localStorage com segurança
  function loadSchedulesFromLocalStorage() {
    try {
      const localSchedulesStr = localStorage.getItem('schedules');
      if (!localSchedulesStr) {
        console.warn('Nenhum dado de escalas encontrado no localStorage');
        return {};
      }
      
      const localSchedules = JSON.parse(localSchedulesStr);
      if (!localSchedules || typeof localSchedules !== 'object' || Array.isArray(localSchedules)) {
        console.error('Dados de escalas no localStorage não são um objeto válido');
        return {};
      }
      
      console.log('Dados de escalas carregados do localStorage:', Object.keys(localSchedules).length, 'datas');
      return localSchedules;
    } catch (error) {
      console.error('Erro ao processar escalas do localStorage:', error);
      return {};
    }
  }
}

// Save militaries data
function saveMilitaries(militariesObject) {
  // Sempre salvar no localStorage como fallback
  try {
    const militariesArray = Array.isArray(militariesObject) ? 
      militariesObject : Object.values(militariesObject);
    localStorage.setItem('militaries', JSON.stringify(militariesArray));
    console.log('Militares salvos no localStorage:', militariesArray.length, 'registros');
  } catch (error) {
    console.error('Erro ao salvar militares no localStorage:', error);
  }
  
  // Salvar no Firebase se disponível
  if (window.isFirebaseAvailable && militariesRef) {
    console.log('Salvando militares no Firebase...');
    return militariesRef.set(militariesObject)
      .then(() => {
        console.log('Militares salvos com sucesso no Firebase');
        return true;
      })
      .catch(error => {
        console.error('Erro ao salvar militares no Firebase:', error);
        return false;
      });
  } else {
    return Promise.resolve(true);
  }
}

// Save schedules data
function saveSchedules(schedulesObject) {
  // Sempre salvar no localStorage como fallback
  try {
    localStorage.setItem('schedules', JSON.stringify(schedulesObject));
    console.log('Escalas salvas no localStorage:', Object.keys(schedulesObject).length, 'datas');
  } catch (error) {
    console.error('Erro ao salvar escalas no localStorage:', error);
  }
  
  // Salvar no Firebase se disponível
  if (window.isFirebaseAvailable && schedulesRef) {
    console.log('Salvando escalas no Firebase...');
    return schedulesRef.set(schedulesObject)
      .then(() => {
        console.log('Escalas salvas com sucesso no Firebase');
        return true;
      })
      .catch(error => {
        console.error('Erro ao salvar escalas no Firebase:', error);
        return false;
      });
  } else {
    return Promise.resolve(true);
  }
}

// Setup real-time listeners if Firebase is available
function setupMilitariesListener(callback) {
  if (window.isFirebaseAvailable && militariesRef) {
    console.log('Configurando listener em tempo real para militares');
    militariesRef.on('value', snapshot => {
      const data = snapshot.val();
      const militaries = data ? Object.values(data) : [];
      callback(militaries);
    });
    return true;
  }
  return false; // Indicate that we couldn't set up a real-time listener
}

function setupSchedulesListener(callback) {
  if (window.isFirebaseAvailable && schedulesRef) {
    console.log('Configurando listener em tempo real para escalas');
    schedulesRef.on('value', snapshot => {
      const data = snapshot.val() || {};
      callback(data);
    });
    return true;
  }
  return false; // Indicate that we couldn't set up a real-time listener
}

// Funcionalidade auxiliar para verificar conexão
window.checkFirebaseConnection = function() {
  if (window.isFirebaseAvailable && window.firebaseDB) {
    window.firebaseDB.ref('.info/connected').once('value')
      .then(snapshot => {
        const connected = snapshot.val() === true;
        alert(connected ? 
          'Conectado ao Firebase com sucesso!' : 
          'Não foi possível conectar ao Firebase. Utilizando armazenamento local.');
        return connected;
      })
      .catch(error => {
        alert('Erro ao verificar conexão: ' + error.message);
        return false;
      });
  } else {
    alert('Firebase não está disponível. Utilizando armazenamento local.');
    return false;
  }
};

// Logging de verificação na inicialização
console.log('Status do Firebase ao carregar firebase-config.js:', 
  window.isFirebaseAvailable ? 'disponível' : 'indisponível');

// Adicionar à janela global para acesso de scripts e console
window.firebase_functions = {
  loadMilitaries,
  loadSchedules,
  saveMilitaries,
  saveSchedules,
  setupMilitariesListener,
  setupSchedulesListener
};

// Instructions element shown in the login panel
document.addEventListener('DOMContentLoaded', () => {
  const loginPanel = document.getElementById('login-panel');
  if (loginPanel) {
    const instructionsDiv = document.createElement('div');
    instructionsDiv.style.marginTop = '20px';
    instructionsDiv.style.padding = '15px';
    instructionsDiv.style.background = 'rgba(255,255,255,0.1)';
    instructionsDiv.style.borderRadius = '8px';
    instructionsDiv.style.fontSize = '0.9rem';
    instructionsDiv.style.color = 'white';
    instructionsDiv.style.maxWidth = '500px';
    instructionsDiv.style.textAlign = 'left';
    
    instructionsDiv.innerHTML = `
      <h3 style="margin-top:0">Firebase Configurado!</h3>
      <p>O sistema está usando Firebase para sincronização em todos os dispositivos.</p>
      <p>Você pode criar uma nova conta ou usar as credenciais temporárias:</p>
      <p><strong>Credenciais temporárias:</strong> Email: admin@exemplo.com / Senha: 123456</p>
    `;
    
    loginPanel.appendChild(instructionsDiv);
    
    // Add test credentials
    if (localUsers.length === 0) {
      localUsers.push({
        email: 'admin@exemplo.com',
        password: '123456',
        uid: 'local_admin'
      });
      localStorage.setItem('localUsers', JSON.stringify(localUsers));
    }
  }
});