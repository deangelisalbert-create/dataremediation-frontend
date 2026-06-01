// components/RapportPanel.jsx — Rapport complet DataRemédiation
// Dépendances : recharts (déjà dispo dans le projet React)
// Import dans ton dashboard : import RapportPanel from './RapportPanel';
// Usage : <RapportPanel rapport={auditResult.rapport} />

import { useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, RadialBarChart, RadialBar
} from "recharts";

// ── Palette & tokens ──────────────────────────────────────
const C = {
  bg:       "#0a0f1e",
  surface:  "#111827",
  border:   "#1e2d45",
  accent:   "#00d4ff",
  green:    "#22c55e",
  orange:   "#f59e0b",
  red:      "#ef4444",
  purple:   "#8b5cf6",
  muted:    "#64748b",
  text:     "#e2e8f0",
  textDim:  "#94a3b8",
};

// ── Composants utilitaires ────────────────────────────────
const Badge = ({ label, color }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 700, letterSpacing: 1,
    background: color + "22", color, border: `1px solid ${color}44`,
    textTransform: "uppercase",
  }}>{label}</span>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "20px 24px",
    ...style,
  }}>{children}</div>
);

const SectionTitle = ({ icon, title, sub }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <h2 style={{
        margin: 0, fontSize: 15, fontWeight: 700,
        color: C.text, letterSpacing: 0.5,
        fontFamily: "'DM Mono', monospace",
      }}>{title}</h2>
    </div>
    {sub && <p style={{ margin: "4px 0 0 28px", fontSize: 12, color: C.textDim }}>{sub}</p>}
  </div>
);

const Divider = () => (
  <div style={{ borderTop: `1px solid ${C.border}`, margin: "24px 0" }} />
);

// ── Niveau de risque → couleur ────────────────────────────
function riskColor(niveau) {
  if (!niveau) return C.muted;
  const n = niveau.toLowerCase();
  if (n === "faible")   return C.green;
  if (n === "modéré")   return C.orange;
  if (n === "élevé")    return C.red;
  if (n === "critique") return "#ff0055";
  return C.muted;
}

// ── Priorité → couleur ────────────────────────────────────
function prioriteColor(p) {
  if (!p) return C.muted;
  return p === "CRITIQUE" ? C.red : C.orange;
}

// ── Score → couleur ───────────────────────────────────────
function scoreColor(s) {
  if (s >= 80) return C.green;
  if (s >= 50) return C.orange;
  return C.red;
}

