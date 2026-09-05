export type ReflectionMode = 'deep-reflection' | 'brainstorm' | 'summary' | 'philosophical';

export type DocumentType = 'Marksheet' | 'Degree' | 'Certificate' | 'Other';

export interface SubjectGrade {
  subject: string;
  grade: string;
}

export interface KeyMetrics {
  gpa?: string;
  totalScore?: string;
  honors?: string;
  subjects?: SubjectGrade[];
  [key: string]: any;
}

export interface AcademicDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  issuingInstitution: string;
  dateOfIssuance: string;
  awardLocation: string;
  keyMetrics: KeyMetrics;
  summary: string;
  fileName: string;
  fileType: string;
  fileDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedDocumentData {
  documentType: DocumentType;
  issuingInstitution: string;
  dateOfIssuance: string;
  awardLocation: string;
  keyMetrics: KeyMetrics;
  summary: string;
  fileName: string;
  fileType: string;
  fileBase64?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
  citedDocumentIds?: string[];
}

export interface ReflectionSummary {
  title?: string;
  sentiment?: string;
  keyTakeaways?: string[];
  actionStep?: string;
}

export interface UserInteraction {
  id: string;
  userId: string;
  title: string;
  reflectionMode: ReflectionMode;
  messages: ChatMessage[];
  summary?: ReflectionSummary;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

