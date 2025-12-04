-- Seed Data
DO $$
DECLARE
    -- Plan IDs
    free_id TEXT := 'AT-FREE';
    digital_id TEXT := 'AT-DIGITAL';
    personal_id TEXT := 'AT-PERSONAL';
    business_id TEXT := 'AT-BUSINESS';
    
    -- Feature IDs
    f_affiliate UUID;
    f_cashback UUID;
    f_tracking UUID;
    f_mail_service UUID;
    f_scanning UUID;
    f_storage UUID;
    f_retention UUID;
    f_pages UUID;
    f_app_access UUID;
    f_quality UUID;
    f_parcel UUID;
    f_starter_kit UUID;
    f_virtual_office UUID;
    f_biz_reg UUID;
    f_greenhills UUID;
BEGIN
    -- Insert Plans
    INSERT INTO subscription_schema.subscription_plan_table (subscription_plan_id, subscription_plan_name, subscription_plan_price, subscription_plan_description, subscription_plan_is_popular, subscription_plan_button_text, subscription_plan_usage_note)
    VALUES
    (free_id, 'Free', 0, 'Earn while you refer', false, 'I''m interested!', 'Perfect for affiliates'),
    (digital_id, 'Digital', 299, 'For individuals who just need their mail digitized', false, 'I''m interested!', 'For personal use only'),
    (personal_id, 'Personal', 499, 'Complete mail management solution', true, 'I''m interested!', 'For personal use only'),
    (business_id, 'Business', 2999, 'Professional virtual office solution', false, 'I''m interested!', 'For business use')
    ON CONFLICT (subscription_plan_id) DO UPDATE SET
        subscription_plan_name = EXCLUDED.subscription_plan_name,
        subscription_plan_price = EXCLUDED.subscription_plan_price,
        subscription_plan_description = EXCLUDED.subscription_plan_description,
        subscription_plan_is_popular = EXCLUDED.subscription_plan_is_popular,
        subscription_plan_button_text = EXCLUDED.subscription_plan_button_text,
        subscription_plan_usage_note = EXCLUDED.subscription_plan_usage_note;

    -- Insert Plan Storage Details
    INSERT INTO subscription_schema.subscription_plan_storage_table (subscription_plan_storage_plan_id, subscription_plan_max_gb_storage, subscription_plan_max_quantity_storage, subscription_plan_max_mailbox_access, subscription_plan_type_sort_order)
    VALUES
    (free_id, 0, 0, 0, 1),
    (digital_id, 5, 5000, 1, 2),
    (personal_id, 20, 20000, 5, 3),
    (business_id, 200, 200000, NULL, 4)
    ON CONFLICT (subscription_plan_storage_plan_id) DO UPDATE SET
        subscription_plan_max_gb_storage = EXCLUDED.subscription_plan_max_gb_storage,
        subscription_plan_max_quantity_storage = EXCLUDED.subscription_plan_max_quantity_storage,
        subscription_plan_max_mailbox_access = EXCLUDED.subscription_plan_max_mailbox_access,
        subscription_plan_type_sort_order = EXCLUDED.subscription_plan_type_sort_order;

    -- Insert Features (and capture IDs)
    -- Helper to insert and return id
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Affiliate Access') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_affiliate;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Cash Back') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_cashback;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Tracking') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_tracking;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Mail Service') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_mail_service;
    
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Scanning') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_scanning;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Storage') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_storage;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Retention') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_retention;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Pages') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_pages;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('App Access') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_app_access;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Quality') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_quality;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Parcel') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_parcel;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Starter Kit') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_starter_kit;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Virtual Office') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_virtual_office;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Biz Reg') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_biz_reg;
    INSERT INTO subscription_schema.subscription_feature_table (subscription_feature_label) VALUES ('Greenhills') ON CONFLICT (subscription_feature_label) DO UPDATE SET subscription_feature_label=EXCLUDED.subscription_feature_label RETURNING subscription_feature_id INTO f_greenhills;

    -- Clear existing plan features to re-seed
    DELETE FROM subscription_schema.subscription_plan_feature_table;

    -- FREE Plan Features
    INSERT INTO subscription_schema.subscription_plan_feature_table (subscription_plan_feature_plan_id, subscription_plan_feature_feature_id, subscription_plan_feature_display_text, subscription_plan_feature_is_primary, subscription_plan_feature_sort_order) VALUES
    (free_id, f_affiliate, 'Affiliate link access', true, 1),
    (free_id, f_cashback, '5% cash back per subscriber', true, 2),
    (free_id, f_tracking, 'Track your referrals', true, 3),
    (free_id, f_mail_service, 'No mail services', true, 4);

    -- DIGITAL Plan Features
    INSERT INTO subscription_schema.subscription_plan_feature_table (subscription_plan_feature_plan_id, subscription_plan_feature_feature_id, subscription_plan_feature_display_text, subscription_plan_feature_is_primary, subscription_plan_feature_sort_order) VALUES
    (digital_id, f_scanning, 'Mail scanning & digitization', true, 1),
    (digital_id, f_storage, '5GB digital storage', true, 2),
    (digital_id, f_retention, '7-day physical retention', true, 3),
    -- Secondary
    (digital_id, f_pages, '~5,000 scanned pages', false, 4),
    (digital_id, f_app_access, 'Access via web app', false, 5),
    (digital_id, f_quality, 'Standard quality scans', false, 6),
    (digital_id, f_parcel, 'No parcel handling', false, 7);

    -- PERSONAL Plan Features
    INSERT INTO subscription_schema.subscription_plan_feature_table (subscription_plan_feature_plan_id, subscription_plan_feature_feature_id, subscription_plan_feature_display_text, subscription_plan_feature_is_primary, subscription_plan_feature_sort_order) VALUES
    (personal_id, f_scanning, 'Everything in Digital', true, 1), 
    (personal_id, f_storage, '20GB digital storage', true, 2),
    (personal_id, f_parcel, 'Parcel handling', true, 3),
    -- Secondary
    (personal_id, f_pages, '~20,000 scanned pages', false, 4),
    (personal_id, f_retention, '90-day physical retention', false, 5),
    (personal_id, f_quality, 'High quality scans', false, 6),
    (personal_id, f_starter_kit, 'Starter kit included', false, 7);

    -- BUSINESS Plan Features
    INSERT INTO subscription_schema.subscription_plan_feature_table (subscription_plan_feature_plan_id, subscription_plan_feature_feature_id, subscription_plan_feature_display_text, subscription_plan_feature_is_primary, subscription_plan_feature_sort_order) VALUES
    (business_id, f_scanning, 'Everything in Personal', true, 1),
    (business_id, f_storage, '200GB digital storage', true, 2),
    (business_id, f_virtual_office, 'Virtual office address', true, 3),
    -- Secondary
    (business_id, f_pages, '~200,000 scanned pages', false, 4),
    (business_id, f_retention, '365-day physical retention', false, 5),
    (business_id, f_biz_reg, 'Business registration use', false, 6),
    (business_id, f_greenhills, 'Greenhills business address', false, 7);

