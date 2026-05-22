    // frontend/src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  register, login, logout,
  listFiles, uploadFile, deleteFile,
  getDownloadLink, buildDownloadUrl, restoreSession,
} from './api';
import { PaymentButton } from './components/PaymentButton';

const MAX_SIZE_MB    = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXT    = ['.csv', '.xlsx', '.xls', '.pdf'];

// ─── Emails admin — bypass paiement pour démos ────────────────────────────────
const ADMIN_EMAILS = [
  'deangelisalbert@gmail.com',
];

const P = {
  bg:'#06080f',surface:'#0b0e18',card:'#0f1220',
  border:'#161c2e',borderHi:'#1e2a42',
  accent:'#00e5a0',accentDim:'#00b07a',
  blue:'#3d8eff',warn:'#ffb340',danger:'#ff4566',
  text:'#c8d4ee',muted:'#4a5878',dim:'#2a3450',chrome:'#8899cc',
};

const API_URL = import.meta.env.VITE_API_URL || 'https://dataremediation-backend-production.up.railway.app';

const ABONNEMENTS = [
  {
    label: 'Starter',
    prix: '249 € HT/mois',
    desc: 'Jusqu\'à 50 fournisseurs',
    features: ['Contrôle SIRET mensuel', 'Validation TVA', 'Rapport PDF', 'Support email'],
    link: 'https://buy.stripe.com/cNi00c9RRcb74mmeptfQI05',
    color: '#00e5a0',
  },
  {
    label: 'PME BTP',
    prix: '459 € HT/mois',
    desc: '51 à 200 fournisseurs',
    features: ['Contrôle SIRET mensuel', 'Validation TVA', 'Détection doublons', 'Rapport PDF', 'Support prioritaire'],
    link: 'https://buy.stripe.com/8x214g2pp7UR3ii1CHfQI06',
    color: '#3d8eff',
  },
  {
    label: 'PME Structurée',
    prix: '890 € HT/mois',
    desc: '201 à 500 fournisseurs',
    features: ['Contrôle SIRET mensuel', 'Validation TVA', 'Détection doublons', 'Scoring conformité', 'Rapport PDF avancé', 'Support dédié'],
    link: 'https://buy.stripe.com/3cIaEQfcbcb7dWWchlfQI07',
    color: '#ffb340',
  },
  {
    label: 'Cabinet Comptable',
    prix: '1 990 € HT/mois',
    desc: 'Portefeuille clients illimité',
    features: ['Multi-clients', 'Contrôle SIRET mensuel', 'Validation TVA', 'Détection doublons', 'Tableaux de bord', 'Rapports PDF white-label', 'Account manager dédié'],
    link: 'https://buy.stripe.com/28EfZae87grn0664OTfQI08',
    color: '#ff4566',
  },
];

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

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user,   setUser]   = useState(null);
  const [files,  setFiles]  = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (resetToken) {
      setScreen('reset-password');
      return;
    }
    restoreSession().then(u => {
      if (u) { setUser(u); setScreen('dashboard'); }
      else    setScreen('login');
    });
    const handler = () => { setUser(null); setFiles([]); setScreen('login'); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

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
          onForgot={() => setScreen('forgot-password')}
        />
      )}
      {screen === 'forgot-password' && (
        <ForgotPasswordScreen onBack={() => setScreen('login')} />
      )}
      {screen === 'reset-password' && (
        <ResetPasswordScreen onSuccess={() => {
          window.history.replaceState({}, '', '/');
          setScreen('login');
        }} />
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

function AuthScreen({ mode, onSuccess, onSwitch, onForgot }) {
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
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
              <div style={{fontSize:10,color:P.muted,letterSpacing:'.06em',textTransform:'uppercase'}}>Mot de passe</div>
              {mode==='login' && (
                <button onClick={onForgot} style={{background:'none',border:'none',color:P.muted,fontSize:10,cursor:'pointer',padding:0,textDecoration:'underline'}}>
                  Mot de passe oublié ?
                </button>
              )}
            </div>
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

function ForgotPasswordScreen({ onBack }) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [err,     setErr]     = useState('');

  const submit = async () => {
    if (!email) return setErr('Email requis');
    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      setSent(true);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,background:`radial-gradient(ellipse at 30% 20%,${P.accent}08 0%,transparent 50%),${P.bg}`}}>
      <div className="fadeUp card" style={{width:'100%',maxWidth:420,padding:'40px 36px'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:36,marginBottom:12}}>🔑</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:P.text}}>Mot de passe oublié</div>
          <div style={{fontSize:11,color:P.muted,marginTop:6}}>Entrez votre email pour recevoir un lien de réinitialisation</div>
        </div>
        {sent ? (
          <div style={{textAlign:'center'}}>
            <div style={{background:`${P.accent}15`,border:`1px solid ${P.accent}30`,borderRadius:8,padding:'20px',marginBottom:20}}>
              <div style={{fontSize:24,marginBottom:8}}>✉️</div>
              <div style={{color:P.accent,fontWeight:600,marginBottom:4}}>Email envoyé !</div>
              <div style={{fontSize:11,color:P.muted}}>Vérifiez votre boîte mail et cliquez sur le lien de réinitialisation.</div>
            </div>
            <button className="btn-ghost" onClick={onBack} style={{width:'100%'}}>← Retour à la connexion</button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <div style={{fontSize:10,color:P.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Email</div>
              <input className="field" type="email" placeholder="vous@entreprise.fr" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
            </div>
            {err && <div style={{background:`${P.danger}12`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',fontSize:11,color:P.danger}}>⚠ {err}</div>}
            <button className="btn-primary" onClick={submit} disabled={loading} style={{marginTop:4}}>
              {loading ? <span className="spin">⟳</span> : '→ Envoyer le lien'}
            </button>
            <button className="btn-ghost" onClick={onBack} style={{textAlign:'center'}}>← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ResetPasswordScreen({ onSuccess }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState('');
  const [done,     setDone]     = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');

  const submit = async () => {
    if (password.length < 8) return setErr('Mot de passe trop court (8 caractères min)');
    if (password !== confirm) return setErr('Les mots de passe ne correspondent pas');
    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setDone(true);
      setTimeout(onSuccess, 2000);
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:24,background:`radial-gradient(ellipse at 30% 20%,${P.accent}08 0%,transparent 50%),${P.bg}`}}>
      <div className="fadeUp card" style={{width:'100%',maxWidth:420,padding:'40px 36px'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:36,marginBottom:12}}>🔒</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:P.text}}>Nouveau mot de passe</div>
          <div style={{fontSize:11,color:P.muted,marginTop:6}}>Choisissez un nouveau mot de passe sécurisé</div>
        </div>
        {done ? (
          <div style={{textAlign:'center'}}>
            <div style={{background:`${P.accent}15`,border:`1px solid ${P.accent}30`,borderRadius:8,padding:'20px'}}>
              <div style={{fontSize:24,marginBottom:8}}>✅</div>
              <div style={{color:P.accent,fontWeight:600}}>Mot de passe mis à jour !</div>
              <div style={{fontSize:11,color:P.muted,marginTop:4}}>Redirection en cours…</div>
            </div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <div style={{fontSize:10,color:P.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Nouveau mot de passe</div>
              <input className="field" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
            </div>
            <div>
              <div style={{fontSize:10,color:P.muted,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>Confirmer</div>
              <input className="field" type="password" placeholder="••••••••" value={confirm} onChange={e=>setConfirm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} />
            </div>
            {err && <div style={{background:`${P.danger}12`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',fontSize:11,color:P.danger}}>⚠ {err}</div>}
            <button className="btn-primary" onClick={submit} disabled={loading} style={{marginTop:4}}>
              {loading ? <span className="spin">⟳</span> : '→ Réinitialiser'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel Abonnements ────────────────────────────────────────────────────────
function AbonnementsPanel({ user, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={onClose}>
      <div className="fadeUp card" style={{width:'100%',maxWidth:900,maxHeight:'90vh',overflowY:'auto',padding:32}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700}}>Abonnements Suivi Mensuel</div>
            <div style={{fontSize:11,color:P.muted,marginTop:4}}>Contrôle continu de vos fournisseurs · Résiliable à tout moment · TVA 20% en sus</div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{fontSize:11,padding:'6px 14px'}}>✕ Fermer</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginTop:24}}>
          {ABONNEMENTS.map((a, i) => (
            <div key={i} className="card" style={{padding:20,border:`1px solid ${a.color}30`,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:P.text}}>{a.label}</div>
                  <div style={{fontSize:10,color:P.muted,marginTop:2}}>{a.desc}</div>
                </div>
                <div style={{background:`${a.color}15`,border:`1px solid ${a.color}30`,borderRadius:6,padding:'4px 8px',fontSize:10,color:a.color,fontWeight:700,whiteSpace:'nowrap'}}>
                  {a.prix}
                </div>
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                {a.features.map((feat, j) => (
                  <div key={j} style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:P.chrome}}>
                    <span style={{color:a.color,fontSize:12}}>✓</span>{feat}
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const url = `${a.link}?prefilled_email=${encodeURIComponent(user?.email||'')}`;
                  window.location.href = url;
                }}
                style={{
                  width:'100%',background:a.color,color:'#000',fontWeight:700,
                  padding:'10px',borderRadius:'6px',fontSize:'11px',
                  letterSpacing:'.06em',textTransform:'uppercase',border:'none',
                  cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",marginTop:4,
                }}
              >
                → S'abonner
              </button>
            </div>
          ))}
        </div>
        <div style={{marginTop:20,fontSize:10,color:P.dim,textAlign:'center'}}>
          🔐 Paiement sécurisé Stripe · Résiliation possible à tout moment · Facture PDF automatique
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, files, onLogout, onReload, showUpload, setShowUpload, activeFile, setActiveFile }) {
  const [showAbonnements, setShowAbonnements] = useState(false);
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  const stats = {
    total:      files.length,
    done:       files.filter(f=>f.status==='done').length,
    processing: files.filter(f=>['analyzing','importing'].includes(f.status)).length,
    error:      files.filter(f=>f.status==='error').length,
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {showAbonnements && <AbonnementsPanel user={user} onClose={()=>setShowAbonnements(false)} />}

      <header style={{borderBottom:`1px solid ${P.border}`,padding:'12px 28px',display:'flex',alignItems:'center',justifyContent:'space-between',background:P.surface,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${P.accent},${P.blue})`,fontSize:16}}>⚡</div>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,letterSpacing:'-.2px'}}>DataRemédiation</div>
            <div style={{fontSize:9,color:P.muted,letterSpacing:'.1em',textTransform:'uppercase'}}>
              Espace client · {user.company}
              {isAdmin && <span style={{marginLeft:8,color:P.accent}}>· ADMIN</span>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button
            onClick={()=>setShowAbonnements(true)}
            style={{background:`${P.accent}15`,border:`1px solid ${P.accent}30`,color:P.accent,padding:'6px 14px',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.06em',textTransform:'uppercase'}}
          >
            📅 Abonnements
          </button>
          <div className="glow" style={{width:6,height:6,borderRadius:'50%',background:P.accent}} />
          <div style={{fontSize:10,color:P.muted,padding:'4px 10px',background:P.card,border:`1px solid ${P.border}`,borderRadius:6}}>{user.email}</div>
          <button className="btn-ghost" onClick={onLogout} style={{fontSize:10,padding:'6px 12px'}}>Déconnexion ↗</button>
        </div>
      </header>

      <div style={{flex:1,padding:'28px',maxWidth:1100,margin:'0 auto',width:'100%'}}>
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

        <div style={{display:'grid',gridTemplateColumns:activeFile?'1fr 400px':'1fr',gap:16}}>
          <div>
            {showUpload ? (
              <UploadZone
                user={user}
                isAdmin={isAdmin}
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
            <ReportPanel file={activeFile} onClose={()=>setActiveFile(null)} userPlan={user?.plan || 'basic'} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UploadZone avec admin bypass ─────────────────────────────────────────────
function UploadZone({ onDone, onCancel, user, isAdmin }) {
  const [dragging,       setDragging]       = useState(false);
  const [file,           setFile]           = useState(null);
  const [errs,           setErrs]           = useState([]);
  const [progress,       setProgress]       = useState(0);
  const [uploading,      setUploading]      = useState(false);
  const [error,          setError]          = useState('');
  const [nbFournisseurs, setNbFournisseurs] = useState(0);
  const [detecting,      setDetecting]      = useState(false);
  const [paid,           setPaid]           = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === 'true') {
      setPaid(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handle = (f) => {
    const e = valFile(f);
    setErrs(e);
    setFile(e.length ? null : f);
    if (!e.length) detectFournisseurs(f);
  };

  const detectFournisseurs = (f) => {
    setDetecting(true);
    const ext = '.' + f.name.split('.').pop().toLowerCase();

    if (ext === '.csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = e.target.result.split('\n').filter(l => l.trim()).length;
        setNbFournisseurs(Math.max(0, lines - 1));
        setDetecting(false);
      };
      reader.readAsText(f);

    } else if (ext === '.xlsx' || ext === '.xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet);
          setNbFournisseurs(rows.length);
        } catch {
          setNbFournisseurs(Math.max(1, Math.round(f.size / 1024 * 3)));
        }
        setDetecting(false);
      };
      reader.readAsArrayBuffer(f);

    } else {
      setNbFournisseurs(Math.max(1, Math.round(f.size / 1024 * 3)));
      setDetecting(false);
    }
  };

  const canUpload = paid || isAdmin;

  const upload = async () => {
    if (!file || !canUpload) return;
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
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600}}>Importer un fichier</div>
          {isAdmin && (
            <span style={{background:`${P.accent}15`,border:`1px solid ${P.accent}30`,borderRadius:4,padding:'2px 8px',fontSize:9,color:P.accent,fontWeight:700,letterSpacing:'.07em'}}>
              MODE DÉMO
            </span>
          )}
        </div>
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
          <div style={{fontSize:11,color:P.muted}}>
            {fmtSize(file.size)}
            {detecting ? ' · Analyse en cours…' : nbFournisseurs > 0 ? ` · ${nbFournisseurs} fournisseurs détectés` : ''}
          </div></>
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

      {file && errs.length === 0 && !uploading && !detecting && (
        <div style={{marginTop:16}}>
          {canUpload ? (
            <div style={{background:'#00e5a015',border:'1px solid #00e5a040',borderRadius:8,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:18}}>{isAdmin ? '🔑' : '✅'}</span>
              <div>
                <div style={{fontSize:12,color:'#00e5a0',fontWeight:700}}>
                  {isAdmin ? 'Accès démo — paiement bypassed' : 'Paiement confirmé'}
                </div>
                <div style={{fontSize:10,color:'#4a5878'}}>Vous pouvez maintenant lancer l'analyse</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{fontSize:10,color:P.muted,marginBottom:8,textAlign:'center',letterSpacing:'.06em',textTransform:'uppercase'}}>
                Étape 1 — Payer pour activer le traitement
              </div>
              <PaymentButton
                userEmail={user?.email}
                fileName={file.name}
                nbFournisseurs={nbFournisseurs}
              />
            </>
          )}
        </div>
      )}

      {file && detecting && (
        <div style={{marginTop:16,textAlign:'center',fontSize:11,color:P.muted}}>
          <span className="spin" style={{marginRight:6}}>⟳</span>Analyse du fichier…
        </div>
      )}

      <button
        className="btn-primary"
        onClick={upload}
        disabled={!file || errs.length > 0 || uploading || !canUpload || detecting}
        style={{marginTop:10,width:'100%',opacity:(!canUpload && file && !detecting) ? 0.35 : 1}}
      >
        {uploading ? (
          <><span className="spin">⟳</span> Upload en cours…</>
        ) : detecting ? (
          '⟳ Analyse du fichier…'
        ) : !canUpload && file ? (
          '🔒 Paiement requis avant l\'import'
        ) : (
          '↑ Importer et analyser'
        )}
      </button>

      {!canUpload && file && !detecting && (
        <div style={{fontSize:10,color:P.muted,textAlign:'center',marginTop:6}}>
          Effectuez le paiement ci-dessus pour débloquer l'import
        </div>
      )}
    </div>
  );
}

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
        <div style={{marginTop:8,fontSize:10,color:P.danger,paddingTop:8,borderTop:`1px solid ${P.border}`,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          ✗ Analyse échouée — cliquez pour voir le rapport
        </div>
      )}
    </div>
  );
}

function ReportPanel({ file, onClose, userPlan }) {
  const [loading, setLoading] = useState('');
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');

  const getLink = async (type) => {
    setLoading(type); setError('');
    try {
      const data = await getDownloadLink(file.id, type);
      window.open(buildDownloadUrl(data.downloadUrl), '_blank');
    } catch(e) { setError(e.message); }
    setLoading('');
  };

  const parseSummary = () => {
    try {
      const raw = file.summary || file.error_message || '';
      if (!raw) return {};
      if (typeof raw === 'object') return raw;
      const str = String(raw);
      const jsonStart = str.indexOf('{');
      if (jsonStart === -1) return {};
      return JSON.parse(str.slice(jsonStart));
    } catch(e) { return {}; }
  };

  const data    = parseSummary();
  const results = data.results || [];
  const summary = data.summary || {};
  const isDone  = file.status === 'done' || results.length > 0;

  const counts = {
    all:      results.length,
    conforme: results.filter(r => (r.statut||'').includes('Conforme')).length,
    corriger: results.filter(r => (r.statut||'').includes('corriger')).length,
    bloquant: results.filter(r => (r.statut||'').includes('Bloquant')).length,
  };

  const filtered = results.filter(r => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'conforme' && (r.statut||'').includes('Conforme')) ||
      (filter === 'corriger' && (r.statut||'').includes('corriger')) ||
      (filter === 'bloquant' && (r.statut||'').includes('Bloquant'));
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.alias||'').toLowerCase().includes(q) ||
      (r.nom_reel||'').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const getTag = (statut='') => {
    if (statut.includes('Conforme')) return { bg:`${P.accent}15`, color:P.accent, border:`${P.accent}30`, icon:'✓', label:'Conforme' };
    if (statut.includes('corriger')) return { bg:`${P.warn}15`,   color:P.warn,   border:`${P.warn}30`,   icon:'⚠', label:'À corriger' };
    return                                  { bg:`${P.danger}15`, color:P.danger, border:`${P.danger}30`, icon:'✗', label:'Bloquant' };
  };

  return (
    <div className="fadeUp card" style={{padding:20,position:'sticky',top:80,maxHeight:'calc(100vh - 100px)',overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600}}>Rapport détaillé</div>
        <button className="btn-ghost" onClick={onClose} style={{fontSize:10,padding:'4px 10px'}}>✕</button>
      </div>
      <div style={{fontSize:11,color:P.muted,marginBottom:16,padding:'8px 10px',background:P.surface,borderRadius:6,border:`1px solid ${P.border}`}}>
        <div style={{fontWeight:600,color:P.text,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{file.original_name}</div>
        <div>{fmtSize(file.file_size)} · {fmtDate(file.uploaded_at)}</div>
        {file.completed_at && <div style={{color:P.accent,marginTop:2}}>✓ Terminé {fmtDate(file.completed_at)}</div>}
      </div>
      {!isDone ? (
        <div style={{textAlign:'center',padding:'32px 0'}}>
          {file.status==='error' ? (
            <><div style={{fontSize:28,marginBottom:8,color:P.danger}}>✗</div>
            <div style={{color:P.danger,fontSize:12}}>Analyse échouée</div>
            <div style={{fontSize:10,color:P.muted,marginTop:8}}>Réessayez en important un nouveau fichier</div></>
          ) : (
            <><div className="spin" style={{fontSize:28,marginBottom:8,color:P.warn}}>◎</div>
            <div style={{color:P.warn,fontSize:12}}>Analyse en cours…</div>
            <div style={{fontSize:10,color:P.muted,marginTop:4}}>Pseudo · Validation · IA Claude</div></>
          )}
        </div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
            {[
              ['Total',      counts.all,      P.blue],
              ['Taux',       `${summary.taux !== undefined ? summary.taux : file.taux_conformite || 0}%`, P.accent],
              ['À corriger', counts.corriger, P.warn],
              ['Bloquants',  counts.bloquant, P.danger],
            ].map(([l,v,c],i)=>(
              <div key={i} style={{background:P.surface,border:`1px solid ${c}20`,borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:9,color:P.muted,textTransform:'uppercase',letterSpacing:'.07em'}}>{l}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:c,marginTop:3}}>{v}</div>
              </div>
            ))}
          </div>
          {results.length > 0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,marginBottom:10}}>
                Détail par fournisseur
                <span style={{fontSize:10,color:P.muted,fontFamily:"'JetBrains Mono',monospace",fontWeight:400,marginLeft:8}}>({results.length})</span>
              </div>
              <input
                style={{width:'100%',background:P.surface,border:`1px solid ${P.border}`,borderRadius:6,padding:'7px 10px',color:P.text,fontSize:11,fontFamily:"'JetBrains Mono',monospace",marginBottom:8,outline:'none'}}
                placeholder="Rechercher nom ou alias…"
                value={search}
                onChange={e=>setSearch(e.target.value)}
              />
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                {[
                  ['all',      `Tous (${counts.all})`,             P.chrome],
                  ['conforme', `✓ Conformes (${counts.conforme})`, P.accent],
                  ['corriger', `⚠ Corriger (${counts.corriger})`,  P.warn],
                  ['bloquant', `✗ Bloquants (${counts.bloquant})`, P.danger],
                ].map(([key,label,color])=>(
                  <button key={key} onClick={()=>setFilter(key)} style={{
                    background: filter===key ? `${color}15` : 'transparent',
                    border: `1px solid ${filter===key ? color+'50' : P.border}`,
                    color: filter===key ? color : P.muted,
                    padding:'3px 9px',borderRadius:4,fontSize:10,cursor:'pointer',
                    fontFamily:"'JetBrains Mono',monospace",transition:'all .15s'
                  }}>{label}</button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {filtered.length === 0 ? (
                  <div style={{textAlign:'center',padding:'20px 0',color:P.muted,fontSize:11}}>Aucun résultat</div>
                ) : filtered.map((r,i) => {
                  const tag = getTag(r.statut||'');
                  return (
                    <div key={i} style={{background:P.surface,border:`1px solid ${tag.border}`,borderRadius:8,padding:'10px 12px',borderLeft:`3px solid ${tag.color}`}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:600,color:P.text,fontSize:11}}>{r.nom_reel || r.alias}</div>
                          <div style={{fontSize:10,color:P.muted,marginTop:1}}>{r.alias}</div>
                        </div>
                        <span style={{background:tag.bg,color:tag.color,border:`1px solid ${tag.border}`,borderRadius:4,padding:'2px 7px',fontSize:9,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',flexShrink:0}}>
                          {tag.icon} {tag.label}
                        </span>
                      </div>
                      <div style={{display:'flex',gap:10,marginBottom:4}}>
                        <span style={{fontSize:10,color:r.siret_ok?P.accent:P.danger}}>{r.siret_ok?'✓':'✗'} SIRET/SIREN</span>
                        <span style={{fontSize:10,color:r.tva_ok?P.accent:P.danger}}>{r.tva_ok?'✓':'✗'} TVA</span>
                        {r.siren_coherent === false && <span style={{fontSize:10,color:P.danger}}>✗ SIREN incohérent</span>}
                      </div>
                      {(r.erreurs||[]).map((e,j)=>(
                        <div key={j} style={{fontSize:10,color:P.danger,marginTop:2}}>✗ {e}</div>
                      ))}
                      {r.suggestion && (
                        <div style={{fontSize:10,color:r.statut?.includes('Conforme')?P.accent:P.muted,marginTop:4,paddingTop:4,borderTop:`1px solid ${P.border}`,fontStyle:'italic'}}>
                          → {r.suggestion}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:14}}>
            <div style={{fontSize:10,color:P.muted,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:12}}>Téléchargements sécurisés</div>
            {error && <div style={{background:`${P.danger}10`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'8px 10px',marginBottom:10,fontSize:11,color:P.danger}}>✗ {error}</div>}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {results.length > 0 && (
                <button onClick={()=>getLink('csv')} disabled={loading==='csv'} style={{display:'flex',alignItems:'center',gap:8,background:`${P.accent}12`,border:`1px solid ${P.accent}30`,borderRadius:7,padding:'10px 14px',color:P.accent,fontSize:12,cursor:'pointer',fontFamily:"'JetBrains Mono'"}}>
                  {loading==='csv' ? <span className="spin">⟳</span> : <span>↓</span>}
                  <div style={{flex:1,textAlign:'left'}}>
                    <div style={{fontWeight:600}}>Fichier Excel corrigé</div>
                    <div style={{fontSize:9,color:P.accentDim,marginTop:1}}>CSV · Données nettoyées · Lien 15 min</div>
                  </div>
                </button>
              )}
              <button onClick={()=>getLink('pdf')} disabled={loading==='pdf'} style={{display:'flex',alignItems:'center',gap:8,background:`${P.blue}12`,border:`1px solid ${P.blue}30`,borderRadius:7,padding:'10px 14px',color:P.blue,fontSize:12,cursor:'pointer',fontFamily:"'JetBrains Mono'"}}>
                {loading==='pdf' ? <span className="spin">⟳</span> : <span>↓</span>}
                <div style={{flex:1,textAlign:'left'}}>
                  <div style={{fontWeight:600}}>Rapport complet</div>
                  <div style={{fontSize:9,color:'#2a5aaa',marginTop:1}}>Conformité e-Invoicing · Lien 15 min</div>
                </div>
              </button>
            </div>
            <div style={{marginTop:10,fontSize:9,color:P.dim}}>🔐 Liens signés JWT · 15 min · Via backend sécurisé</div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="card fadeUp" style={{padding:'60px 40px',textAlign:'center',borderStyle:'dashed'}}>
      <div style={{fontSize:48,marginBottom:16,color:P.dim}}>⊙</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600,marginBottom:8}}>Aucun fichier importé</div>
      <div style={{fontSize:12,color:P.muted,marginBottom:24,lineHeight:1.7}}>Importez vos fichiers fournisseurs pour démarrer<br/>un audit de conformité e-Invoicing 2026.</div>
      <button className="btn-primary" onClick={onUpload}>+ Importer un premier fichier</button>
    </div>
  );
}

    
