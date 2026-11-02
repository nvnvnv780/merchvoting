import { normalizePhone } from './phone.js';
export function normalizeEmail(value) {
 if (typeof value !== 'string') return null;
 const email = value.trim().toLowerCase();
 const parts = email.split('@');
 if (email.length > 254 || parts.length !== 2 || parts[0].length > 64 || parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..')) return null;
 return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ? email : null;
}
export function normalizeIdentity(body) {
 if (!body || typeof body !== 'object' || (body.email != null && body.phone != null)) return null;
 const type = body.email != null ? 'email' : 'phone';
 const value = type === 'email' ? normalizeEmail(body.email) : normalizePhone(body.phone);
 return value ? {type,value} : null;
}
export function identityPayload(identity) { return {[identity.type]:identity.value}; }
export function identityHashInput(identity) { return identity.type === 'phone' ? identity.value : `email:${identity.value}`; }

export function parseContact(value) {
 if (typeof value !== 'string') return null;
 return normalizeIdentity(value.includes('@') ? {email:value} : {phone:value});
}
