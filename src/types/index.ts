// ==============================================================================
// PRAJA SEVA (CIVIC GRIEVANCE & PR PORTAL) - CORE TYPE DEFINITIONS
// ==============================================================================

export type ComplaintCategory = 'DRAINAGE' | 'ROADS' | 'WATER' | 'LIGHTS' | 'GARBAGE' | 'OTHER';

export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RESOLVED' | 'REJECTED';

export type UserRole = 'ADMIN' | 'VOLUNTEER';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string | null;
  founder_phone: string;
  mla_name: string;
  mla_designation: string;
  mla_photo_url?: string | null;
  party_name?: string | null;
  party_logo_url?: string | null;
  party_primary_color: string;
  party_secondary_color: string;
  constituency_slogan: string;
  whatsapp_group_mla?: string | null;
  whatsapp_group_town?: string | null;
  infrastructure_mode: 'SHARED' | 'DEDICATED_BYOK';
  custom_supabase_url?: string | null;
  custom_supabase_anon_key?: string | null;
  custom_whatsapp_phone_number_id?: string | null;
  custom_whatsapp_access_token?: string | null;
  custom_zoho_folder_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ward {
  id: string;
  organization_id: string;
  ward_number: string;
  name: string;
  whatsapp_group_jid?: string | null;
  incharge_name?: string | null;
  incharge_phone?: string | null;
  created_at: string;
}

export interface StaffMember {
  id: string;
  organization_id: string;
  full_name: string;
  phone: string;
  role: UserRole;
  assigned_ward_id?: string | null;
  is_active: boolean;
  failed_pin_attempts: number;
  locked_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Complaint {
  id: string;
  organization_id: string;
  ticket_number: string;
  citizen_name: string;
  citizen_phone: string;
  citizen_email?: string | null;
  is_phone_verified: boolean;
  category: ComplaintCategory;
  description?: string | null;
  voice_note_url?: string | null;
  latitude: number;
  longitude: number;
  location_address?: string | null;
  ward_id?: string | null;
  before_photo_url: string;
  after_photo_url?: string | null;
  poster_url?: string | null;
  status: TicketStatus;
  assigned_to?: string | null;
  rejection_reason?: string | null;
  resolution_notes?: string | null;
  volunteer_upload_lat?: number | null;
  volunteer_upload_lng?: number | null;
  proximity_meters?: number | null;
  is_proximity_verified: boolean;
  created_at: string;
  assigned_at?: string | null;
  submitted_for_approval_at?: string | null;
  resolved_at?: string | null;
  
  // Joined relation fields
  ward?: Ward | null;
  assigned_staff?: StaffMember | null;
}

export type SupportedLanguage = 'te' | 'en' | 'hi';
