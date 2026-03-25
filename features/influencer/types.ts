export type InfluencerStatus =
  | 'PENDING_PROFILE_REVIEW'
  | 'PENDING_DOCUMENTS'
  | 'PENDING_DOCUMENT_REVIEW'
  | 'REJECTED'
  | 'ACTIVE';

export type InfluencerCompanyType = 'SAHIS' | 'LTD';

export type InfluencerDocumentType =
  | 'IDENTITY_DOCUMENT'
  | 'TAX_CERTIFICATE'
  | 'SIGNATURE_DECLARATION'
  | 'RESIDENCE_DOCUMENT'
  | 'BANK_ACCOUNT_DOCUMENT'
  | 'SIGNATURE_CIRCULAR'
  | 'COMMERCIAL_REGISTER_GAZETTE'
  | 'CERTIFICATE_OF_ACTIVITY'
  | 'AUTHORIZATION_DOCUMENT';

export type InfluencerDocument = {
  documentType: InfluencerDocumentType;
  documentPath: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionNote: string | null;
  presignedUrl: string | null;
};

export type InfluencerApplication = {
  id: string;
  name: string;
  surname: string;
  gsmNumber: string;
  nationalId: string | null;
  taxNumber: string | null;
  companyType: InfluencerCompanyType;
  profilePhoto: string | null;
  socialLinks: Record<string, string>;
  status: InfluencerStatus;
  rejectionReason: string | null;
  userEmail: string | null;
  userId: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
};

export const DOCUMENT_LABELS: Record<InfluencerDocumentType, string> = {
  IDENTITY_DOCUMENT: 'Kimlik Fotokopisi',
  TAX_CERTIFICATE: 'Vergi Levhası',
  SIGNATURE_DECLARATION: 'İmza Beyannamesi',
  RESIDENCE_DOCUMENT: 'İkametgah Belgesi',
  BANK_ACCOUNT_DOCUMENT: 'Banka IBAN Belgesi',
  SIGNATURE_CIRCULAR: 'İmza Sirküleri',
  COMMERCIAL_REGISTER_GAZETTE: 'Ticaret Sicil Gazetesi',
  CERTIFICATE_OF_ACTIVITY: 'Faaliyet Belgesi',
  AUTHORIZATION_DOCUMENT: 'Yetki Belgesi',
};

export const SAHIS_DOCUMENTS: InfluencerDocumentType[] = [
  'IDENTITY_DOCUMENT',
  'TAX_CERTIFICATE',
  'SIGNATURE_DECLARATION',
  'RESIDENCE_DOCUMENT',
  'BANK_ACCOUNT_DOCUMENT',
];

export const LTD_DOCUMENTS: InfluencerDocumentType[] = [
  'TAX_CERTIFICATE',
  'SIGNATURE_CIRCULAR',
  'COMMERCIAL_REGISTER_GAZETTE',
  'CERTIFICATE_OF_ACTIVITY',
  'BANK_ACCOUNT_DOCUMENT',
];
