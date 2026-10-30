export function normalizePhone(value) {
  let phone = String(value ?? '').replace(/[\s().-]/g, '');
  if (phone.startsWith('+84')) phone = '0' + phone.slice(3);
  else if (phone.startsWith('84') && phone.length === 11) phone = '0' + phone.slice(2);
  return /^0[35789]\d{8}$/.test(phone) ? phone : null;
}
