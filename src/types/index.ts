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
  currency: string;
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
  currency?: string;
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
  currency?: string;
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
  currency: string;
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
  currency?: string;
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
  currency?: string;
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
  Export: undefined;
  RecurringJobs: undefined;
  ProjectTemplates: undefined;
  Analytics: undefined;
  Insights: undefined;
  Inventory: undefined;
  Fleet: undefined;
  QRCodes: undefined;
  ReceiptScanner: undefined;
  Integrations: undefined;
  ClientPortal: { clientId: number };
  Geofences: undefined;
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

// Voice note entity for session attachments
export interface VoiceNote {
  id: number;
  session_id: number;
  file_path: string; // relative path: "voice_notes/session_123/note_1234567890.m4a"
  duration_seconds: number;
  recorded_at: string;
  created_at: string;
}

// Photo entity for session attachments
export interface Photo {
  id: number;
  session_id: number;
  file_path: string; // relative path: "photos/session_123/photo_1.jpg"
  captured_at: string;
  created_at: string;
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
  default_currency: string;
  onboarding_completed: boolean;
  weekly_hours_goal: number;
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
  default_currency?: string;
  weekly_hours_goal?: number;
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
  | 'unlimited_invoices'
  | 'unlimited_history'
  | 'custom_branding'
  | 'pdf_export'
  | 'email_invoices'
  | 'sms_invoices'
  | 'unlimited_materials'
  | 'data_export'
  | 'recurring_jobs'
  | 'voice_notes'
  | 'project_templates'
  | 'analytics'
  | 'insights'
  | 'inventory'
  | 'fleet'
  | 'qr_codes'
  | 'receipt_scanning'
  | 'integrations'
  | 'client_portal'
  | 'geofencing';

// Recurring job types
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type OccurrenceStatus = 'pending' | 'completed' | 'skipped';

export interface RecurringJob {
  id: number;
  client_id: number;
  title: string;
  frequency: RecurringFrequency;
  day_of_week: DayOfWeek;
  day_of_month: number | null;
  duration_seconds: number;
  notes: string | null;
  auto_invoice: boolean;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  last_generated_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringJobInput {
  client_id: number;
  title: string;
  frequency: RecurringFrequency;
  day_of_week: DayOfWeek;
  day_of_month?: number | null;
  duration_seconds: number;
  notes?: string;
  auto_invoice?: boolean;
  start_date: string;
  end_date?: string | null;
}

export interface UpdateRecurringJobInput {
  client_id?: number;
  title?: string;
  frequency?: RecurringFrequency;
  day_of_week?: DayOfWeek;
  day_of_month?: number | null;
  duration_seconds?: number;
  notes?: string | null;
  auto_invoice?: boolean;
  is_active?: boolean;
  start_date?: string;
  end_date?: string | null;
}

export interface RecurringJobOccurrence {
  id: number;
  recurring_job_id: number;
  scheduled_date: string;
  status: OccurrenceStatus;
  session_id: number | null;
  invoice_id: number | null;
  created_at: string;
}

// Project template types
export type TradeCategory = 'general';

export interface ProjectTemplate {
  id: number;
  title: string;
  trade_category: TradeCategory;
  estimated_duration_seconds: number;
  default_notes: string | null;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateMaterial {
  id: number;
  template_id: number;
  name: string;
  cost: number;
  created_at: string;
}

export interface CreateProjectTemplateInput {
  title: string;
  trade_category: TradeCategory;
  estimated_duration_seconds: number;
  default_notes?: string;
  materials?: { name: string; cost: number }[];
}

// Client geofence for auto clock-in/out
export interface ClientGeofence {
  id: number;
  client_id: number;
  latitude: number;
  longitude: number;
  radius: number; // meters
  is_active: boolean;
  auto_start: boolean;
  auto_stop: boolean;
  created_at: string;
}

export interface CreateGeofenceInput {
  client_id: number;
  latitude: number;
  longitude: number;
  radius: number;
  auto_start?: boolean;
  auto_stop?: boolean;
}

// Inventory / material catalog for advanced material management
export interface CatalogItem {
  id: number;
  name: string;
  default_cost: number;
  barcode: string | null;
  supplier_name: string | null;
  supplier_contact: string | null;
  unit: string; // 'each' | 'ft' | 'lb' | 'gal' | 'box' | 'roll' etc.
  reorder_level: number;
  current_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCatalogItemInput {
  name: string;
  default_cost: number;
  barcode?: string;
  supplier_name?: string;
  supplier_contact?: string;
  unit?: string;
  reorder_level?: number;
  current_quantity?: number;
}

export interface UpdateCatalogItemInput {
  name?: string;
  default_cost?: number;
  barcode?: string | null;
  supplier_name?: string | null;
  supplier_contact?: string | null;
  unit?: string;
  reorder_level?: number;
  current_quantity?: number;
}

// Weather data for sessions
export interface SessionWeather {
  id: number;
  session_id: number;
  temperature_f: number;
  condition: string; // 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog'
  wind_speed_mph: number;
  humidity: number;
  recorded_at: string;
}

// Fleet management types
export interface Vehicle {
  id: number;
  name: string; // "2020 Ford F-150"
  license_plate: string | null;
  odometer: number; // current miles
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleInput {
  name: string;
  license_plate?: string;
  odometer?: number;
}

export interface MileageEntry {
  id: number;
  vehicle_id: number;
  client_id: number | null;
  start_odometer: number;
  end_odometer: number;
  distance: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface CreateMileageInput {
  vehicle_id: number;
  client_id?: number;
  start_odometer: number;
  end_odometer: number;
  date: string;
  notes?: string;
}

export interface FuelEntry {
  id: number;
  vehicle_id: number;
  gallons: number;
  cost_per_gallon: number;
  total_cost: number;
  odometer: number;
  date: string;
  created_at: string;
}

export interface CreateFuelInput {
  vehicle_id: number;
  gallons: number;
  cost_per_gallon: number;
  odometer: number;
  date: string;
}

// QR Code entity (Sprint 19)
export interface QRCode {
  id: number;
  client_id: number;
  label: string;
  code_data: string;
  created_at: string;
}

export interface CreateQRCodeInput {
  client_id: number;
  label: string;
}

// Receipt entity (Sprint 21)
export interface Receipt {
  id: number;
  photo_path: string;
  vendor_name: string | null;
  total_amount: number | null;
  date: string;
  notes: string | null;
  category: string | null;
  client_id: number | null;
  is_processed: number;
  created_at: string;
}

export interface CreateReceiptInput {
  photo_path: string;
  vendor_name?: string;
  total_amount?: number;
  date: string;
  notes?: string;
  category?: string;
  client_id?: number;
}

// Calendar sync config (Sprint 15)
export interface CalendarSyncConfig {
  id: number;
  calendar_id: string;
  calendar_name: string;
  sync_enabled: number;
  last_synced: string | null;
  created_at: string;
}

// Free tier limits
export const FREE_TIER_LIMITS = {
  maxClients: 3,
  maxInvoicesPerMonth: 10,
  maxReportHistoryDays: 30,
  maxMaterialsPerClient: 5,
  canCustomizeBranding: false,
  canExportPdf: false,
  canEmailInvoices: false,
  canSmsInvoices: false,
  canExportData: false,
} as const;
