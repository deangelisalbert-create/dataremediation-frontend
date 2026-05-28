import { useState, useRef } from 'react';
import { rectifierFichier } from '../api';

const P = {
  bg:'#06080f', surface:'#0b0e18', card:'#0f1220',
  border:'#161c2e', borderHi:'#1e2a42',
  accent:'#00e5a0', accentDim:'#00b07a',
  blue:'#3d8eff', warn:'#ffb340', danger:'#ff4566',
  text:'#c8d4ee', muted:'#4a5878', dim:'#2a3450', chrome:'#8899cc',
};

const ALLOWED = ['.csv', '.xml', '.json'];
const MAX_MB  = 10;

export function RectificationPanel({ onClose }) {
  const [file,       setFile]       = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [rapport,    setRapport]    = useState(null);
  const [filter,     setFilter]     = useState('all');
  const inputRef = useRef();

  const handleFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED.includes(ext)) return setError('Format non supporté. Utilisez CSV, XML ou JSON.');
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

  const scoreColor = (v) => v >= 90 ? P.accent : v >= 70 ? P.blue : v >= 50 ? P.warn : P.danger;

  const details = rapport?.rapport?.details || [];
  const stats   = rapport?.rapport?.statistiques || {};
  const score   = rapport?.rapport?.score_qualite || {};
  const meta    = rapport?.rapport?.meta || {};

  const filtered = details.filter(d => {
    if (filter === 'valide')   return d.statut === 'VALIDE';
    if (filter === 'corrige')  return d.statut === 'CORRIGE';
    if (filter === 'anomalie') return d.statut === 'ANOMALIE' || d.statut === 'ERREUR_RECTIFICATION';
    return true;
  });

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:780, maxHeight:'90vh', overflowY:'auto',
        background:P.card, border:`1px solid ${P.border}`, borderRadius:12, padding:32,
        fontFamily:"'JetBrains Mono','Fira Code',monospace", fontSize:13, color:P.text,
      }}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700}}>
              Module de Rectification
            </div>
            <div style={{fontSize:10,color:P.muted,marginTop:4,letterSpacing:'.08em',textTransform:'uppercase'}}>
              Correction automatique · INSEE · VIES · Claude AI
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:`1px solid ${P.border}`,color:P.muted,padding:'6px 14px',borderRadius:6,fontSize:11,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>
            ✕ Fermer
          </button>
        </div>

        {/* Zone upload */}
        {!rapport && (
          <div
            className={dragging ? 'drop-active' : ''}
            onClick={() => inputRef.current?.click()}
            onDragOver={e=>{e.preventDefault();setDragging(true)}}
            onDragLeave={()=>setDragging(false)}
            onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
            style={{
              border:`2px dashed ${file ? P.accent : dragging ? P.blue : P.border}`,
              borderRadius:10, padding:'32px 20px', textAlign:'center', cursor:'pointer',
              transition:'all .2s', marginBottom:16,
              background: file ? `${P.accent}05` : 'transparent',
            }}
          >
            <input ref={inputRef} type="file" accept=".csv,.xml,.json"
              onChange={e=>{if(e.target.files[0])handleFile(e.target.files[0])}}
              style={{display:'none'}} />
            {file ? (
              <>
                <div style={{fontSize:32,marginBottom:8}}>📄</div>
                <div style={{color:P.accent,fontWeight:600,marginBottom:4}}>{file.name}</div>
                <div style={{fontSize:11,color:P.muted}}>
                  {(file.size/1024).toFixed(0)} Ko · Prêt à rectifier
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:36,marginBottom:10,color:P.dim}}>⊕</div>
                <div style={{color:P.chrome,marginBottom:6,fontWeight:500}}>Glisser-déposer ou cliquer</div>
                <div style={{fontSize:11,color:P.muted}}>CSV · XML · JSON — max {MAX_MB} Mo</div>
              </>
            )}
          </div>
        )}

        {/* Pipeline info */}
        {!rapport && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
            {[
              ['🔍','Détection','SIRET · TVA · montants · dates'],
              ['🏢','Enrichissement','API INSEE + VIES EU'],
              ['🤖','Rectification','Claude AI · score confiance'],
            ].map(([icon,title,desc],i)=>(
              <div key={i} style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:'12px',textAlign:'center'}}>
                <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
                <div style={{fontSize:11,fontWeight:600,color:P.text,marginBottom:3}}>{title}</div>
                <div style={{fontSize:9,color:P.muted,lineHeight:1.5}}>{desc}</div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div style={{background:`${P.danger}12`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'10px 14px',marginBottom:12,fontSize:11,color:P.danger}}>
            ✗ {error}
          </div>
        )}

        {/* Progress */}
        {loading && (
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:P.muted,marginBottom:6}}>
              <span>Analyse en cours… INSEE · VIES · Claude</span>
              <span>{progress}%</span>
            </div>
            <div style={{height:4,background:P.border,borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${progress||10}%`,background:`linear-gradient(90deg,${P.accent},${P.blue})`,transition:'width .3s'}} />
            </div>
            <div style={{fontSize:10,color:P.muted,marginTop:8,textAlign:'center'}}>
              Cela peut prendre 30 à 60 secondes selon le volume…
            </div>
          </div>
        )}

        {/* Bouton lancer */}
        {!rapport && (
          <button
            onClick={lancer}
            disabled={!file || loading}
            style={{
              width:'100%', padding:'13px', borderRadius:8, border:'none',
              background: file && !loading ? P.accent : P.dim,
              color: file && !loading ? '#000' : P.muted,
              fontWeight:700, fontSize:13, cursor: file && !loading ? 'pointer' : 'not-allowed',
              fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.06em', textTransform:'uppercase',
              transition:'all .2s',
            }}
          >
            {loading ? '⟳ Rectification en cours…' : '→ Lancer la rectification'}
          </button>
        )}

        {/* Rapport */}
        {rapport && (
          <div>
            {/* Score */}
            <div style={{background:P.surface,border:`1px solid ${scoreColor(score.valeur)}30`,borderRadius:10,padding:20,marginBottom:16,textAlign:'center'}}>
              <div style={{fontSize:10,color:P.muted,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Score qualité</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:52,fontWeight:700,color:scoreColor(score.valeur),lineHeight:1}}>
                {score.valeur}
              </div>
              <div style={{fontSize:12,color:scoreColor(score.valeur),marginTop:4,fontWeight:600}}>{score.mention}</div>
              <div style={{fontSize:10,color:P.muted,marginTop:8}}>{rapport.rapport?.resume}</div>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:16}}>
              {[
                ['Total',      stats.total,     P.blue],
                ['Valides',    stats.valides,   P.accent],
                ['Corrigés',   stats.corriges,  P.warn],
                ['Erreurs',    stats.erreurs,   P.danger],
              ].map(([l,v,c],i)=>(
                <div key={i} style={{background:P.surface,border:`1px solid ${c}20`,borderRadius:8,padding:'12px',textAlign:'center'}}>
                  <div style={{fontSize:9,color:P.muted,textTransform:'uppercase',letterSpacing:'.07em'}}>{l}</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:26,fontWeight:700,color:c,marginTop:4}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Fichier info */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:8,padding:12,marginBottom:16,fontSize:10,color:P.muted}}>
              📄 {meta.fichier} · {meta.total_lignes} lignes · {new Date(meta.date_analyse).toLocaleString('fr-FR')}
            </div>

            {/* Filtres */}
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              {[
                ['all',      `Tous (${details.length})`,   P.chrome],
                ['valide',   `✓ Valides (${stats.valides})`,  P.accent],
                ['corrige',  `⚡ Corrigés (${stats.corriges})`, P.warn],
                ['anomalie', `✗ Anomalies (${(stats.total||0)-(stats.valides||0)-(stats.corriges||0)})`, P.danger],
              ].map(([key,label,color])=>(
                <button key={key} onClick={()=>setFilter(key)} style={{
                  background: filter===key ? `${color}15` : 'transparent',
                  border:`1px solid ${filter===key ? color+'50' : P.border}`,
                  color: filter===key ? color : P.muted,
                  padding:'4px 10px', borderRadius:4, fontSize:10, cursor:'pointer',
                  fontFamily:"'JetBrains Mono',monospace", transition:'all .15s',
                }}>{label}</button>
              ))}
            </div>

            {/* Détails */}
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:400,overflowY:'auto'}}>
              {filtered.map((d,i)=>(
                <div key={i} style={{
                  background:P.surface,
                  border:`1px solid ${d.statut==='VALIDE'?P.accent+'30':d.statut==='CORRIGE'?P.warn+'30':P.danger+'30'}`,
                  borderRadius:8, padding:'12px 14px',
                  borderLeft:`3px solid ${d.statut==='VALIDE'?P.accent:d.statut==='CORRIGE'?P.warn:P.danger}`,
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{fontSize:11,color:P.muted}}>Ligne {d.index + 1}</div>
                    <span style={{
                      background: d.statut==='VALIDE'?`${P.accent}15`:d.statut==='CORRIGE'?`${P.warn}15`:`${P.danger}15`,
                      color: d.statut==='VALIDE'?P.accent:d.statut==='CORRIGE'?P.warn:P.danger,
                      border:`1px solid ${d.statut==='VALIDE'?P.accent+'30':d.statut==='CORRIGE'?P.warn+'30':P.danger+'30'}`,
                      borderRadius:4, padding:'2px 8px', fontSize:9, fontWeight:600,
                      letterSpacing:'.07em', textTransform:'uppercase',
                    }}>
                      {d.statut==='VALIDE'?'✓ Valide':d.statut==='CORRIGE'?'⚡ Corrigé':'✗ Anomalie'}
                    </span>
                  </div>

                  {/* Anomalies */}
                  {d.anomalies?.length > 0 && (
                    <div style={{marginBottom:6}}>
                      {d.anomalies.map((a,j)=>(
                        <div key={j} style={{fontSize:10,color:P.danger,marginTop:2}}>
                          ✗ {a.champ} — {a.type} {a.valeur ? `(${a.valeur})` : ''}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Corrections */}
                  {d.corrections?.length > 0 && (
                    <div style={{borderTop:`1px solid ${P.border}`,paddingTop:8,marginTop:6}}>
                      {d.corrections.map((c,j)=>(
                        <div key={j} style={{fontSize:10,marginTop:4}}>
                          <span style={{color:P.warn}}>⚡ {c.champ}</span>
                          <span style={{color:P.muted}}> : </span>
                          <span style={{color:P.danger,textDecoration:'line-through'}}>{c.avant}</span>
                          <span style={{color:P.muted}}> → </span>
                          <span style={{color:P.accent}}>{c.apres}</span>
                          <span style={{color:P.dim,marginLeft:6}}>({c.confiance})</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* INSEE */}
                  {d.enrichissement_insee && (
                    <div style={{fontSize:10,color:P.muted,marginTop:6,paddingTop:6,borderTop:`1px solid ${P.border}`}}>
                      🏢 {d.enrichissement_insee.raison_sociale} · {d.enrichissement_insee.statut_entreprise}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Nouveau fichier */}
            <button
              onClick={()=>{setRapport(null);setFile(null);setProgress(0);}}
              style={{
                width:'100%', marginTop:16, padding:'11px', borderRadius:8,
                background:'transparent', border:`1px solid ${P.border}`,
                color:P.muted, fontSize:12, cursor:'pointer',
                fontFamily:"'JetBrains Mono',monospace",
              }}
            >
              ↩ Rectifier un autre fichier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
