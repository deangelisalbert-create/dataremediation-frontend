import { useState, useRef } from 'react';
import { rectifierFichier } from '../api';

const P = {
  bg:'#06080f', surface:'#0b0e18', card:'#0f1220',
  border:'#161c2e', borderHi:'#1e2a42',
  accent:'#00e5a0', accentDim:'#00b07a',
  blue:'#3d8eff', warn:'#ffb340', danger:'#ff4566',
  text:'#c8d4ee', muted:'#4a5878', dim:'#2a3450', chrome:'#8899cc',
};

const ALLOWED = ['.csv', '.xml', '.json', '.xlsx', '.xls'];
const MAX_MB  = 10;
const API_URL = import.meta.env.VITE_API_URL || 'https://dataremediation-backend-production.up.railway.app';

export function RectificationPanel({ onClose }) {
  const [file,      setFile]      = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error,     setError]     = useState('');
  const [rapport,   setRapport]   = useState(null);
  const [filter,    setFilter]    = useState('all');
  const inputRef = useRef();

  const handleFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED.includes(ext)) return setError('Format non supporte. Utilisez CSV, XLSX, XML ou JSON.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Fichier trop volumineux (max ${MAX_MB} Mo)`);
    setError('');
    setFile(f);
    setRapport(null);
  };

  const lancer = async () => {
    if (!file) return;
    setLoading(true); setError(''); setProgress(0);
    try {
      const result = await rectifierFichier(file, setProgress);
      setRapport(result);
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const exporterExcel = async () => {
    if (!rapport) return;
    setExporting(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/rectification/export-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rapport: rapport.rapport, donnees_corrigees: rapport.donnees_corrigees, nomFichier: file?.name || 'rectification' }),
      });
      if (!res.ok) throw new Error('Erreur export Excel');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `conformite_${(file?.name || 'fichier').replace(/\.[^.]+$/, '')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { setError(e.message); }
    setExporting(false);
  };

  const exporterPDF = async () => {
    if (!rapport) return;
    setExporting(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      const res = await fetch(`${API_URL}/api/rectification/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ rapport: rapport.rapport, donnees_corrigees: rapport.donnees_corrigees, nomFichier: file?.name || 'rectification', companyName: '' }),
      });
      if (!res.ok) throw new Error('Erreur export PDF');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `conformite_${(file?.name || 'fichier').replace(/\.[^.]+$/, '')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(e) { setError(e.message); }
    setExporting(false);
  };

  const scoreColor = (v) => v >= 90 ? P.accent : v >= 70 ? P.blue : v >= 50 ? P.warn : P.danger;

  const details = rapport?.rapport?.details || [];
  const stats   = rapport?.rapport?.statistiques || {};
  const score   = rapport?.rapport?.score_qualite || {};
  const meta    = rapport?.rapport?.meta || {};
  const risque  = rapport?.rapport?.risque_pdp || {};
  const roi     = rapport?.rapport?.roi || {};

  const filtered = details.filter(d => {
    if (filter === 'valide')   return d.statut === 'VALIDE';
    if (filter === 'corrige')  return d.statut === 'CORRIGE';
    if (filter === 'anomalie') return d.statut === 'ANOMALIE' || d.statut === 'ERREUR_RECTIFICATION';
    return true;
  });

  const niveauColor = risque.niveau === 'CRITIQUE' ? P.danger : risque.niveau === 'ELEVE' ? P.warn : risque.niveau === 'MODERE' ? P.blue : P.accent;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:820, maxHeight:'92vh', overflowY:'auto',
        background:P.card, border:`1px solid ${P.border}`, borderRadius:14, padding:'28px 32px',
        fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:13, color:P.text,
      }}>

        {/* ── Header ── */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:P.text}}>
              Audit de Conformite Fournisseurs
            </div>
            <div style={{fontSize:10,color:P.accent,marginTop:4,letterSpacing:'.08em',textTransform:'uppercase'}}>
              Facturation Electronique 2026 · INSEE · VIES · Claude AI
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:`1px solid ${P.border}`,color:P.muted,padding:'6px 14px',borderRadius:6,fontSize:11,cursor:'pointer'}}>
            x Fermer
          </button>
        </div>

        {/* ── Zone upload ── */}
        {!rapport && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragging(true)}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
              style={{
                border:`2px dashed ${file ? P.accent : dragging ? P.blue : P.border}`,
                borderRadius:10, padding:'28px 20px', textAlign:'center', cursor:'pointer',
                transition:'all .2s', marginBottom:14,
                background: file ? `${P.accent}05` : dragging ? `${P.blue}05` : 'transparent',
              }}
            >
              <input ref={inputRef} type="file" accept=".csv,.xml,.json,.xlsx,.xls"
                onChange={e=>{if(e.target.files[0])handleFile(e.target.files[0])}}
                style={{display:'none'}} />
              {file ? (
                <>
                  <div style={{fontSize:28,marginBottom:8}}>📊</div>
                  <div style={{color:P.accent,fontWeight:600,marginBottom:4}}>{file.name}</div>
                  <div style={{fontSize:11,color:P.muted}}>{(file.size/1024).toFixed(0)} Ko · Pret a analyser</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:32,marginBottom:8,color:P.dim}}>+</div>
                  <div style={{color:P.chrome,marginBottom:4,fontWeight:500,fontSize:13}}>Glisser-deposer ou cliquer</div>
                  <div style={{fontSize:11,color:P.muted}}>CSV · XLSX · XML · JSON — max {MAX_MB} Mo</div>
                </>
              )}
            </div>

            {/* Promesse metier */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:'12px 16px'}}>
                <div style={{fontSize:10,color:P.accent,fontWeight:700,letterSpacing:'.06em',marginBottom:8,textTransform:'uppercase'}}>Detection automatique</div>
                {['SIRET invalides ou manquants','TVA intracommunautaire','Doublons fournisseurs','Emails errones','Champs obligatoires manquants','Preparation facturation electronique 2026'].map((item,i)=>(
                  <div key={i} style={{fontSize:10,color:P.muted,marginTop:4,display:'flex',alignItems:'center',gap:6}}>
                    <span style={{color:P.accent}}>+</span>{item}
                  </div>
                ))}
              </div>
              <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:'12px 16px'}}>
                <div style={{fontSize:10,color:P.blue,fontWeight:700,letterSpacing:'.06em',marginBottom:8,textTransform:'uppercase'}}>Rapport genere</div>
                {['Score conformite global','Liste anomalies par categorie','Corrections proposees (IA)','Export Excel corrige','Rapport PDF dirigeant','Plan d\'action 2026'].map((item,i)=>(
                  <div key={i} style={{fontSize:10,color:P.muted,marginTop:4,display:'flex',alignItems:'center',gap:6}}>
                    <span style={{color:P.blue}}>+</span>{item}
                  </div>
                ))}
              </div>
            </div>

            {/* ROI estimé avant analyse */}
            {file && (
              <div style={{background:`${P.accent}08`,border:`1px solid ${P.accent}20`,borderRadius:8,padding:'10px 16px',marginBottom:14,display:'flex',gap:24,flexWrap:'wrap'}}>
                <div style={{fontSize:10,color:P.muted}}>
                  Temps d'analyse estime : <span style={{color:P.accent,fontWeight:700}}>2-3 minutes</span>
                </div>
                <div style={{fontSize:10,color:P.muted}}>
                  Equivalent manuel : <span style={{color:P.warn,fontWeight:700}}>4h a 6h</span>
                </div>
                <div style={{fontSize:10,color:P.muted}}>
                  Gain potentiel : <span style={{color:P.accent,fontWeight:700}}>~300 EUR</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Erreur ── */}
        {error && (
          <div style={{background:`${P.danger}12`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:11,color:P.danger}}>
            x {error}
          </div>
        )}

        {/* ── Progress ── */}
        {loading && (
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:P.muted,marginBottom:6}}>
              <span>Audit en cours — INSEE · VIES · Claude AI</span>
              <span>{progress}%</span>
            </div>
            <div style={{height:4,background:P.border,borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${progress||10}%`,background:`linear-gradient(90deg,${P.accent},${P.blue})`,transition:'width .3s'}} />
            </div>
            <div style={{fontSize:10,color:P.muted,marginTop:8,textAlign:'center'}}>
              Analyse et correction automatique en cours — 30 a 90 secondes selon le volume
            </div>
          </div>
        )}

        {/* ── Bouton lancer ── */}
        {!rapport && (
          <button
            onClick={lancer}
            disabled={!file || loading}
            style={{
              width:'100%', padding:'14px', borderRadius:8, border:'none',
              background: file && !loading ? P.accent : P.dim,
              color: file && !loading ? '#000' : P.muted,
              fontWeight:700, fontSize:13, cursor: file && !loading ? 'pointer' : 'not-allowed',
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.08em', textTransform:'uppercase',
              transition:'all .2s',
            }}
          >
            {loading ? 'Audit en cours...' : file ? 'Lancer l\'audit de conformite' : 'Selectionnez un fichier fournisseurs'}
          </button>
        )}

        {/* ── Rapport ── */}
        {rapport && (
          <div>

            {/* Score + Risque PDP */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
              <div style={{background:P.surface,border:`1px solid ${scoreColor(score.valeur)}30`,borderRadius:10,padding:20,textAlign:'center'}}>
                <div style={{fontSize:9,color:P.muted,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Score conformite</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:48,fontWeight:700,color:scoreColor(score.valeur),lineHeight:1}}>
                  {score.valeur}
                </div>
                <div style={{fontSize:11,color:scoreColor(score.valeur),marginTop:4,fontWeight:600}}>{score.mention}</div>
              </div>
              <div style={{background:P.surface,border:`1px solid ${niveauColor}30`,borderRadius:10,padding:20}}>
                <div style={{fontSize:9,color:P.muted,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Risque PDP 2026</div>
                <div style={{fontSize:18,fontWeight:800,color:niveauColor,marginBottom:6}}>{risque.niveau || 'N/A'}</div>
                <div style={{fontSize:10,color:P.muted,lineHeight:1.5}}>{risque.description || ''}</div>
                {roi.temps_manuel_h > 0 && (
                  <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${P.border}`,fontSize:10}}>
                    <span style={{color:P.muted}}>Temps economise : </span>
                    <span style={{color:P.accent,fontWeight:700}}>{roi.temps_manuel_h}h (~{roi.cout_manuel_eur} EUR)</span>
                  </div>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
              {[
                ['Total',    stats.total,    P.blue],
                ['Valides',  stats.valides,  P.accent],
                ['Corriges', stats.corriges, P.warn],
                ['Anomalies',stats.erreurs,  P.danger],
              ].map(([l,v,c],i)=>(
                <div key={i} style={{background:P.surface,border:`1px solid ${c}20`,borderRadius:8,padding:'10px',textAlign:'center'}}>
                  <div style={{fontSize:8,color:P.muted,textTransform:'uppercase',letterSpacing:'.07em'}}>{l}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,color:c,marginTop:3}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Fichier info */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:10,color:P.muted,display:'flex',gap:12,flexWrap:'wrap'}}>
              <span>Fichier : {meta.fichier}</span>
              <span>·</span>
              <span>{meta.total_lignes} lignes</span>
              <span>·</span>
              <span>{new Date(meta.date_analyse).toLocaleString('fr-FR')}</span>
              <span>·</span>
              <span style={{color:P.accent}}>Type : {meta.type_fichier || 'fournisseurs'}</span>
            </div>

            {/* Boutons export */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
              <button onClick={exporterExcel} disabled={exporting} style={{
                padding:'12px', borderRadius:8, border:'none',
                background: exporting ? P.dim : P.accent, color: exporting ? P.muted : '#000',
                fontWeight:700, fontSize:11, cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.05em', textTransform:'uppercase',
              }}>
                {exporting ? 'Export...' : 'Telecharger Excel corrige'}
              </button>
              <button onClick={exporterPDF} disabled={exporting} style={{
                padding:'12px', borderRadius:8, border:'none',
                background: exporting ? P.dim : P.blue, color: exporting ? P.muted : '#fff',
                fontWeight:700, fontSize:11, cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.05em', textTransform:'uppercase',
              }}>
                {exporting ? 'Export...' : 'Rapport PDF Conformite'}
              </button>
            </div>
            <div style={{fontSize:9,color:P.dim,textAlign:'center',marginBottom:16}}>
              Excel : Resume · Donnees corrigees · Corrections · Anomalies — PDF : Rapport dirigeant 4 pages
            </div>

            {/* Filtres */}
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              {[
                ['all',      `Tous (${details.length})`,                                                    P.chrome],
                ['valide',   `Valides (${stats.valides})`,                                                  P.accent],
                ['corrige',  `Corriges (${stats.corriges})`,                                                P.warn],
                ['anomalie', `Anomalies (${(stats.total||0)-(stats.valides||0)-(stats.corriges||0)})`,      P.danger],
              ].map(([key,label,color])=>(
                <button key={key} onClick={()=>setFilter(key)} style={{
                  background: filter===key ? `${color}15` : 'transparent',
                  border:`1px solid ${filter===key ? color+'50' : P.border}`,
                  color: filter===key ? color : P.muted,
                  padding:'4px 12px', borderRadius:4, fontSize:10, cursor:'pointer',
                  fontFamily:"'JetBrains Mono',monospace", transition:'all .15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Liste details */}
            <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:380,overflowY:'auto'}}>
              {filtered.length === 0 && (
                <div style={{textAlign:'center',padding:'20px',color:P.muted,fontSize:11}}>Aucun resultat</div>
              )}
              {filtered.map((d,i)=>{
                const isVal  = d.statut === 'VALIDE';
                const isCor  = d.statut === 'CORRIGE';
                const sColor = isVal ? P.accent : isCor ? P.warn : P.danger;
                const sLabel = isVal ? 'Valide' : isCor ? 'Corrige' : 'Anomalie';
                // Nom du fournisseur
                const nom = d.donnees_originales?.denomination || d.donnees_originales?.Denomination ||
                            d.donnees_originales?.['Dénomination'] || d.donnees_originales?.raison_sociale ||
                            d.donnees_originales?.nom || `Ligne ${d.index+1}`;
                return (
                  <div key={i} style={{
                    background:P.surface, border:`1px solid ${sColor}25`,
                    borderRadius:8, padding:'10px 14px', borderLeft:`3px solid ${sColor}`,
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:isCor||d.anomalies?.length>0?6:0}}>
                      <div style={{fontSize:11,fontWeight:600,color:P.text}}>{String(nom).slice(0,40)}</div>
                      <span style={{background:`${sColor}15`,color:sColor,border:`1px solid ${sColor}30`,borderRadius:4,padding:'2px 8px',fontSize:9,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase'}}>
                        {sLabel}
                      </span>
                    </div>
                    {d.anomalies?.length > 0 && (
                      <div style={{marginBottom:isCor?6:0}}>
                        {d.anomalies.map((a,j)=>(
                          <div key={j} style={{fontSize:9,color:P.danger,marginTop:2}}>
                            x {a.champ} — {a.type} {a.valeur?`(${a.valeur})`:''}
                          </div>
                        ))}
                      </div>
                    )}
                    {d.corrections?.length > 0 && (
                      <div style={{borderTop:`1px solid ${P.border}`,paddingTop:6,marginTop:4}}>
                        {d.corrections.map((c,j)=>(
                          <div key={j} style={{fontSize:9,marginTop:3,display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                            <span style={{color:P.warn,fontWeight:600}}>{c.champ}</span>
                            <span style={{color:P.danger,textDecoration:'line-through'}}>{String(c.avant||'').slice(0,20)}</span>
                            <span style={{color:P.muted}}>-></span>
                            <span style={{color:P.accent,fontWeight:600}}>{String(c.apres||'').slice(0,20)}</span>
                            <span style={{color:P.dim}}>({c.confiance})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {d.enrichissement_insee && (
                      <div style={{fontSize:9,color:P.blue,marginTop:4,paddingTop:4,borderTop:`1px solid ${P.border}`}}>
                        INSEE : {d.enrichissement_insee.raison_sociale} · {d.enrichissement_insee.statut_entreprise}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Nouveau fichier */}
            <button onClick={()=>{setRapport(null);setFile(null);setProgress(0);setError('');}} style={{
              width:'100%', marginTop:16, padding:'11px', borderRadius:8,
              background:'transparent', border:`1px solid ${P.border}`,
              color:P.muted, fontSize:11, cursor:'pointer',
              fontFamily:"'JetBrains Mono',monospace",
            }}>
              Analyser un autre fichier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
