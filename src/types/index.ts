// Tag entity
export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

// Client entity
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  email: string;
  hourly_rate: number;
  created_at: string;
  updated_at: string;
}

// For creating a new client (without id and timestamps)
export interface CreateClientInput {
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  email: string;
  hourly_rate: number;
}

// For updating a client
export interface UpdateClientInput {
  first_name?: string;
  last_name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  email?: string;
  hourly_rate?: number;
}

// Time session entity
export interface TimeSession {
  id: number;
  client_id: number;
  start_time: string;
  end_time: string | null;
  duration: number; // in seconds
  date: string; // YYYY-MM-DD format
  is_active: boolean;
  notes: string | null; // Job notes/description
  created_at: string;
}

// For creating a new time session
export interface CreateSessionInput {
  client_id: number;
  start_time: string;
  date: string;
}

// Invoice entity
export interface Invoice {
  id: number;
  client_id: number;
  total_hours: number;
  total_amount: number;
  sent_date: string | null;
  send_method: 'email' | 'sms' | null;
  session_ids: string; // JSON array of session IDs
  created_at: string;
}

// For creating an invoice
export interface CreateInvoiceInput {
  client_id: number;
  total_hours: number;
  total_amount: number;
  session_ids: number[];
}

// Active timer state (for persistence)
export interface ActiveTimer {
  id: 1; // Always 1 (singleton)
  client_id: number | null;
  session_id: number | null;
  start_time: string | null;
  is_running: boolean;
}

// Timer state for UI
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  clientId: number | null;
  sessionId: number | null;
  startTime: Date | null;
  elapsedSeconds: number;
}

// Form validation errors
export interface ValidationErrors {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  hourly_rate?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  ChooseClient: undefined;
  AddClient: undefined;
  EditClient: { clientId: number };
  ClientDetails: { clientId: number };
  EditSession: { sessionId: number; clientId: number };
  SendInvoice: { clientId?: number };
  InvoiceHistory: undefined;
  Reports: undefined;
  Settings: undefined;
  Legal: { type: 'privacy' | 'terms' };
  Paywall: { feature?: PremiumFeature };
};

// Client with computed full name
export interface ClientWithFullName extends Client {
  full_name: string;
}

// Session with computed billable amount
export interface SessionWithBillable extends TimeSession {
  billable_amount: number;
}

// Grouped sessions by date
export interface GroupedSessions {
  date: string;
  sessions: SessionWithBillable[];
  totalDuration: number;
  totalBillable: number;
}

// Invoice preview data
export interface InvoicePreview {
  client: Client;
  sessions: SessionWithBillable[];
  materials: Material[];
  totalHours: number;
  totalLaborAmount: number;
  totalMaterialsAmount: number;
  totalAmount: number;
  invoiceDate: string;
  dueDate: string;
}

// Address for autocomplete
export interface AddressComponents {
  street: string;
  city: string;
  state: string;
  zip_code: string;
}

// Material/Cost entity for job expenses
export interface Material {
  id: number;
  client_id: number;
  name: string;
  cost: number;
  created_at: string;
}

// For creating a new material
export interface CreateMaterialInput {
  client_id: number;
  name: string;
  cost: number;
}

// For updating a material
export interface UpdateMaterialInput {
  name?: string;
  cost?: number;
}

// User settings entity (singleton)
export interface UserSettings {
  id: 1; // Always 1 (singleton)
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_street: string | null;
  business_city: string | null;
  business_state: string | null;
  business_zip: string | null;
  logo_uri: string | null;
  primary_color: string;
  accent_color: string;
  updated_at: string | null;
  first_launch_date: string | null; // For 15-day trial tracking
  // Payment methods
  paypal_enabled: boolean;
  paypal_username: string | null;
  venmo_enabled: boolean;
  venmo_username: string | null;
  zelle_enabled: boolean;
  zelle_id: string | null;
  cashapp_enabled: boolean;
  cashapp_tag: string | null;
  stripe_enabled: boolean;
  stripe_payment_link: string | null;
  onboarding_completed: boolean;
}

// For updating user settings
export interface UpdateSettingsInput {
  business_name?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  business_street?: string | null;
  business_city?: string | null;
  business_state?: string | null;
  business_zip?: string | null;
  logo_uri?: string | null;
  primary_color?: string;
  accent_color?: string;
  // Payment methods
  paypal_enabled?: boolean;
  paypal_username?: string | null;
  venmo_enabled?: boolean;
  venmo_username?: string | null;
  zelle_enabled?: boolean;
  zelle_id?: string | null;
  cashapp_enabled?: boolean;
  cashapp_tag?: string | null;
  stripe_enabled?: boolean;
  stripe_payment_link?: string | null;
}

// Subscription types
export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionPackage {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
}

export interface SubscriptionState {
  isLoading: boolean;
  isPremium: boolean;
  tier: SubscriptionTier;
  expirationDate: Date | null;
  packages: SubscriptionPackage[];
}

// Premium features that require subscription
export type PremiumFeature =
  | 'unlimited_clients'
  | 'custom_branding'
  | 'pdf_export'
  | 'email_invoices'
  | 'sms_invoices'
  | 'unlimited_materials'
  | 'data_export';

// Free tier limits
export const FREE_TIER_LIMITS = {
  maxClients: 3,
  maxMaterialsPerClient: 5,
  canCustomizeBranding: false,
  canExportPdf: false,
  canEmailInvoices: false,
  canSmsInvoices: false,
  canExportData: false,
} as const;
