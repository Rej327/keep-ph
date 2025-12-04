-- Remove all policies for files
DROP POLICY IF EXISTS objects_policy ON storage.objects;
DROP POLICY IF EXISTS buckets_policy ON storage.buckets;

-- Delete file buckets created and files uploaded
DELETE FROM storage.objects;
DELETE FROM storage.buckets;

-- Start storage
INSERT INTO storage.buckets (id, name, public) VALUES
('KEEP-PH-DOCUMENTS', 'KEEP-PH-DOCUMENTS', true);
INSERT INTO storage.buckets (id, name, public) VALUES
('KEEP-PH-ATTACHMENTS', 'KEEP-PH-ATTACHMENTS', true);
INSERT INTO storage.buckets (id, name, public) VALUES
('USER-AVATARS', 'USER-AVATARS', true);

-- Drop existing schemas if they exist
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS status_schema CASCADE;
DROP SCHEMA IF EXISTS user_schema CASCADE;
DROP SCHEMA IF EXISTS mailroom_schema CASCADE;
DROP SCHEMA IF EXISTS request_schema CASCADE;
DROP SCHEMA IF EXISTS subscription_schema CASCADE;
DROP SCHEMA IF EXISTS referral_schema CASCADE;
DROP SCHEMA IF EXISTS analytics_schema CASCADE;
DROP SCHEMA IF EXISTS storage_schema CASCADE;

-- Create all schemas
CREATE SCHEMA public AUTHORIZATION postgres;
CREATE SCHEMA status_schema AUTHORIZATION postgres;
CREATE SCHEMA user_schema AUTHORIZATION postgres;
CREATE SCHEMA mailroom_schema AUTHORIZATION postgres;
CREATE SCHEMA request_schema AUTHORIZATION postgres;
CREATE SCHEMA subscription_schema AUTHORIZATION postgres;
CREATE SCHEMA referral_schema AUTHORIZATION postgres;
CREATE SCHEMA analytics_schema AUTHORIZATION postgres;
CREATE SCHEMA storage_schema AUTHORIZATION postgres;

