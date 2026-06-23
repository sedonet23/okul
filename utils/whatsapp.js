export function openWhatsApp(number, message = '') {
  if (!number) return;
  const clean = number.replace(/\D/g, '');
  const url = `https://wa.me/90${clean}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
