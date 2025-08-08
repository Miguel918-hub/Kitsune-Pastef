<script>
const $ = id => document.getElementById(id);
const editor = $('editor');
const codeBlock = $('codeBlock');
const badgeLang = $('badgeLang');
const pasteTitle = $('pasteTitle');
const hashInfo = $('hashInfo');
const langSelect = $('lang');
const titleInput = $('title');
const expansionSelect = $('expansion');

function b64enc(s){ return btoa(unescape(encodeURIComponent(s))); }
function b64dec(s){ try { return decodeURIComponent(escape(atob(s))); } catch(e){ return null } }

function setHashFromData(obj){
  const json = JSON.stringify(obj);
  const b = b64enc(json);
  location.hash = b;
  updateHashInfo();
}

function readDataFromHash(){
  if(!location.hash) return null;
  const b = location.hash.slice(1);
  const json = b64dec(b);
  if(!json) return null;
  try{ return JSON.parse(json); } catch(e){ return null }
}

function updateHashInfo(){
  if(location.hash){
    const short = location.hash.slice(1,9);
    hashInfo.textContent = 'hash: #' + short + ' • Copie a URL para compartilhar';
  } else {
    hashInfo.textContent = 'URL: —';
  }
}

/* simples escape html */
function escapeHtml(str){
  return str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

/* simples highlight básico para algumas linguagens */
const HIGHLIGHTERS = {
  javascript: str => {
    return escapeHtml(str)
      .replace(/(\/\/.*$)/gm, '<span class="tok-cm">$1</span>')
      .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="tok-str">$1</span>')
      .replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|class|extends|import|from|export|await|async|try|catch)\b/g, '<span class="tok-k">$1</span>')
      .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
  },
  lua: str => {
    return escapeHtml(str)
      .replace(/(--.*$)/gm, '<span class="tok-cm">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>')
      .replace(/\b(local|function|end|if|then|else|for|in|while|do|repeat|until|return|nil|true|false)\b/g, '<span class="tok-k">$1</span>')
      .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
  },
  python: str => {
    return escapeHtml(str)
      .replace(/(#.*$)/gm, '<span class="tok-cm">$1</span>')
      .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>')
      .replace(/\b(def|class|return|if|elif|else|for|while|try|except|with|as|import|from|pass|break|continue|lambda|True|False|None)\b/g, '<span class="tok-k">$1</span>')
      .replace(/\b([A-Za-z_]\w*)(?=\s*\()/g, '<span class="tok-fn">$1</span>');
  },
  html: str => {
    return escapeHtml(str)
      .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-cm">$1</span>')
      .replace(/(&lt;\/?[^\s&]+?)(\s|&gt;)/g, '<span class="tok-k">$1</span>$2')
      .replace(/(".*?"|'.*?')/g, '<span class="tok-str">$1</span>');
  },
  css: str => {
    return escapeHtml(str)
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="tok-cm">$1</span>')
      .replace(/([.#]?[a-zA-Z0-9\-\_]+)(?=\s*\{)/g, '<span class="tok-k">$1</span>')
      .replace(/(:\s*)([^;}\n]+)/g, '$1<span class="tok-str">$2</span>');
  },
  default: str => escapeHtml(str)
};

function highlightText(lang, text){
  const fn = HIGHLIGHTERS[lang] || HIGHLIGHTERS.default;
  try { return fn(text); } catch(e) { return escapeHtml(text); }
}

function renderPreview(){
  const lang = (langSelect.value === 'auto') ? detectLang(editor.value) : langSelect.value;
  badgeLang.textContent = lang;
  pasteTitle.textContent = titleInput.value || '—';
  const html = highlightText(lang, editor.value || ' ');
  codeBlock.innerHTML = html;
}

function detectLang(text){
  const t = text.slice(0,2000).toLowerCase();
  if(t.includes('<?php') || /<\s*html/.test(t)) return 'html';
  if(/\bfunction\b/.test(t) && /=>/.test(t)) return 'javascript';
  if(/\b(local|function|end)\b/.test(t) && !t.includes('then') && !t.includes('elseif') && !t.includes('repeat') && !t.includes('until') && t.includes('print')) return 'lua';
  if(/\b(def|elif|import|from)\b/.test(t)) return 'python';
  if(t.trim().startsWith('{') && /:\s*["'{\[]?/.test(t)) return 'json';
  if(t.includes('{') && t.includes('}')) return 'css';
  return 'text';
}

async function copyToClipboard(){
  try{
    await navigator.clipboard.writeText(editor.value);
    alert('Copiado para a área de transferência.');
  }catch(e){
    prompt('Copiar manualmente:', editor.value);
  }
}

function downloadContent(filename, content){
  const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function openRawWindow(content){
  const win = window.open('', '_blank');
  win.document.write('<pre style="white-space:pre-wrap;word-break:break-word;padding:16px;background:#07120f;color:#dff7ea;font-family:ui-monospace">'+escapeHtml(content)+'</pre>');
  win.document.title = 'RAW - Kitsune Paste';
}

function saveAndGenerate(){
  const obj = {title: titleInput.value || '', lang: langSelect.value, content: editor.value || '', ts: Date.now()};
  setHashFromData(obj);
  if(expansionSelect.value === 'local') {
    const id = 'paste_local_' + (+new Date());
    localStorage.setItem(id, JSON.stringify(obj));
    alert('Salvo localmente com chave: ' + id + '\nAlém disso, URL gerada!');
  } else {
    alert('URL gerada! Copie a barra de endereços para compartilhar.');
  }
}

function loadFromHashOrLocal(){
  const data = readDataFromHash();
  if(data){
    titleInput.value = data.title || '';
    if(data.lang && Object.keys(HIGHLIGHTERS).includes(data.lang)) langSelect.value = data.lang;
    else langSelect.value = 'auto';
    editor.value = data.content || '';
    renderPreview();
  } else {
    const keys = Object.keys(localStorage).filter(k=>k.startsWith('paste_local_')).sort();
    if(keys.length){
      const last = JSON.parse(localStorage.getItem(keys[keys.length-1]));
      titleInput.value = last.title || '';
      editor.value = last.content || '';
      renderPreview();
    }
  }
  updateHashInfo();
}

let dark = true;
const themeBtn = $('themeBtn');
themeBtn.addEventListener('click', ()=>{
  if(dark){
    document.documentElement.style.setProperty('--bg','#f6fff8');
    document.documentElement.style.setProperty('--panel','#ffffff');
    document.documentElement.style.setProperty('--muted','#2d4a41');
    document.documentElement.style.setProperty('--accent','#2dd36f');
    document.body.style.color = '#063827';
    dark = false;
  } else {
    document.documentElement.style.setProperty('--bg','#0b0e0f');
    document.documentElement.style.setProperty('--panel','#0f1515');
    document.documentElement.style.setProperty('--muted','#98a3a3');
    document.body.style.color = '#dfeeea';
    dark = true;
  }
});

editor.addEventListener('input', renderPreview);
langSelect.addEventListener('change', renderPreview);
titleInput.addEventListener('input', renderPreview);
$('saveBtn').addEventListener('click', saveAndGenerate);
$('copyBtn').addEventListener('click', copyToClipboard);
$('downloadBtn').addEventListener('click', ()=> {
  const name = (titleInput.value||'paste').replaceAll(/[^a-z0-9\-_]/ig,'_') + '.txt';
  downloadContent(name, editor.value);
});
$('clearBtn').addEventListener('click', ()=> {
  if(confirm('Limpar o editor?')){
    editor.value=''; 
    renderPreview(); 
    location.hash=''; 
    updateHashInfo();
  }
});
$('rawBtn').addEventListener('click', ()=> {
  openRawWindow(editor.value);
});
$('downloadRaw').addEventListener('click', ()=> {
  downloadContent('raw.txt', editor.value);
});
$('openRaw').addEventListener('click', ()=> {
  openRawWindow(editor.value);
});

window.addEventListener('hashchange', ()=> {
  loadFromHashOrLocal();
});

loadFromHashOrLocal();
renderPreview();
</script>
