const STRIPE_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK;

export function PaymentButton({ userEmail, fileName }) {
  const handlePayment = () => {
    const url = `${STRIPE_LINK}?prefilled_email=${encodeURIComponent(userEmail)}`;
    window.location.href = url;
  };

  return (
    <button onClick={handlePayment}>
      Payer pour traiter "{fileName}"
    </button>
  );
}