END $$;

-- Insert default mail item statuses
INSERT INTO status_schema.mail_item_status_table (mail_item_status_id, mail_item_status_value, mail_item_status_sort_order) VALUES
    ('MIS-RECEIVED', 'received', 1),
    ('MIS-READ', 'read', 2),
    ('MIS-RETRIEVAL', 'retrieval', 3),
    ('MIS-SCANNING', 'scanning', 4),
    ('MIS-SCANNED', 'scanned', 5),
    ('MIS-RETRIEVED', 'retrieved', 6),
    ('MIS-ARCHIVED', 'archived', 7),
    ('MIS-DISPOSAL', 'disposal', 8),
    ('MIS-DISPOSED', 'disposed', 9);
    ('MIS-TRANSIT', 'in_transit', 10);
    ('MIS-DELIVERED', 'delivered', 11)

-- Insert default virtual address statuses
INSERT INTO status_schema.virtual_address_status_table (virtual_address_status_id, virtual_address_status_value, virtual_address_status_sort_order) VALUES
    ('VAS-ACTIVE', 'active', 1),
    ('VAS-INACTIVE', 'inactive', 2),
    ('VAS-SUSPENDED', 'suspended', 3);

-- Insert default dispose request statuses
INSERT INTO status_schema.dispose_request_status_table (dispose_request_status_id, dispose_request_status_value, dispose_request_status_sort_order) VALUES
    ('DRS-PENDING', 'pending', 1),
    ('DRS-REJECTED', 'rejected', 2),
    ('DRS-COMPLETED', 'completed', 3);


