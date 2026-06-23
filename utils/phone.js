export function callPhone(number) {
  if (!number) return;
  const cleanNumber = number.replace(/\s/g, '');
  window.location.href = `tel:${cleanNumber}`;
}
