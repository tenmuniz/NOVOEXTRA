# Guia de Migração para Firebase Modular

Este guia descreve como migrar da sintaxe do Firebase Compat (usada atualmente no projeto) para a nova sintaxe Modular do Firebase (recomendada).

## Configuração atual vs. nova

### Atual (Compat):
```javascript
// Carregamento via script tag
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js"></script>

// Inicialização
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const ref = db.ref('militaries');
```

### Nova (Modular):
```javascript
// Importação modular
import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

// Inicialização
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const militariesRef = ref(db, 'militaries');
```

## Passos para migração

1. **Atualizar as dependências**
   - Substituir as tags script pelos imports do módulo
   - Adicionar um bundler como Webpack, Rollup ou Vite para suportar imports

2. **Substituir as principais operações**

   | Operação | Versão Compat | Versão Modular |
   |----------|---------------|----------------|
   | Inicializar | `firebase.initializeApp(config)` | `const app = initializeApp(config)` |
   | Obter DB | `firebase.database()` | `getDatabase(app)` |
   | Criar referência | `db.ref('path')` | `ref(db, 'path')` |
   | Salvar dados | `ref.set(data)` | `set(ref, data)` |
   | Ler uma vez | `ref.once('value')` | `get(ref)` |
   | Ouvir mudanças | `ref.on('value', callback)` | `onValue(ref, callback)` |
   | Adicionar item | `ref.push(data)` | `push(ref, data)` |
   | Remover item | `ref.remove()` | `remove(ref)` |
   | Atualizar item | `ref.update(data)` | `update(ref, data)` |

3. **Substituir o tratamento de retornos e callbacks**

   - Versão Compat:
     ```javascript
     ref.once('value').then(snapshot => {
       console.log(snapshot.val());
     });
     ```

   - Versão Modular:
     ```javascript
     get(ref).then(snapshot => {
       console.log(snapshot.val());
     });
     ```

4. **Atualizar listeners em tempo real**

   - Versão Compat:
     ```javascript
     ref.on('value', snapshot => {
       console.log(snapshot.val());
     }, error => {
       console.error(error);
     });
     ```

   - Versão Modular:
     ```javascript
     const unsubscribe = onValue(ref, snapshot => {
       console.log(snapshot.val());
     }, error => {
       console.error(error);
     });
     
     // Para cancelar o listener:
     unsubscribe();
     ```

## Vantagens da migração

1. **Melhor Tree-Shaking**: Apenas o código usado é incluído no bundle final
2. **Melhor tipagem**: Suporte aprimorado para TypeScript
3. **Manutenção futura**: A API modular é o padrão recomendado pelo Firebase
4. **Menor tamanho de bundle**: Redução significativa no tamanho final do JavaScript

## Estratégia recomendada para este projeto

Como o projeto possui várias páginas, a migração pode ser feita gradualmente:

1. Primeiro, crie os novos serviços com a sintaxe modular (como no arquivo `firebase-example.js`)
2. Atualize um arquivo por vez, testando cada modificação
3. Comece com as funções mais simples e menos integradas ao sistema
4. Use um bundler como Webpack para permitir os imports

## Exemplo de migração para a função loadMilitaries

**Atual:**
```javascript
function loadMilitaries() {
  if (isFirebaseAvailable) {
    return militariesRef.once('value').then(snapshot => {
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    });
  } else {
    const localMilitaries = JSON.parse(localStorage.getItem('militaries') || '[]');
    return Promise.resolve(localMilitaries);
  }
}
```

**Nova:**
```javascript
import { getDatabase, ref, get } from "firebase/database";

function loadMilitaries() {
  try {
    const db = getDatabase();
    const militariesRef = ref(db, 'militaries');
    return get(militariesRef).then(snapshot => {
      const data = snapshot.val();
      return data ? Object.values(data) : [];
    });
  } catch (error) {
    console.error('Firebase error:', error);
    const localMilitaries = JSON.parse(localStorage.getItem('militaries') || '[]');
    return Promise.resolve(localMilitaries);
  }
}
```

Para mais informações, consulte a [documentação oficial de migração do Firebase](https://firebase.google.com/docs/web/modular-upgrade). 