-- Insert default retrieval request statuses
INSERT INTO status_schema.retrieval_request_status_table (retrieval_request_status_id, retrieval_request_status_value, retrieval_request_status_sort_order) VALUES
    ('RRS-PENDING', 'pending', 1),
    ('RRS-APPROVED', 'approved', 2),
    ('RRS-IN_TRANSIT', 'in_transit', 3),
    ('RRS-DELIVERED', 'delivered', 4),
    ('RRS-REJECTED', 'rejected', 5);
    ('RRS-ARRIVED', 'arrived', 6)

-- Insert default pickup request statuses
INSERT INTO status_schema.pickup_request_status_table (pickup_request_status_id, pickup_request_status_value, pickup_request_status_sort_order) VALUES
    ('PRS-PENDING', 'pending', 1),
    ('PRS-APPROVED', 'approved', 2),
    ('PRS-READY', 'ready_for_pickup', 3),
    ('PRS-COMPLETED', 'completed', 4),
    ('PRS-REJECTED', 'rejected', 5);

-- Insert default scan request statuses
INSERT INTO status_schema.scan_request_status_table (scan_request_status_id, scan_request_status_value, scan_request_status_sort_order) VALUES
    ('SRS-PENDING', 'pending', 1),
    ('SRS-IN_PROGRESS', 'in_progress', 2),
    ('SRS-COMPLETED', 'completed', 3),
    ('SRS-REJECTED', 'rejected', 4);

-- Insert default referral statuses
INSERT INTO status_schema.referral_status_table (referral_status_id, referral_status_value, referral_status_sort_order) VALUES
    ('RFS-PENDING', 'pending', 1),
    ('RFS-ACCEPTED', 'accepted', 2),
    ('RFS-REJECTED', 'rejected', 3),
    ('RFS-EXPIRED', 'expired', 4);

-- Insert default subscription statuses
INSERT INTO status_schema.subscription_status_table (subscription_status_id, subscription_status_value, subscription_status_sort_order) VALUES
    ('SST-NONSUB', 'non_subscriber', 1),
    ('SST-ACTIVE', 'active', 2),
    ('SST-SUSPENDED', 'suspended', 3),
    ('SST-EXPIRED', 'expired', 4);
    ('SST-PENDING', 'pending', 5);

-- Insert default account types
INSERT INTO user_schema.account_type_table (account_type_id, account_type_value, account_max_quantity_storage, account_max_gb_storage, account_max_mailbox_access, account_max_parcel_handling, account_type_sort_order) VALUES
    ('AT-FREE', 'free', 5, 1, 1, 1, 1),
    ('AT-DIGITAL', 'digital', 50, 5, 5, 2, 2),
    ('AT-PERSONAL', 'personal', 250, 20, 10, 3, 3),
    ('AT-BUSINESS', 'business', 500, 50, 20, 4, 4);

    -- Source Types
INSERT INTO notification_schema.notification_source_type_table
  (notification_source_type_id, notification_source_type_name, notification_source_type_description)
VALUES
  ('SRC-USER', 'user', 'Triggered by user actions'),
  ('SRC-SYSTEM', 'system', 'Triggered by system or app updates'),
  ('SRC-ADMIN', 'admin', 'Triggered by admin actions'),
  ('SRC-AUTOMATION', 'automation', 'Triggered by automated system jobs');

-- Scope Types
INSERT INTO notification_schema.notification_scope_type_table
  (notification_scope_type_id, notification_scope_type_name, notification_scope_type_description)
VALUES
  ('ST-ALL', 'all', 'Notification applies to all users'),
  ('ST-SPECIFIC', 'specific', 'Notification applies to one user');

-- Status Types (Lifecycle only)
INSERT INTO notification_schema.notification_status_type_table
  (notification_status_type_id, notification_status_type_name, notification_status_type_description)
VALUES
  ('NST-PENDING', 'pending', 'Ready to be pushed'),
  ('NST-DELIVERED', 'delivered', 'Successfully pushed to client'),
  ('NST-FAILED', 'failed', 'Failed to push');

-- Item Types
INSERT INTO notification_schema.notification_item_type_table
  (notification_item_type_id, notification_item_type_name, notification_item_type_description)
VALUES
  ('NIT-MAIL', 'mail', 'Mail item'),
  ('NIT-PACKAGE', 'package', 'Package item'),
  ('NIT-BILLING', 'billing', 'Billing or Invoice item');