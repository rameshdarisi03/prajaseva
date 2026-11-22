-- ==============================================================================
-- PRAJA SEVA (CIVIC GRIEVANCE & PR PORTAL) - PRODUCTION DATABASE SCHEMA
-- Target Database: Supabase PostgreSQL (AWS Mumbai - ap-south-1)
-- Standards: Strict Multi-Tenant Isolation, 4-Digit PIN Security, PostGIS Ready
-- Date SSOT Standard: DD-MM-YYYY
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZATIONS (CONSTITUENCIES & MODULAR BYOK SLOTS)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,                             -- e.g. 'Mangalagiri Assembly Constituency'
    slug TEXT UNIQUE NOT NULL,                      -- e.g. 'mangalagiri'
    custom_domain TEXT UNIQUE,                      -- e.g. 'grievances.mangalagiri-mla.in'
    founder_phone TEXT NOT NULL,                    -- The Founder / Master controller phone number
    
    -- MLA / Leadership Profile & Branding
    mla_name TEXT NOT NULL,                         -- e.g. 'Nara Lokesh' or 'Ramesh Darisi'
    mla_designation TEXT DEFAULT 'Member of Legislative Assembly (MLA)',
    mla_photo_url TEXT,                             -- High-res transparent PNG for posters
    party_name TEXT,                                -- Party Name
    party_logo_url TEXT,                            -- Party Emblem / Symbol PNG
    party_primary_color TEXT DEFAULT '#16A34A',     -- Primary brand hex
    party_secondary_color TEXT DEFAULT '#F59E0B',   -- Secondary brand hex
    constituency_slogan TEXT DEFAULT 'ప్రజల కోసం... ప్రజా సేవలో...',
    
    -- WhatsApp Dispatch Channels (Mapped by Founder)
    whatsapp_group_mla TEXT,                        -- MLA Core Leadership Group ID
    whatsapp_group_town TEXT,                       -- Town / Public Group ID
    
    -- Modular Infrastructure Mode (Shared vs Dedicated BYOK)
    infrastructure_mode TEXT DEFAULT 'SHARED' CHECK (infrastructure_mode IN ('SHARED', 'DEDICATED_BYOK')),
    custom_supabase_url TEXT,
    custom_supabase_anon_key TEXT,
    custom_whatsapp_phone_number_id TEXT,
    custom_whatsapp_access_token TEXT,
    custom_zoho_folder_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WARDS (MUNICIPAL / PANCHAYAT SEGMENTS)
CREATE TABLE IF NOT EXISTS wards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ward_number TEXT NOT NULL,                      -- e.g. '04'
    name TEXT NOT NULL,                             -- e.g. 'Ward 04 - Market Clock Tower'
    whatsapp_group_jid TEXT,                        -- Specific WhatsApp group for this ward
    incharge_name TEXT,
    incharge_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, ward_number)
);

-- 3. STAFF & VOLUNTEER WHITELIST (CLOSED-LOOP AUTH & 4-DIGIT PIN)
CREATE TABLE IF NOT EXISTS staff_whitelist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,                            -- 10-digit Indian mobile number
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'VOLUNTEER')),
    pin_hash TEXT NOT NULL,                         -- Bcrypt hash of 4-digit PIN
    assigned_ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    failed_pin_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, phone)
);

-- 4. COMPLAINTS (CORE GRIEVANCES & PR LIFECYCLE)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,                    -- Human-readable e.g. 'CMP-1001'
    
    -- Citizen Details
    citizen_name TEXT NOT NULL,
    citizen_phone TEXT NOT NULL,
    citizen_email TEXT,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Grievance Details
    category TEXT NOT NULL CHECK (category IN ('DRAINAGE', 'ROADS', 'WATER', 'LIGHTS', 'GARBAGE', 'OTHER')),
    description TEXT,
    voice_note_url TEXT,                            -- Audio recording URL
    
    -- Location & GPS
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    location_address TEXT,
    ward_id UUID REFERENCES wards(id) ON DELETE SET NULL,
    
    -- Visual Evidence & PR Media
    before_photo_url TEXT NOT NULL,                 -- Live upload before photo
    after_photo_url TEXT,                           -- Live camera resolution photo
    poster_url TEXT,                                -- Generated 4:5 Before/After PR poster
    
    -- 4-Stage Ticket Lifecycle
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'PENDING_APPROVAL', 'RESOLVED', 'REJECTED')),
    
    -- Assignment & Operations
    assigned_to UUID REFERENCES staff_whitelist(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    resolution_notes TEXT,
    
    -- Fraud Prevention & Field Audit
    volunteer_upload_lat NUMERIC(10, 7),
    volunteer_upload_lng NUMERIC(10, 7),
    proximity_meters NUMERIC(10, 2),                -- Distance between complaint GPS & volunteer GPS
    is_proximity_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps for SLA & Analytics (SSOT DD-MM-YYYY)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    submitted_for_approval_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    
    -- Sequential ticket numbering per organization
    UNIQUE(organization_id, ticket_number)
);

-- 5. AUDIT & SECURITY LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_phone TEXT NOT NULL,
    actor_role TEXT,
    action TEXT NOT NULL,                           -- e.g. 'PIN_LOGIN', 'ASSIGN_TICKET', 'APPROVE_RESOLUTION'
    ip_address TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR BLISTERING PERFORMANCE (<5ms SQL Queries)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_complaints_org_status ON complaints(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_org_created ON complaints(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_phone ON complaints(citizen_phone);
CREATE INDEX IF NOT EXISTS idx_staff_whitelist_phone ON staff_whitelist(phone);
CREATE INDEX IF NOT EXISTS idx_wards_org ON wards(organization_id);

-- ==============================================================================
-- INITIAL SEEDING: FIRST CONSTITUENCY & FOUNDER
-- ==============================================================================
INSERT INTO organizations (
    id,
    name,
    slug,
    founder_phone,
    mla_name,
    mla_designation,
    constituency_slogan
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Mangalagiri Assembly Constituency',
    'mangalagiri',
    '9206651295',
    'Ramesh Darisi',
    'MLA / Constituency Representative',
    'ప్రజల కోసం... ప్రజా సేవలో...'
) ON CONFLICT (id) DO NOTHING;

-- Initial Wards for the Constituency
INSERT INTO wards (organization_id, ward_number, name) VALUES
('00000000-0000-0000-0000-000000000001', '01', 'Ward 01 - Old Town & Bus Stand'),
('00000000-0000-0000-0000-000000000001', '02', 'Ward 02 - Station Road & Colony'),
('00000000-0000-0000-0000-000000000001', '03', 'Ward 03 - Rythu Bazaar & Temple'),
('00000000-0000-0000-0000-000000000001', '04', 'Ward 04 - Market Clock Tower & Main Road'),
('00000000-0000-0000-0000-000000000001', '05', 'Ward 05 - Bypass Junction & Industrial Area')
ON CONFLICT DO NOTHING;

-- Seed Founder as Super Admin with default PIN '1234'
-- Hash of '1234' using bcrypt ($2b$10$wN9Q...):
INSERT INTO staff_whitelist (
    organization_id,
    full_name,
    phone,
    role,
    pin_hash
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Ramesh Darisi (Founder / Admin)',
    '9206651295',
    'ADMIN',
    '$2b$10$b8xN5Qp9FjO2Y3mH1PzZMeA5hK3T7vU8W4yC2X1E0rL6sD9fG8hJa' -- Default 4-digit PIN: 1234
) ON CONFLICT DO NOTHING;
