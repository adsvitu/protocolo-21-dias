const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Update CDN
html = html.replace(
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>',
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js"></script>'
);

// 2. Add Login UI
const loginUI = `<div id="authContainer" class="card" style="margin-bottom: 20px;">
  <h2>Acesso à Jornada</h2>
  <div class="row">
    <input type="email" id="emailInput" placeholder="Email (ex: vlmattus@gmail.com)" style="width: 250px;">
    <input type="password" id="passwordInput" placeholder="Senha" style="width: 200px;">
    <button id="loginBtn" class="primary">Entrar</button>
  </div>
  <p id="authError" class="hint" style="color:red;display:none;"></p>
</div>`;
html = html.replace('<main>', '<main>' + loginUI);

// 3. Update Supabase variables and valid()
const initRegex = /const SUPABASE_URL[\s\S]*?async function initSync\(\)\{[\s\S]*?\n\}/;

const newInit = `const SUPABASE_URL = 'COLOQUE_SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'COLOQUE_SUA_CHAVE_ANON_AQUI';
const supabaseClient = window.supabase && SUPABASE_URL !== 'COLOQUE_SUA_URL_AQUI' ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUser = null;

async function checkUser() {
  if(!supabaseClient) { render(); return; }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if(session) {
    currentUser = session.user;
    document.getElementById('authContainer').style.display = 'none';
    initSync();
  } else { render(); }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  if(!supabaseClient) {
    document.getElementById('authError').textContent = 'Supabase não configurado. Adicione a URL e a Anon Key no código.';
    document.getElementById('authError').style.display = 'block';
    return;
  }
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error) {
    document.getElementById('authError').textContent = error.message;
    document.getElementById('authError').style.display = 'block';
  } else {
    currentUser = data.user;
    document.getElementById('authContainer').style.display = 'none';
    initSync();
  }
});

async function initSync(){
  if(!currentUser || !supabaseClient) { render(); return; }
  let localState = null;
  try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(valid(parsed))localState=parsed;else document.getElementById('storageError').classList.remove('hidden')}}catch(e){document.getElementById('storageError').classList.remove('hidden')}
  
  document.getElementById('saved').textContent = 'Sincronizando com a nuvem...';
  try {
    const { data, error } = await supabaseClient.from('jornada').select('state, updated_at').eq('id', currentUser.id).maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    if(data && data.state && valid(data.state)) {
      if(!localState || new Date(data.updated_at) > new Date(localState.updatedAt || 0)) {
        state = data.state;
        localStorage.setItem(KEY, JSON.stringify(state));
      } else if(localState) { state = localState; syncToCloud(); }
    } else if(localState) { state = localState; syncToCloud(); }
  } catch(err) { 
    console.error(err); 
    if(localState) state = localState; 
  }
  render();
}`;

html = html.replace(initRegex, newInit);

// 4. Update valid()
const newValid = "function valid(s){return s&&s.version===1&&/^\\d{4}-\\d{2}-\\d{2}$/.test(s.start)&&Number.isInteger(s.selected)&&s.selected>=1&&s.selected<=21&&s.days&&typeof s.days==='object'&&!Array.isArray(s.days)&&Array.isArray(s.resets)&&typeof s.resetAction==='string'&&typeof s.maintenance==='string'&&Object.entries(s.days).every(([k,v])=>/^([1-9]|1[0-9]|2[01])$/.test(k)&&v&&typeof v==='object'&&(!v.steps||(Array.isArray(v.steps)&&v.steps.every(x=>typeof x==='boolean')))&&(v.status===undefined||['pending','done','skip'].includes(v.status))&&(v.sleep===undefined||typeof v.sleep==='number')&&(v.focus===undefined||typeof v.focus==='number')&&(v.energy===undefined||typeof v.energy==='number')&&(v.screen===undefined||typeof v.screen==='number')&&(v.returnTime===undefined||typeof v.returnTime==='number')&&(v.deep===undefined||typeof v.deep==='number')&&(v.habits===undefined||typeof v.habits==='string')&&(v.task===undefined||typeof v.task==='string'))}";

html = html.replace(/function valid\(s\)\{.*?\}/, newValid);

// 5. Change upsert logic
html = html.replace(
  "await supabaseClient.from('jornada').upsert({ id: secretToken, state: state, updated_at: state.updatedAt });",
  "await supabaseClient.from('jornada').upsert({ id: currentUser.id, state: state, updated_at: state.updatedAt });"
);

// 6. Init checkUser instead of initSync
html = html.replace('initSync();\n</script>', 'checkUser();\n</script>');

// 7. Update copy
html = html.replace(
  'Os dados ficam no armazenamento local deste navegador, neste computador. Não são enviados para um servidor.',
  'Os dados ficam armazenados localmente e são sincronizados com o servidor em sua conta autenticada. Isso garante que seu progresso seja salvo na nuvem com segurança.'
);

fs.writeFileSync('dashboard.html', html, 'utf8');
console.log('Done!');
