const STRIPE_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK;

export function PaymentButton({ userEmail, fileName }) {
  const handlePayment = () => {
    const url = `${STRIPE_LINK}?prefilled_email=${encodeURIComponent(userEmail)}`;
    window.location.href = url;
  };

  return (
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
      💳 Payer pour traiter "{fileName}"
    </button>
  );
}
