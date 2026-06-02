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
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
}

async function apiFetch(path, method = 'GET', body = null) {
  const token = localStorage.getItem('dr_refresh');
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

export default function DossiersPanel({ onSelectDossier, onUploadForDossier }) {
  const [dossiers,    setDossiers]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editDossier, setEditDossier] = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [error,       setError]       = useState('');
  const [form,        setForm]        = useState({ nom:'', siret:'', contact:'', email:'', notes:'' });
  const [saving,      setSaving]      = useState(false);

  useEffect(() => { loadDossiers(); }, []);

  const loadDossiers = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/dossiers');
      setDossiers(data.dossiers || []);
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const openNew = () => {
    setForm({ nom:'', siret:'', contact:'', email:'', notes:'' });
    setEditDossier(null);
    setShowForm(true);
  };

  const openEdit = (d) => {
    setForm({ nom:d.nom||'', siret:d.siret||'', contact:d.contact||'', email:d.email||'', notes:d.notes||'' });
    setEditDossier(d);
    setShowForm(true);
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
    } catch(e) {
      setError(e.message);
    }
    setSaving(false);
  };

  const deleteDossier = async (id) => {
    if (!confirm('Supprimer ce dossier ? Les audits associes seront detaches.')) return;
    try {
      await apiFetch(`/api/dossiers/${id}`, 'DELETE');
      if (selected?.id === id) setSelected(null);
      await loadDossiers();
    } catch(e) {
      setError(e.message);
    }
  };

  const scoreColor = (v) => {
    if (v === null || v === undefined) return P.muted;
    return v >= 80 ? P.accent : v >= 50 ? P.warn : P.danger;
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

      {/* Erreur */}
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
            <div>
              <div style={{fontSize:9,color:P.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Nom du client *</div>
              <input
                style={{width:'100%',background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'9px 12px',color:P.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:'none'}}
                placeholder="Cabinet Dupont & Associes"
                value={form.nom}
                onChange={e=>setForm(f=>({...f,nom:e.target.value}))}
              />
            </div>
            <div>
              <div style={{fontSize:9,color:P.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>SIRET</div>
              <input
                style={{width:'100%',background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'9px 12px',color:P.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:'none'}}
                placeholder="12345678901234"
                value={form.siret}
                onChange={e=>setForm(f=>({...f,siret:e.target.value}))}
              />
            </div>
            <div>
              <div style={{fontSize:9,color:P.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Contact</div>
              <input
                style={{width:'100%',background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'9px 12px',color:P.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:'none'}}
                placeholder="Jean Dupont"
                value={form.contact}
                onChange={e=>setForm(f=>({...f,contact:e.target.value}))}
              />
            </div>
            <div>
              <div style={{fontSize:9,color:P.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Email</div>
              <input
                style={{width:'100%',background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'9px 12px',color:P.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:'none'}}
                placeholder="jean@dupont.fr"
                value={form.email}
                onChange={e=>setForm(f=>({...f,email:e.target.value}))}
              />
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:P.muted,marginBottom:4,textTransform:'uppercase',letterSpacing:'.06em'}}>Notes</div>
            <textarea
              style={{width:'100%',background:P.card,border:`1px solid ${P.border}`,borderRadius:6,padding:'9px 12px',color:P.text,fontSize:12,fontFamily:"'JetBrains Mono',monospace",outline:'none',resize:'vertical',minHeight:60}}
              placeholder="Informations complementaires…"
              value={form.notes}
              onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
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
            }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste dossiers */}
      {loading ? (
        <div style={{textAlign:'center',padding:'40px 0',color:P.muted,fontSize:12}}>
          Chargement des dossiers…
        </div>
      ) : dossiers.length === 0 ? (
        <div style={{
          background:P.card, border:`1px dashed ${P.border}`, borderRadius:10,
          padding:'60px 40px', textAlign:'center',
        }}>
          <div style={{fontSize:36,marginBottom:12,color:P.dim}}>+</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:600,marginBottom:8}}>
            Aucun dossier client
          </div>
          <div style={{fontSize:11,color:P.muted,marginBottom:20,lineHeight:1.6}}>
            Creez un dossier par client pour organiser<br/>vos audits de conformite e-Invoicing 2026.
          </div>
          <button onClick={openNew} style={{
            background:P.accent, color:'#000', fontWeight:700, padding:'10px 24px',
            borderRadius:6, border:'none', fontSize:11, cursor:'pointer',
            fontFamily:"'JetBrains Mono',monospace",
          }}>
            + Creer le premier dossier
          </button>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {dossiers.map(d => {
            const isSelected = selected?.id === d.id;
            const nbAudits   = parseInt(d.nb_audits) || 0;
            return (
              <div key={d.id}>
                <div
                  onClick={() => setSelected(isSelected ? null : d)}
                  style={{
                    background:P.card, border:`1px solid ${isSelected?P.accent+'40':P.border}`,
                    borderLeft:`3px solid ${isSelected?P.accent:P.border}`,
                    borderRadius:10, padding:'14px 16px', cursor:'pointer',
                    transition:'all .15s',
                  }}
                >
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    {/* Icone */}
                    <div style={{
                      width:38,height:38,borderRadius:8,
                      background:`${P.blue}15`,border:`1px solid ${P.blue}30`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:16,flexShrink:0,color:P.blue,fontWeight:700,
                      fontFamily:"'Playfair Display',serif",
                    }}>
                      {d.nom.charAt(0).toUpperCase()}
                    </div>

                    {/* Infos */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,color:P.text,fontSize:13}}>{d.nom}</div>
                      <div style={{fontSize:10,color:P.muted,marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                        {d.siret && <span>SIRET : {d.siret}</span>}
                        {d.contact && <span>· {d.contact}</span>}
                        {d.email && <span>· {d.email}</span>}
                        {!d.siret && !d.contact && !d.email && <span>Aucune information</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0}}>
                      <div style={{
                        background:P.surface, border:`1px solid ${P.border}`,
                        borderRadius:6, padding:'4px 10px', fontSize:10, color:P.chrome,
                        textAlign:'center',
                      }}>
                        <div style={{fontWeight:700,color:P.text}}>{nbAudits}</div>
                        <div style={{fontSize:8,color:P.muted}}>audit{nbAudits>1?'s':''}</div>
                      </div>
                      {d.dernier_audit && (
                        <div style={{fontSize:9,color:P.muted,textAlign:'right'}}>
                          <div>Dernier audit</div>
                          <div style={{color:P.chrome}}>{fmtDate(d.dernier_audit)}</div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{display:'flex',gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>onUploadForDossier&&onUploadForDossier(d)} style={{
                        background:`${P.accent}15`, border:`1px solid ${P.accent}30`,
                        color:P.accent, padding:'5px 10px', borderRadius:5,
                        fontSize:9, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace",
                        fontWeight:700, textTransform:'uppercase',
                      }}>
                        + Audit
                      </button>
                      <button onClick={()=>openEdit(d)} style={{
                        background:'transparent', border:`1px solid ${P.border}`,
                        color:P.muted, padding:'5px 10px', borderRadius:5,
                        fontSize:9, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace",
                      }}>
                        Modifier
                      </button>
                      <button onClick={()=>deleteDossier(d.id)} style={{
                        background:'transparent', border:`1px solid ${P.danger}40`,
                        color:P.danger, padding:'5px 10px', borderRadius:5,
                        fontSize:9, cursor:'pointer', fontFamily:"'JetBrains Mono',monospace",
                      }}>
                        x
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audits du dossier (expandable) */}
                {isSelected && (
                  <div style={{
                    marginLeft:16, marginTop:4,
                    background:P.surface, border:`1px solid ${P.accent}20`,
                    borderRadius:8, padding:'12px 16px',
                  }}>
                    <div style={{fontSize:10,color:P.accent,fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:10}}>
                      Historique des audits
                    </div>
                    {!d.audits || d.audits.length === 0 ? (
                      <div style={{fontSize:11,color:P.muted,fontStyle:'italic'}}>
                        Aucun audit pour ce dossier.
                        <button onClick={()=>onUploadForDossier&&onUploadForDossier(d)}
                          style={{marginLeft:8,background:'none',border:'none',color:P.accent,fontSize:11,cursor:'pointer',textDecoration:'underline'}}>
                          Lancer un audit
                        </button>
                      </div>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        {(d.audits||[]).map((a,i)=>(
                          <div key={i} style={{
                            display:'flex',alignItems:'center',gap:10,
                            background:P.card,borderRadius:6,padding:'8px 12px',
                            border:`1px solid ${P.border}`,
                          }}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:11,fontWeight:600,color:P.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.nom}</div>
                              <div style={{fontSize:9,color:P.muted,marginTop:1}}>{fmtDate(a.date)}</div>
                            </div>
                            {a.taux !== null && a.taux !== undefined && (
                              <div style={{
                                fontSize:13,fontWeight:800,color:scoreColor(a.taux),
                                fontFamily:"'Playfair Display',serif",flexShrink:0,
                              }}>
                                {a.taux}%
                              </div>
                            )}
                            <div style={{
                              fontSize:9,fontWeight:600,color:a.status==='done'?P.accent:a.status==='error'?P.danger:P.warn,
                              textTransform:'uppercase',flexShrink:0,
                            }}>
                              {a.status==='done'?'Termine':a.status==='error'?'Erreur':'En cours'}
                            </div>
                          </div>
                        ))}
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
