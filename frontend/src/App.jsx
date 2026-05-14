// frontend/src/App.jsx
// ═══════════════════════════════════════════════════════════
//  DataRemédiation — Espace Client (version connectée au backend)
//  Remplace les appels directs à Anthropic par l'API sécurisée
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  register, login, logout,
  listFiles, uploadFile, getFileStatus, deleteFile,
  getDownloadLink, buildDownloadUrl, restoreSession,
} from './api';

const MAX_SIZE_MB    = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXT    = ['.csv', '.xlsx', '.xls', '.pdf'];

const P = {
  bg:'#06080f',surface:'#0b0e18',card:'#0f1220',
  border:'#161c2e',borderHi:'#1e2a42',
  accent:'#00e5a0',accentDim:'#00b07a',
  blue:'#3d8eff',warn:'#ffb340',danger:'#ff4566',
  text:'#c8d4ee',muted:'#4a5878',dim:'#2a3450',chrome:'#8899cc',
};

function fmtSize(b){ return b>1048576?`${(b/1048576).toFixed(1)} Mo`:`${(b/1024).toFixed(0)} Ko`; }
function fmtDate(ts){ return new Date(ts).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
function fmtTTL(ts){
  const diff = ts - Date.now();
  if (diff <= 0) return 'Expiré';
  const h = Math.floor(diff/3600000);
  const m = Math.floor((diff%3600000)/60000);
  return h > 0 ? `${h}h${m}min` : `${m} min`;
}
function valFile(f){
  const ext = '.'+f.name.split('.').pop().toLowerCase();
  const e = [];
  if (!ALLOWED_EXT.includes(ext)) e.push(`Format non accepté : ${ext}`);
  if (f.size > MAX_SIZE_BYTES)     e.push(`Trop volumineux (max ${MAX_SIZE_MB} Mo)`);
  if (f.size === 0)                e.push('Fichier vide');
  return e;
}

const STATUS_CFG = {
  importing: { label:'Importé',    color:'#4a9eff', icon:'↑', pulse:true  },
  analyzing: { label:'En analyse', color:'#ffb340', icon:'◎', pulse:true  },
  done:      { label:'Terminé',    color:'#00e5a0', icon:'✓', pulse:false },
  error:     { label:'Erreur',     color:'#ff4566', icon:'✗', pulse:false },
};

// ═══════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user,   setUser]   = useState(null);
  const [files,  setFiles]  = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  // Restaurer la session depuis le refresh token stocké
  useEffect(() => {
    restoreSession().then(u => {
      if (u) { setUser(u); setScreen('dashboard'); }
      else    setScreen('login');
    });
    // Écouter l'événement de déconnexion forcée (token expiré)
    const handler = () => { setUser(null); setFiles([]); setScreen('login'); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  // Polling des fichiers en cours d'analyse
  useEffect(() => {
    if (screen !== 'dashboard' || !user) return;
    loadFiles();
    const hasProcessing = files.some(f => ['importing','analyzing'].includes(f.status));
    if (!hasProcessing) return;
    const t = setInterval(loadFiles, 3000);
    return () => clearInterval(t);
  }, [screen, user, files.map(f=>f.status).join(',')]);

  const loadFiles = useCallback(async () => {
    if (!user) return;
    try {
      const f = await listFiles();
      setFiles(f || []);
      // Mettre à jour activeFile si il est en cours
      setActiveFile(prev => prev ? (f.find(x=>x.id===prev.id)||prev) : null);
    } catch(e) { console.error('loadFiles:', e.message); }
  }, [user]);

  const handleLogin = async (u) => {
    setUser(u); setScreen('dashboard');
    const f = await listFiles().catch(()=>[]);
    setFiles(f);
  };

  const handleLogout = async () => {
    await logout().catch(()=>{});
    setUser(null); setFiles([]); setScreen('login');
  };

  if (screen === 'loading') return <Shell><LoadingScreen /></Shell>;

  return (
    <Shell>
      {(screen==='login'||screen==='register') && (
        <AuthScreen
          mode={screen}
          onSuccess={handleLogin}
          onSwitch={() => setScreen(screen==='login'?'register':'login')}
        />
      )}
      {screen === 'dashboard' && (
        <Dashboard
          user={user} files={files}
          onLogout={handleLogout} onReload={loadFiles}
          showUpload={showUpload} setShowUpload={setShowUpload}
          activeFile={activeFile} setActiveFile={setActiveFile}
        />
      )}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════
// SHELL
// ═══════════════════════════════════════════════════════════
function Shell({ children }) {
  return (
    <div style={{minHeight:'100vh',background:P.bg,color:P.text,fontFamily:"'JetBrains Mono','Fira Code',monospace",fontSize:13}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${P.bg}}::-webkit-scrollbar-thumb{background:${P.dim};border-radius:2px}
        button{cursor:pointer;font-family:'JetBrains Mono',monospace;border:none;transition:all .18s}
        input{font-family:'JetBrains Mono',monospace;outline:none;transition:all .18s}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px ${P.accent}40}50%{box-shadow:0 0 20px ${P.accent}80}}
        @keyframes progressFill{0%{width:5%}50%{width:70%}100%{width:95%}}
        .fadeUp{animation:fadeUp .4s ease forwards}
        .pulse{animation:pulse 1.6s ease-in-out infinite}
        .spin{animation:spin .8s linear infinite;display:inline-block}
        .glow{animation:glow 2s ease-in-out infinite}
        .btn-primary{background:${P.accent};color:#000;font-weight:700;padding:11px 26px;border-radius:6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
        .btn-primary:hover{background:${P.accentDim};box-shadow:0 4px 20px ${P.accent}40;transform:translateY(-1px)}
        .btn-primary:disabled{opacity:.35;cursor:not-allowed;transform:none}
        .btn-ghost{background:transparent;border:1px solid ${P.border};color:${P.muted};padding:9px 18px;border-radius:6px;font-size:11px}
        .btn-ghost:hover{border-color:${P.borderHi};color:${P.chrome}}
        .btn-danger{background:transparent;border:1px solid ${P.danger}40;color:${P.danger};padding:7px 14px;border-radius:5px;font-size:11px}
        .btn-danger:hover{background:${P.danger}15}
        .field{width:100%;background:${P.surface};border:1px solid ${P.border};border-radius:6px;padding:11px 14px;color:${P.text};font-size:13px}
        .field:focus{border-color:${P.accent}60;background:${P.card}}
        .card{background:${P.card};border:1px solid ${P.border};border-radius:10px}
        .tag{border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;display:inline-flex;align-items:center;gap:4px}
        .row-hover:hover{background:${P.surface};border-color:${P.borderHi}!important}
        .drop-active{border-color:${P.accent}!important;background:${P.accent}06!important}
      `}</style>
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div className="spin" style={{fontSize:32,marginBottom:12,color:P.accent}}>⟳</div>
        <div style={{fontSize:12,color:P.muted}}>Restauration de la session…</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// AUTH SCREEN
// ═══════════════════════════════════════════════════════════
function AuthScreen({ mode, onSuccess, onSwitch }) {
  const [form, setForm]       = useState({company:'',email:'',password:'',confirm:''});
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');
  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async () => {
    setErr(''); setLoading(true);
    try {
      let user;
      if (mode === 'register') {
        if (!form.company.trim()) throw new Error("Nom d'entreprise requis");
        if (form.password !== form.confirm) throw new Error('Les mots de passe ne correspondent pas');
        user = await register(form.company, form.email, form.password);
      } else {
        user = await login(form.email, form.password);
      }
      onSuccess(user);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,background:`radial-gradient(ellipse at 30% 20%,${P.accent}08 0%,transparent 50%),${P.bg}`}}>
      <div style={{position:'fixed',inset:0,backgroundImage:`linear-gradient(${P.border} 1px,transparent 1px),linear-gradient(90deg,${P.border} 1px,transparent 1px)`,backgroundSize:'60px 60px',opacity:.4,pointerEvents:'none'}} />
      <div className="fadeUp card" style={{width:'100%',maxWidth:420,padding:'40px 36px',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${P.accent}60,transparent)`,animation:'progressFill 2s ease-in-out infinite',pointerEvents:'none'}} />
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:48,height:48,borderRadius:10,background:`linear-gradient(135deg,${P.accent},${P.blue})`,fontSize:22,marginBottom:12}}>⚡</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:P.text}}>DataRemédiation</div>
          <div style={{fontSize:10,color:P.muted,letterSpacing:'.12em',textTransform:'uppercase',marginTop:4}}>
            {mode==='login'?'Espace Client Sécurisé':'Créer un compte'}
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {mode==='register' && (
            <div>
              <div style={{fontSize:10,color:P.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Entreprise</div>
              <input className="field" placeholder="ACME Corp SAS" value={form.company} onChange={e=>f('company',e.target.value)} />
            </div>
          )}
          <div>
            <div style={{fontSize:10,color:P.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Email</div>
            <input className="field" type="email" placeholder="vous@entreprise.fr" value={form.email} onChange={e=>f('email',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
          </div>
          <div>
            <div style={{fontSize:10,color:P.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Mot de passe</div>
            <input className="field" type="password" placeholder="••••••••" value={form.password} onChange={e=>f('password',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
          </div>
          {mode==='register' && (
            <div>
              <div style={{fontSize:10,color:P.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Confirmer</div>
              <input className="field" type="password" placeholder="••••••••" value={form.confirm} onChange={e=>f('confirm',e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
            </div>
          )}
          {err && <div style={{background:`${P.danger}12`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',fontSize:11,color:P.danger}}>⚠ {err}</div>}
          <button className="btn-primary" onClick={submit} disabled={loading} style={{marginTop:4}}>
            {loading ? <span className="spin">⟳</span> : mode==='login' ? '→ Connexion' : '→ Créer le compte'}
          </button>
          <div style={{textAlign:'center',fontSize:11,color:P.muted,marginTop:4}}>
            {mode==='login'?'Pas encore de compte ?':'Déjà inscrit ?'}{' '}
            <button onClick={onSwitch} style={{background:'none',border:'none',color:P.accent,fontSize:11,cursor:'pointer',padding:0}}>
              {mode==='login'?'S\'inscrire':'Se connecter'}
            </button>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:24}}>
          {['🔐 JWT','🔒 AES-256','🛡️ RGPD'].map(b=>(
            <div key={b} style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:4,padding:'3px 8px',fontSize:9,color:P.dim,letterSpacing:'.06em'}}>{b}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
function Dashboard({ user, files, onLogout, onReload, showUpload, setShowUpload, activeFile, setActiveFile }) {
  const stats = {
    total:      files.length,
    done:       files.filter(f=>f.status==='done').length,
    processing: files.filter(f=>['analyzing','importing'].includes(f.status)).length,
    error:      files.filter(f=>f.status==='error').length,
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <header style={{borderBottom:`1px solid ${P.border}`,padding:'12px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',background:P.surface,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${P.accent},${P.blue})`,fontSize:16}}>⚡</div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,letterSpacing:'-.2px'}}>DataRemédiation</div>
            <div style={{fontSize:9,color:P.muted,letterSpacing:'.1em',textTransform:'uppercase'}}>Espace client · {user.company}</div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="glow" style={{width:6,height:6,borderRadius:'50%',background:P.accent}} />
          <div style={{fontSize:10,color:P.muted,padding:'4px 10px',background:P.card,border:`1px solid ${P.border}`,borderRadius:6}}>{user.email}</div>
          <button className="btn-ghost" onClick={onLogout} style={{fontSize:10,padding:'6px 12px'}}>Déconnexion ↗</button>
        </div>
      </header>

      <div style={{flex:1,padding:'28px',maxWidth:1100,margin:'0 auto',width:'100%'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24}} className="fadeUp">
          {[
            {label:'Fichiers',      value:stats.total,      color:P.blue,   icon:'◈'},
            {label:'Terminés',      value:stats.done,       color:P.accent, icon:'✓'},
            {label:'En traitement', value:stats.processing, color:P.warn,   icon:'◌'},
            {label:'Erreurs',       value:stats.error,      color:P.danger, icon:'✗'},
          ].map((s,i)=>(
            <div key={i} className="card" style={{padding:'16px 18px',borderColor:s.color+'20'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{fontSize:10,color:P.muted,textTransform:'uppercase',letterSpacing:'.08em'}}>{s.label}</div>
                <div style={{fontSize:14,color:s.color+'60'}}>{s.icon}</div>
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:30,fontWeight:700,color:s.color,marginTop:6}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:activeFile?'1fr 380px':'1fr',gap:16}}>
          <div>
            {showUpload ? (
              <UploadZone
                onDone={async () => { setShowUpload(false); await onReload(); }}
                onCancel={() => setShowUpload(false)}
              />
            ) : (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600}}>Mes fichiers</div>
                  <button className="btn-primary" onClick={()=>setShowUpload(true)} style={{fontSize:11,padding:'9px 20px'}}>+ Nouveau fichier</button>
                </div>
                {files.length === 0 ? (
                  <EmptyState onUpload={()=>setShowUpload(true)} />
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {files.map(f => (
                      <FileRow key={f.id} file={f}
                        isActive={activeFile?.id===f.id}
                        onClick={() => setActiveFile(activeFile?.id===f.id ? null : f)}
                        onDelete={async () => {
                          await deleteFile(f.id).catch(()=>{});
                          if (activeFile?.id===f.id) setActiveFile(null);
                          onReload();
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {activeFile && !showUpload && (
            <ReportPanel file={activeFile} onClose={()=>setActiveFile(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// UPLOAD ZONE
// ═══════════════════════════════════════════════════════════
function UploadZone({ onDone, onCancel }) {
  const [dragging, setDragging] = useState(false);
  const [file,     setFile]     = useState(null);
  const [errs,     setErrs]     = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading,setUploading]= useState(false);
  const [error,    setError]    = useState('');
  const inputRef = useRef();

  const handle = (f) => { const e=valFile(f); setErrs(e); setFile(e.length?null:f); };

  const upload = async () => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      await uploadFile(file, setProgress);
      await onDone();
    } catch(e) {
      setError(e.message);
      setUploading(false);
    }
  };

  return (
    <div className="fadeUp card" style={{padding:24,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600}}>Importer un fichier</div>
        <button className="btn-ghost" onClick={onCancel} style={{fontSize:11,padding:'5px 12px'}}>✕ Annuler</button>
      </div>
      <div
        className={dragging?'drop-active':''}
        onClick={()=>inputRef.current?.click()}
        onDragOver={e=>{e.preventDefault();setDragging(true)}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handle(f);}}
        style={{border:`2px dashed ${file?P.accent:dragging?P.blue:P.border}`,borderRadius:10,padding:'32px 20px',textAlign:'center',cursor:'pointer',transition:'all .2s',background:file?`${P.accent}05`:dragging?`${P.blue}05`:'transparent'}}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={e=>{if(e.target.files[0])handle(e.target.files[0])}} style={{display:'none'}} />
        {file ? (
          <><div style={{fontSize:32,marginBottom:8}}>{file.name.endsWith('.pdf')?'📄':'📊'}</div>
          <div style={{color:P.accent,fontWeight:600,marginBottom:4}}>{file.name}</div>
          <div style={{fontSize:11,color:P.muted}}>{fmtSize(file.size)}</div></>
        ) : (
          <><div style={{fontSize:36,marginBottom:10,color:P.dim}}>⊕</div>
          <div style={{color:P.chrome,marginBottom:6,fontWeight:500}}>Glisser-déposer ou cliquer</div>
          <div style={{fontSize:11,color:P.muted}}>CSV · XLSX · XLS · PDF — max {MAX_SIZE_MB} Mo</div></>
        )}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
        {[['🔒','Chiffrement TLS en transit'],['🗑️','Suppression auto 48h'],['🔏','Pseudo avant IA'],['🌐','Backend sécurisé — clé cachée']].map(([i,l],k)=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:6,background:P.surface,border:`1px solid ${P.border}`,borderRadius:6,padding:'7px 10px',fontSize:10,color:P.muted}}><span style={{fontSize:13}}>{i}</span>{l}</div>
        ))}
      </div>

      {errs.length>0 && <div style={{background:`${P.danger}10`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',marginTop:12}}>{errs.map((e,i)=><div key={i} style={{fontSize:11,color:P.danger}}>✗ {e}</div>)}</div>}
      {error && <div style={{background:`${P.danger}10`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',marginTop:12,fontSize:11,color:P.danger}}>✗ {error}</div>}

      {uploading && (
        <div style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:P.muted,marginBottom:5}}><span>Upload sécurisé…</span><span>{progress}%</span></div>
          <div style={{height:3,background:P.border,borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${progress}%`,background:`linear-gradient(90deg,${P.accent},${P.blue})`,transition:'width .15s'}} />
          </div>
        </div>
      )}
      <button className="btn-primary" onClick={upload} disabled={!file||errs.length>0||uploading} style={{marginTop:16,width:'100%'}}>
        {uploading ? <><span className="spin">⟳</span> Upload en cours…</> : '↑ Importer et analyser'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FILE ROW
// ═══════════════════════════════════════════════════════════
function FileRow({ file, isActive, onClick, onDelete }) {
  const st = STATUS_CFG[file.status] || STATUS_CFG.importing;
  const ext = '.'+file.original_name.split('.').pop().toLowerCase();
  const extC = {'.csv':'#00e5a0','.xlsx':'#3d8eff','.xls':'#3d8eff','.pdf':'#ff4566'};
  const ttl = file.expires_at ? fmtTTL(new Date(file.expires_at).getTime()) : null;

  return (
    <div className="card row-hover" onClick={onClick} style={{padding:'14px 16px',cursor:'pointer',borderColor:isActive?P.accent+'40':P.border,borderLeft:`3px solid ${isActive?P.accent:P.border}`,transition:'all .15s'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:36,height:36,borderRadius:8,background:`${extC[ext]||P.muted}15`,border:`1px solid ${extC[ext]||P.muted}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
          {ext==='.pdf'?'📄':'📊'}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,color:P.text,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{file.original_name}</div>
          <div style={{fontSize:10,color:P.muted,marginTop:2}}>
            {fmtSize(file.file_size)} · {fmtDate(file.uploaded_at)}
            {ttl && <span style={{marginLeft:8,color:P.dim}}>· Expire {ttl}</span>}
          </div>
        </div>
        <div className={`tag ${st.pulse?'pulse':''}`} style={{background:`${st.color}15`,color:st.color,border:`1px solid ${st.color}30`,flexShrink:0}}>
          <span>{st.icon}</span>{st.label}
        </div>
        <button className="btn-danger" onClick={e=>{e.stopPropagation();onDelete();}} style={{padding:'5px 10px',fontSize:10,flexShrink:0}}>✕</button>
      </div>
      {file.status==='analyzing' && (
        <div style={{marginTop:10,height:2,background:P.border,borderRadius:1,overflow:'hidden'}}>
          <div style={{height:'100%',background:`linear-gradient(90deg,${P.accent},${P.blue})`,animation:'progressFill 3s ease-in-out infinite'}} />
        </div>
      )}
      {file.status==='error' && file.error_message && (
        <div style={{marginTop:8,fontSize:10,color:P.danger,paddingTop:8,borderTop:`1px solid ${P.border}`}}>✗ {file.error_message}</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// REPORT PANEL
// ═══════════════════════════════════════════════════════════
