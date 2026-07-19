export type RoleType = 'ADMIN' | 'GOVERNMENT_OFFICER' | 'PROVIDER' | 'BUYER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: RoleType;
  isActive: boolean;
}

export type PropertyCategory = 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'INDUSTRIAL';
export type PropertyStatus = 'PENDING_AI' | 'PENDING_GOVT' | 'APPROVED' | 'REJECTED' | 'DISPUTED';

export interface Property {
  id: string;
  propertyCode: string;
  title: string;
  category: PropertyCategory;
  area: number;
  price: number;
  description?: string;
  surveyNumber: string;
  address: string;
  latitude: number;
  longitude: number;
  district: string;
  village: string;
  state: string;
  pincode: string;
  threeSixtyImageUrl?: string;
  status: PropertyStatus;
  providerId: string;
  provider?: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  imageUrl: string;
  thumbnailUrl: string;
  displayOrder: number;
}

export interface PropertyVideo {
  id: string;
  propertyId: string;
  videoUrl: string;
  duration?: number;
  thumbnailUrl?: string;
}

export type DocumentType = 'SALE_DEED' | 'PATTA' | 'SURVEY_MAP' | 'TAX_RECEIPT' | 'IDENTITY_PROOF' | 'OWNERSHIP_PROOF';
export type OcrStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type DocVerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';

export interface PropertyDocument {
  id: string;
  propertyId: string;
  documentType: DocumentType;
  fileUrl: string;
  ocrStatus: OcrStatus;
  verificationStatus: DocVerificationStatus;
  rawText?: string; // from OCR
}

export interface AiVerification {
  id: string;
  propertyId: string;
  aiTrustScore: number;
  forgeryScore: number;
  duplicateScore: number;
  ownershipMatch: boolean;
  riskScore: number;
  summary?: string;
  reasoning?: string;
  confidence: number;
  generatedDate: string;
}

export type GovtVerificationStatus = 'APPROVED' | 'REJECTED' | 'DISPUTED';

export interface GovernmentVerification {
  id: string;
  propertyId: string;
  officerId: string;
  remarks?: string;
  status: GovtVerificationStatus;
  verifiedDate: string;
}

export interface VerificationTimeline {
  id: string;
  propertyId: string;
  timestamp: string;
  action: 'UPLOADED' | 'AI_STARTED' | 'AI_COMPLETED' | 'GOVT_REVIEW_STARTED' | 'APPROVED' | 'REJECTED' | 'DISPUTED';
  remarks?: string;
  userId: string;
}

export type FraudReportStatus = 'SUBMITTED' | 'UNDER_INVESTIGATION' | 'RESOLVED_FRAUDULENT' | 'RESOLVED_DISMISSED';

export interface FraudReport {
  id: string;
  reporterId: string;
  propertyId: string;
  reason: string;
  description: string;
  status: FraudReportStatus;
  officerId?: string;
  createdAt: string;
}

export type VisitStatus = 'SCHEDULED' | 'CONFIRMED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';

export interface PropertyVisit {
  id: string;
  buyer?: User;
  property?: Property;
  visitDate: string;
  visitTime: string;
  status: VisitStatus;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'SYSTEM' | 'PROPERTY_VERIFIED' | 'VISIT_SCHEDULED' | 'FRAUD_ALERT' | 'API_LIMIT_REACHED';
  isRead: boolean;
  receiverId: string;
  createdTime: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title?: string;
  createdAt?: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  senderRole: 'USER' | 'AI';
  content: string;
  timestamp: string;
}

export interface DeveloperKey {
  id: string;         // Primary field returned by backend
  apiKeyId?: string;  // Alias (some endpoints may use this)
  rawApiKey?: string;
  name: string;
  prefix: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiryDate?: string;
  createdTime?: string;
  accessScope?: 'READ_ONLY' | 'READ_WRITE' | 'FULL_ADMIN';
  rateLimitRpm?: number;
  allowedIps?: string;
}

export interface DeveloperKeyLog {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress: string;
  requestTimestamp: string;
  responseTimeMs: number;
}

export interface AnalyticsDashboard {
  analyticsDate: string;
  propertyViews: number;
  searchCount: number;
  verificationCount: number;
  fraudCount: number;
  apiCalls: number;
}
