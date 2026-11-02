// Original merch files, in voting ID order. Keep this order stable once voting opens.
export const merchImages = Array.from({ length: 48 }, (_, i) => `/merch/${i + 1}.webp`);
merchImages[40] = '/merch/41-cats.png'; // Correct square-cat plush artwork, original PNG bytes.
export const maxMerchCount = 48;
export const campaignId = 'merch-48';
