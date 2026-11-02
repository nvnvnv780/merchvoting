// Original merch files, in voting ID order. Keep this order stable once voting opens.
export const merchImages = Array.from({ length: 48 }, (_, i) => `/merch/${i + 1}.webp`);
merchImages[40] = '/merch/41-cats.png'; // Correct square-cat plush artwork, original PNG bytes.
export const maxMerchCount = 48;
export const campaignId = 'merch-48';

// Hide duplicate 46 without transferring its votes to another product.
export const visibleMerchIds = Array.from({ length: 48 }, (_, i) => i + 1).filter(id => id !== 46);
