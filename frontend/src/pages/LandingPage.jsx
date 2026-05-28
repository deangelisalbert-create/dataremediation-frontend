    import { useState, useEffect } from "react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0D0F14;
    --paper: #F5F3EE;
    --cream: #EDE9E1;
    --gold: #C9A84C;
    --gold-light: #E8C97A;
    --muted: #6B6B72;
    --border: rgba(201,168,76,0.2);
  }

  body { background: var(--ink); color: var(--paper); font-family: 'DM Sans', sans-serif; }

  .landing {
    min-height: 100vh;
    background: var(--ink);
    overflow: hidden;
    position: relative;
  }

  /* Background texture */
  .landing::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: 
      radial-gradient(ellipse 80% 60% at 70% -10%, rgba(201,168,76,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at -10% 80%, rgba(201,168,76,0.05) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  /* NAV */
  .nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 48px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    background: rgba(13,15,20,0.8);
    backdrop-filter: blur(12px);
  }

  .nav-logo {
    font-family: 'Playfair Display', serif;
    font-size: 1.25rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--paper);
  }

  .nav-logo span { color: var(--gold); }

  .nav-cta {
    font-size: 0.8rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--gold);
    border: 1px solid var(--border);
    padding: 10px 24px;
    cursor: pointer;
    background: transparent;
    transition: all 0.25s ease;
    font-family: 'DM Sans', sans-serif;
  }

  .nav-cta:hover {
    background: var(--gold);
    color: var(--ink);
    border-color: var(--gold);
  }

  /* HERO */
  .hero {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 140px 48px 80px;
    max-width: 900px;
  }

  .hero-eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    gap: 12px;
    opacity: 0;
    animation: fadeUp 0.7s ease 0.1s forwards;
  }

  .hero-eyebrow::before {
    content: '';
    display: block;
    width: 32px;
    height: 1px;
    background: var(--gold);
  }

  .hero-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2.8rem, 6vw, 5.2rem);
    font-weight: 400;
    line-height: 1.08;
    letter-spacing: -0.02em;
    color: var(--paper);
    margin-bottom: 32px;
    opacity: 0;
    animation: fadeUp 0.8s ease 0.25s forwards;
  }

  .hero-title em {
    font-style: italic;
    color: var(--gold);
  }

  .hero-subtitle {
    font-size: 1.05rem;
    font-weight: 300;
    line-height: 1.7;
    color: var(--muted);
    max-width: 520px;
    margin-bottom: 52px;
    opacity: 0;
    animation: fadeUp 0.8s ease 0.4s forwards;
  }

  .hero-actions {
    display: flex;
    align-items: center;
    gap: 24px;
    opacity: 0;
    animation: fadeUp 0.8s ease 0.55s forwards;
  }

  .btn-primary {
    background: var(--gold);
    color: var(--ink);
    border: none;
    padding: 16px 40px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.25s ease;
    position: relative;
    overflow: hidden;
  }

  .btn-primary::after {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255,255,255,0.15);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .btn-primary:hover::after { opacity: 1; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(201,168,76,0.25); }

  .btn-link {
    font-size: 0.85rem;
    color: var(--muted);
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: color 0.2s;
  }

  .btn-link:hover { color: var(--paper); }
  .btn-link::after { content: '→'; transition: transform 0.2s; }
  .btn-link:hover::after { transform: translateX(4px); }

  /* DIVIDER */
  .section-divider {
    position: relative;
    z-index: 1;
    border: none;
    border-top: 1px solid rgba(255,255,255,0.06);
    margin: 0 48px;
  }

  /* FEATURES */
  .features {
    position: relative;
    z-index: 1;
    padding: 96px 48px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    background: rgba(255,255,255,0.03);
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .feature {
    padding: 48px 40px;
    border-right: 1px solid rgba(255,255,255,0.06);
    opacity: 0;
    animation: fadeUp 0.7s ease forwards;
  }

  .feature:last-child { border-right: none; }
  .feature:nth-child(1) { animation-delay: 0.1s; }
  .feature:nth-child(2) { animation-delay: 0.2s; }
  .feature:nth-child(3) { animation-delay: 0.3s; }

  .feature-number {
    font-family: 'Playfair Display', serif;
    font-size: 2.5rem;
    color: var(--gold);
    opacity: 0.3;
    line-height: 1;
    margin-bottom: 20px;
  }

  .feature-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.15rem;
    font-weight: 500;
    color: var(--paper);
    margin-bottom: 12px;
  }

  .feature-text {
    font-size: 0.88rem;
    line-height: 1.75;
    color: var(--muted);
    font-weight: 300;
  }

  /* COMPLIANCE BAND */
  .compliance {
    position: relative;
    z-index: 1;
    padding: 80px 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 48px;
  }

  .compliance-label {
    font-size: 0.7rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 16px;
  }

  .compliance-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(1.6rem, 3vw, 2.4rem);
    font-weight: 400;
    color: var(--paper);
    max-width: 500px;
    line-height: 1.2;
  }

  .compliance-badges {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex-shrink: 0;
  }

  .badge {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    border: 1px solid var(--border);
    background: rgba(201,168,76,0.04);
    font-size: 0.8rem;
    color: var(--paper);
    letter-spacing: 0.04em;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--gold);
    flex-shrink: 0;
  }

  /* CTA SECTION */
  .cta-section {
    position: relative;
    z-index: 1;
    text-align: center;
    padding: 96px 48px 80px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .cta-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 400;
    color: var(--paper);
    margin-bottom: 16px;
  }

  .cta-sub {
    font-size: 0.95rem;
    color: var(--muted);
    margin-bottom: 40px;
    font-weight: 300;
  }

  /* FOOTER */
  .footer {
    position: relative;
    z-index: 1;
    padding: 24px 48px;
    border-top: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-logo {
    font-family: 'Playfair Display', serif;
    font-size: 0.9rem;
    color: var(--muted);
  }

  .footer-text {
    font-size: 0.75rem;
    color: rgba(107,107,114,0.6);
    letter-spacing: 0.04em;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 768px) {
    .nav { padding: 20px 24px; }
    .hero { padding: 120px 24px 60px; }
    .features { grid-template-columns: 1fr; padding: 48px 24px; }
    .feature { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 36px 0; }
    .feature:last-child { border-bottom: none; }
    .compliance { flex-direction: column; padding: 60px 24px; align-items: flex-start; }
    .cta-section { padding: 72px 24px 60px; }
    .footer { flex-direction: column; gap: 8px; padding: 24px; text-align: center; }
    .section-divider { margin: 0 24px; }
  }
`;

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAccess = () => {
    window.location.href = "/login";
  };

  return (
    <>
      <style>{styles}</style>
      <div className="landing">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            Data<span>Remédiation</span>
          </div>
          <button className="nav-cta" onClick={handleAccess}>
            Accéder
          </button>
        </nav>

        {/* HERO */}
        <section className="hero">
          <div className="hero-eyebrow">Agent IA · e-Facturation B2B</div>
          <h1 className="hero-title">
            La conformité facture,<br />
            <em>automatisée.</em>
          </h1>
          <p className="hero-subtitle">
            DataRemédiation analyse, corrige et valide vos flux de facturation électronique
            avant transmission. Conçu pour les cabinets comptables et leurs clients.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={handleAccess}>
              Accéder à l'espace client
            </button>
            <button className="btn-link" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              En savoir plus
            </button>
          </div>
        </section>

        {/* FEATURES */}
        <section className="features" id="features">
          {[
            {
              n: "01",
              title: "Détection intelligente",
              text: "L'agent identifie automatiquement les anomalies dans vos factures : TVA incorrecte, mentions obligatoires manquantes, format non conforme."
            },
            {
              n: "02",
              title: "Remédiation assistée",
              text: "Chaque anomalie est expliquée et corrigée avec suggestion de modification. Validation humaine préservée pour chaque décision."
            },
            {
              n: "03",
              title: "Traçabilité complète",
              text: "Historique d'audit détaillé pour chaque facture traitée. Exportable à tout moment pour vos dossiers de conformité."
            }
          ].map((f) => (
            <div className="feature" key={f.n}>
              <div className="feature-number">{f.n}</div>
              <div className="feature-title">{f.title}</div>
              <p className="feature-text">{f.text}</p>
            </div>
          ))}
        </section>

        {/* COMPLIANCE */}
        <section className="compliance">
          <div>
            <div className="compliance-label">Conformité réglementaire</div>
            <h2 className="compliance-title">
              Aligné sur les exigences de la réforme e-Invoicing 2026
            </h2>
          </div>
          <div className="compliance-badges">
            {[
              "Directive EN 16931",
              "Format Factur-X / UBL",
              "Plateforme Publique de Facturation",
              "RGPD & sécurité des données"
            ].map((label) => (
              <div className="badge" key={label}>
                <span className="badge-dot" />
                {label}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <h2 className="cta-title">Votre espace vous attend.</h2>
          <p className="cta-sub">Connectez-vous pour accéder à vos dossiers clients et flux de facturation.</p>
          <button className="btn-primary" onClick={handleAccess}>
            Accéder à l'espace client
          </button>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <div className="footer-logo">DataRemédiation</div>
          <div className="footer-text">© 2026 · Tous droits réservés</div>
        </footer>
      </div>
    </>
  );
}

    
