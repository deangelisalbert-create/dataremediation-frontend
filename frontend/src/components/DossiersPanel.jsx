// components/DossiersPanel.jsx
import { useState, useEffect } from 'react';

const P = {
  bg:'#06080f', surface:'#0b0e18', card:'#0f1220',
  border:'#161c2e', borderHi:'#1e2a42',
  accent:'#00e5a0', accentDim:'#00b07a',
  blue:'#3d8eff', warn:'#ffb340', danger:'#ff4566',
  text:'#c8d4ee', muted:'#4a5878', dim:'#2a3450', chrome:'#8899cc',
};

const API_URL = import.meta.env.VITE_API_URL || 'https://dataremediation-backend-production.up.railway.app';

function fmtDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
}

function scoreColor(v) {
  if (v === null || v === undefined) return P.muted;
  return v >= 80 ? P.accent : v >= 50 ? P.warn : P.danger;
}

function scoreLabel(v) {
  if (v === null || v === undefined) return 'Non analyse';
  if (v >= 80) return 'Conforme';
  if (v >= 50) return 'A ameliorer';
  return 'Critique';
}

async function apiFetch(path, method = 'GET', body = null) {
  // Chercher le token dans toutes les sources possibles
const token = sessionStorage.getItem('token') || 
              localStorage.getItem('token') || 
              localStorage.getItem('dr_refresh') || '';
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erreur ${res.status}`);
  }
  return res.json();
}

export default function DossiersPanel({ onUploadForDossier }) {
  const [dossiers,    setDossiers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editDossier, setEditDossier] = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [detailData,  setDetailData]  = useState(null);
  const [error,       setError]       = useState('');
  const [form,        setForm]        = useState({ nom:'', siret:'', contact:'', email:'', notes:'' });
  const [saving,      setSaving]      = useState(false);

  useEffect(() => { loadDossiers(); }, []);

  const loadDossiers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/dossiers');
      setDossiers(data.dossiers || []);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const loadDetail = async (id) => {
    try {
      const data = await apiFetch(`/api/dossiers/${id}`);
      setDetailData(data.dossier);
    } catch(e) { console.warn('Detail dossier:', e.message); }
  };

  const toggleSelect = async (d) => {
    if (selected?.id === d.id) {
      setSelected(null);
      setDetailData(null);
    } else {
      setSelected(d);
      await loadDetail(d.id);
    }
  };

  const openNew = () => {
    setForm({ nom:'', siret:'', contact:'', email:'', notes:'' });
    setEditDossier(null);
    setShowForm(true);
    setError('');
  };

  const openEdit = (d, e) => {
    e.stopPropagation();
    setForm({ nom:d.nom||'', siret:d.siret||'', contact:d.contact||'', email:d.email||'', notes:d.notes||'' });
    setEditDossier(d);
    setShowForm(true);
    setError('');
  };

  const saveDossier = async () => {
    if (!form.nom.trim()) return setError('Le nom du dossier est requis.');
    setSaving(true); setError('');
    try {
      if (editDossier) {
        await apiFetch(`/api/dossiers/${editDossier.id}`, 'PUT', form);
      } else {
        await apiFetch('/api/dossiers', 'POST', form);
      }
      setShowForm(false);
      await loadDossiers();
    } catch(e) { setError(e.message); }
    setSaving(false);
  };

  const deleteDossier = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce dossier ? Les audits associes seront detaches.')) return;
    try {
      await apiFetch(`/api/dossiers/${id}`, 'DELETE');
      if (selected?.id === id) { setSelected(null); setDetailData(null); }
      await loadDossiers();
    } catch(e) { setError(e.message); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:600}}>
          Dossiers clients
          <span style={{fontSize:11,color:P.muted,fontFamily:"'JetBrains Mono',monospace",fontWeight:400,marginLeft:10}}>
            ({dossiers.length})
          </span>
        </div>
        <button onClick={openNew} style={{
          background:P.accent, color:'#000', fontWeight:700, padding:'9px 20px',
          borderRadius:6, border:'none', fontSize:11, cursor:'pointer',
          fontFamily:"'JetBrains Mono',monospace", letterSpacing:'.06em', textTransform:'uppercase',
        }}>
          + Nouveau dossier
        </button>
      </div>

      {error && (
        <div style={{background:`${P.danger}12`,border:`1px solid ${P.danger}30`,borderRadius:6,padding:'9px 12px',marginBottom:12,fontSize:11,color:P.danger}}>
          ! {error}
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{background:P.surface,border:`1px solid ${P.accent}30`,borderRadius:10,padding:20,marginBottom:16}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:600,marginBottom:16,color:P.text}}>
            {editDossier ? 'Modifier le dossier' : 'Nouveau dossier client'}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            {[
              { key:'nom',     label:'Nom du client *', placeholder:'ISOPANO SAS' },
              { key:'siret',   label:'SIRET',           placeholder:'12345678901234' },
              { key:'contact', label:'Contact',         placeholder:'Jean Dupont' },
              { key:'email',   label:'Email',           placeholder:'contact@client.fr' },
            ].map(f => (
              <div key={f.key}>
                <div style={{fontSize:9,color:P.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>{f.label}</div>
                <input
                  style={{width:'100%',background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'9px 12px',color:P.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:'none'}}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e=>setForm(prev=>({...prev,[f.key]:e.target.value}))}
                />
              </div>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:P.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Notes</div>
            <textarea
              style={{width:'100%',background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'9px 12px',color:P.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:'none',resize:'vertical',minHeight:56}}
              placeholder="Informations complementaires…"
              value={form.notes}
              onChange={e=>setForm(prev=>({...prev,notes:e.target.value}))}
            />
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={saveDossier} disabled={saving} style={{
              background:P.accent, color:'#000', fontWeight:700, padding:'9px 20px',
              borderRadius:6, border:'none', fontSize:11, cursor:saving?'not-allowed':'pointer',
              fontFamily:"'JetBrains Mono',monospace", opacity:saving?0.5:1,
            }}>
              {saving ? 'Enregistrement...' : editDossier ? 'Enregistrer' : 'Creer le dossier'}
            </button>
            <button onClick={()=>setShowForm(false)} style={{
              background:'transparent', border:`1px solid ${P.border}`, color:P.muted,
              padding:'9px 16px', borderRadius:6, fontSize:11, cursor:'pointer',
              fontFamily:"'JetBrains Mono',monospace",
            }}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div style={{textAlign:'center',padding:'40px 0',color:P.muted,fontSize:12}}>Chargement…</div>
      ) : dossiers.length === 0 ? (
        <div style={{background:P.card,border:`1px dashed ${P.border}`,borderRadius:10,padding:'60px 40px',textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12,color:P.dim}}>+</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600,marginBottom:8}}>Aucun dossier client</div>
          <div style={{fontSize:11,color:P.muted,marginBottom:20,lineHeight:1.6}}>
            Creez un dossier par client pour organiser<br/>vos audits de conformite e-Invoicing 2026.
          </div>
          <button onClick={openNew} style={{background:P.accent,color:'#000',fontWeight:700,padding:'10px 24px',borderRadius:6,border:'none',fontSize:11,cursor:'pointer',fontFamily:"'JetBrains Mono',monospace"}}>
            + Creer le premier dossier
          </button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {dossiers.map(d => {
            const isSelected = selected?.id === d.id;
            const score      = d.dernier_score !== null && d.dernier_score !== undefined ? parseInt(d.dernier_score) : null;
            const nbAudits   = parseInt(d.nb_audits) || 0;
            const sColor     = scoreColor(score);

            return (
              <div key={d.id}>
                {/* Carte dossier */}
                <div
                  onClick={() => toggleSelect(d)}
                  style={{
                    background:P.card,
                    border:`1px solid ${isSelected ? P.accent+'50' : P.border}`,
                    borderLeft:`3px solid ${score !== null ? sColor : isSelected ? P.accent : P.border}`,
                    borderRadius:10, padding:'16px 18px', cursor:'pointer',
                    transition:'all .15s',
                  }}
                >
                  <div style={{display:'flex',alignItems:'center',gap:14}}>
                    {/* Score badge */}
                    <div style={{
                      width:52, height:52, borderRadius:10, flexShrink:0,
                      background:`${sColor}15`, border:`2px solid ${sColor}40`,
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center',
                    }}>
                      {score !== null ? (
                        <>
                          <div style={{fontSize:16,fontWeight:800,color:sColor,fontFamily:"'Playfair Display',serif",lineHeight:1}}>{score}%</div>
                          <div style={{fontSize:7,color:sColor,textTransform:'uppercase',letterSpacing:'.04em',marginTop:1}}>{scoreLabel(score)}</div>
                        </>
                      ) : (
                        <>
                          <div style={{fontSize:14,color:P.muted}}>—</div>
                          <div style={{fontSize:7,color:P.muted,textTransform:'uppercase'}}>Non analyse</div>
                        </>
                      )}
                    </div>

                    {/* Infos */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,color:P.text,fontSize:14,fontFamily:"'Playfair Display',serif"}}>{d.nom}</div>
                      <div style={{fontSize:10,color:P.muted,marginTop:3,display:'flex',gap:10,flexWrap:'wrap'}}>
                        {d.siret && <span>SIRET {d.siret}</span>}
                        {d.contact && <span>· {d.contact}</span>}
                        {d.email && <span>· {d.email}</span>}
                      </div>
                      {d.dernier_audit && (
                        <div style={{fontSize:9,color:P.dim,marginTop:4}}>
                          Derniere analyse : {fmtDate(d.dernier_audit)}
                        </div>
                      )}
                    </div>

                    {/* Compteur audits */}
                    <div style={{
                      background:P.surface, border:`1px solid ${P.border}`,
                      borderRadius:8, padding:'8px 12px', textAlign:'center', flexShrink:0,
                    }}>
                      <div style={{fontSize:18,fontWeight:800,color:P.text,fontFamily:"'Playfair Display',serif"}}>{nbAudits}</div>
                      <div style={{fontSize:8,color:P.muted,textTransform:'uppercase'}}>audit{nbAudits>1?'s':''}</div>
                    </div>

                    {/* Actions */}
                    <div style={{display:'flex',gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>onUploadForDossier&&onUploadForDossier(d)} style={{
                        background:`${P.accent}15`, border:`1px solid ${P.accent}30`,
                        color:P.accent, padding:'6px 12px', borderRadius:5,
                        fontSize:10, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace",
                        fontWeight:700,
                      }}>
                        {score !== null ? 'Reanalyser' : 'Lancer audit'}
                      </button>
                      <button onClick={(e)=>openEdit(d,e)} style={{
                        background:'transparent', border:`1px solid ${P.border}`,
                        color:P.muted, padding:'6px 10px', borderRadius:5,
                        fontSize:10, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace",
                      }}>Modifier</button>
                      <button onClick={(e)=>deleteDossier(d.id,e)} style={{
                        background:'transparent', border:`1px solid ${P.danger}40`,
                        color:P.danger, padding:'6px 10px', borderRadius:5,
                        fontSize:10, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace",
                      }}>x</button>
                    </div>
                  </div>
                </div>

                {/* Historique audits (expandable) */}
                {isSelected && (
                  <div style={{
                    marginLeft:16, marginTop:4, marginBottom:4,
                    background:P.surface, border:`1px solid ${P.accent}20`,
                    borderRadius:8, padding:'14px 16px',
                  }}>
                    <div style={{fontSize:10,color:P.accent,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:12}}>
                      Historique des audits
                    </div>
                    {!detailData?.audits || detailData.audits.length === 0 ? (
                      <div style={{fontSize:11,color:P.muted}}>
                        Aucun audit pour ce dossier.{' '}
                        <button onClick={()=>onUploadForDossier&&onUploadForDossier(d)}
                          style={{background:'none',border:'none',color:P.accent,fontSize:11,cursor:'pointer',textDecoration:'underline',fontFamily:"'JetBrains Mono',monospace"}}>
                          Lancer le premier audit
                        </button>
                      </div>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {detailData.audits.map((a,i) => {
                          const aScore = a.taux_conformite !== null ? parseInt(a.taux_conformite) : null;
                          const aC     = scoreColor(aScore);
                          return (
                            <div key={i} style={{
                              display:'flex', alignItems:'center', gap:12,
                              background:P.card, borderRadius:6, padding:'10px 14px',
                              border:`1px solid ${P.border}`,
                              borderLeft:`3px solid ${aC}`,
                            }}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,fontWeight:600,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.original_name}</div>
                                <div style={{fontSize:9,color:P.muted,marginTop:2,display:'flex',gap:8}}>
                                  <span>{fmtDate(a.uploaded_at)}</span>
                                  {a.row_count && <span>· {a.row_count} fournisseurs</span>}
                                </div>
                              </div>
                              {aScore !== null && (
                                <div style={{fontSize:20,fontWeight:800,color:aC,fontFamily:"'Playfair Display',serif",flexShrink:0}}>
                                  {aScore}%
                                </div>
                              )}
                              <div style={{
                                fontSize:9, fontWeight:700,
                                color: a.status==='done' ? P.accent : a.status==='error' ? P.danger : P.warn,
                                textTransform:'uppercase', flexShrink:0,
                              }}>
                                {a.status==='done' ? 'Termine' : a.status==='error' ? 'Erreur' : 'En cours'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
