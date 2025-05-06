// Exemplo de uso do Firebase com sintaxe modular
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, push, remove } from "firebase/database";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAorbz8PzwQH-ieYjfcQMdePPx0h5o9eto",
  authDomain: "extranew-8d885.firebaseapp.com",
  databaseURL: "https://extranew-8d885-default-rtdb.firebaseio.com",
  projectId: "extranew-8d885",
  storageBucket: "extranew-8d885.firebasestorage.app",
  messagingSenderId: "992132989313",
  appId: "1:992132989313:web:f70a711cd6b335234ea880"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Exemplos de operações com o banco de dados

// 1. Salvar militares
function salvarMilitares(militares) {
  return set(ref(db, 'militaries'), militares);
}

// 2. Salvar escalas
function salvarEscalas(escalas) {
  return set(ref(db, 'schedules'), escalas);
}

// 3. Obter militares em tempo real
function obterMilitares(callback) {
  const militariesRef = ref(db, 'militaries');
  onValue(militariesRef, (snapshot) => {
    const data = snapshot.val() || [];
    callback(Object.values(data));
  });
}

// 4. Obter escalas em tempo real
function obterEscalas(callback) {
  const schedulesRef = ref(db, 'schedules');
  onValue(schedulesRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(data);
  });
}

// 5. Adicionar um militar
function adicionarMilitar(militar) {
  const militariesRef = ref(db, 'militaries');
  const newMilitaryRef = push(militariesRef);
  militar.id = newMilitaryRef.key;
  return set(newMilitaryRef, militar);
}

// 6. Remover um militar
function removerMilitar(militarId) {
  return remove(ref(db, `militaries/${militarId}`));
}

// Exportar funções para uso em outros arquivos
export {
  salvarMilitares,
  salvarEscalas,
  obterMilitares,
  obterEscalas,
  adicionarMilitar,
  removerMilitar
}; 