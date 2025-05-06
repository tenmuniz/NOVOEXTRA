// Firebase configuration - Updated with new credentials
const firebaseConfig = {
  apiKey: "AIzaSyAEAaKTimREDnZdMZaEqeIErW1Vg8n_GGw",
  authDomain: "sistema-meritocracia-20cipm.firebaseapp.com",
  projectId: "sistema-meritocracia-20cipm",
  storageBucket: "sistema-meritocracia-20cipm.firebasestorage.app",
  messagingSenderId: "1096372826283",
  appId: "1:1096372826283:web:4063f556935788c57c87ee",
  databaseURL: "https://sistema-meritocracia-20cipm-default-rtdb.firebaseio.com" // URL do Realtime Database
};

// Fallback mechanism variables
let isFirebaseAvailable = false;
let localUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
let currentUser = null;

// Initialize Firebase with error handling
try {
  firebase.initializeApp(firebaseConfig);
  isFirebaseAvailable = true;
  console.log('Firebase initialized successfully');
  
  // Test database connection
  firebase.database().ref('.info/connected').on('value', function(snap) {
    if (snap.val() === true) {
      console.log('Connected to Firebase database');
    } else {
      console.warn('Disconnected from Firebase database, may fall back to local storage');
    }
  });
} catch (error) {
  console.error('Firebase initialization failed. Using localStorage fallback:', error);
  alert('Erro na conexão com Firebase: ' + error.message);
  isFirebaseAvailable = false;
}

// Auth and Database references (if available)
const auth = isFirebaseAvailable ? firebase.auth() : null;
const db = isFirebaseAvailable ? firebase.database() : null;

// Data references (will be null if Firebase unavailable)
const militariesRef = isFirebaseAvailable ? db.ref('militaries') : null;
const schedulesRef = isFirebaseAvailable ? db.ref('schedules') : null;

// Skip authentication and show app directly
console.log('Authentication disabled - showing app directly');
// Create a dummy user to satisfy app requirements
const dummyUser = { 
  id: 'dummy_user',
  email: 'admin@exemplo.com', 
  name: 'Administrador',
  isLocalUser: true
};
currentUser = dummyUser;
handleAuthStateChange(dummyUser);

// Unified auth state change handler
function handleAuthStateChange(user) {
  currentUser = user;
  
  // Ensure loading screen is hidden
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
  }
  
  // Always show app regardless of auth state - login screen is removed
  document.getElementById('login-panel').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
  
  // Initialize the app
  if (typeof initApp === 'function') {
    try {
      initApp();
    } catch (error) {
      console.error('Error initializing app:', error);
      alert('Erro ao inicializar o aplicativo: ' + error.message);
    }
  } else {
    console.warn('initApp function not available, app may not initialize properly');
  }
}

// User authentication methods - handling both Firebase and local fallback
function loginUser(email, password) {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.remove('hidden');
  }

  console.log('Attempting login with email:', email);
  
  if (isFirebaseAvailable) {
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
  
  if (isFirebaseAvailable) {
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
  if (isFirebaseAvailable) {
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
  if (isFirebaseAvailable) {
    return militariesRef.once('value').then(snapshot => {
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    });
  } else {
    // Local fallback
    const localMilitaries = JSON.parse(localStorage.getItem('militaries') || '[]');
    return Promise.resolve(localMilitaries);
  }
}

// Load schedules data
function loadSchedules() {
  if (isFirebaseAvailable) {
    return schedulesRef.once('value').then(snapshot => {
      return snapshot.val() || {};
    });
  } else {
    // Local fallback
    const localSchedules = JSON.parse(localStorage.getItem('schedules') || '{}');
    return Promise.resolve(localSchedules);
  }
}

// Save militaries data
function saveMilitaries(militariesObject) {
  if (isFirebaseAvailable) {
    return militariesRef.set(militariesObject);
  } else {
    // Local fallback - convert object to array if needed
    const militariesArray = Array.isArray(militariesObject) ? 
      militariesObject : Object.values(militariesObject);
    localStorage.setItem('militaries', JSON.stringify(militariesArray));
    return Promise.resolve();
  }
}

// Save schedules data
function saveSchedules(schedulesObject) {
  if (isFirebaseAvailable) {
    return schedulesRef.set(schedulesObject);
  } else {
    // Local fallback
    localStorage.setItem('schedules', JSON.stringify(schedulesObject));
    return Promise.resolve();
  }
}

// Setup real-time listeners if Firebase is available
function setupMilitariesListener(callback) {
  if (isFirebaseAvailable) {
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
  if (isFirebaseAvailable) {
    schedulesRef.on('value', snapshot => {
      const data = snapshot.val() || {};
      callback(data);
    });
    return true;
  }
  return false; // Indicate that we couldn't set up a real-time listener
}

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