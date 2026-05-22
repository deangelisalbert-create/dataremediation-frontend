    // frontend/src/components/PaymentButton.jsx

const STRIPE_LINKS = {
  starter:  'https://buy.stripe.com/dRm9AMe876QN5qq5SXfQI01', // 1-50   → 490 € HT
  pme:      'https://buy.stripe.com/7sY5kw5BB6QN3ii6X1fQI02', // 51-200 → 1 490 € HT
  eti:      'https://buy.stripe.com/bJe3coaVV1wt0661CHfQI03', // 201-500→ 4 900 € HT
};

const PALIERS = [
  { key: 'starter', max: 50,  label: 'Starter',         prix: '490 € HT',   desc: '1 à 50 fournisseurs'   },
  { key: 'pme',     max: 200, label: 'PME BTP',         prix: '1 490 € HT', desc: '51 à 200 fournisseurs' },
  { key: 'eti',     max: 500, label: 'PME Structurée',  prix: '4 900 € HT', desc: '201 à 500 fournisseurs'},
];

function getPalier(nbFournisseurs) {
  if (nbFournisseurs <= 50)  return PALIERS[0];
  if (nbFournisseurs <= 200) return PALIERS[1];
  if (nbFournisseurs <= 500) return PALIERS[2];
  return null; // 500+ → sur devis
}

export function PaymentButton({ userEmail, fileName, nbFournisseurs = 0 }) {
  const palier = getPalier(nbFournisseurs);

  // 500+ fournisseurs → sur devis
  if (!palier) {
    return (
      <div style={{
        width: '100%',
        background: '#3d8eff18',
        border: '1px solid #3d8eff40',
        borderRadius: '8px',
        padding: '14px 16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 11, color: '#3d8eff', fontWeight: 700, marginBottom: 4 }}>
          📋 Volume important ({nbFournisseurs} fournisseurs détectés)
        </div>
        <div style={{ fontSize: 10, color: '#4a5878', marginBottom: 10 }}>
          Pour 500+ fournisseurs, contactez-nous pour un devis personnalisé.
        </div>
        <a
          href="mailto:contact@dataremediation.fr"
          style={{
            display: 'inline-block',
            background: '#3d8eff',
            color: '#000',
            fontWeight: 700,
            padding: '9px 20px',
            borderRadius: '6px',
            fontSize: '11px',
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            textDecoration: 'none',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ✉ Demander un devis
        </a>
      </div>
    );
  }

  const handlePayment = () => {
    const url = `${STRIPE_LINKS[palier.key]}?prefilled_email=${encodeURIComponent(userEmail)}`;
    window.location.href = url;
  };

  return (
    <div style={{
      background: '#00e5a008',
      border: '1px solid #00e5a030',
      borderRadius: '8px',
      padding: '14px 16px',
    }}>
      {/* Palier détecté */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: '#4a5878', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Offre détectée
          </div>
          <div style={{ fontSize: 12, color: '#c8d4ee', fontWeight: 600, marginTop: 2 }}>
            {palier.label} — <span style={{ color: '#00e5a0' }}>{palier.prix}</span>
          </div>
          <div style={{ fontSize: 10, color: '#4a5878', marginTop: 2 }}>
            {palier.desc} · {nbFournisseurs} détectés
          </div>
        </div>
        <div style={{
          background: '#00e5a015',
          border: '1px solid #00e5a030',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: 18,
        }}>
          💳
        </div>
      </div>

      {/* Bouton paiement */}
      <button
        onClick={handlePayment}
        style={{
          width: '100%',
          background: '#00e5a0',
          color: '#000',
          fontWeight: 700,
          padding: '11px 26px',
          borderRadius: '6px',
          fontSize: '12px',
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        💳 Payer {palier.prix} et activer l'analyse
      </button>

      <div style={{ fontSize: 9, color: '#2a3450', textAlign: 'center', marginTop: 8 }}>
        Prix HT · TVA 20% appliquée au paiement · Paiement sécurisé Stripe
      </div>
    </div>
  );
}

export function isPaid() {
  return new URLSearchParams(window.location.search).get('paid') === 'true';
}

    