// ══════════════════════════════════════════════════════════
// SECTION 1 — Score Exécutif
// ══════════════════════════════════════════════════════════
function ScoreExecutif({ data }) {
  if (!data) return null;
  const { score_global, niveau_risque, interpretation, resume } = data;
  const color = riskColor(niveau_risque);

  const kpis = [
    { label: "Analysés",        value: resume.fournisseurs_analyses,       color: C.accent },
    { label: "Conformes",       value: resume.fournisseurs_conformes,       color: C.green },
    { label: "Anomalies",       value: resume.anomalies_detectees,          color: C.orange },
    { label: "Bloquants",       value: resume.fournisseurs_bloquants,       color: C.red },
    { label: "Doublons",        value: resume.doublons,                     color: C.purple },
    { label: "SIRET invalides", value: resume.siret_invalides,              color: C.red },
    { label: "TVA incoh.",      value: resume.tva_incoherentes,             color: C.orange },
    { label: "Champs manq.",    value: resume.champs_critiques_manquants,   color: C.muted },
  ];

  return (
    <Card>
      <SectionTitle icon="🎯" title="Score Exécutif" />
      <div style={{ display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" }}>

        {/* Jauge circulaire */}
        <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="58" fill="none" stroke={C.border} strokeWidth="10" />
            <circle
              cx="70" cy="70" r="58" fill="none"
              stroke={color} strokeWidth="10"
              strokeDasharray={`${(score_global / 100) * 364} 364`}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dasharray 1s ease" }}
            />
          </svg>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 30, fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>
              {score_global}%
            </span>
            <Badge label={niveau_risque} color={color} />
          </div>
        </div>

        {/* Interprétation */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{
            margin: "0 0 16px", fontSize: 13, color: C.textDim,
            lineHeight: 1.6, fontStyle: "italic",
            borderLeft: `3px solid ${color}`, paddingLeft: 12,
          }}>{interpretation}</p>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {kpis.map(k => (
              <div key={k.label} style={{
                background: C.bg, borderRadius: 8, padding: "8px 12px",
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: "'DM Mono', monospace" }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 2 — Tableau de Bord
// ══════════════════════════════════════════════════════════
function TableauDeBord({ data }) {
  if (!data) return null;
  const { graphiques, taux_conformite_par_categorie } = data;

  return (
    <Card>
      <SectionTitle icon="📊" title="Tableau de Bord" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, flexWrap: "wrap" }}>

        {/* Pie — Répartition statuts */}
        <div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textDim, fontWeight: 600 }}>
            RÉPARTITION FOURNISSEURS
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={graphiques.pie_statuts}
                cx="50%" cy="50%"
                innerRadius={45} outerRadius={75}
                dataKey="value" paddingAngle={3}
              >
                {graphiques.pie_statuts.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}
                labelStyle={{ color: C.text }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {graphiques.pie_statuts.map(s => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ color: C.textDim }}>{s.name}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar — Anomalies par type */}
        <div>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textDim, fontWeight: 600 }}>
            ANOMALIES PAR TYPE
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={graphiques.bar_anomalies} layout="vertical">
              <XAxis type="number" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textDim, fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {graphiques.bar_anomalies.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Taux par catégorie */}
      <Divider />
      <p style={{ margin: "0 0 12px", fontSize: 12, color: C.textDim, fontWeight: 600 }}>
        TAUX DE CONFORMITÉ PAR CATÉGORIE
      </p>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(taux_conformite_par_categorie).map(([key, val]) => (
          <div key={key} style={{
            flex: 1, minWidth: 100, background: C.bg,
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: scoreColor(val), fontFamily: "'DM Mono', monospace" }}>
              {val}%
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2, textTransform: "uppercase" }}>{key}</div>
            <div style={{
              marginTop: 8, height: 4, borderRadius: 2,
              background: C.border, overflow: "hidden",
            }}>
              <div style={{ width: `${val}%`, height: "100%", background: scoreColor(val), borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 3 — Détail des Anomalies
// ══════════════════════════════════════════════════════════
function DetailAnomalies({ data }) {
  if (!data) return null;
  const [expanded, setExpanded] = useState(null);
  const { liste, total_anomalies } = data;

  if (total_anomalies === 0) {
    return (
      <Card>
        <SectionTitle icon="✅" title="Détail des Anomalies" />
        <p style={{ color: C.green, fontSize: 13 }}>Aucune anomalie détectée — base fournisseurs conforme.</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle
        icon="🔍"
        title="Détail des Anomalies"
        sub={`${total_anomalies} fournisseur(s) avec anomalies`}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {liste.map((a, i) => (
          <div
            key={i}
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "12px 16px", cursor: "pointer",
              transition: "border-color 0.2s",
              borderColor: expanded === i ? C.accent + "66" : C.border,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 11, fontFamily: "'DM Mono', monospace",
                color: C.muted, minWidth: 80,
              }}>{a.alias}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text, flex: 1 }}>{a.nom}</span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {a.types_anomalie.map((t, j) => (
                  <Badge key={j} label={t} color={C.orange} />
                ))}
              </div>
            </div>

            {expanded === i && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
                  {[
                    { label: "SIRET", ok: a.details.siret_ok },
                    { label: "TVA",   ok: a.details.tva_ok },
                    { label: "SIREN", ok: a.details.siren_coherent },
                  ].map(d => (
                    <span key={d.label} style={{ fontSize: 12, color: d.ok ? C.green : C.red }}>
                      {d.ok ? "✓" : "✗"} {d.label}
                    </span>
                  ))}
                </div>
                {a.erreurs?.map((e, j) => (
                  <p key={j} style={{ margin: "4px 0", fontSize: 12, color: C.textDim }}>• {e}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 4 — Plan de Remédiation
// ══════════════════════════════════════════════════════════
function PlanRemediation({ data }) {
  if (!data) return null;
  const { total_actions, actions_critiques, par_priorite } = data;

  if (total_actions === 0) {
    return (
      <Card>
        <SectionTitle icon="🛠️" title="Plan de Remédiation" />
        <p style={{ color: C.green, fontSize: 13 }}>Aucune action corrective requise.</p>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle
        icon="🛠️"
        title="Plan de Remédiation"
        sub={`${total_actions} actions — dont ${actions_critiques} critique(s)`}
      />

      {["CRITIQUE", "MODÉRÉE"].map(prio => {
        const actions = par_priorite[prio] || [];
        if (actions.length === 0) return null;
        return (
          <div key={prio} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 3, height: 16, background: prioriteColor(prio), borderRadius: 2 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: prioriteColor(prio), letterSpacing: 1 }}>
                {prio} — {actions.length} action(s)
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {actions.map((a, i) => (
                <div key={i} style={{
                  background: C.bg, borderRadius: 8, padding: "14px 16px",
                  border: `1px solid ${prioriteColor(prio)}33`,
                  borderLeft: `3px solid ${prioriteColor(prio)}`,
                }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: C.text }}>
                        {a.fournisseur}
                      </p>
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: C.red }}>⚠ {a.probleme}</p>
                      <p style={{ margin: "0 0 6px", fontSize: 12, color: C.textDim }}>
                        → {a.correction_proposee}
                      </p>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: C.muted }}>Impact : {a.impact_metier}</span>
                        <span style={{ fontSize: 11, color: C.accent }}>⏱ {a.delai_recommande}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 5 — Scoring Fournisseurs
// ══════════════════════════════════════════════════════════
function ScoringFournisseurs({ data }) {
  if (!data) return null;
  const { fournisseurs, score_moyen, distribution } = data;
  const [filter, setFilter] = useState("tous");

  const filtered = filter === "tous"
    ? fournisseurs
    : fournisseurs.filter(f => f.categorie === filter);

  const cats = [
    { key: "tous",             label: "Tous",             color: C.accent },
    { key: "Action immédiate", label: "Action immédiate", color: C.red },
    { key: "À surveiller",     label: "À surveiller",     color: C.orange },
    { key: "Conforme",         label: "Conformes",        color: C.green },
  ];

  return (
    <Card>
      <SectionTitle
        icon="🏆"
        title="Scoring Fournisseurs"
        sub={`Score moyen : ${score_moyen}/100`}
      />

      {/* Distribution pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            style={{
              padding: "5px 14px", borderRadius: 20, border: "none",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filter === c.key ? c.color : C.bg,
              color: filter === c.key ? "#000" : c.color,
              border: `1px solid ${c.color}44`,
              transition: "all 0.2s",
            }}
          >
            {c.label}
            {c.key !== "tous" && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                {distribution[
                  c.key === "Action immédiate" ? "action_immediate"
                  : c.key === "À surveiller" ? "a_surveiller"
                  : "conformes"
                ]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
        {filtered.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: C.bg, borderRadius: 8, padding: "10px 14px",
            border: `1px solid ${C.border}`,
          }}>
            {/* Score badge */}
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              border: `2px solid ${scoreColor(f.score)}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 800, color: scoreColor(f.score),
              fontFamily: "'DM Mono', monospace",
            }}>{f.score}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {f.nom}
              </p>
              {f.penalites.length > 0 && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>
                  {f.penalites.join(" · ")}
                </p>
              )}
            </div>

            <Badge
              label={f.categorie}
              color={f.categorie === "Conforme" ? C.green : f.categorie === "À surveiller" ? C.orange : C.red}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 6 — Suivi Mensuel
// ══════════════════════════════════════════════════════════
function SuiviMensuel({ data }) {
  if (!data) return null;

  return (
    <Card>
      <SectionTitle icon="📅" title="Suivi Mensuel" sub={data.periode} />
      {!data.historique_disponible ? (
        <div style={{
          background: C.bg, borderRadius: 8, padding: "16px 20px",
          border: `1px dashed ${C.border}`, textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: 13, color: C.textDim }}>{data.message}</p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: C.muted }}>
            Le suivi mensuel sera disponible dès le prochain audit.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            { label: "Score actuel",         value: `${data.score_actuel}%`,        color: scoreColor(data.score_actuel) },
            { label: "Score précédent",      value: `${data.score_precedent}%`,     color: C.muted },
            { label: "Évolution",            value: `${data.evolution > 0 ? "+" : ""}${data.evolution}%`, color: data.evolution >= 0 ? C.green : C.red },
            { label: "Nouvelles anomalies",  value: data.nouvelles_anomalies,       color: C.orange },
          ].map(k => (
            <div key={k.label} style={{
              flex: 1, minWidth: 120, background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px",
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontFamily: "'DM Mono', monospace" }}>
                {k.value}
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
          <div style={{ width: "100%", background: C.bg, borderRadius: 8, padding: "12px 16px", border: `1px solid ${C.border}` }}>
            <p style={{ margin: 0, fontSize: 13, color: C.textDim, fontStyle: "italic" }}>{data.message}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 7 — Indicateurs de Valeur
// ══════════════════════════════════════════════════════════
function IndicateursValeur({ data }) {
  if (!data) return null;

  const kpis = [
    { label: "Anomalies détectées",     value: data.anomalies_detectees,        unit: "",   color: C.accent },
    { label: "Temps économisé",         value: data.temps_manuel_economise_h,   unit: "h",  color: C.green },
    { label: "Coût interne évité",      value: `${data.cout_interne_estime_eur} €`,    unit: "", color: C.green },
    { label: "Gain total estimé",       value: `${data.gain_total_estime_eur} €`,      unit: "", color: C.green },
  ];

  return (
    <Card>
      <SectionTitle icon="💶" title="Indicateurs de Valeur" sub="ROI estimé de l'audit" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: k.color, fontFamily: "'DM Mono', monospace" }}>
              {k.value}{k.unit}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: C.accent + "11", border: `1px solid ${C.accent}33`,
        borderRadius: 8, padding: "12px 16px",
      }}>
        <p style={{ margin: 0, fontSize: 13, color: C.accent }}>{data.message_valeur}</p>
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 11, color: C.muted }}>
        * Hypothèses : {data.hypotheses.temps_par_anomalie_h}h/anomalie · {data.hypotheses.taux_horaire_eur}€/h · {data.hypotheses.cout_rejet_facture_eur}€/rejet
      </p>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// SECTION 8 — Contrôles Premium
// ══════════════════════════════════════════════════════════
function ControlesPremium({ data }) {
  if (!data) return null;

  return (
    <Card style={{ border: `1px solid ${C.purple}44` }}>
      <SectionTitle icon="⭐" title="Contrôles Premium" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>

        <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.purple, fontFamily: "'DM Mono', monospace" }}>
            {data.doublons_detectes.count}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Doublons détectés</div>
          {data.doublons_detectes.liste.map((d, i) => (
            <p key={i} style={{ margin: "6px 0 0", fontSize: 11, color: C.textDim }}>
              SIREN {d.siren} : {d.fournisseurs.join(" / ")}
            </p>
          ))}
        </div>

        <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.red, fontFamily: "'DM Mono', monospace" }}>
            {data.alertes_fraude_potentielle.count}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Alertes fraude potentielle</div>
          {data.alertes_fraude_potentielle.liste.map((a, i) => (
            <p key={i} style={{ margin: "6px 0 0", fontSize: 11, color: C.red }}>⚠ {a.nom}</p>
          ))}
        </div>

        <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.orange, fontFamily: "'DM Mono', monospace" }}>
            {data.incoherences_avancees.count}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Incohérences avancées</div>
          {data.incoherences_avancees.liste.map((a, i) => (
            <p key={i} style={{ margin: "6px 0 0", fontSize: 11, color: C.orange }}>• {a.nom}</p>
          ))}
        </div>
      </div>

      <p style={{ margin: "14px 0 0", fontSize: 11, color: C.muted, fontStyle: "italic" }}>
        {data.note}
      </p>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function RapportPanel({ rapport }) {
  const [activeSection, setActiveSection] = useState(null);

  if (!rapport) {
    return (
      <div style={{
        background: C.surface, border: `1px dashed ${C.border}`,
        borderRadius: 12, padding: 40, textAlign: "center",
      }}>
        <p style={{ color: C.muted, fontSize: 14 }}>Aucun rapport disponible pour cet audit.</p>
      </div>
    );
  }

  const sections = [
    { key: "score_executif",      label: "Score",        icon: "🎯" },
    { key: "tableau_de_bord",     label: "Dashboard",    icon: "📊" },
    { key: "detail_anomalies",    label: "Anomalies",    icon: "🔍" },
    { key: "plan_remediation",    label: "Remédiation",  icon: "🛠️" },
    { key: "scoring_fournisseurs",label: "Scoring",      icon: "🏆" },
    { key: "suivi_mensuel",       label: "Suivi",        icon: "📅" },
    { key: "indicateurs_valeur",  label: "ROI",          icon: "💶" },
    { key: "controles_premium",   label: "Premium",      icon: "⭐" },
  ];

  return (
    <div style={{
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: C.bg, minHeight: "100vh", padding: "0 0 40px",
    }}>
      {/* Header */}
      <div style={{
        background: C.surface, borderBottom: `1px solid ${C.border}`,
        padding: "16px 24px", marginBottom: 24,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 16, fontWeight: 800, color: C.text,
            fontFamily: "'DM Mono', monospace", letterSpacing: 1,
          }}>
            <span style={{ color: C.accent }}>DATA</span>REMÉDIATION
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>
            {rapport.meta?.fichier} · {rapport.meta?.genere_le}
          </p>
        </div>
        <Badge
          label={`Risque ${rapport.score_executif?.niveau_risque || "—"}`}
          color={riskColor(rapport.score_executif?.niveau_risque)}
        />
      </div>

      {/* Nav pills */}
      <div style={{
        display: "flex", gap: 6, padding: "0 24px", marginBottom: 20,
        overflowX: "auto", flexWrap: "nowrap",
      }}>
        {sections.map(s => (
          <a
            key={s.key}
            href={`#${s.key}`}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap",
              fontSize: 12, fontWeight: 600, textDecoration: "none",
              background: C.surface, color: C.textDim,
              border: `1px solid ${C.border}`,
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accent + "66"; }}
            onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}
          >
            {s.icon} {s.label}
          </a>
        ))}
      </div>

      {/* Sections */}
      <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div id="score_executif"><ScoreExecutif data={rapport.score_executif} /></div>
        <div id="tableau_de_bord"><TableauDeBord data={rapport.tableau_de_bord} /></div>
        <div id="detail_anomalies"><DetailAnomalies data={rapport.detail_anomalies} /></div>
        <div id="plan_remediation"><PlanRemediation data={rapport.plan_remediation} /></div>
        <div id="scoring_fournisseurs"><ScoringFournisseurs data={rapport.scoring_fournisseurs} /></div>
        <div id="suivi_mensuel"><SuiviMensuel data={rapport.suivi_mensuel} /></div>
        <div id="indicateurs_valeur"><IndicateursValeur data={rapport.indicateurs_valeur} /></div>
        <div id="controles_premium"><ControlesPremium data={rapport.controles_premium} /></div>
      </div>
    </div>
  );
}