-- Mailbox Status Table
CREATE TABLE status_schema.mailbox_status_table (
    mailbox_status_id TEXT PRIMARY KEY,
    mailbox_status_value TEXT NOT NULL UNIQUE,
    mailbox_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    mailbox_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Mail Item Status Table
CREATE TABLE status_schema.mail_item_status_table (
    mail_item_status_id TEXT PRIMARY KEY,
    mail_item_status_value TEXT NOT NULL UNIQUE,
    mail_item_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    mail_item_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Virtual Address Status Table
CREATE TABLE status_schema.virtual_address_status_table (
    virtual_address_status_id TEXT PRIMARY KEY,
    virtual_address_status_value TEXT NOT NULL UNIQUE,
    virtual_address_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    virtual_address_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Dispose Request Status Table
CREATE TABLE status_schema.dispose_request_status_table (
    dispose_request_status_id TEXT PRIMARY KEY,
    dispose_request_status_value TEXT NOT NULL UNIQUE,
    dispose_request_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    dispose_request_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Retrieval Request Status Table
CREATE TABLE status_schema.retrieval_request_status_table (
    retrieval_request_status_id TEXT PRIMARY KEY,
    retrieval_request_status_value TEXT NOT NULL UNIQUE,
    retrieval_request_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    retrieval_request_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Pickup Request Status Table
CREATE TABLE status_schema.pickup_request_status_table (
    pickup_request_status_id TEXT PRIMARY KEY,
    pickup_request_status_value TEXT NOT NULL UNIQUE,
    pickup_request_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    pickup_request_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Scan Request Status Table
CREATE TABLE status_schema.scan_request_status_table (
    scan_request_status_id TEXT PRIMARY KEY,
    scan_request_status_value TEXT NOT NULL UNIQUE,
    scan_request_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    scan_request_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Referral Status Table
CREATE TABLE status_schema.referral_status_table (
    referral_status_id TEXT PRIMARY KEY,
    referral_status_value TEXT NOT NULL UNIQUE,
    referral_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    referral_status_sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE status_schema.subscription_status_table (
    subscription_status_id TEXT PRIMARY KEY,
    subscription_status_value TEXT NOT NULL UNIQUE,
    subscription_status_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    subscription_status_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Account Type Table
CREATE TABLE user_schema.account_type_table (
    account_type_id TEXT PRIMARY KEY,
    account_type_value TEXT NOT NULL UNIQUE,
    account_max_quantity_storage INTEGER NOT NULL DEFAULT 0,
    account_max_gb_storage INTEGER NOT NULL DEFAULT 0,
    account_max_mailbox_access INTEGER NOT NULL DEFAULT 1,
    account_max_parcel_handling INTEGER NOT NULL DEFAULT 0,
    account_type_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    account_type_sort_order INTEGER NOT NULL DEFAULT 0
);

-- User Table
CREATE TABLE user_schema.user_table (
    user_id UUID PRIMARY KEY NOT NULL,
    user_username VARCHAR(30),
    user_email VARCHAR(254) NOT NULL UNIQUE,
    user_first_name VARCHAR(254),
    user_last_name VARCHAR(254),
    user_phone VARCHAR(50),
    user_is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    user_avatar_bucket_path TEXT,
    user_referral_email VARCHAR(254),
    user_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Account Table
CREATE TABLE user_schema.account_table (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_user_id UUID NOT NULL, -- FK to user_schema.user_table.user_id
    account_number TEXT NOT NULL UNIQUE, -- Q42025-0001
    account_address_key TEXT NOT NULL, -- Derived from virtual_address_address (Gold, Silver, Bronze.)
    account_type TEXT NOT NULL DEFAULT 'AT-FREE', -- FK to user_schema.account_type_table.account_type_id
    account_is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    account_subscription_status_id TEXT NOT NULL DEFAULT 'SST-NONSUB', --fK to status_schema.subscription_status_table.subscription_status_id
    account_subscription_ends_at TIMESTAMPTZ,
    account_remaining_mailbox_access SMALLINT DEFAULT NULL,
    account_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    account_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create User Address Table
CREATE TABLE user_schema.user_address_table (
    user_address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address_user_id UUID NOT NULL REFERENCES user_schema.user_table(user_id) ON DELETE CASCADE,
    user_address_label VARCHAR(50), -- e.g. "Home", "Office"
    user_address_line1 VARCHAR(255) NOT NULL,
    user_address_line2 VARCHAR(255),
    user_address_city VARCHAR(100) NOT NULL,
    user_address_province VARCHAR(100) NOT NULL,
    user_address_postal_code VARCHAR(20) NOT NULL,
    user_address_country VARCHAR(100) DEFAULT 'Philippines',
    user_address_is_default BOOLEAN DEFAULT FALSE,
    user_address_created_at TIMESTAMPTZ DEFAULT NOW(),
    user_address_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geographic queries
-- CREATE INDEX idx_account_address_key ON user_schema.account_table(account_address_key);

-- Mailbox Table
CREATE TABLE mailroom_schema.mailbox_table (
    mailbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mailbox_account_id UUID NOT NULL, -- FK to user_schema.account_table.account_id
    mailbox_status_id TEXT NOT NULL, -- FK to status_schema.mailbox_status_table.mailbox_status_id
    mailbox_label TEXT,
    mailbox_mail_remaining_space SMALLINT DEFAULT 0,
    mailbox_package_remaining_space SMALLINT DEFAULT 0,
    mailbox_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mailbox_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mail Item Table
CREATE TABLE mailroom_schema.mail_item_table (
    mail_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_item_mailbox_id UUID NOT NULL, -- FK to mailroom_schema.mailbox_table.mailbox_id
    mail_item_sender TEXT,
    mail_item_attachment_id UUID,
    mail_item_received_at TIMESTAMPTZ DEFAULT NOW(),
    mail_item_status_id TEXT NOT NULL, -- FK to status_schema.mail_item_status_table.mail_item_status_id
    mail_item_is_read BOOLEAN DEFAULT FALSE,
    mail_item_is_deleted BOOLEAN DEFAULT FALSE,
    mail_item_type TEXT NOT NULL DEFAULT 'MAIL', -- TYPE: MAIL, PACKAGE
    mail_item_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mail_item_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mail Attachements Table
CREATE TABLE mailroom_schema.mail_attachment_table (
    mail_attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mail_attachment_mail_item_id UUID NOT NULL, -- FK to mailroom_schema.mail_item_table.mail_item_id
    mail_attachment_unopened_scan_file_path TEXT,
    mail_attachment_item_scan_file_path TEXT,
    mail_attachment_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mail_attachment_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Address Table
CREATE TABLE mailroom_schema.mailroom_address_table (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_key TEXT NOT NULL UNIQUE, -- Gold, Silver, Bronze
    address_full TEXT NOT NULL,
    address_map_link TEXT,
    address_is_active BOOLEAN DEFAULT TRUE,
    address_created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO mailroom_schema.mailroom_address_table (address_key, address_full, address_map_link) VALUES
('Gold', 'Unit 115 Gold Building Condominium, No. 15 Annapolis Greenhills, San Juan Metro Manila', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3860.885448295044!2d121.05270057468363!3d14.605600785881297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397b7dde89ff1f1%3A0xc7d73c48077da697!2sGold%20Building%2C%2015%20Annapolis%20St%2C%20San%20Juan%20City%2C%20Metro%20Manila!5e0!3m2!1sen!2sph!4v1764580621479!5m2!1sen!2sph');


-- Virtual Address Table
CREATE TABLE mailroom_schema.mailroom_user_virtual_address_table (
    mailroom_user_virtual_address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mailroom_user_virtual_address_account_id UUID NOT NULL, -- FK to user_schema.account_table.account_id
    mailroom_user_virtual_address_address_key TEXT NOT NULL, -- FK to mailroom_schema.mailroom_address_table.mailroom_address_key (Gold, Silver, Bronze)
    mailroom_user_virtual_address_status_id TEXT NOT NULL, -- FK to status_schema.virtual_address_status_table.virtual_address_status_id
    mailroom_user_virtual_address_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    mailroom_user_virtual_address_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for geographic queries
-- CREATE INDEX idx_virtual_address_area_code ON mailroom_schema.virtual_address_table(virtual_address_area_code);

-- Dispose Request Table
CREATE TABLE request_schema.dispose_request_table (
    dispose_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispose_request_mail_item_id UUID NOT NULL, -- FK to mailroom_schema.mail_item_table.mail_item_id
    dispose_request_account_id UUID NOT NULL, -- FK to user_schema.account_table.account_id
    dispose_request_status_id TEXT NOT NULL, -- FK to status_schema.dispose_request_status_table.dispose_request_status_id
    dispose_request_notes TEXT,
    dispose_request_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispose_request_processed_at TIMESTAMPTZ,
    dispose_request_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispose_request_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retrieval Request Table (Forwarding)
CREATE TABLE request_schema.retrieval_request_table (
    retrieval_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retrieval_request_mail_item_id UUID NOT NULL, -- FK to mailroom_schema.mail_item_table.mail_item_id
    retrieval_request_account_id UUID NOT NULL, -- FK to user_schema.account_table.account_id
    retrieval_request_status_id TEXT NOT NULL, -- FK to status_schema.retrieval_request_status_table.retrieval_request_status_id
    retrieval_request_address TEXT NOT NULL, -- Address to deliver/forward to
    retrieval_request_courier TEXT, -- Courier service name if applicable
    retrieval_request_tracking_number TEXT,
    retrieval_request_notes TEXT,
    retrieval_request_label_url TEXT,
    retrieval_request_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retrieval_request_processed_at TIMESTAMPTZ,
    retrieval_request_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retrieval_request_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pickup Request Table (User picks up)
CREATE TABLE request_schema.pickup_request_table (
    pickup_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_request_mail_item_id UUID NOT NULL, -- FK to mailroom_schema.mail_item_table.mail_item_id
    pickup_request_account_id UUID NOT NULL, -- FK to user_schema.account_table.account_id
    pickup_request_status_id TEXT NOT NULL, -- FK to status_schema.pickup_request_status_table.pickup_request_status_id
    pickup_request_schedule_date TIMESTAMPTZ, -- Requested pickup time
    pickup_request_notes TEXT,
    pickup_request_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pickup_request_processed_at TIMESTAMPTZ,
    pickup_request_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pickup_request_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scan Request Table
CREATE TABLE request_schema.scan_request_table (
    scan_request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_request_mail_item_id UUID NOT NULL, -- FK to mailroom_schema.mail_item_table.mail_item_id
    scan_request_account_id UUID NOT NULL, -- FK to user_schema.account_table.account_id
    scan_request_status_id TEXT NOT NULL, -- FK to status_schema.scan_request_status_table.scan_request_status_id
    scan_request_instructions TEXT, -- Specific pages or details to scan
    scan_request_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scan_request_processed_at TIMESTAMPTZ,
    scan_request_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scan_request_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referral Invitation Table
CREATE TABLE referral_schema.referral_invitation_table (
    referral_invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_owner_user_id UUID NOT NULL, -- Fk to user_schema.user_table.user_id
    referral_redeemed_by_user_id UUID NOT NULL, -- Fk to user_schema.user_table.user_id
    referral_invitation_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    referral_invitation_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

    CONSTRAINT referral_no_self_referral
        CHECK (referral_owner_user_id <> referral_redeemed_by_user_id)
);

-- Visitor Analytics Table (Combined approach - no redundancy)
CREATE TABLE analytics_schema.visitor_analytics_table (
    visitor_analytics_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_analytics_date DATE NOT NULL,
    visitor_analytics_ip_address INET NOT NULL,
    visitor_analytics_user_agent TEXT,
    visitor_analytics_source TEXT NOT NULL, -- 'website', 'app', etc.
    visitor_analytics_referrer TEXT,
    visitor_analytics_landing_page TEXT,
    visitor_analytics_session_count INTEGER NOT NULL DEFAULT 1, -- How many times this IP visited today
    visitor_analytics_first_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visitor_analytics_last_visit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visitor_analytics_duration_seconds INTEGER,
    visitor_analytics_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visitor_analytics_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(visitor_analytics_date, visitor_analytics_ip_address, visitor_analytics_source)
);

-- New Account Count Table
CREATE TABLE analytics_schema.new_account_count_table (
    new_account_count_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    new_account_count_date DATE NOT NULL,
    new_account_count_value INTEGER NOT NULL DEFAULT 0,
    new_account_count_type TEXT NOT NULL DEFAULT 'total', -- 'free', 'digital', 'personal', 'business'
    new_account_count_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    new_account_count_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(new_account_count_date, new_account_count_type)
);

-- Subscription Account Count Table
CREATE TABLE analytics_schema.subscription_account_count_table (
    subscription_account_count_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_account_count_date DATE NOT NULL,
    subscription_account_count_value INTEGER NOT NULL DEFAULT 0,
    subscription_account_count_type TEXT NOT NULL DEFAULT 'total', -- 'free', 'digital', 'personal', 'business'
    subscription_account_count_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subscription_account_count_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(subscription_account_count_date, subscription_account_count_type)
);

-- Error Analytics Table
CREATE TABLE analytics_schema.error_table (
    error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_type TEXT NOT NULL, -- 'api_error', 'database_error', 'validation_error', 'system_error'
    error_source TEXT NOT NULL, -- 'frontend', 'backend', 'database', 'external_api'
    error_message TEXT NOT NULL,
    error_stack_trace TEXT,
    error_user_id UUID, -- FK to user_schema.user_table.user_id (nullable for anonymous errors)
    error_user_agent TEXT,
    error_ip_address INET,
    error_request_path TEXT,
    error_request_method TEXT,
    error_request_payload TEXT, -- Stringified payload
    error_response_status INTEGER,
    error_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    error_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    error_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_schema.subscription_plan_table (
    subscription_plan_id TEXT PRIMARY KEY,
    subscription_plan_name TEXT NOT NULL,
    subscription_plan_price NUMERIC NOT NULL,
    subscription_plan_description TEXT,
    subscription_plan_is_popular BOOLEAN DEFAULT false,
    subscription_plan_button_text TEXT DEFAULT 'Choose Plan',
    subscription_plan_usage_note TEXT,
    subscription_plan_created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_schema.subscription_plan_storage_table (
    subscription_plan_storage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_plan_storage_plan_id TEXT REFERENCES subscription_schema.subscription_plan_table(subscription_plan_id) ON DELETE CASCADE,
    subscription_plan_max_gb_storage NUMERIC NOT NULL DEFAULT 0,
    subscription_plan_max_quantity_storage INTEGER NOT NULL DEFAULT 0,
    subscription_plan_max_mailbox_access INTEGER DEFAULT NULL, -- NULL means unlimited
    subscription_plan_type_sort_order INTEGER DEFAULT 0,
    subscription_plan_storage_created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subscription_plan_storage_plan_id)
);

CREATE TABLE IF NOT EXISTS subscription_schema.subscription_feature_table (
    subscription_feature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_feature_label TEXT NOT NULL UNIQUE, -- e.g. "Storage"
    subscription_feature_created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_schema.subscription_plan_feature_table (
    subscription_plan_feature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_plan_feature_plan_id TEXT REFERENCES subscription_schema.subscription_plan_table(subscription_plan_id) ON DELETE CASCADE,
    subscription_plan_feature_feature_id UUID REFERENCES subscription_schema.subscription_feature_table(subscription_feature_id) ON DELETE CASCADE,
    subscription_plan_feature_display_text TEXT NOT NULL,
    subscription_plan_feature_is_primary BOOLEAN DEFAULT true,
    subscription_plan_feature_sort_order INTEGER DEFAULT 0,
    subscription_plan_feature_created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Grant permissions on public schema
GRANT ALL ON ALL TABLES IN SCHEMA public TO public;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Grant permissions on status_schema
GRANT ALL ON ALL TABLES IN SCHEMA status_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA status_schema TO postgres;
GRANT ALL ON SCHEMA status_schema TO postgres;
GRANT ALL ON SCHEMA status_schema TO public;

-- Grant permissions on user_schema
GRANT ALL ON ALL TABLES IN SCHEMA user_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA user_schema TO postgres;
GRANT ALL ON SCHEMA user_schema TO postgres;
GRANT ALL ON SCHEMA user_schema TO public;

-- Grant permissions on mailroom_schema
GRANT ALL ON ALL TABLES IN SCHEMA mailroom_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA mailroom_schema TO postgres;
GRANT ALL ON SCHEMA mailroom_schema TO postgres;
GRANT ALL ON SCHEMA mailroom_schema TO public;

-- Grant permissions on request_schema
GRANT ALL ON ALL TABLES IN SCHEMA request_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA request_schema TO postgres;
GRANT ALL ON SCHEMA request_schema TO postgres;
GRANT ALL ON SCHEMA request_schema TO public;

-- Grant permissions on subscription_schema
GRANT ALL ON ALL TABLES IN SCHEMA subscription_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA subscription_schema TO postgres;
GRANT ALL ON SCHEMA subscription_schema TO postgres;
GRANT ALL ON SCHEMA subscription_schema TO public;

-- Grant permissions on referral_schema
GRANT ALL ON ALL TABLES IN SCHEMA referral_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA referral_schema TO postgres;
GRANT ALL ON SCHEMA referral_schema TO postgres;
GRANT ALL ON SCHEMA referral_schema TO public;

-- Grant permissions on storage_schema
GRANT ALL ON ALL TABLES IN SCHEMA storage_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA storage_schema TO postgres;
GRANT ALL ON SCHEMA storage_schema TO postgres;
GRANT ALL ON SCHEMA storage_schema TO public;

-- Grant permissions on analytics_schema
GRANT ALL ON ALL TABLES IN SCHEMA analytics_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA analytics_schema TO postgres;
GRANT ALL ON SCHEMA analytics_schema TO postgres;
GRANT ALL ON SCHEMA analytics_schema TO public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_profile TO service_role;
