import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  register, login, logout,
  listFiles, uploadFile, deleteFile,
  getDownloadLink, buildDownloadUrl, restoreSession,
  getCredits,
} from './api';
import { PaymentButton } from './components/PaymentButton';
import { RectificationPanel } from './components/RectificationPanel';

const MAX_SIZE_MB    = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXT    = ['.csv', '.xlsx', '.xls', '.pdf'];
const ADMIN_EMAILS   = ['deangelis.albert@gmail.com'];

const P = {
  bg:'#06080f',surface:'#0b0e18',card:'#0f1220',
  border:'#161c2e',borderHi:'#1e2a42',
  accent:'#00e5a0',accentDim:'#00b07a',
  blue:'#3d8eff',warn:'#ffb340',danger:'#ff4566',
  text:'#c8d4ee',muted:'#4a5878',dim:'#2a3450',chrome:'#8899cc',
};

const API_URL = import.meta.env.VITE_API_URL || 'https://dataremediation-backend-production.up.railway.app';

const ABONNEMENTS = [
  { label:'Starter', prix:'249 € HT/mois', desc:'Jusqu\'à 50 fournisseurs', features:['Contrôle SIRET mensuel','Validation TVA','Rapport PDF','Support email'], link:'https://buy.stripe.com/cNi00c9RRcb74mmeptfQI05', color:'#00e5a0' },
  { label:'PME BTP', prix:'459 € HT/mois', desc:'51 à 200 fournisseurs', features:['Contrôle SIRET mensuel','Validation TVA','Détection doublons','Rapport PDF','Support prioritaire'], link:'https://buy.stripe.com/8x214g2pp7UR3ii1CHfQI06', color:'#3d8eff' },
  { label:'PME Structurée', prix:'890 € HT/mois', desc:'201 à 500 fournisseurs', features:['Contrôle SIRET mensuel','Validation TVA','Détection doublons','Scoring conformité','Rapport PDF avancé','Support dédié'], link:'https://buy.stripe.com/3cIaEQfcbcb7dWWchlfQI07', color:'#ffb340' },
  { label:'Cabinet Comptable', prix:'1 990 € HT/mois', desc:'Portefeuille clients illimité', features:['Multi-clients','Contrôle SIRET mensuel','Validation TVA','Détection doublons','Tableaux de bord','Rapports PDF white-label','Account manager dédié'], link:'https://buy.stripe.com/28EfZae87grn0664OTfQI08', color:'#ff4566' },
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

// ── LANDING PAGE ──────────────────────────────────────────────────────────────
function LandingPage({ onEnter }) {
  const landingStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
    .lp-nav { position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:24px 48px;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(13,15,20,0.9);backdrop-filter:blur(16px); }
    .lp-logo { font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:500;color:#F5F3EE;letter-spacing:0.02em; }
    .lp-logo span { color:#C9A84C; }
    .lp-nav-btn { font-size:0.78rem;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;border:1px solid rgba(201,168,76,0.3);padding:10px 28px;cursor:pointer;background:transparent;transition:all 0.25s ease;font-family:'DM Sans',sans-serif; }
    .lp-nav-btn:hover { background:#C9A84C;color:#0D0F14;border-color:#C9A84C; }
    .lp-hero { position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:140px 48px 80px;max-width:860px; }
    .lp-eyebrow { font-family:'DM Sans',sans-serif;font-size:0.72rem;letter-spacing:0.22em;text-transform:uppercase;color:#C9A84C;margin-bottom:32px;display:flex;align-items:center;gap:14px;opacity:0;animation:lpFadeUp 0.7s ease 0.1s forwards; }
    .lp-eyebrow::before { content:'';display:block;width:36px;height:1px;background:#C9A84C;flex-shrink:0; }
    .lp-title { font-family:'Playfair Display',serif;font-size:clamp(2.6rem,5.5vw,4.8rem);font-weight:400;line-height:1.1;letter-spacing:-0.02em;color:#F5F3EE;margin-bottom:36px;opacity:0;animation:lpFadeUp 0.8s ease 0.25s forwards; }
    .lp-title em { font-style:italic;color:#C9A84C; }
    .lp-subtitle { font-family:'DM Sans',sans-serif;font-size:1.05rem;font-weight:300;line-height:1.75;color:#7A7A85;max-width:540px;margin-bottom:20px;opacity:0;animation:lpFadeUp 0.8s ease 0.4s forwards; }
    .lp-urgence { font-family:'DM Sans',sans-serif;font-size:0.82rem;font-weight:500;color:#C9A84C;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-left:3px solid #C9A84C;padding:10px 16px;margin-bottom:44px;max-width:540px;letter-spacing:0.01em;opacity:0;animation:lpFadeUp 0.8s ease 0.5s forwards; }
    .lp-actions { display:flex;align-items:center;gap:24px;opacity:0;animation:lpFadeUp 0.8s ease 0.6s forwards; }
    .lp-btn-primary { background:#C9A84C;color:#0D0F14;border:none;padding:17px 44px;font-family:'DM Sans',sans-serif;font-size:0.85rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;transition:all 0.25s ease; }
    .lp-btn-primary:hover { transform:translateY(-2px);box-shadow:0 10px 36px rgba(201,168,76,0.3); }
    .lp-btn-link { font-family:'DM Sans',sans-serif;font-size:0.85rem;color:#5A5A65;background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;transition:color 0.2s; }
    .lp-btn-link:hover { color:#F5F3EE; }
    .lp-problem { position:relative;z-index:1;padding:80px 48px;border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(201,168,76,0.03); }
    .lp-problem-label { font-family:'DM Sans',sans-serif;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;margin-bottom:20px; }
    .lp-problem-title { font-family:'Playfair Display',serif;font-size:clamp(1.6rem,3vw,2.4rem);font-weight:400;color:#F5F3EE;line-height:1.2;max-width:640px;margin-bottom:40px; }
    .lp-problem-title em { font-style:italic;color:#C9A84C; }
    .lp-risks { display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06); }
    .lp-risk { padding:28px 24px;background:#0D0F14; }
    .lp-risk-icon { font-size:1.4rem;margin-bottom:12px; }
    .lp-risk-title { font-family:'DM Sans',sans-serif;font-size:0.88rem;font-weight:500;color:#F5F3EE;margin-bottom:8px; }
    .lp-risk-text { font-family:'DM Sans',sans-serif;font-size:0.8rem;line-height:1.65;color:#5A5A65; }
    .lp-features { position:relative;z-index:1;display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05); }
    .lp-feature { padding:52px 40px;border-right:1px solid rgba(255,255,255,0.05); }
    .lp-feature:last-child { border-right:none; }
    .lp-feature-num { font-family:'Playfair Display',serif;font-size:2.2rem;color:#C9A84C;opacity:0.25;line-height:1;margin-bottom:20px; }
    .lp-feature-title { font-family:'Playfair Display',serif;font-size:1.05rem;color:#F5F3EE;margin-bottom:12px;line-height:1.3; }
    .lp-feature-text { font-family:'DM Sans',sans-serif;font-size:0.85rem;line-height:1.8;color:#5A5A65;font-weight:300; }
    .lp-feature-gain { margin-top:20px;font-family:'DM Sans',sans-serif;font-size:0.75rem;font-weight:500;color:#C9A84C;letter-spacing:0.04em; }
    .lp-cta { position:relative;z-index:1;text-align:center;padding:100px 48px 88px;border-top:1px solid rgba(255,255,255,0.05); }
    .lp-cta-label { font-family:'DM Sans',sans-serif;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;color:#C9A84C;margin-bottom:20px; }
    .lp-cta-title { font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3.2rem);font-weight:400;color:#F5F3EE;margin-bottom:16px;line-height:1.15; }
    .lp-cta-title em { font-style:italic;color:#C9A84C; }
    .lp-cta-sub { font-family:'DM Sans',sans-serif;font-size:0.95rem;color:#5A5A65;margin-bottom:44px;font-weight:300; }
    .lp-footer { position:relative;z-index:1;padding:24px 48px;border-top:1px solid rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:space-between; }
    .lp-footer-logo { font-family:'Playfair Display',serif;font-size:0.9rem;color:#3A3A45; }
    .lp-footer-text { font-family:'DM Sans',sans-serif;font-size:0.75rem;color:#2A2A35; }
    @keyframes lpFadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @media (max-width:768px) {
      .lp-nav{padding:20px 24px} .lp-hero{padding:120px 24px 60px} .lp-problem{padding:60px 24px}
      .lp-risks{grid-template-columns:1fr} .lp-features{grid-template-columns:1fr}
      .lp-feature{border-right:none;border-bottom:1px solid rgba(255,255,255,0.05);padding:40px 24px}
      .lp-cta{padding:72px 24px 64px} .lp-footer{flex-direction:column;gap:8px;padding:24px;text-align:center}
    }
  `;

  return (
    <div style={{minHeight:'100vh',background:'#0D0F14',position:'relative',overflow:'hidden'}}>
      <style>{landingStyles}</style>
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,background:'radial-gradient(ellipse 70% 50% at 75% -5%,rgba(201,168,76,0.06) 0%,transparent 55%),radial-gradient(ellipse 40% 30% at -5% 85%,rgba(201,168,76,0.04) 0%,transparent 50%)'}} />
      <nav className="lp-nav">
        <div className="lp-logo">Data<span>Remédiation</span></div>
        <button className="lp-nav-btn" onClick={onEnter}>Espace client</button>
      </nav>
      <section className="lp-hero">
        <div className="lp-eyebrow">Cabinets comptables · Réforme 2026</div>
        <h1 className="lp-title">Vos clients sont-ils prêts<br />pour la <em>facturation électronique</em> ?</h1>
        <p className="lp-subtitle">Nous aidons les cabinets à auditer et fiabiliser automatiquement les bases fournisseurs de leurs clients — avant que la réforme ne rende chaque erreur bloquante.</p>
        <div className="lp-urgence">⚠ Obligation généralisée dès 2026 · Une base fournisseurs non fiabilisée = des factures rejetées</div>
        <div className="lp-actions">
          <button className="lp-btn-primary" onClick={onEnter}>Accéder à l'espace client</button>
          <button className="lp-btn-link" onClick={()=>document.getElementById('lp-problem')?.scrollIntoView({behavior:'smooth'})}>Comprendre l'enjeu →</button>
        </div>
      </section>
      <section className="lp-problem" id="lp-problem">
        <div className="lp-problem-label">Le problème concret</div>
        <h2 className="lp-problem-title">Une base fournisseurs non vérifiée,<br />c'est un <em>risque opérationnel immédiat</em>.</h2>
        <div className="lp-risks">
          {[
            {icon:'🚫',title:'SIRET invalide ou radié',text:"Un fournisseur avec un SIRET incorrect sera rejeté automatiquement par la Plateforme Publique de Facturation. Sans correction préalable, la facture ne passe pas."},
            {icon:'⚠️',title:'TVA intracommunautaire erronée',text:"Un numéro de TVA non validé sur VIES bloque la déductibilité. Le cabinet engage sa responsabilité si l'erreur n'est pas détectée en amont."},
            {icon:'📋',title:'Données manquantes ou doublons',text:"Des champs obligatoires absents ou des doublons dans la base ralentissent le traitement et multiplient les rejets en cascade dès la mise en conformité."},
          ].map((r,i)=>(
            <div className="lp-risk" key={i}>
              <div className="lp-risk-icon">{r.icon}</div>
              <div className="lp-risk-title">{r.title}</div>
              <p className="lp-risk-text">{r.text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="lp-features" id="lp-features">
        {[
          {n:'01',title:'Audit automatique de la base fournisseurs',text:"Importez le fichier fournisseurs de votre client. En quelques minutes, chaque ligne est contrôlée : SIRET actif, TVA valide, cohérence des données, doublons détectés.",gain:'→ Gain : 0 heure de vérification manuelle'},
          {n:'02',title:'Rapport de conformité prêt à livrer',text:"Chaque anomalie est expliquée, classée par niveau de risque (bloquant / à corriger / conforme) et exportée en PDF ou Excel — directement transmissible au client.",gain:'→ Gain : un livrable professionnel en un clic'},
          {n:'03',title:'Traçabilité complète pour le cabinet',text:"Historique de tous les audits par client, date, et version. Vous gardez la main sur chaque correction validée — pour vos obligations de conseil et votre couverture juridique.",gain:'→ Gain : preuve de diligence horodatée'},
        ].map(f=>(
          <div className="lp-feature" key={f.n}>
            <div className="lp-feature-num">{f.n}</div>
            <div className="lp-feature-title">{f.title}</div>
            <p className="lp-feature-text">{f.text}</p>
            <div className="lp-feature-gain">{f.gain}</div>
          </div>
        ))}
      </section>
      <section className="lp-cta">
        <div className="lp-cta-label">Prendre de l'avance</div>
        <h2 className="lp-cta-title">Le bon moment, c'est<br /><em>avant</em> que la réforme s'applique.</h2>
        <p className="lp-cta-sub">Accédez à votre espace pour auditer la première base fournisseurs de vos clients.</p>
        <button className="lp-btn-primary" onClick={onEnter}>Accéder à l'espace client</button>
      </section>
      <footer className="lp-footer">
        <div className="lp-footer-logo">DataRemédiation</div>
        <div className="lp-footer-text">© 2026 · Conçu pour les cabinets comptables</div>
      </footer>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user,   setUser]   = useState(null);
  const [files,  setFiles]  = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (resetToken) { setScreen('reset-password'); return; }
    if (window.location.pathname === '/' && !params.get('paid')) {
      restoreSession().then(u => {
        if (u) { setUser(u); setScreen('dashboard'); }
        else    setScreen('landing');
      });
    } else {
      restoreSession().then(u => {
        if (u) { setUser(u); setScreen('dashboard'); }
        else    setScreen('login');
      });
    }
    const handler = () => { setUser(null); setFiles([]); setScreen('landing'); };
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
    setUser(null); setFiles([]); setScreen('landing');
  };

  if (screen === 'loading')  return <Shell><LoadingScreen /></Shell>;
  if (screen === 'landing')  return <LandingPage onEnter={() => setScreen('login')} />;

  return (
    <Shell>
      {(screen==='login'||screen==='register') && (
        <AuthScreen mode={screen} onSuccess={handleLogin}
          onSwitch={() => setScreen(screen==='login'?'register':'login')}
          onForgot={() => setScreen('forgot-password')}
          onBack={() => setScreen('landing')} />
      )}
      {screen === 'forgot-password' && <ForgotPasswordScreen onBack={() => setScreen('login')} />}
      {screen === 'reset-password' && (
        <ResetPasswordScreen onSuccess={() => { window.history.replaceState({}, '', '/'); setScreen('login'); }} />
      )}
      {screen === 'dashboard' && (
        <Dashboard user={user} files={files}
          onLogout={handleLogout} onReload={loadFiles}
          showUpload={showUpload} setShowUpload={setShowUpload}
          activeFile={activeFile} setActiveFile={setActiveFile} />
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

function AuthScreen({ mode, onSuccess, onSwitch, onForgot, onBack }) {
  const [form, setForm] = useState({company:'',email:'',password:'',confirm:''});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
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
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${P.accent}60,transparent)`,pointerEvents:'none'}} />
        <button onClick={onBack} style={{background:'none',border:'none',color:P.muted,fontSize:10,cursor:'pointer',padding:0,marginBottom:20,display:'flex',alignItems:'center',gap:4,fontFamily:"'JetBrains Mono',monospace"}}>
          ← Retour à l'accueil
        </button>
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
                <button onClick={onForgot} style={{background:'none',border:'none',color:P.muted,fontSize:10,cursor:'pointer',padding:0,textDecoration:'underline'}}>Mot de passe oublié ?</button>
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
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!email) return setErr('Email requis');
    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
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
              <div style={{fontSize:11,color:P.muted}}>Vérifiez votre boîte mail et cliquez sur le lien.</div>
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
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const token = new URLSearchParams(window.location.search).get('token');

  const submit = async () => {
    if (password.length < 8) return setErr('Mot de passe trop court (8 caractères min)');
    if (password !== confirm) return setErr('Les mots de passe ne correspondent pas');
    setLoading(true); setErr('');
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method:'POST', headers:{'Content-Type':'application/json'},
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

function AbonnementsPanel({ user, onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:24}} onClick={onClose}>
      <div className="fadeUp card" style={{width:'100%',maxWidth:900,maxHeight:'90vh',overflowY:'auto',padding:32}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700}}>Abonnements Suivi Mensuel</div>
            <div style={{fontSize:11,color:P.muted,marginTop:4}}>Contrôle continu · Résiliable à tout moment · TVA 20% en sus</div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{fontSize:11,padding:'6px 14px'}}>✕ Fermer</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginTop:24}}>
          {ABONNEMENTS.map((a,i)=>(
            <div key={i} className="card" style={{padding:20,border:`1px solid ${a.color}30`,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:P.text}}>{a.label}</div>
                  <div style={{fontSize:10,color:P.muted,marginTop:2}}>{a.desc}</div>
                </div>
                <div style={{background:`${a.color}15`,border:`1px solid ${a.color}30`,borderRadius:6,padding:'4px 8px',fontSize:10,color:a.color,fontWeight:700,whiteSpace:'nowrap'}}>{a.prix}</div>
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                {a.features.map((feat,j)=>(
                  <div key={j} style={{display:'flex',alignItems:'center',gap:6,fontSize:10,color:P.chrome}}>
                    <span style={{color:a.color,fontSize:12}}>✓</span>{feat}
                  </div>
                ))}
              </div>
              <button onClick={()=>{window.location.href=`${a.link}?prefilled_email=${encodeURIComponent(user?.email||'')}`;}}
                style={{width:'100%',background:a.color,color:'#000',fontWeight:700,padding:'10px',borderRadius:'6px',fontSize:'11px',letterSpacing:'.06em',textTransform:'uppercase',border:'none',cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",marginTop:4}}>
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

function CreditsWidget({ credits, onOpenAbonnements }) {
  if (!credits) return null;
  const { credits: nbCredits, abonnement, abonnement_fournisseurs_restants, abonnement_quota, abonnement_reset_date } = credits;
  if (abonnement) {
    const resetDate = abonnement_reset_date ? new Date(abonnement_reset_date).toLocaleDateString('fr-FR') : '';
    const pct = abonnement_quota > 0 ? Math.round((abonnement_fournisseurs_restants / abonnement_quota) * 100) : 0;
    const color = pct > 50 ? P.accent : pct > 20 ? P.warn : P.danger;
    return (
      <div style={{background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'6px 12px',fontSize:10,display:'flex',alignItems:'center',gap:8}}>
        <div>
          <div style={{color:P.muted,textTransform:'uppercase',letterSpacing:'.06em',fontSize:9}}>Abonnement {abonnement}</div>
          <div style={{color,fontWeight:700}}>{abonnement_fournisseurs_restants} / {abonnement_quota} fournisseurs restants</div>
          {resetDate && <div style={{color:P.dim,fontSize:9}}>Reset le {resetDate}</div>}
        </div>
        <div style={{width:6,height:6,borderRadius:'50%',background:color}} />
      </div>
    );
  }
  if (nbCredits > 0) {
    return (
      <div style={{background:P.card,border:`1px solid ${P.accent}30`,borderRadius:6,padding:'6px 12px',fontSize:10,display:'flex',alignItems:'center',gap:6}}>
        <span style={{color:P.accent,fontWeight:700}}>💳 {nbCredits} crédit{nbCredits>1?'s':''}</span>
        <span style={{color:P.muted}}>disponible{nbCredits>1?'s':''}</span>
      </div>
    );
  }
  return (
    <button onClick={onOpenAbonnements} style={{background:`${P.danger}15`,border:`1px solid ${P.danger}30`,color:P.danger,padding:'6px 12px',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>
      ⚠ Aucun crédit — S'abonner
    </button>
  );
}

function Dashboard({ user, files, onLogout, onReload, showUpload, setShowUpload, activeFile, setActiveFile }) {
  const [showAbonnements,   setShowAbonnements]   = useState(false);
  const [showRectification, setShowRectification] = useState(false);
  const [credits, setCredits] = useState(null);
  const isAdmin = ADMIN_EMAILS.includes(user?.email);

  useEffect(() => {
    if (!isAdmin) { getCredits().then(setCredits).catch(()=>{}); }
  }, [isAdmin, showUpload]);

  const stats = {
    total:      files.length,
    done:       files.filter(f=>f.status==='done').length,
    processing: files.filter(f=>['analyzing','importing'].includes(f.status)).length,
    error:      files.filter(f=>f.status==='error').length,
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {showAbonnements   && <AbonnementsPanel user={user} onClose={()=>setShowAbonnements(false)} />}
      {showRectification && <RectificationPanel onClose={()=>setShowRectification(false)} />}

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
          {!isAdmin && <CreditsWidget credits={credits} onOpenAbonnements={()=>setShowAbonnements(true)} />}
          <button onClick={()=>setShowRectification(true)} style={{background:`${P.blue}15`,border:`1px solid ${P.blue}30`,color:P.blue,padding:'6px 14px',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.06em',textTransform:'uppercase'}}>
            ⚡ Rectifier
          </button>
          <button onClick={()=>setShowAbonnements(true)} style={{background:`${P.accent}15`,border:`1px solid ${P.accent}30`,color:P.accent,padding:'6px 14px',borderRadius:6,fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace",letterSpacing:'.06em',textTransform:'uppercase'}}>
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
              <UploadZone user={user} isAdmin={isAdmin} credits={credits}
                onDone={async()=>{setShowUpload(false);await onReload();getCredits().then(setCredits).catch(()=>{});}}
                onCancel={()=>setShowUpload(false)} />
            ) : (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600}}>Mes fichiers</div>
                  <button className="btn-primary" onClick={()=>setShowUpload(true)} style={{fontSize:11,padding:'9px 20px'}}>+ Nouveau fichier</button>
                </div>
                {files.length===0 ? (
                  <EmptyState onUpload={()=>setShowUpload(true)} />
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {files.map(f=>(
                      <FileRow key={f.id} file={f}
                        isActive={activeFile?.id===f.id}
                        onClick={()=>setActiveFile(activeFile?.id===f.id?null:f)}
                        onDelete={async()=>{
                          await deleteFile(f.id).catch(()=>{});
                          if(activeFile?.id===f.id) setActiveFile(null);
                          onReload();
                        }} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {activeFile && !showUpload && (
            <ReportPanel file={activeFile} onClose={()=>setActiveFile(null)} userPlan={user?.plan||'basic'} />
          )}
        </div>
      </div>
    </div>
  );
}

function UploadZone({ onDone, onCancel, user, isAdmin, credits }) {
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
    if (params.get('paid')==='true') {
      setPaid(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const hasCredits = isAdmin || (credits && (credits.credits>0 || credits.abonnement));
  const canUpload  = isAdmin || paid || hasCredits;

  const handle = (f) => {
    const e = valFile(f);
    setErrs(e);
    setFile(e.length ? null : f);
    if (!e.length) detectFournisseurs(f);
  };

  const detectFournisseurs = (f) => {
    setDetecting(true);
    const ext = '.'+f.name.split('.').pop().toLowerCase();
    if (ext==='.csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const lines = e.target.result.split('\n').filter(l=>l.trim()).length;
        setNbFournisseurs(Math.max(0,lines-1));
        setDetecting(false);
      };
      reader.readAsText(f);
    } else if (ext==='.xlsx'||ext==='.xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, {type:'array'});
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet);
          setNbFournisseurs(rows.length);
        } catch { setNbFournisseurs(Math.max(1,Math.round(f.size/1024*3))); }
        setDetecting(false);
      };
      reader.readAsArrayBuffer(f);
    } else {
      setNbFournisseurs(Math.max(1,Math.round(f.size/1024*3)));
      setDetecting(false);
    }
  };

  const upload = async () => {
    if (!file||!canUpload) return;
    setUploading(true); setError('');
    try {
      await uploadFile(file, setProgress, nbFournisseurs);
      await onDone();
    } catch(e) { setError(e.message); setUploading(false); }
  };

  return (
    <div className="fadeUp card" style={{padding:24,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600}}>Importer un fichier</div>
          {isAdmin && <span style={{background:`${P.accent}15`,border:`1px solid ${P.accent}30`,borderRadius:4,padding:'2px 8px',fontSize:9,color:P.accent,fontWeight:700,letterSpacing:'.07em'}}>MODE DEMO</span>}
        </div>
        <button className="btn-ghost" onClick={onCancel} style={{fontSize:11,padding:'5px 12px'}}>x Annuler</button>
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
          <>
            <div style={{fontSize:32,marginBottom:8}}>{file.name.endsWith('.pdf')?'📄':'📊'}</div>
            <div style={{color:P.accent,fontWeight:600,marginBottom:4}}>{file.name}</div>
            <div style={{fontSize:11,color:P.muted}}>
              {fmtSize(file.size)}
              {detecting?' · Analyse en cours…':nbFournisseurs>0?` · ${nbFournisseurs} fournisseurs detectes`:''}
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize:36,marginBottom:10,color:P.dim}}>+</div>
            <div style={{color:P.chrome,marginBottom:6,fontWeight:500}}>Glisser-deposer ou cliquer</div>
            <div style={{fontSize:11,color:P.muted}}>CSV · XLSX · XLS · PDF — max {MAX_SIZE_MB} Mo</div>
          </>
        )}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12}}>
        {[['🔒','Chiffrement TLS en transit'],['🗑️','Suppression auto 48h'],['🔏','Pseudo avant IA'],['🌐','Backend securise — cle cachee']].map(([i,l],k)=>(
          <div key={k} style={{display:'flex',alignItems:'center',gap:6,background:P.surface,border:`1px solid ${P.border}`,borderRadius:6,padding:'7px 10px',fontSize:10,color:P.muted}}><span style={{fontSize:13}}>{i}</span>{l}</div>
        ))}
      </div>
      {errs.length>0 && <div style={{background:`${P.danger}10`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',marginTop:12}}>{errs.map((e,i)=><div key={i} style={{fontSize:11,color:P.danger}}>x {e}</div>)}</div>}
      {error && <div style={{background:`${P.danger}10`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',marginTop:12,fontSize:11,color:P.danger}}>x {error}</div>}
      {uploading && (
        <div style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:P.muted,marginBottom:5}}><span>Upload securise…</span><span>{progress}%</span></div>
          <div style={{height:3,background:P.border,borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${progress}%`,background:`linear-gradient(90deg,${P.accent},${P.blue})`,transition:'width .15s'}} />
          </div>
        </div>
      )}
      {file && errs.length===0 && !uploading && !detecting && (
        <div style={{marginTop:16}}>
          {canUpload ? (
            <div style={{background:'#00e5a015',border:'1px solid #00e5a040',borderRadius:8,padding:'12px 16px',display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:18}}>{isAdmin?'🔑':'✅'}</span>
              <div>
                <div style={{fontSize:12,color:'#00e5a0',fontWeight:700}}>
                  {isAdmin?'Acces demo — paiement bypassed':hasCredits?'Credit disponible — pret a analyser':'Paiement confirme'}
                </div>
                <div style={{fontSize:10,color:'#4a5878'}}>Vous pouvez maintenant lancer l'analyse</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{fontSize:10,color:P.muted,marginBottom:8,textAlign:'center',letterSpacing:'.06em',textTransform:'uppercase'}}>
                Etape 1 — Payer pour activer le traitement
              </div>
              <PaymentButton userEmail={user?.email} fileName={file.name} nbFournisseurs={nbFournisseurs} />
            </>
          )}
        </div>
      )}
      {file && detecting && (
        <div style={{marginTop:16,textAlign:'center',fontSize:11,color:P.muted}}>
          <span style={{marginRight:6}}>⟳</span>Analyse du fichier…
        </div>
      )}
      <button className="btn-primary" onClick={upload}
        disabled={!file||errs.length>0||uploading||!canUpload||detecting}
        style={{marginTop:10,width:'100%',opacity:(!canUpload&&file&&!detecting)?0.35:1}}>
        {uploading?'⟳ Upload en cours…':detecting?'⟳ Analyse du fichier…':!canUpload&&file?'🔒 Paiement requis':'Importer et analyser'}
      </button>
      {!canUpload && file && !detecting && (
        <div style={{fontSize:10,color:P.muted,textAlign:'center',marginTop:6}}>
          Effectuez le paiement ci-dessus pour debloquer l'import
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
        <button className="btn-danger" onClick={e=>{e.stopPropagation();onDelete();}} style={{padding:'5px 10px',fontSize:10,flexShrink:0}}>x</button>
      </div>
      {file.status==='analyzing' && (
        <div style={{marginTop:10,height:2,background:P.border,borderRadius:1,overflow:'hidden'}}>
          <div style={{height:'100%',background:`linear-gradient(90deg,${P.accent},${P.blue})`,animation:'progressFill 3s ease-in-out infinite'}} />
        </div>
      )}
      {file.status==='error' && file.error_message && (
        <div style={{marginTop:8,fontSize:10,color:P.danger,paddingTop:8,borderTop:`1px solid ${P.border}`,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
          x Analyse echouee — cliquez pour voir le rapport
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
      if (jsonStart===-1) return {};
      return JSON.parse(str.slice(jsonStart));
    } catch(e) { return {}; }
  };

  const data    = parseSummary();
  const results = data.results || [];
  const summary = data.summary || {};
  const isDone  = file.status==='done' || results.length>0;

  const counts = {
    all:      results.length,
    conforme: results.filter(r=>(r.statut||'').includes('Conforme')).length,
    corriger: results.filter(r=>(r.statut||'').includes('corriger')).length,
    bloquant: results.filter(r=>(r.statut||'').includes('Bloquant')).length,
  };

  const filtered = results.filter(r => {
    const matchFilter = filter==='all'||
      (filter==='conforme'&&(r.statut||'').includes('Conforme'))||
      (filter==='corriger'&&(r.statut||'').includes('corriger'))||
      (filter==='bloquant'&&(r.statut||'').includes('Bloquant'));
    const q = search.toLowerCase();
    const matchSearch = !q||(r.alias||'').toLowerCase().includes(q)||(r.nom_reel||'').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const getTag = (statut='') => {
    if (statut.includes('Conforme')) return {bg:`${P.accent}15`,color:P.accent,border:`${P.accent}30`,icon:'✓',label:'Conforme'};
    if (statut.includes('corriger')) return {bg:`${P.warn}15`,color:P.warn,border:`${P.warn}30`,icon:'⚠',label:'A corriger'};
    return {bg:`${P.danger}15`,color:P.danger,border:`${P.danger}30`,icon:'x',label:'Bloquant'};
  };

  return (
    <div className="fadeUp card" style={{padding:20,position:'sticky',top:80,maxHeight:'calc(100vh - 100px)',overflowY:'auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600}}>Rapport detaille</div>
        <button className="btn-ghost" onClick={onClose} style={{fontSize:10,padding:'4px 10px'}}>x</button>
      </div>
      <div style={{fontSize:11,color:P.muted,marginBottom:16,padding:'8px 10px',background:P.surface,borderRadius:6,border:`1px solid ${P.border}`}}>
        <div style={{fontWeight:600,color:P.text,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{file.original_name}</div>
        <div>{fmtSize(file.file_size)} · {fmtDate(file.uploaded_at)}</div>
        {file.completed_at && <div style={{color:P.accent,marginTop:2}}>✓ Termine {fmtDate(file.completed_at)}</div>}
      </div>
      {!isDone ? (
        <div style={{textAlign:'center',padding:'32px 0'}}>
          {file.status==='error' ? (
            <>
              <div style={{fontSize:28,marginBottom:8,color:P.danger}}>x</div>
              <div style={{color:P.danger,fontSize:12}}>Analyse echouee</div>
              <div style={{fontSize:10,color:P.muted,marginTop:8}}>Reessayez en important un nouveau fichier</div>
            </>
          ) : (
            <>
              <div style={{fontSize:28,marginBottom:8,color:P.warn}}>◎</div>
              <div style={{color:P.warn,fontSize:12}}>Analyse en cours…</div>
              <div style={{fontSize:10,color:P.muted,marginTop:4}}>Pseudo · Validation · IA Claude</div>
            </>
          )}
        </div>
      ) : (
        <>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            {[
              ['Total',      counts.all,      P.blue],
              ['Taux',       `${summary.taux!==undefined?summary.taux:file.taux_conformite||0}%`, P.accent],
              ['A corriger', counts.corriger, P.warn],
              ['Bloquants',  counts.bloquant, P.danger],
            ].map(([l,v,c],i)=>(
              <div key={i} style={{background:P.surface,border:`1px solid ${c}20`,borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:9,color:P.muted,textTransform:'uppercase',letterSpacing:'.07em'}}>{l}</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:c,marginTop:3}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:14,marginBottom:16}}>
            <div style={{fontSize:10,color:P.muted,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:10}}>Telechargements securises</div>
            {error && <div style={{background:`${P.danger}10`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'8px 10px',marginBottom:10,fontSize:11,color:P.danger}}>x {error}</div>}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {results.length>0 && (
                <button onClick={()=>getLink('csv')} disabled={loading==='csv'} style={{display:'flex',alignItems:'center',gap:8,background:`${P.accent}12`,border:`1px solid ${P.accent}30`,borderRadius:7,padding:'10px 14px',color:P.accent,fontSize:12,cursor:'pointer',fontFamily:"'JetBrains Mono'"}}>
                  {loading==='csv'?'⟳':'↓'}
                  <div style={{flex:1,textAlign:'left'}}>
                    <div style={{fontWeight:600}}>Fichier Excel corrige</div>
                    <div style={{fontSize:9,color:P.accentDim,marginTop:1}}>XLSX · Donnees nettoyees · Lien 15 min</div>
                  </div>
                </button>
              )}
              <button onClick={()=>getLink('pdf')} disabled={loading==='pdf'} style={{display:'flex',alignItems:'center',gap:8,background:`${P.blue}12`,border:`1px solid ${P.blue}30`,borderRadius:7,padding:'10px 14px',color:P.blue,fontSize:12,cursor:'pointer',fontFamily:"'JetBrains Mono'"}}>
                {loading==='pdf'?'⟳':'↓'}
                <div style={{flex:1,textAlign:'left'}}>
                  <div style={{fontWeight:600}}>Rapport PDF complet</div>
                  <div style={{fontSize:9,color:'#2a5aaa',marginTop:1}}>Conformite e-Invoicing · Lien 15 min</div>
                </div>
              </button>
            </div>
            <div style={{marginTop:10,fontSize:9,color:P.dim}}>🔐 Liens signes JWT · 15 min · Via backend securise</div>
          </div>
          {results.length>0 && (
            <div style={{marginBottom:16}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:13,fontWeight:600,marginBottom:10}}>
                Detail par fournisseur
                <span style={{fontSize:10,color:P.muted,fontFamily:"'JetBrains Mono',monospace",fontWeight:400,marginLeft:8}}>({results.length})</span>
              </div>
              <input style={{width:'100%',background:P.surface,border:`1px solid ${P.border}`,borderRadius:6,padding:'7px 10px',color:P.text,fontSize:11,fontFamily:"'JetBrains Mono',monospace",marginBottom:8,outline:'none'}}
                placeholder="Rechercher nom ou alias…" value={search} onChange={e=>setSearch(e.target.value)} />
              <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
                {[
                  ['all',      `Tous (${counts.all})`,             P.chrome],
                  ['conforme', `✓ Conformes (${counts.conforme})`, P.accent],
                  ['corriger', `⚠ Corriger (${counts.corriger})`,  P.warn],
                  ['bloquant', `x Bloquants (${counts.bloquant})`, P.danger],
                ].map(([key,label,color])=>(
                  <button key={key} onClick={()=>setFilter(key)} style={{
                    background:filter===key?`${color}15`:'transparent',
                    border:`1px solid ${filter===key?color+'50':P.border}`,
                    color:filter===key?color:P.muted,
                    padding:'3px 9px',borderRadius:4,fontSize:10,cursor:'pointer',
                    fontFamily:"'JetBrains Mono',monospace",transition:'all .15s'
                  }}>{label}</button>
                ))}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {filtered.length===0 ? (
                  <div style={{textAlign:'center',padding:'20px 0',color:P.muted,fontSize:11}}>Aucun resultat</div>
                ) : filtered.map((r,i)=>{
                  const tag = getTag(r.statut||'');
                  return (
                    <div key={i} style={{background:P.surface,border:`1px solid ${tag.border}`,borderRadius:8,padding:'10px 12px',borderLeft:`3px solid ${tag.color}`}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}}>
                        <div style={{minWidth:0}}>
                          <div style={{fontWeight:600,color:P.text,fontSize:11}}>{r.nom_reel||r.alias}</div>
                          <div style={{fontSize:10,color:P.muted,marginTop:1}}>{r.alias}</div>
                        </div>
                        <span style={{background:tag.bg,color:tag.color,border:`1px solid ${tag.border}`,borderRadius:4,padding:'2px 7px',fontSize:9,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',flexShrink:0}}>
                          {tag.icon} {tag.label}
                        </span>
                      </div>
                      <div style={{display:'flex',gap:10,marginBottom:4}}>
                        <span style={{fontSize:10,color:r.siret_ok?P.accent:P.danger}}>{r.siret_ok?'✓':'x'} SIRET/SIREN</span>
                        <span style={{fontSize:10,color:r.tva_ok?P.accent:P.danger}}>{r.tva_ok?'✓':'x'} TVA</span>
                        {r.siren_coherent===false && <span style={{fontSize:10,color:P.danger}}>x SIREN incoherent</span>}
                      </div>
                      {(r.erreurs||[]).map((e,j)=>(
                        <div key={j} style={{fontSize:10,color:P.danger,marginTop:2}}>x {e}</div>
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
        </>
      )}
    </div>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="card fadeUp" style={{padding:'60px 40px',textAlign:'center',borderStyle:'dashed'}}>
      <div style={{fontSize:48,marginBottom:16,color:P.dim}}>⊙</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600,marginBottom:8}}>Aucun fichier importe</div>
      <div style={{fontSize:12,color:P.muted,marginBottom:24,lineHeight:1.7}}>Importez vos fichiers fournisseurs pour demarrer<br/>un audit de conformite e-Invoicing 2026.</div>
      <button className="btn-primary" onClick={onUpload}>+ Importer un premier fichier</button>
    </div>
  );
}
