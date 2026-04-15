export function validatePhone(gsm: string): string | null {
  const digits = gsm.replace(/\D/g, '');
  if (digits.length === 0) return 'Telefon numarası zorunludur.';
  if (digits.length !== 10) return 'Telefon numarası 10 haneli olmalıdır (5XX XXX XX XX).';
  if (!digits.startsWith('5')) return 'Telefon numarası 5 ile başlamalıdır.';
  return null;
}

export function validateNationalId(id: string): string | null {
  const trimmed = id.trim();
  if (!trimmed) return 'TC Kimlik No zorunludur.';
  if (!/^\d{11}$/.test(trimmed)) return 'TC Kimlik No 11 haneli olmalıdır.';
  if (trimmed[0] === '0') return 'TC Kimlik No 0 ile başlayamaz.';

  const digits = trimmed.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const tenth = ((oddSum * 7) - evenSum + 1000) % 10;
  const eleventh = (digits.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;

  if (tenth !== digits[9] || eleventh !== digits[10]) {
    return 'Geçerli bir TC Kimlik No giriniz.';
  }
  return null;
}

export function validateTaxNumber(tax: string): string | null {
  const trimmed = tax.trim();
  if (!trimmed) return 'Vergi No zorunludur.';
  if (!/^\d{10}$/.test(trimmed)) return 'Vergi No 10 haneli olmalıdır.';
  return null;
}

function isValidHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

function validateSocialUrl(raw: string, platform: string, allowedHosts: string[]): string | null {
  const url = isValidHttpUrl(raw);
  if (!url) return `Geçerli bir ${platform} linki girin (https:// ile başlamalı).`;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const ok = allowedHosts.some((h) => host === h || host.endsWith(`.${h}`));
  if (!ok) return `${platform} linki ${allowedHosts[0]} alan adından olmalıdır.`;
  if (!url.pathname || url.pathname === '/' || url.pathname.length < 2) {
    return `${platform} linki bir profil adresi içermelidir.`;
  }
  return null;
}

export function validateInstagramUrl(raw: string): string | null {
  return validateSocialUrl(raw, 'Instagram', ['instagram.com']);
}

export function validateYoutubeUrl(raw: string): string | null {
  return validateSocialUrl(raw, 'YouTube', ['youtube.com', 'youtu.be']);
}

export function validateTiktokUrl(raw: string): string | null {
  return validateSocialUrl(raw, 'TikTok', ['tiktok.com']);
}

export function validateTwitterUrl(raw: string): string | null {
  return validateSocialUrl(raw, 'Twitter / X', ['twitter.com', 'x.com']);
}

export type InfluencerProfilePayload = {
  gsmNumber: string;
  companyType: 'BIREYSEL' | 'LTD';
  nationalId: string;
  taxNumber: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  twitterUrl: string;
};

export function validateInfluencerProfile(p: InfluencerProfilePayload): string | null {
  const phoneErr = validatePhone(p.gsmNumber);
  if (phoneErr) return phoneErr;

  if (p.companyType === 'BIREYSEL') {
    const idErr = validateNationalId(p.nationalId);
    if (idErr) return idErr;
  } else {
    const taxErr = validateTaxNumber(p.taxNumber);
    if (taxErr) return taxErr;
  }

  const igErr = validateInstagramUrl(p.instagramUrl);
  if (igErr) return igErr;

  if (p.youtubeUrl.trim()) {
    const e = validateYoutubeUrl(p.youtubeUrl);
    if (e) return e;
  }
  if (p.tiktokUrl.trim()) {
    const e = validateTiktokUrl(p.tiktokUrl);
    if (e) return e;
  }
  if (p.twitterUrl.trim()) {
    const e = validateTwitterUrl(p.twitterUrl);
    if (e) return e;
  }

  return null;
}
