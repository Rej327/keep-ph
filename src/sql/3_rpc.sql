-- Enable pgcrypto extension for random bytes generation

CREATE OR REPLACE FUNCTION create_user_account(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_email VARCHAR(254) := (input_data->>'email')::VARCHAR;
  input_first_name VARCHAR(254) := (input_data->>'first_name')::VARCHAR;
  input_last_name VARCHAR(254) := (input_data->>'last_name')::VARCHAR;
  input_account_type TEXT := COALESCE((input_data->>'account_type')::TEXT, 'AT-FREE');
  
  -- Default Location variables (Matched with UI: Gold Building, 15 Annapolis St., Greenhills, San Juan, Metro Manila)
  var_city TEXT := 'San Juan';
  var_province TEXT := 'Metro Manila';
  var_country TEXT := 'Philippines';
  var_postal_code TEXT := '1502';
  var_area_code TEXT := 'MNL';
  var_street TEXT := '15 Annapolis St., Greenhills, Gold Building';
  
  -- Function variables
  var_account_number TEXT;
  var_new_account_id UUID;
  var_new_virtual_address_id UUID;
  var_full_address TEXT;
  
  -- Return variable
  return_data JSON;
BEGIN
  -- 1. Insert into user_schema.user_table
  -- We use ON CONFLICT just in case, though this should be a fresh sign up
  INSERT INTO user_schema.user_table (
    user_id,
    user_email,
    user_first_name,
    user_last_name
  ) VALUES (
    input_user_id,
    input_email,
    input_first_name,
    input_last_name
  )
  ON CONFLICT (user_id) DO UPDATE SET
    user_first_name = EXCLUDED.user_first_name,
    user_last_name = EXCLUDED.user_last_name,
    user_updated_at = NOW();

  -- 2. Generate account number (format: Q[Quarter][Year]-[Seq])
  -- Example: Q42025-0001
  -- Locking the table for count consistency is ideal but for now we just generate
  SELECT CONCAT('Q', EXTRACT(QUARTER FROM NOW()), EXTRACT(YEAR FROM NOW()), '-', 
         LPAD((COUNT(*) + 1)::TEXT, 4, '0'))
  INTO var_account_number
  FROM user_schema.account_table;

  -- Check if account number exists (simple collision avoidance could be added here)
  
  -- 3. Create new account
  INSERT INTO user_schema.account_table (
    account_user_id,
    account_number,
    account_address_key,
    account_type,
    account_subscription_status_id,
    account_subscription_ends_at,
    account_remaining_mailbox_access
  ) VALUES (
    input_user_id,
    var_account_number,
    var_area_code,
    input_account_type,
    'SST-NONSUB',
    NULL,
    NULL
  )
  RETURNING account_id INTO var_new_account_id;

  -- 4. Generate Virtual Address
  -- Format: Suite [Account#], [Street], [City], [Province], [Country] [Zip]
  var_full_address := CONCAT('Suite ', var_account_number, ', ', var_street, ', ', var_city, ', ', var_province, ', ', var_country, ' ', var_postal_code);

  INSERT INTO mailroom_schema.virtual_address_table (
    virtual_address_account_id,
    virtual_address_address,
    virtual_address_street,
    virtual_address_city,
    virtual_address_province,
    virtual_address_postal_code,
    virtual_address_country,
    virtual_address_area_code,
    virtual_address_status_id
  ) VALUES (
    var_new_account_id,
    var_full_address,
    var_street,
    var_city,
    var_province,
    var_postal_code,
    var_country,
    var_area_code,
    'VAS-ACTIVE'
  )
  RETURNING virtual_address_id INTO var_new_virtual_address_id;

  -- 5. Build Return Data
  SELECT JSON_BUILD_OBJECT(
    'user_id', input_user_id,
    'account_id', var_new_account_id,
    'account_number', var_account_number,
    'virtual_address', var_full_address
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(input_user_uuid UUID)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_schema.user_table ut
    WHERE ut.user_id = input_user_uuid AND ut.user_is_admin = TRUE
  );
END;
$$
LANGUAGE plpgsql;

-- Check if account is business plan
CREATE OR REPLACE FUNCTION is_account_business(input_account_user_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_schema.account_table at
    WHERE at.account_user_id = input_account_user_id AND at.account_is_subscribed = TRUE AND at.account_type = 'AT-BUSINESS'
  );
END;
$$
LANGUAGE plpgsql;

-- Check if account is free plan
CREATE OR REPLACE FUNCTION is_account_free(input_account_user_id UUID)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  return_data JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'account_type', at.account_type,
    'account_status', at.account_subscription_status_id
  ) INTO return_data
  FROM user_schema.account_table at
  WHERE at.account_user_id = input_account_user_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get user full details for profile
CREATE OR REPLACE FUNCTION get_user_full_details(input_user_id UUID)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  return_data JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'user', (SELECT JSON_BUILD_OBJECT(
      'user_id', u.user_id,
      'user_username', u.user_username,
      'user_email', u.user_email,
      'user_first_name', u.user_first_name,
      'user_last_name', u.user_last_name,
      'user_is_admin', u.user_is_admin,
      'user_is_verified', u.user_is_verified,
      'user_avatar_bucket_path', u.user_avatar_bucket_path
    ) FROM user_schema.user_table u WHERE u.user_id = input_user_id),
    'account', (SELECT JSON_BUILD_OBJECT(
      'account_id', a.account_id,
      'account_user_id', a.account_user_id,
      'account_number', a.account_number,
      'account_address_key', a.account_address_key,
      'account_type', a.account_type,
      'account_type_sort_order', at.account_type_sort_order,
      'account_type_value', at.account_type_value,
      'account_is_subscribed', a.account_is_subscribed,
      'account_max_quantity_storage', at.account_max_quantity_storage,
      'account_max_gb_storage', at.account_max_gb_storage,
      'account_max_mailbox_access', at.account_max_mailbox_access,
      'account_remaining_mailbox_access', a.account_remaining_mailbox_access,
      'account_subscription_status_id', a.account_subscription_status_id,
      'account_subscription_status_value', ss.subscription_status_value,
      'account_subscription_ends_at', a.account_subscription_ends_at
    ) FROM user_schema.account_table a
    JOIN user_schema.account_type_table at ON a.account_type = at.account_type_id
    JOIN status_schema.subscription_status_table ss ON a.account_subscription_status_id = ss.subscription_status_id
    WHERE a.account_user_id = input_user_id),
    'address', (SELECT JSON_BUILD_OBJECT(
      'mailroom_address_id', addr.address_id,
      'mailroom_address_key', addr.address_key,
      'mailroom_address_value', addr.address_full,
      'mailroom_address_link', addr.address_map_link
    ) FROM user_schema.account_table a
    JOIN mailroom_schema.mailroom_address_table addr ON a.account_address_key = addr.address_key
    WHERE a.account_user_id = input_user_id)
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get current user
CREATE OR REPLACE FUNCTION get_user(input_user_id UUID)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  return_data JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'user', (SELECT JSON_BUILD_OBJECT(
      'user_id', u.user_id,
      'user_username', u.user_username,
      'user_email', u.user_email,
      'user_first_name', u.user_first_name,
      'user_last_name', u.user_last_name,
      'user_is_admin', u.user_is_admin,
      'user_avatar_bucket_path', u.user_avatar_bucket_path
    ) FROM user_schema.user_table u WHERE u.user_id = input_user_id)
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get mail access limit
CREATE OR REPLACE FUNCTION get_mail_access_limit(input_user_id UUID, input_plan_id TEXT)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Plan defaults
  var_plan_max_mailbox_access INTEGER;
  var_plan_max_quantity_storage INTEGER;
  var_plan_max_gb_storage NUMERIC;
  var_plan_max_parcel_handling INTEGER;
  var_plan_duration_days INTEGER;

  -- User Account details
  var_is_subscribed BOOLEAN;
  var_account_id UUID;
  var_current_account_type TEXT;
  var_remaining_mailbox_access INTEGER;

  -- Mailbox details
  var_mailbox_mail_remaining_space INTEGER;
  var_mailbox_package_remaining_space INTEGER;

  return_data JSON;
BEGIN
  -- 1. Get Plan Defaults (Base)
  SELECT
    account_max_mailbox_access,
    account_max_quantity_storage,
    account_max_gb_storage,
    account_max_parcel_handling,
    account_duration_days
  INTO
    var_plan_max_mailbox_access,
    var_plan_max_quantity_storage,
    var_plan_max_gb_storage,
    var_plan_max_parcel_handling,
    var_plan_duration_days
  FROM user_schema.account_type_table
  WHERE account_type_id = input_plan_id;

  -- 2. Get User Account Status
  SELECT 
    account_is_subscribed, 
    account_id,
    account_type,
    account_remaining_mailbox_access
  INTO 
    var_is_subscribed, 
    var_account_id,
    var_current_account_type,
    var_remaining_mailbox_access
  FROM user_schema.account_table
  WHERE account_user_id = input_user_id;

  -- 3. Override if User is Subscribed and Plan Matches
  IF var_is_subscribed IS TRUE AND var_current_account_type = input_plan_id THEN
    -- Override Max Mailbox Access with Remaining Access
    var_plan_max_mailbox_access := COALESCE(var_remaining_mailbox_access, var_plan_max_mailbox_access);

    -- Fetch latest mailbox limits
    SELECT 
      mailbox_mail_remaining_space,
      mailbox_package_remaining_space
    INTO 
      var_mailbox_mail_remaining_space,
      var_mailbox_package_remaining_space
    FROM mailroom_schema.mailbox_table
    WHERE mailbox_account_id = var_account_id
      AND mailbox_status_id = 'MBS-ACTIVE'
    ORDER BY mailbox_created_at DESC
    LIMIT 1;

    -- Override Storage Limits if mailbox found
    IF var_mailbox_mail_remaining_space IS NOT NULL THEN
      var_plan_max_quantity_storage := var_mailbox_mail_remaining_space;
    END IF;

    IF var_mailbox_package_remaining_space IS NOT NULL THEN
      var_plan_max_parcel_handling := var_mailbox_package_remaining_space;
    END IF;
  END IF;

  -- 4. Return Data
  SELECT JSON_BUILD_OBJECT(
    'account_max_mailbox_access', var_plan_max_mailbox_access,
    'account_max_quantity_storage', var_plan_max_quantity_storage,
    'account_max_gb_storage', var_plan_max_gb_storage,
    'account_max_parcel_handling', var_plan_max_parcel_handling,
    'account_duration_days', var_plan_duration_days
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Create mailbox with account update
CREATE OR REPLACE FUNCTION create_mailbox_with_account_update(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_account_type TEXT := (input_data->>'account_type')::TEXT;
  input_account_is_subscribed BOOLEAN := (input_data->>'account_is_subscribed')::BOOLEAN;
  input_account_subscription_ends_at TIMESTAMPTZ := (input_data->>'account_subscription_ends_at')::TIMESTAMPTZ;
  input_account_remaining_mailbox_access SMALLINT := (input_data->>'account_remaining_mailbox_access')::SMALLINT;
  input_account_subscription_status_id TEXT := (input_data->>'account_subscription_status_id')::TEXT;
  input_mailbox_data JSON := (input_data->'mailbox')::JSON;

  -- Function variables
  var_mailbox_item JSON;
  var_mailbox_account_id UUID;
  var_mailbox_status_id TEXT;
  var_mailbox_label TEXT;
  var_mailbox_mail_remaining_space SMALLINT;

  -- Return variable
  return_data JSON;
BEGIN
  -- 1. Update account subscription details
  UPDATE user_schema.account_table
  SET
    account_type = input_account_type,
    account_is_subscribed = input_account_is_subscribed,
    account_subscription_ends_at = input_account_subscription_ends_at,
    account_remaining_mailbox_access = input_account_remaining_mailbox_access,
    account_subscription_status_id = input_account_subscription_status_id,
    account_updated_at = NOW()
  WHERE account_id = input_account_id;

  -- 2. Insert mailboxes
  FOR var_mailbox_item IN SELECT * FROM json_array_elements(input_mailbox_data)
  LOOP
    var_mailbox_account_id := (var_mailbox_item->>'mailbox_account_id')::UUID;
    var_mailbox_status_id := (var_mailbox_item->>'mailbox_status_id')::TEXT;
    var_mailbox_label := (var_mailbox_item->>'mailbox_label')::TEXT;
    var_mailbox_mail_remaining_space := (var_mailbox_item->>'mailbox_mail_remaining_space')::SMALLINT;

    INSERT INTO mailroom_schema.mailbox_table (
      mailbox_account_id,
      mailbox_status_id,
      mailbox_label,
      mailbox_space_remaining
    ) VALUES (
      var_mailbox_account_id,
      var_mailbox_status_id,
      var_mailbox_label,
      var_mailbox_space_remaining
    );
  END LOOP;

  -- 3. Build return data
  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'message', 'Account updated and mailboxes created successfully',
    'account_id', input_account_id,
    'mailbox_count', json_array_length(input_mailbox_data)
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Create mail item with space decrement
CREATE OR REPLACE FUNCTION create_mail_item_with_space_decrement(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_mailbox_id UUID := (input_data->>'mailbox_id')::UUID;
  input_sender TEXT := (input_data->>'sender')::TEXT;
  input_image_path TEXT := (input_data->>'image_path')::TEXT;
  input_received_at TIMESTAMPTZ := (input_data->>'received_at')::TIMESTAMPTZ;
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, 'MIS-SCANNED');
  input_name TEXT := (input_data->>'name')::TEXT;
  input_description TEXT := (input_data->>'description')::TEXT;
  input_item_type TEXT := COALESCE((input_data->>'item_type')::TEXT, 'mail');

  -- Function variables
  var_current_space SMALLINT;
  var_new_mail_item_id UUID;

  -- Return variable
  return_data JSON;
BEGIN
  -- 1. Check current space remaining
  IF input_item_type = 'package' THEN
    SELECT mailbox_package_remaining_space INTO var_current_space
    FROM mailroom_schema.mailbox_table
    WHERE mailbox_id = input_mailbox_id;
  ELSE
    SELECT mailbox_mail_remaining_space INTO var_current_space
    FROM mailroom_schema.mailbox_table
    WHERE mailbox_id = input_mailbox_id;
  END IF;

  IF var_current_space IS NULL THEN
    RAISE EXCEPTION 'Mailbox not found';
  END IF;

  IF var_current_space <= 0 THEN
    RAISE EXCEPTION 'Mailbox capacity full, no storage space remaining';
  END IF;

  -- 2. Decrement space
  IF input_item_type = 'package' THEN
    UPDATE mailroom_schema.mailbox_table
    SET mailbox_package_remaining_space = mailbox_package_remaining_space - 1,
        mailbox_updated_at = NOW()
    WHERE mailbox_id = input_mailbox_id;
  ELSE
    UPDATE mailroom_schema.mailbox_table
    SET mailbox_mail_remaining_space = mailbox_mail_remaining_space - 1,
        mailbox_updated_at = NOW()
    WHERE mailbox_id = input_mailbox_id;
  END IF;

  -- 3. Insert mail item
  INSERT INTO mailroom_schema.mail_item_table (
    mail_item_mailbox_id,
    mail_item_sender,
    mail_item_received_at,
    mail_item_status_id,
    mail_item_name,
    mail_item_description,
    mail_item_type
  ) VALUES (
    input_mailbox_id,
    input_sender,
    input_received_at,
    input_status_id,
    input_name,
    input_description,
    UPPER(input_item_type)
  )
  RETURNING mail_item_id INTO var_new_mail_item_id;

    -- 4. Insert attachments
    INSERT INTO mailroom_schema.mail_attachment_table (
      mail_attachment_mail_item_id,
      mail_attachment_unopened_scan_file_path
    )
    VALUES (
      var_new_mail_item_id,
      input_image_path
    );

  -- 5. Build return data
  SELECT JSON_BUILD_OBJECT(
    'mail_item_id', var_new_mail_item_id,
    'mailbox_id', input_mailbox_id,
    'remaining_space', var_current_space - 1
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get all customers
CREATE OR REPLACE FUNCTION get_all_customers(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_search TEXT := (input_data->>'search')::TEXT;
  input_status_filter TEXT := (input_data->>'status_filter')::TEXT;
  input_type_filter TEXT := (input_data->>'type_filter')::TEXT;
  input_sort_order TEXT := (input_data->>'sort_order')::TEXT;
  
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_AGG(customer_data) INTO return_data
  FROM (
    SELECT 
      JSON_BUILD_OBJECT(
        'account_id', a.account_id,
        'account_number', a.account_number,
        'account_address_key', a.account_address_key,
        'account_type', a.account_type,
        'account_type_value', at.account_type_value,
        'account_subscription_status_id', a.account_subscription_status_id,
        'account_subscription_status_value', ss.subscription_status_value,
        'account_subscription_ends_at', a.account_subscription_ends_at,
        'account_remaining_mailbox_access', a.account_remaining_mailbox_access,
        'account_created_at', a.account_created_at,
        'user_id', u.user_id,
        'user_email', u.user_email,
        'user_first_name', u.user_first_name,
        'user_last_name', u.user_last_name
      ) as customer_data
    FROM user_schema.account_table a
    LEFT JOIN user_schema.user_table u ON a.account_user_id = u.user_id
    LEFT JOIN user_schema.account_type_table at ON a.account_type = at.account_type_id
    LEFT JOIN status_schema.subscription_status_table ss ON a.account_subscription_status_id = ss.subscription_status_id
    WHERE 
      (input_search IS NULL OR input_search = '' OR 
       LOWER(u.user_first_name || ' ' || u.user_last_name) LIKE LOWER('%' || input_search || '%') OR
       LOWER(u.user_email) LIKE LOWER('%' || input_search || '%') OR
       LOWER(a.account_number) LIKE LOWER('%' || input_search || '%'))
      AND
      (input_status_filter IS NULL OR input_status_filter = '' OR 
       LOWER(ss.subscription_status_value) = LOWER(input_status_filter))
      AND
      (input_type_filter IS NULL OR input_type_filter = '' OR 
       LOWER(at.account_type_value) = LOWER(input_type_filter))
    ORDER BY 
      CASE 
        WHEN input_sort_order = 'asc' THEN a.account_created_at
      END ASC,
      CASE 
        WHEN input_sort_order = 'desc' OR input_sort_order IS NULL THEN a.account_created_at
      END DESC
  ) subquery;

  RETURN COALESCE(return_data, '[]'::JSON);
END;
$$
LANGUAGE plpgsql;

-- Get all mail items by user account no and mailbox id
CREATE OR REPLACE FUNCTION get_all_item_mail_by_user_account_no_and_mailbox_id(
  input_user_id UUID,
  input_account_no TEXT,
  input_mailbox_id UUID
)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  return_data JSON;
BEGIN
  SELECT
    JSON_AGG(mail_data) INTO return_data
  FROM (
    SELECT
      mi.mail_item_id,
      mi.mail_item_sender,
      mi.mail_item_name,
      mi.mail_item_description,
      mi.mail_item_received_at,
      mi.mail_item_created_at,
      mi.mail_item_is_read,
      mi.mail_item_type,
      mis.mail_item_status_value,
      ma.mail_attachment_unopened_scan_file_path,
      ma.mail_attachment_item_scan_file_path,
      mb.mailbox_label,
      -- Retrieval info
      rr.retrieval_request_label_url,
      rr.retrieval_request_tracking_number,
      rr.retrieval_request_courier,
      rr.retrieval_request_status_id

    FROM mailroom_schema.mail_item_table mi
    JOIN mailroom_schema.mailbox_table mb ON mi.mail_item_mailbox_id = mb.mailbox_id
    JOIN user_schema.account_table acc ON mb.mailbox_account_id = acc.account_id
    JOIN status_schema.mail_item_status_table mis ON mi.mail_item_status_id = mis.mail_item_status_id
    LEFT JOIN mailroom_schema.mail_attachment_table ma ON mi.mail_item_id = ma.mail_attachment_mail_item_id
    LEFT JOIN LATERAL (
        SELECT
            retrieval_request_label_url,
            retrieval_request_tracking_number,
            retrieval_request_courier,
            retrieval_request_status_id
        FROM request_schema.retrieval_request_table
        WHERE retrieval_request_mail_item_id = mi.mail_item_id
        ORDER BY retrieval_request_created_at DESC
        LIMIT 1
    ) rr ON TRUE
    WHERE
      acc.account_user_id = input_user_id
      AND acc.account_number = input_account_no
      AND (input_mailbox_id IS NULL OR mb.mailbox_id = input_mailbox_id)
      AND mi.mail_item_is_deleted = FALSE
    ORDER BY mi.mail_item_received_at DESC
  ) as mail_data;

  RETURN COALESCE(return_data, '[]'::JSON);
END;
$$
LANGUAGE plpgsql;

-- Mark mail item as unread
CREATE OR REPLACE FUNCTION mark_mail_item_as_unread(input_mail_item_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE mailroom_schema.mail_item_table
  SET mail_item_is_read = FALSE,
      mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql;

-- Mark mail item as read
CREATE OR REPLACE FUNCTION mark_mail_item_as_read(input_mail_item_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE mailroom_schema.mail_item_table
  SET mail_item_is_read = TRUE,
      mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql;

-- Set mail item archive status
CREATE OR REPLACE FUNCTION set_mail_item_archive_status(
  input_mail_item_id UUID,
  input_is_archived BOOLEAN
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
DECLARE
  target_status TEXT;
BEGIN
  IF input_is_archived THEN
    target_status := 'MIS-ARCHIVED';
  ELSE
    target_status := 'MIS-RECEIVED';
  END IF;

  UPDATE mailroom_schema.mail_item_table
  SET mail_item_status_id = target_status,
      mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql;

-- Request mail item disposal
CREATE OR REPLACE FUNCTION request_mail_item_disposal(
  input_mail_item_id UUID,
  input_account_id UUID,
  input_notes TEXT DEFAULT NULL
)
RETURNS UUID
SET search_path TO ''
AS $$
DECLARE
  new_request_id UUID;
BEGIN
  -- Check if already disposed or pending disposal
  IF EXISTS (
    SELECT 1 FROM request_schema.dispose_request_table
    WHERE dispose_request_mail_item_id = input_mail_item_id
    AND dispose_request_status_id IN ('DRS-PENDING', 'DRS-APPROVED', 'DRS-COMPLETED')
  ) THEN
    RAISE EXCEPTION 'Disposal request already exists for this mail item';
  END IF;

  UPDATE mailroom_schema.mail_item_table
    SET mail_item_status_id = 'MIS-DISPOSAL',
        mail_item_updated_at = NOW()
    WHERE mail_item_id = input_mail_item_id;

  INSERT INTO request_schema.dispose_request_table (
    dispose_request_mail_item_id,
    dispose_request_account_id,
    dispose_request_status_id,
    dispose_request_notes
  ) VALUES (
    input_mail_item_id,
    input_account_id,
    'DRS-PENDING',
    input_notes
  )
  RETURNING dispose_request_id INTO new_request_id;

  RETURN new_request_id;
END;
$$
LANGUAGE plpgsql;

-- Request mail item retrieval
CREATE OR REPLACE FUNCTION request_mail_item_retrieval(
  input_mail_item_id UUID,
  input_account_id UUID,
  input_address TEXT,
  input_notes TEXT DEFAULT NULL
)
RETURNS UUID
SET search_path TO ''
AS $$
DECLARE
  new_request_id UUID;
BEGIN
  -- Check if retrieval already active
  IF EXISTS (
    SELECT 1 FROM request_schema.retrieval_request_table
    WHERE retrieval_request_mail_item_id = input_mail_item_id
    AND retrieval_request_status_id IN ('RRS-PENDING', 'RRS-APPROVED', 'RRS-IN_TRANSIT')
  ) THEN
    RAISE EXCEPTION 'Retrieval request already active for this mail item';
  END IF;

  INSERT INTO request_schema.retrieval_request_table (
    retrieval_request_mail_item_id,
    retrieval_request_account_id,
    retrieval_request_status_id,
    retrieval_request_address,
    retrieval_request_notes
  ) VALUES (
    input_mail_item_id,
    input_account_id,
    'RRS-PENDING',
    input_address,
    input_notes
  )
  RETURNING retrieval_request_id INTO new_request_id;
  
  -- Update mail item status to Retrieved? Or wait until approved?
  -- Typically we wait.
  
  UPDATE mailroom_schema.mail_item_table
  SET mail_item_status_id = 'MIS-RETRIEVAL',
      mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id;

  RETURN new_request_id;
END;
$$
LANGUAGE plpgsql;

-- Admin Customer Mailroom
-- Get all mailrooms
CREATE OR REPLACE FUNCTION get_all_mailrooms(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_search TEXT := (input_data->>'search')::TEXT;
  input_status_filter TEXT := (input_data->>'status_filter')::TEXT;
  input_type_filter TEXT := (input_data->>'type_filter')::TEXT;
  input_sort_order TEXT := (input_data->>'sort_order')::TEXT;

  return_data JSON;

BEGIN
    SELECT
        COALESCE(JSON_AGG(
            JSON_BUILD_OBJECT(
                'mailbox_id', mb.mailbox_id,
                'mailbox_label', mb.mailbox_label,
                'mailbox_status_id', mb.mailbox_status_id,
                'mailbox_status_value', mst.mailbox_status_value,
                'mailbox_mail_remaining_space', mb.mailbox_mail_remaining_space,
                'account_id', acc.account_id,
                'account_number', acc.account_number,
								'account_address_key', acc.account_address_key,
                'user_id', u.user_id,
                'user_full_name', CONCAT_WS(' ', u.user_first_name, u.user_last_name),
                'user_email', u.user_email,
                'mailbox_created_at', mb.mailbox_created_at
            ) ORDER BY 
                CASE WHEN input_sort_order = 'asc' THEN mb.mailbox_created_at END ASC,
                CASE WHEN input_sort_order = 'desc' OR input_sort_order IS NULL THEN mb.mailbox_created_at END DESC
        ), '[]'::JSON)
    INTO
        return_data
    FROM
        mailroom_schema.mailbox_table mb
    JOIN
        status_schema.mailbox_status_table mst ON mb.mailbox_status_id = mst.mailbox_status_id
    JOIN
        user_schema.account_table acc ON mb.mailbox_account_id = acc.account_id
    JOIN
        user_schema.user_table u ON acc.account_user_id = u.user_id
    WHERE
        (input_search IS NULL OR input_search = '' OR
         mb.mailbox_label ILIKE '%' || input_search || '%' OR
         acc.account_number ILIKE '%' || input_search || '%' OR
         u.user_email ILIKE '%' || input_search || '%' OR
         CONCAT_WS(' ', u.user_first_name, u.user_last_name) ILIKE '%' || input_search || '%')
        AND
        (input_status_filter IS NULL OR input_status_filter = '' OR mb.mailbox_status_id::TEXT = input_status_filter)
        AND
        (input_type_filter IS NULL OR input_type_filter = '' OR acc.account_type = input_type_filter);

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Update mailbox status
CREATE OR REPLACE FUNCTION update_mailbox_status(
  input_mailbox_id UUID,
  input_status_id TEXT
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE mailroom_schema.mailbox_table
  SET mailbox_status_id = input_status_id,
      mailbox_updated_at = NOW()
  WHERE mailbox_id = input_mailbox_id;

  RETURN FOUND;
END;
$$
LANGUAGE plpgsql;

-- Get all disposal requests
CREATE OR REPLACE FUNCTION get_all_disposal_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_search TEXT := (input_data->>'search')::TEXT;
  input_status_filter TEXT := (input_data->>'status_filter')::TEXT;
  input_sort_order TEXT := (input_data->>'sort_order')::TEXT;
  
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    COALESCE(JSON_AGG(request_data), '[]'::JSON) INTO return_data
  FROM (
    SELECT 
      JSON_BUILD_OBJECT(
        'dispose_request_id', dr.dispose_request_id,
        'dispose_request_mail_item_id', dr.dispose_request_mail_item_id,
        'dispose_request_account_id', dr.dispose_request_account_id,
        'dispose_request_status_id', dr.dispose_request_status_id,
        'dispose_request_status_value', drs.dispose_request_status_value,
        'dispose_request_requested_at', dr.dispose_request_requested_at,
        'mail_item_name', mi.mail_item_name,
        'mail_item_sender', mi.mail_item_sender,
        'user_id', u.user_id,
        'user_full_name', CONCAT_WS(' ', u.user_first_name, u.user_last_name),
        'user_email', u.user_email,
        'account_address_key', acc.account_address_key,
        'account_account_number', acc.account_number,
        'account_type', acc.account_type,
        'account_type_value',act.account_type_value

      ) as request_data
    FROM request_schema.dispose_request_table dr
    JOIN status_schema.dispose_request_status_table drs ON dr.dispose_request_status_id = drs.dispose_request_status_id
    JOIN mailroom_schema.mail_item_table mi ON dr.dispose_request_mail_item_id = mi.mail_item_id
    JOIN user_schema.account_table acc ON dr.dispose_request_account_id = acc.account_id
    JOIN user_schema.user_table u ON acc.account_user_id = u.user_id
    JOIN user_schema.account_type_table act ON acc.account_type = act.account_type_id
    WHERE 
      (input_search IS NULL OR input_search = '' OR 
       LOWER(u.user_first_name || ' ' || u.user_last_name) LIKE LOWER('%' || input_search || '%') OR
       LOWER(u.user_email) LIKE LOWER('%' || input_search || '%'))
      AND
      (input_status_filter IS NULL OR input_status_filter = '' OR 
       LOWER(drs.dispose_request_status_value) = LOWER(input_status_filter) OR
       LOWER(dr.dispose_request_status_id) = LOWER(input_status_filter))
    ORDER BY 
      CASE 
        WHEN input_sort_order = 'asc' THEN dr.dispose_request_requested_at
      END ASC,
      CASE 
        WHEN input_sort_order = 'desc' OR input_sort_order IS NULL THEN dr.dispose_request_requested_at
      END DESC
  ) subquery;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update disposal request status
CREATE OR REPLACE FUNCTION update_disposal_request_status(
  input_request_id UUID,
  input_status_id TEXT
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE request_schema.dispose_request_table
  SET dispose_request_status_id = input_status_id,
      dispose_request_updated_at = NOW(),
      dispose_request_processed_at = CASE WHEN input_status_id IN ('DRS-APPROVED', 'DRS-COMPLETED', 'DRS-REJECTED') THEN NOW() ELSE dispose_request_processed_at END
  WHERE dispose_request_id = input_request_id;

  -- If completed, update mail item status to disposed (if not already)
  IF input_status_id = 'DRS-COMPLETED' THEN
    UPDATE mailroom_schema.mail_item_table
    SET mail_item_status_id = 'MIS-DISPOSED',
        mail_item_updated_at = NOW()
    WHERE mail_item_id = (SELECT dispose_request_mail_item_id FROM request_schema.dispose_request_table WHERE dispose_request_id = input_request_id);
  END IF;

  RETURN FOUND;
END;
$$
LANGUAGE plpgsql;

-- Create user profile (Onboarding)
CREATE OR REPLACE FUNCTION create_user_profile(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_email VARCHAR(254) := (input_data->>'email')::VARCHAR;
  input_first_name VARCHAR(254) := (input_data->>'first_name')::VARCHAR;
  input_last_name VARCHAR(254) := (input_data->>'last_name')::VARCHAR;
  input_avatar TEXT := (input_data->>'avatar_bucket_path')::TEXT;
  
  -- Return variable
  return_data JSON;
BEGIN
  -- 1. Insert into user_schema.user_table
  INSERT INTO user_schema.user_table (
    user_id,
    user_email,
    user_first_name,
    user_last_name,
    user_avatar_bucket_path
  ) VALUES (
    input_user_id,
    input_email,
    input_first_name,
    input_last_name,
    input_avatar
  )
  ON CONFLICT (user_id) DO UPDATE SET
    user_first_name = EXCLUDED.user_first_name,
    user_last_name = EXCLUDED.user_last_name,
    user_avatar_bucket_path = EXCLUDED.user_avatar_bucket_path,
    user_updated_at = NOW();

  -- 2. Build Return Data
  SELECT JSON_BUILD_OBJECT(
    'user_id', input_user_id,
    'email', input_email
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get user has account
CREATE OR REPLACE FUNCTION get_user_has_account(input_user_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_schema.account_table
    WHERE account_user_id = input_user_id
  );
END;
$$
LANGUAGE plpgsql;

-- Get active addresses
CREATE OR REPLACE FUNCTION get_active_addresses()
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'mailroom_address_id', address_id,
            'mailroom_address_key', address_key,
            'mailroom_address_value', address_full,
            'mailroom_address_link', address_map_link
        )
    )
    INTO result
    FROM mailroom_schema.mailroom_address_table
    WHERE address_is_active = TRUE;

    RETURN coalesce(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Subcription function
CREATE OR REPLACE FUNCTION create_user_subscription_account(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  var_account_id UUID := gen_random_uuid();
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_account_type TEXT := COALESCE((input_data->>'account_type')::TEXT, 'AT-FREE');
  input_account_is_subscribed BOOLEAN := COALESCE((input_data->>'account_is_subscribed')::BOOLEAN, FALSE);
  input_account_subscription_ends_at TIMESTAMPTZ := (input_data->>'account_subscription_ends_at')::TIMESTAMPTZ;
  input_account_remaining_mailbox_access SMALLINT := (input_data->>'account_remaining_mailbox_access')::SMALLINT;
  input_account_subscription_status_id TEXT := COALESCE((input_data->>'account_subscription_status_id')::TEXT, 'SST-NONSUB');
  input_mailbox_data JSON := COALESCE((input_data->'mailbox')::JSON, '[]'::JSON);
  
  -- Address Inputs
  input_address_key TEXT := (input_data->>'account_address_key')::TEXT;
  input_referred_by VARCHAR(254) := (input_data->>'referred_by')::VARCHAR;

  -- Function variables
  var_account_number TEXT;
  var_referrer_id UUID;
  var_mailbox_item JSON;
  var_mailbox_status_id TEXT;
  var_mailbox_label TEXT;
  var_mailbox_mail_remaining_space SMALLINT;
  var_mailbox_package_remaining_space SMALLINT;
  
  -- Return variable
  return_data JSON;
BEGIN
  -- 1. Generate account number
  SELECT (COUNT(*) + 1)::TEXT
  INTO var_account_number
  FROM user_schema.account_table;

  -- 2. Create or update account subscription details
  IF input_referred_by IS NOT NULL AND input_referred_by <> '' THEN
    -- Get referrer user id
    SELECT user_id INTO var_referrer_id
    FROM user_schema.user_table
    WHERE user_referral_code = input_referred_by;

    IF var_referrer_id IS NOT NULL THEN
      -- Update user referral email
      UPDATE user_schema.user_table
      SET user_referral_code = input_referred_by,
          user_updated_at = NOW()
      WHERE user_id = input_user_id;

      -- Insert into referral table if not self-referral
      IF var_referrer_id <> input_user_id THEN
        INSERT INTO referral_schema.referral_invitation_table (
          referral_owner_user_id,
          referral_redeemed_by_user_id
        ) VALUES (
          var_referrer_id,
          input_user_id
        );
      END IF;
    END IF;
  END IF;

  INSERT INTO user_schema.account_table (
    account_id,
    account_user_id,
    account_number,
    account_address_key,
    account_type,
    account_is_subscribed,
    account_subscription_ends_at,
    account_remaining_mailbox_access,
    account_subscription_status_id,
    account_created_at,
    account_updated_at
  ) VALUES (
    var_account_id,
    input_user_id,
    var_account_number,
    input_address_key,
    input_account_type,
    input_account_is_subscribed,
    input_account_subscription_ends_at,
    input_account_remaining_mailbox_access,
    input_account_subscription_status_id,
    NOW(),
    NOW()
  ) ON CONFLICT (account_id) DO UPDATE SET
    account_type = EXCLUDED.account_type,
    account_is_subscribed = EXCLUDED.account_is_subscribed,
    account_subscription_ends_at = EXCLUDED.account_subscription_ends_at,
    account_remaining_mailbox_access = EXCLUDED.account_remaining_mailbox_access,
    account_subscription_status_id = EXCLUDED.account_subscription_status_id,
    account_updated_at = NOW();

  -- 4. Generate referral code for free plan
  IF input_account_type = 'AT-FREE' THEN
    UPDATE user_schema.user_table
    SET user_referral_code = UPPER(LEFT(encode(gen_random_bytes(6), 'hex'), 12)),
        user_updated_at = NOW()
    WHERE user_id = input_user_id
    AND (user_referral_code IS NULL OR user_referral_code = '');
  END IF;
  -- 5. Insert mailboxes
  FOR var_mailbox_item IN SELECT * FROM json_array_elements(input_mailbox_data)
  LOOP
    var_mailbox_status_id := (var_mailbox_item->>'mailbox_status_id')::TEXT;
    var_mailbox_label := (var_mailbox_item->>'mailbox_label')::TEXT;
    var_mailbox_mail_remaining_space := (var_mailbox_item->>'mailbox_mail_remaining_space')::SMALLINT;
    var_mailbox_package_remaining_space := (var_mailbox_item->>'mailbox_package_remaining_space')::SMALLINT;

    INSERT INTO mailroom_schema.mailbox_table (
      mailbox_account_id,
      mailbox_status_id,
      mailbox_label,
      mailbox_mail_remaining_space,
      mailbox_package_remaining_space
    ) VALUES (
      var_account_id,
      var_mailbox_status_id,
      var_mailbox_label,
      var_mailbox_mail_remaining_space,
      var_mailbox_package_remaining_space
    );
  END LOOP;

  -- 6. Build return data
  SELECT JSON_BUILD_OBJECT(
    'success', TRUE,
    'message', 'Account updated and mailboxes created successfully',
    'account_id', var_account_id,
    'account_number', var_account_number,
    'mailbox_count', json_array_length(input_mailbox_data)
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get active address
CREATE OR REPLACE FUNCTION get_active_addresses()
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'mailroom_address_id', address_id,
            'mailroom_address_key', address_key,
            'mailroom_address_value', address_full,
            'mailroom_address_link', address_map_link
        )
    )
    INTO result
    FROM mailroom_schema.mailroom_address_table
    WHERE address_is_active = TRUE;

    RETURN coalesce(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Get Subscription Plan
CREATE OR REPLACE FUNCTION get_subscription_plans(input_data JSON DEFAULT '{}'::json)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    return_data JSON;
BEGIN
    return_data := (
        SELECT json_agg(
            json_build_object(
                'id', p.subscription_plan_id,
                'name', p.subscription_plan_name,
                'price', p.subscription_plan_price,
                'description', p.subscription_plan_description,
                'popular', p.subscription_plan_is_popular,
                'button_text', p.subscription_plan_button_text,
                'usage_note', p.subscription_plan_usage_note,
                'storage_gb', s.subscription_plan_max_gb_storage,
                'quantity_storage', s.subscription_plan_max_quantity_storage,
                'max_mailbox_access', s.subscription_plan_max_mailbox_access,
                'sort_order', s.subscription_plan_type_sort_order,
                'features', (
                    SELECT json_agg(
                        json_build_object(
                            'feature_label', f.subscription_feature_label,
                            'display_text', pf.subscription_plan_feature_display_text,
                            'is_primary', pf.subscription_plan_feature_is_primary,
                            'sort_order', pf.subscription_plan_feature_sort_order
                        ) ORDER BY pf.subscription_plan_feature_sort_order ASC
                    )
                    FROM subscription_schema.subscription_plan_feature_table pf
                    JOIN subscription_schema.subscription_feature_table f ON f.subscription_feature_id = pf.subscription_plan_feature_feature_id
                    WHERE pf.subscription_plan_feature_plan_id = p.subscription_plan_id
                )
            ) ORDER BY s.subscription_plan_type_sort_order ASC
        )
        FROM subscription_schema.subscription_plan_table p
        LEFT JOIN subscription_schema.subscription_plan_storage_table s ON s.subscription_plan_storage_plan_id = p.subscription_plan_id
    );

    RETURN return_data;
END;
$$;

-- Get free subscriber list as a referral list
CREATE OR REPLACE FUNCTION get_all_free_subscriber()
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
return_data JSON;
BEGIN
    SELECT
        COALESCE(JSON_AGG(
            JSON_BUILD_OBJECT(
                'account_user_id', a.account_user_id,
                'user_referral_code', u.user_referral_code
            )
        ), '[]'::json) INTO return_data
    FROM user_schema.account_table a
    JOIN user_schema.user_table u ON a.account_user_id = u.user_id
    WHERE a.account_type = 'AT-FREE' AND a.account_is_subscribed = true;

    return_data := JSON_BUILD_OBJECT(
        'referral_user', return_data
    );

    RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get user referrals
CREATE OR REPLACE FUNCTION get_user_referrals(input_user_id UUID)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    return_data JSON;
BEGIN
    SELECT 
        COALESCE(JSON_AGG(
            JSON_BUILD_OBJECT(
                'referral_id', r.referral_invitation_id,
                'invitee_email', u.user_email,
                'account_address_key', a.account_address_key,
                'status', s.subscription_status_value,
                'account_type', a.account_type,
                'account_type_value', at.account_type_value,
                'account_updated_at', TO_CHAR(a.account_updated_at, 'YYYY-MM-DD HH24:MI:SS')
            )
        ), '[]'::json) INTO return_data
    FROM referral_schema.referral_invitation_table r
    JOIN user_schema.user_table u ON r.referral_redeemed_by_user_id = u.user_id
    LEFT JOIN user_schema.account_table a ON u.user_id = a.account_user_id
    LEFT JOIN status_schema.subscription_status_table s ON a.account_subscription_status_id = s.subscription_status_id
    LEFT JOIN user_schema.account_type_table at ON a.account_type = at.account_type_id
    WHERE r.referral_owner_user_id = input_user_id;

    RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update get_user to include phone and referral email
CREATE OR REPLACE FUNCTION get_user(input_user_id UUID)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  return_data JSON;
BEGIN
  SELECT JSON_BUILD_OBJECT(
    'user', (SELECT JSON_BUILD_OBJECT(
      'user_id', u.user_id,
      'user_username', u.user_username,
      'user_email', u.user_email,
      'user_first_name', u.user_first_name,
      'user_last_name', u.user_last_name,
      'user_phone', u.user_phone,
      'user_is_admin', u.user_is_admin,
      'user_avatar_bucket_path', u.user_avatar_bucket_path,
      'user_referral_code', u.user_referral_code
    ) FROM user_schema.user_table u WHERE u.user_id = input_user_id)
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update User Profile RPC
CREATE OR REPLACE FUNCTION update_user_profile(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_username VARCHAR(30) := (input_data->>'username')::VARCHAR;
  input_first_name VARCHAR(254) := (input_data->>'first_name')::VARCHAR;
  input_last_name VARCHAR(254) := (input_data->>'last_name')::VARCHAR;
  input_phone VARCHAR(50) := (input_data->>'phone')::VARCHAR;
  input_avatar_path VARCHAR(256) := (input_data->>'avatar_path')::VARCHAR;
  
  return_data JSON;
BEGIN
  UPDATE user_schema.user_table
  SET
    user_username = input_username,
    user_first_name = input_first_name,
    user_last_name = input_last_name,
    user_phone = input_phone,
    user_avatar_bucket_path = COALESCE(input_avatar_path, user_avatar_bucket_path),
    user_updated_at = NOW()
  WHERE user_id = input_user_id;

  SELECT JSON_BUILD_OBJECT(
    'success', TRUE
  ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get User Physical Addresses
CREATE OR REPLACE FUNCTION get_user_physical_addresses(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  return_data := (
    SELECT JSON_AGG(t)
    FROM (
      SELECT * FROM user_schema.user_address_table AS uat
      WHERE uat.user_address_user_id = input_user_id
      ORDER BY uat.user_address_is_default DESC, uat.user_address_created_at DESC
    ) AS t
  );
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Add User Physical Address
CREATE OR REPLACE FUNCTION add_user_physical_address(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_address_label TEXT := (input_data->>'address_label')::TEXT;
  input_address_line1 TEXT := (input_data->>'address_line1')::TEXT;
  input_address_line2 TEXT := (input_data->>'address_line2')::TEXT;
  input_city TEXT := (input_data->>'city')::TEXT;
  input_province TEXT := (input_data->>'province')::TEXT;
  input_postal_code TEXT := (input_data->>'postal_code')::TEXT;
  input_country TEXT := (input_data->>'country')::TEXT;
  input_is_default BOOLEAN := COALESCE((input_data->>'is_default')::BOOLEAN, FALSE);
  -- Function variables
  var_should_be_default BOOLEAN;
  var_new_id UUID;
  -- Return variable
  return_data JSON;
BEGIN
  var_should_be_default := input_is_default;
  -- If this is the first address, make it default forcedly
  IF NOT EXISTS (SELECT 1 FROM user_schema.user_address_table AS uat WHERE uat.user_address_user_id = input_user_id) THEN
    var_should_be_default := TRUE;
  END IF;
  -- If setting as default, unset others
  IF var_should_be_default THEN
    UPDATE user_schema.user_address_table AS uat
    SET user_address_is_default = FALSE
    WHERE uat.user_address_user_id = input_user_id;
  END IF;
  INSERT INTO user_schema.user_address_table AS uat (
    user_address_user_id,
    user_address_label,
    user_address_line1,
    user_address_line2,
    user_address_city,
    user_address_province,
    user_address_postal_code,
    user_address_country,
    user_address_is_default
  ) VALUES (
    input_user_id,
    input_address_label,
    input_address_line1,
    input_address_line2,
    input_city,
    input_province,
    input_postal_code,
    COALESCE(input_country, 'Philippines'),
    var_should_be_default
  ) RETURNING user_address_id INTO var_new_id;
  return_data := JSON_BUILD_OBJECT('user_address_id', var_new_id);
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Update User Physical Address
CREATE OR REPLACE FUNCTION update_user_physical_address(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_address_id UUID := (input_data->>'user_address_id')::UUID;
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_address_label TEXT := (input_data->>'address_label')::TEXT;
  input_address_line1 TEXT := (input_data->>'address_line1')::TEXT;
  input_address_line2 TEXT := (input_data->>'address_line2')::TEXT;
  input_city TEXT := (input_data->>'city')::TEXT;
  input_province TEXT := (input_data->>'province')::TEXT;
  input_postal_code TEXT := (input_data->>'postal_code')::TEXT;
  input_country TEXT := (input_data->>'country')::TEXT;
  input_is_default BOOLEAN := (input_data->>'is_default')::BOOLEAN;
  -- Function variables
  var_target_user_id UUID;
  var_should_be_default BOOLEAN;
  -- Return variable
  return_data JSON;
BEGIN
  var_target_user_id := input_user_id;
  var_should_be_default := input_is_default;
  -- If setting as default, unset others
  IF var_should_be_default THEN
    UPDATE user_schema.user_address_table AS uat
    SET user_address_is_default = FALSE
    WHERE uat.user_address_user_id = var_target_user_id;
  END IF;
  UPDATE user_schema.user_address_table AS uat
  SET
    user_address_label = COALESCE(input_address_label, uat.user_address_label),
    user_address_line1 = COALESCE(input_address_line1, uat.user_address_line1),
    user_address_line2 = COALESCE(input_address_line2, uat.user_address_line2),
    user_address_city = COALESCE(input_city, uat.user_address_city),
    user_address_province = COALESCE(input_province, uat.user_address_province),
    user_address_postal_code = COALESCE(input_postal_code, uat.user_address_postal_code),
    user_address_country = COALESCE(input_country, uat.user_address_country),
    user_address_is_default = COALESCE(var_should_be_default, uat.user_address_is_default),
    user_address_updated_at = NOW()
  WHERE uat.user_address_id = input_user_address_id
  AND uat.user_address_user_id = var_target_user_id;
  return_data := JSON_BUILD_OBJECT('success', true);
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Delete User Physical Address
CREATE OR REPLACE FUNCTION delete_user_physical_address(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_address_id UUID := (input_data->>'user_address_id')::UUID;
  input_user_id UUID := (input_data->>'user_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  DELETE FROM user_schema.user_address_table AS uat
  WHERE uat.user_address_id = input_user_address_id
  AND uat.user_address_user_id = input_user_id;
  return_data := JSON_BUILD_OBJECT('success', true);
  RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Function to delete a user profile
CREATE OR REPLACE FUNCTION delete_user_profile(input_data JSON)
RETURNS JSON AS $$
DECLARE
  input_user_id UUID := (input_data->>'user_id')::UUID;
  return_data JSON;
BEGIN
  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM user_schema.user_table WHERE user_id = input_user_id) THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  DELETE FROM user_schema.user_address_table WHERE user_address_user_id = input_user_id;
  DELETE FROM user_schema.account_table WHERE account_user_id = input_user_id;
  DELETE FROM user_schema.user_table WHERE user_id = input_user_id;
  
  return_data := json_build_object('success', true, 'message', 'User profile deleted successfully');
  
  RETURN return_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get User Adress for Revtrieval Request
CREATE OR REPLACE FUNCTION get_user_address(input_user_id uuid)
RETURNS JSON
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'address_id', ua.user_address_id,
            'address_value', CONCAT_WS(', ',
                ua.user_address_line1,
                ua.user_address_line2,
                ua.user_address_city,
                ua.user_address_province,
                ua.user_address_postal_code,
                ua.user_address_country
            ),
            'address_label', ua.user_address_label,
            'address_is_default', ua.user_address_is_default
        ) ORDER BY ua.user_address_is_default DESC, ua.user_address_created_at DESC
    ) INTO result
    FROM user_schema.user_address_table ua
    WHERE ua.user_address_user_id = input_user_id;

    RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- Get mail action has requested
CREATE OR REPLACE FUNCTION get_mail_has_request_action(input_mail_item_id UUID)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  has_retrieval BOOLEAN;
  has_disposal BOOLEAN;
  has_scan BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM request_schema.retrieval_request_table rr
    WHERE rr.retrieval_request_mail_item_id = input_mail_item_id
  ) INTO has_retrieval;

  SELECT EXISTS (
    SELECT 1
    FROM request_schema.dispose_request_table dr
    WHERE dr.dispose_request_mail_item_id = input_mail_item_id
  ) INTO has_disposal;

  SELECT EXISTS (
    SELECT 1
    FROM request_schema.scan_request_table sr
    WHERE sr.scan_request_mail_item_id = input_mail_item_id
  ) INTO has_scan;

  RETURN json_build_object(
    'has_request_retrieval', has_retrieval,
    'has_request_disposal', has_disposal,
    'has_request_scan', has_scan
  );
END;
$$ LANGUAGE plpgsql;

-- Request mail scan
CREATE OR REPLACE FUNCTION request_mail_item_scan(
  input_mail_item_id UUID,
  input_account_id UUID,
  input_instructions TEXT DEFAULT NULL
)
RETURNS UUID
SET search_path TO ''
AS $$
DECLARE
  new_request_id UUID;
BEGIN
  -- Check if scan request already active
  IF EXISTS (
    SELECT 1 FROM request_schema.scan_request_table
    WHERE scan_request_mail_item_id = input_mail_item_id
    AND scan_request_status_id IN ('SRS-PENDING', 'SRS-IN_PROGRESS')
  ) THEN
    RAISE EXCEPTION 'Scan request already active for this mail item';
  END IF;

  INSERT INTO request_schema.scan_request_table (
    scan_request_mail_item_id,
    scan_request_account_id,
    scan_request_status_id,
    scan_request_instructions
  ) VALUES (
    input_mail_item_id,
    input_account_id,
    'SRS-PENDING',
    input_instructions
  )
  RETURNING scan_request_id INTO new_request_id;

  -- Update mail item status
  UPDATE mailroom_schema.mail_item_table
  SET mail_item_status_id = 'MIS-SCANNING',
      mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id;

  RETURN new_request_id;
END;
$$
LANGUAGE plpgsql;

-- Get mailroom data for customer
CREATE OR REPLACE FUNCTION get_mailroom_data(input_account_id UUID)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'items', (
      SELECT COALESCE(json_object_agg(
        mi.mail_item_id,
        json_build_object(
          'mail_item_id', mi.mail_item_id,
          'mail_item_sender', mi.mail_item_sender,
          'mail_item_received_at', mi.mail_item_received_at,
          'mail_item_type', mi.mail_item_type,
          'mail_item_status_value', s.mail_item_status_value,
          'mailbox_label', mb.mailbox_label,
          'mail_item_mailbox_id', mb.mailbox_id,
          'mailbox_account_id', mb.mailbox_account_id,
          'mailbox_mail_remaining_space',mb.mailbox_mail_remaining_space,
          'mailbox_package_remaining_space', mb.mailbox_package_remaining_space,
          'account_remaining_mailbox_access', acc.account_remaining_mailbox_access,
          'account_max_mailbox_access', act.account_max_mailbox_access,
          'account_max_quantity_storage', act.account_max_quantity_storage,
          'account_max_parcel_handling', act.account_max_parcel_handling
        )
      ), '{}'::json)
      FROM mailroom_schema.mail_item_table mi
      JOIN mailroom_schema.mailbox_table mb ON mi.mail_item_mailbox_id = mb.mailbox_id
      JOIN status_schema.mail_item_status_table s ON mi.mail_item_status_id = s.mail_item_status_id
      JOIN user_schema.account_table acc ON mb.mailbox_account_id = acc.account_id
      JOIN user_schema.account_type_table act ON acc.account_type = act.account_type_id
      WHERE mb.mailbox_account_id = input_account_id
      AND mi.mail_item_is_deleted = FALSE
    ),
    'columns', (
      SELECT COALESCE(json_object_agg(
        mb.mailbox_id,
        json_build_object(
          'id', mb.mailbox_id,
          'title', mb.mailbox_label,
          'itemIds', (
            SELECT COALESCE(json_agg(mi.mail_item_id), '[]'::json)
            FROM mailroom_schema.mail_item_table mi
            WHERE mi.mail_item_mailbox_id = mb.mailbox_id
            AND mi.mail_item_is_deleted = FALSE
          ),
          'account_max_mailbox_access', act.account_max_mailbox_access,
          'account_max_quantity_storage', act.account_max_quantity_storage,
          'account_max_parcel_handling', act.account_max_parcel_handling
        )
      ), '{}'::json)
      FROM mailroom_schema.mailbox_table mb
      JOIN user_schema.account_table acc ON mb.mailbox_account_id = acc.account_id
      JOIN user_schema.account_type_table act ON acc.account_type = act.account_type_id
      WHERE mb.mailbox_account_id = input_account_id
    ),
    'columnOrder', (
      SELECT COALESCE(json_agg(mb.mailbox_id ORDER BY mb.mailbox_label), '[]'::json)
      FROM mailroom_schema.mailbox_table mb
      WHERE mb.mailbox_account_id = input_account_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update mail item locations
CREATE OR REPLACE FUNCTION update_mail_item_locations(moves JSONB)
RETURNS VOID
SET search_path TO ''
AS $$
DECLARE
  move_record JSONB;
  v_item_id UUID;
  v_new_mailbox_id UUID;
  v_old_mailbox_id UUID;
  v_item_type TEXT;
  v_remaining_space INTEGER;
BEGIN
  FOR move_record IN SELECT * FROM jsonb_array_elements(moves)
  LOOP
    v_item_id := (move_record->>'mail_item_id')::UUID;
    v_new_mailbox_id := (move_record->>'mailbox_id')::UUID;

    -- Get current info
    SELECT mail_item_mailbox_id, mail_item_type 
    INTO v_old_mailbox_id, v_item_type
    FROM mailroom_schema.mail_item_table
    WHERE mail_item_id = v_item_id;

    -- Only proceed if mailbox changed
    IF v_old_mailbox_id IS DISTINCT FROM v_new_mailbox_id THEN

      -- Validate space BEFORE moving
      IF v_item_type = 'MAIL' THEN
        SELECT mailbox_mail_remaining_space
        INTO v_remaining_space
        FROM mailroom_schema.mailbox_table
        WHERE mailbox_id = v_new_mailbox_id;

        IF v_remaining_space <= 0 THEN
          RAISE EXCEPTION 'MAILBOX % has no remaining MAIL space', v_new_mailbox_id;
        END IF;

      ELSIF v_item_type = 'PACKAGE' THEN
        SELECT mailbox_package_remaining_space
        INTO v_remaining_space
        FROM mailroom_schema.mailbox_table
        WHERE mailbox_id = v_new_mailbox_id;

        IF v_remaining_space <= 0 THEN
          RAISE EXCEPTION 'MAILBOX % has no remaining PACKAGE space', v_new_mailbox_id;
        END IF;
      END IF;

      -- Perform actual move
      UPDATE mailroom_schema.mail_item_table
      SET mail_item_mailbox_id = v_new_mailbox_id,
          mail_item_updated_at = NOW()
      WHERE mail_item_id = v_item_id;

      -- Adjust counters
      IF v_item_type = 'MAIL' THEN
        -- Old mailbox gives 1 back
        UPDATE mailroom_schema.mailbox_table
        SET mailbox_mail_remaining_space = mailbox_mail_remaining_space + 1
        WHERE mailbox_id = v_old_mailbox_id;

        -- New mailbox uses 1
        UPDATE mailroom_schema.mailbox_table
        SET mailbox_mail_remaining_space = mailbox_mail_remaining_space - 1
        WHERE mailbox_id = v_new_mailbox_id;

      ELSIF v_item_type = 'PACKAGE' THEN
        UPDATE mailroom_schema.mailbox_table
        SET mailbox_package_remaining_space = mailbox_package_remaining_space + 1
        WHERE mailbox_id = v_old_mailbox_id;

        UPDATE mailroom_schema.mailbox_table
        SET mailbox_package_remaining_space = mailbox_package_remaining_space - 1
        WHERE mailbox_id = v_new_mailbox_id;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Get Retrival Requests
CREATE OR REPLACE FUNCTION get_retrieval_requests(
    input_data JSONB
)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_search_term TEXT := input_data->>'search';
    input_status_filter TEXT := input_data->>'status_filter';
    input_page_number INTEGER := COALESCE((input_data->>'page')::INTEGER, 1);
    input_page_size INTEGER := COALESCE((input_data->>'page_size')::INTEGER, 10);
    input_sort_order TEXT := COALESCE(input_data->>'sort_order', 'desc');
    
    return_data JSONB;
BEGIN
    WITH filtered_data AS (
        SELECT
            r.retrieval_request_id,
            rs.retrieval_request_status_value,
            r.retrieval_request_requested_at,
            r.retrieval_request_courier,
            r.retrieval_request_tracking_number,
            r.retrieval_request_address,
            r.retrieval_request_label_url,
            r.retrieval_request_notes,
            m.mail_item_sender,
            (u.user_first_name || ' ' || u.user_last_name)::TEXT as user_full_name,
            u.user_email::TEXT,
            acc.account_address_key,
            acc.account_number,
            at.account_type_value,
            COUNT(*) OVER() as total_count
        FROM request_schema.retrieval_request_table r
        JOIN mailroom_schema.mail_item_table m ON r.retrieval_request_mail_item_id = m.mail_item_id
        JOIN user_schema.account_table acc ON r.retrieval_request_account_id = acc.account_id
        JOIN user_schema.user_table u ON acc.account_user_id = u.user_id
        JOIN status_schema.retrieval_request_status_table rs ON r.retrieval_request_status_id = rs.retrieval_request_status_id
        JOIN user_schema.account_type_table at ON acc.account_type = at.account_type_id
        WHERE
            (input_search_term IS NULL OR input_search_term = '' OR
             m.mail_item_sender ILIKE '%' || input_search_term || '%' OR
             u.user_first_name ILIKE '%' || input_search_term || '%' OR
             u.user_last_name ILIKE '%' || input_search_term || '%' OR
             u.user_email ILIKE '%' || input_search_term || '%' OR
             acc.account_number ILIKE '%' || input_search_term || '%')
            AND
            (input_status_filter IS NULL OR input_status_filter = '' OR rs.retrieval_request_status_value = input_status_filter)
        ORDER BY
            CASE WHEN input_sort_order = 'asc' THEN r.retrieval_request_requested_at END ASC,
            CASE WHEN input_sort_order = 'desc' THEN r.retrieval_request_requested_at END DESC
        LIMIT input_page_size
        OFFSET (input_page_number - 1) * input_page_size
    )
    SELECT jsonb_agg(row_to_json(filtered_data))
    INTO return_data
    FROM filtered_data;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Process retrieval request
CREATE OR REPLACE FUNCTION process_retrieval_request(
    input_data JSONB
)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_request_id UUID := (input_data->>'request_id')::UUID;
    input_courier TEXT := input_data->>'courier';
    input_tracking_number TEXT := input_data->>'tracking_number';
    input_label_url TEXT := input_data->>'label_url';
    input_status_id TEXT := input_data->>'status_id';
    
    var_status_id TEXT;
    var_mail_item_id UUID;
    var_mail_item_status_id TEXT;
    return_data JSONB;
BEGIN
    -- Determine status ID (Default to IN_TRANSIT if not provided, or use provided one)
    var_status_id := COALESCE(input_status_id, 'RRS-IN_TRANSIT');

    -- Get the mail_item_id associated with this request
    SELECT retrieval_request_mail_item_id INTO var_mail_item_id
    FROM request_schema.retrieval_request_table
    WHERE retrieval_request_id = input_request_id;

    -- Determine Mail Item Status based on Retrieval Status
    IF var_status_id = 'RRS-IN_TRANSIT' THEN
        var_mail_item_status_id := 'MIS-TRANSIT';
    ELSIF var_status_id = 'RRS-DELIVERED' THEN
        var_mail_item_status_id := 'MIS-DELIVERED';
    END IF;

    -- Update retrieval request
    UPDATE request_schema.retrieval_request_table
    SET
        retrieval_request_courier = COALESCE(input_courier, retrieval_request_courier),
        retrieval_request_tracking_number = COALESCE(input_tracking_number, retrieval_request_tracking_number),
        retrieval_request_label_url = COALESCE(input_label_url, retrieval_request_label_url),
        retrieval_request_status_id = var_status_id,
        retrieval_request_processed_at = CASE WHEN retrieval_request_processed_at IS NULL THEN NOW() ELSE retrieval_request_processed_at END,
        retrieval_request_updated_at = NOW()
    WHERE retrieval_request_id = input_request_id;

    -- Update mail item status if mapping exists
    IF var_mail_item_status_id IS NOT NULL THEN
        UPDATE mailroom_schema.mail_item_table
        SET
            mail_item_status_id = var_mail_item_status_id,
            mail_item_updated_at = NOW()
        WHERE mail_item_id = var_mail_item_id;
    END IF;

    return_data := jsonb_build_object('success', true);
    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Get Scan Requests RPC
CREATE OR REPLACE FUNCTION get_scan_requests(
    input_data JSONB
)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_search_term TEXT := input_data->>'search';
    input_status_filter TEXT := input_data->>'status_filter';
    input_page_number INTEGER := COALESCE((input_data->>'page')::INTEGER, 1);
    input_page_size INTEGER := COALESCE((input_data->>'page_size')::INTEGER, 10);
    input_sort_order TEXT := COALESCE(input_data->>'sort_order', 'desc');
    
    return_data JSONB;
BEGIN
    WITH filtered_data AS (
        SELECT
            r.scan_request_id,
            rs.scan_request_status_value,
            r.scan_request_requested_at,
            r.scan_request_instructions,
            r.scan_request_url,
            m.mail_item_sender,
            (u.user_first_name || ' ' || u.user_last_name)::TEXT as user_full_name,
            u.user_email::TEXT,
            acc.account_address_key,
            acc.account_number,
            at.account_type_value,
            COUNT(*) OVER() as total_count
        FROM request_schema.scan_request_table r
        JOIN mailroom_schema.mail_item_table m ON r.scan_request_mail_item_id = m.mail_item_id
        JOIN user_schema.account_table acc ON r.scan_request_account_id = acc.account_id
        JOIN user_schema.user_table u ON acc.account_user_id = u.user_id
        JOIN status_schema.scan_request_status_table rs ON r.scan_request_status_id = rs.scan_request_status_id
        JOIN user_schema.account_type_table at ON acc.account_type = at.account_type_id
        WHERE
            (input_search_term IS NULL OR input_search_term = '' OR
             m.mail_item_sender ILIKE '%' || input_search_term || '%' OR
             u.user_first_name ILIKE '%' || input_search_term || '%' OR
             u.user_last_name ILIKE '%' || input_search_term || '%' OR
             u.user_email ILIKE '%' || input_search_term || '%' OR
             acc.account_number ILIKE '%' || input_search_term || '%')
            AND
            (input_status_filter IS NULL OR input_status_filter = '' OR rs.scan_request_status_value = input_status_filter)
        ORDER BY
            CASE WHEN input_sort_order = 'asc' THEN r.scan_request_requested_at END ASC,
            CASE WHEN input_sort_order = 'desc' THEN r.scan_request_requested_at END DESC
        LIMIT input_page_size
        OFFSET (input_page_number - 1) * input_page_size
    )
    SELECT jsonb_agg(row_to_json(filtered_data))
    INTO return_data
    FROM filtered_data;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Process Scan Request RPC
CREATE OR REPLACE FUNCTION process_scan_request(
    input_data JSONB
)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_request_id UUID := (input_data->>'request_id')::UUID;
    input_url TEXT := input_data->>'url';
    input_status_id TEXT := input_data->>'status_id';
    
    var_status_id TEXT;
    var_mail_item_id UUID;
    var_mail_item_status_id TEXT;
    return_data JSONB;
BEGIN
    -- Determine status ID (Default to COMPLETED if url is provided, or use provided one)
    var_status_id := COALESCE(input_status_id, 'SRS-COMPLETED');

    -- Get the mail_item_id associated with this request
    SELECT scan_request_mail_item_id INTO var_mail_item_id
    FROM request_schema.scan_request_table
    WHERE scan_request_id = input_request_id;

    -- Determine Mail Item Status based on Scan Status
    IF var_status_id = 'SRS-COMPLETED' THEN
        var_mail_item_status_id := 'MIS-SCANNED'; 
    ELSIF var_status_id = 'SRS-REJECTED' THEN
         var_mail_item_status_id := 'MIS-RECEIVED';
    END IF;

    -- Update scan request
    UPDATE request_schema.scan_request_table
    SET
        scan_request_url = COALESCE(input_url, scan_request_url),
        scan_request_status_id = var_status_id,
        scan_request_processed_at = CASE WHEN scan_request_processed_at IS NULL THEN NOW() ELSE scan_request_processed_at END,
        scan_request_updated_at = NOW()
    WHERE scan_request_id = input_request_id;

    -- Update mail item status if mapping exists
    IF var_mail_item_status_id IS NOT NULL THEN
        UPDATE mailroom_schema.mail_item_table
        SET
            mail_item_status_id = var_mail_item_status_id,
            mail_item_updated_at = NOW()
        WHERE mail_item_id = var_mail_item_id;
    END IF;
    
    -- Update the attachment path if URL provided
    IF input_url IS NOT NULL THEN
        -- Check if attachment record exists
        IF EXISTS (SELECT 1 FROM mailroom_schema.mail_attachment_table WHERE mail_attachment_mail_item_id = var_mail_item_id) THEN
            UPDATE mailroom_schema.mail_attachment_table
            SET mail_attachment_item_scan_file_path = input_url,
                mail_attachment_updated_at = NOW()
            WHERE mail_attachment_mail_item_id = var_mail_item_id;
        ELSE
            -- Insert if not exists (unlikely if created properly, but safe)
            INSERT INTO mailroom_schema.mail_attachment_table (
                mail_attachment_mail_item_id,
                mail_attachment_item_scan_file_path
            ) VALUES (
                var_mail_item_id,
                input_url
            );
        END IF;
    END IF;

    return_data := jsonb_build_object('success', true);
    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Cancel Disposal Request RPC
CREATE OR REPLACE FUNCTION cancel_disposal_request(
  input_mail_item_id UUID
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  -- Delete pending disposal request
  DELETE FROM request_schema.dispose_request_table
  WHERE dispose_request_mail_item_id = input_mail_item_id
  AND dispose_request_status_id = 'DRS-PENDING';

  -- Reset mail item status based on attachments
  UPDATE mailroom_schema.mail_item_table
  SET mail_item_status_id = CASE
        WHEN EXISTS (SELECT 1 FROM mailroom_schema.mail_attachment_table WHERE mail_attachment_mail_item_id = input_mail_item_id AND mail_attachment_item_scan_file_path IS NOT NULL) THEN 'MIS-SCANNED'
        ELSE 'MIS-RECEIVED'
      END,
      mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql;

-- Create Notification
CREATE OR REPLACE FUNCTION create_notification(
  input_source_type_id TEXT,
  input_scope_type_id TEXT,
  input_target_user_id UUID,
  input_title TEXT,
  input_message TEXT,
  input_item_type_id TEXT DEFAULT NULL,
  input_item_id UUID DEFAULT NULL,
  input_additional_data JSONB DEFAULT NULL
)
RETURNS UUID
SET search_path TO ''
AS $$
DECLARE
  new_notification_id UUID;
BEGIN
  INSERT INTO notification_schema.notification_table (
    notification_source_type_id,
    notification_scope_type_id,
    notification_target_user_id,
    notification_title,
    notification_message,
    notification_item_type_id,
    notification_item_id,
    notification_additional_data,
    notification_status_type_id
  ) VALUES (
    input_source_type_id,
    input_scope_type_id,
    input_target_user_id,
    input_title,
    input_message,
    input_item_type_id,
    input_item_id,
    input_additional_data,
    'NST-PENDING'
  )
  RETURNING notification_id INTO new_notification_id;

  RETURN new_notification_id;
END;
$$
LANGUAGE plpgsql;

-- Get User Notifications (Paginated)
CREATE OR REPLACE FUNCTION get_user_notifications(
  input_user_id UUID,
  input_page INTEGER DEFAULT 1,
  input_page_size INTEGER DEFAULT 20,
  input_filter_type TEXT DEFAULT 'all' -- 'all', 'unread', 'archived'
)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  return_data JSON;
  offset_val INTEGER;
BEGIN
  offset_val := (input_page - 1) * input_page_size;

  SELECT 
    JSON_BUILD_OBJECT(
      'data', COALESCE(JSON_AGG(n.*), '[]'::JSON),
      'total_count', (
        SELECT COUNT(*) 
        FROM notification_schema.notification_table 
        WHERE notification_target_user_id = input_user_id
        AND (
          CASE 
            WHEN input_filter_type = 'unread' THEN notification_is_read = FALSE
            WHEN input_filter_type = 'archived' THEN notification_is_archived = TRUE
            ELSE notification_is_archived = FALSE
          END
        )
      ),
      'unread_count', (
        SELECT COUNT(*) 
        FROM notification_schema.notification_table 
        WHERE notification_target_user_id = input_user_id 
        AND notification_is_read = FALSE
      )
    ) INTO return_data
  FROM (
    SELECT *
    FROM notification_schema.notification_table
    WHERE notification_target_user_id = input_user_id
    AND (
      CASE 
        WHEN input_filter_type = 'unread' THEN notification_is_read = FALSE
        WHEN input_filter_type = 'archived' THEN notification_is_archived = TRUE
        ELSE notification_is_archived = FALSE
      END
    )
    ORDER BY notification_created_at DESC
    LIMIT input_page_size
    OFFSET offset_val
  ) n;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Mark Notification as Read
CREATE OR REPLACE FUNCTION mark_notification_as_read(
  input_notification_id UUID
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE notification_schema.notification_table
  SET 
    notification_is_read = TRUE,
    notification_read_at = NOW()
  WHERE notification_id = input_notification_id;
  
  RETURN FOUND;
END;
$$
LANGUAGE plpgsql;

-- Mark All Notifications as Read
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(
  input_user_id UUID
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE notification_schema.notification_table
  SET 
    notification_is_read = TRUE,
    notification_read_at = NOW()
  WHERE notification_target_user_id = input_user_id
    AND notification_is_read = FALSE;
  
  RETURN TRUE;
END;
$$
LANGUAGE plpgsql;

-- Mark Toast as Shown
CREATE OR REPLACE FUNCTION mark_notification_toast_shown(
  input_notification_id UUID
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE notification_schema.notification_table
  SET notification_toast_shown = TRUE
  WHERE notification_id = input_notification_id;
  
  RETURN FOUND;
END;
$$
LANGUAGE plpgsql;

-- Archive Notification
CREATE OR REPLACE FUNCTION archive_notification(
  input_notification_id UUID
)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE notification_schema.notification_table
  SET notification_is_archived = TRUE
  WHERE notification_id = input_notification_id;
  
  RETURN FOUND;
END;
$$
LANGUAGE plpgsql;

-- Mark mail item as retrieved (User confirms receipt)
CREATE OR REPLACE FUNCTION mark_mail_item_as_retrieved(input_mail_item_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  UPDATE mailroom_schema.mail_item_table
  SET mail_item_status_id = 'MIS-RETRIEVED',
      mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id;

  RETURN TRUE;
END;
$$
LANGUAGE plpgsql;

-- Log Visitor (Updated to accept visitor_id)
CREATE OR REPLACE FUNCTION log_visitor(
    p_visitor_id TEXT,
    p_user_agent TEXT,
    p_source TEXT DEFAULT 'website',
    p_landing_page TEXT DEFAULT '/'
)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_ip INET;
BEGIN
    BEGIN
        v_ip := (current_setting('request.headers', true)::json->>'x-forwarded-for')::inet;
    EXCEPTION WHEN OTHERS THEN
        v_ip := NULL;
    END;

    INSERT INTO analytics_schema.visitor_analytics_table (
        visitor_analytics_visitor_id,
        visitor_analytics_date,
        visitor_analytics_ip_address,
        visitor_analytics_user_agent,
        visitor_analytics_source,
        visitor_analytics_landing_page
    ) VALUES (
        p_visitor_id,
        CURRENT_DATE,
        v_ip,
        p_user_agent,
        p_source,
        p_landing_page
    )
    ON CONFLICT (visitor_analytics_date, visitor_analytics_visitor_id)
    DO UPDATE SET
        visitor_analytics_session_count = analytics_schema.visitor_analytics_table.visitor_analytics_session_count + 1,
        visitor_analytics_last_visit_at = NOW(),
        visitor_analytics_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Get Total Visitor Count
CREATE OR REPLACE FUNCTION get_visitor_count()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM analytics_schema.visitor_analytics_table;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_type TEXT,
    p_message TEXT,
    p_detail TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO analytics_schema.activity_log_table (
        activity_log_type,
        activity_log_message,
        activity_log_detail,
        activity_log_user_id
    ) VALUES (
        p_type,
        p_message,
        p_detail,
        p_user_id
    );
END;
$$ LANGUAGE plpgsql;

-- Get Dashboard Stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    active_users INTEGER;
    inactive_users INTEGER;
    total_visitors INTEGER;
    visitors_trend FLOAT;
    plan_free INTEGER;
    plan_digital INTEGER;
    plan_personal INTEGER;
    plan_business INTEGER;
    scan_req INTEGER;
    scan_all INTEGER;
    retrieval_req INTEGER;
    retrieval_all INTEGER;
    disposal_req INTEGER;
    disposal_all INTEGER;
    recent_activity JSON;
    recent_errors JSON;
BEGIN
    -- User Counts
    SELECT COUNT(*) INTO active_users FROM user_schema.account_table WHERE account_subscription_status_id = 'SST-ACTIVE';
    SELECT COUNT(*) INTO inactive_users FROM user_schema.account_table WHERE account_subscription_status_id != 'SST-ACTIVE';

    -- Visitor Counts
    SELECT COUNT(*) INTO total_visitors FROM analytics_schema.visitor_analytics_table;
    SELECT 
        CASE 
            WHEN total_visitors > 0 THEN (COUNT(*) FILTER (WHERE visitor_analytics_date >= date_trunc('month', CURRENT_DATE) AND visitor_analytics_date < date_trunc('month', CURRENT_DATE) + interval '1 month') * 100.0 / total_visitors)
            ELSE 0
        END INTO visitors_trend 
    FROM analytics_schema.visitor_analytics_table;

    -- Plan Counts
    SELECT COUNT(*) INTO plan_free FROM user_schema.account_table WHERE account_type = 'AT-FREE';
    SELECT COUNT(*) INTO plan_digital FROM user_schema.account_table WHERE account_type = 'AT-DIGITAL';
    SELECT COUNT(*) INTO plan_personal FROM user_schema.account_table WHERE account_type = 'AT-PERSONAL';
    SELECT COUNT(*) INTO plan_business FROM user_schema.account_table WHERE account_type = 'AT-BUSINESS';

    -- Request Counts
    SELECT COUNT(*) INTO scan_req FROM request_schema.scan_request_table WHERE scan_request_status_id = 'SRS-PENDING';
    SELECT COUNT(*) INTO scan_all FROM request_schema.scan_request_table;
    
    SELECT COUNT(*) INTO retrieval_req FROM request_schema.retrieval_request_table WHERE retrieval_request_status_id = 'RRS-PENDING';
    SELECT COUNT(*) INTO retrieval_all FROM request_schema.retrieval_request_table;
    
    SELECT COUNT(*) INTO disposal_req FROM request_schema.dispose_request_table WHERE dispose_request_status_id = 'DRS-PENDING';
    SELECT COUNT(*) INTO disposal_all FROM request_schema.dispose_request_table;

    -- Recent Activity
    SELECT COALESCE(json_agg(t), '[]'::json) INTO recent_activity FROM (
        SELECT 
            activity_log_type as type,
            activity_log_message as message,
            activity_log_detail as detail,
            activity_log_created_at as time
        FROM analytics_schema.activity_log_table
        ORDER BY activity_log_created_at DESC
        LIMIT 5
    ) t;

    -- Recent Errors
    SELECT COALESCE(json_agg(t), '[]'::json) INTO recent_errors FROM (
        SELECT * FROM analytics_schema.error_table ORDER BY error_timestamp DESC LIMIT 10
    ) t;

    RETURN json_build_object(
        'users', json_build_object('active', active_users, 'inactive', inactive_users),
        'visitors', json_build_object('count', total_visitors, 'trend', visitors_trend),
        'plans', json_build_object('free', plan_free, 'digital', plan_digital, 'personal', plan_personal, 'business', plan_business),
        'requests', json_build_object(
            'scan', json_build_object('requested', scan_req, 'all', scan_all),
            'retrieval', json_build_object('requested', retrieval_req, 'all', retrieval_all),
            'disposal', json_build_object('requested', disposal_req, 'all', disposal_all)
        ),
        'activity_logs', recent_activity,
        'error_logs', recent_errors
    );
END;
$$ LANGUAGE plpgsql;

-- Submit User Verification
CREATE OR REPLACE FUNCTION submit_user_verification(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_id_type VARCHAR := (input_data->>'id_type')::VARCHAR;
    input_id_number VARCHAR := (input_data->>'id_number')::VARCHAR;
    input_front_path TEXT := (input_data->>'front_path')::TEXT;
    input_back_path TEXT := (input_data->>'back_path')::TEXT;
    input_selfie_path TEXT := (input_data->>'selfie_path')::TEXT;
    input_reason TEXT := (input_data->>'reason')::TEXT;
    
    return_data JSON;
BEGIN
    INSERT INTO user_schema.user_verification_table (
        user_verification_id,
        user_verification_user_id,
        user_verification_id_type,
        user_verification_id_number,
        user_verification_id_front_bucket_path,
        user_verification_id_back_bucket_path,
        user_verification_selfie_bucket_path,
        user_verification_status,
        user_verification_reason
    ) VALUES (
        gen_random_uuid(),
        input_user_id,
        input_id_type,
        input_id_number,
        input_front_path,
        input_back_path,
        input_selfie_path,
        'pending',
        input_reason
    ) RETURNING to_json(user_verification_table.*) INTO return_data;

    RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get Verification Requests
CREATE OR REPLACE FUNCTION get_verification_requests(
    input_data JSONB
)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_search_term TEXT := input_data->>'search';
    input_status_filter TEXT := input_data->>'status_filter';
    input_page_number INTEGER := COALESCE((input_data->>'page')::INTEGER, 1);
    input_page_size INTEGER := COALESCE((input_data->>'page_size')::INTEGER, 10);
    input_sort_order TEXT := COALESCE(input_data->>'sort_order', 'desc');
    
    return_data JSONB;
BEGIN
    WITH filtered_data AS (
        SELECT
            acc.account_id,
            v.user_verification_id,
            v.user_verification_user_id,
            v.user_verification_id_type,
            v.user_verification_id_number,
            v.user_verification_id_front_bucket_path,
            v.user_verification_id_back_bucket_path,
            v.user_verification_selfie_bucket_path,
            v.user_verification_status,
            v.user_verification_reason,
            v.user_verification_created_at,
            (u.user_first_name || ' ' || u.user_last_name)::TEXT as user_full_name,
            u.user_email::TEXT,
            u.user_username::TEXT,
            COUNT(*) OVER() as total_count
        FROM user_schema.user_verification_table v
        JOIN user_schema.user_table u ON v.user_verification_user_id = u.user_id
        JOIN user_schema.account_table acc ON u.user_id = acc.account_user_id
        WHERE
            (input_search_term IS NULL OR input_search_term = '' OR
             u.user_first_name ILIKE '%' || input_search_term || '%' OR
             u.user_last_name ILIKE '%' || input_search_term || '%' OR
             u.user_email ILIKE '%' || input_search_term || '%')
            AND
            (input_status_filter IS NULL OR input_status_filter = '' OR v.user_verification_status = input_status_filter)
        ORDER BY
            CASE WHEN input_sort_order = 'asc' THEN v.user_verification_created_at END ASC,
            CASE WHEN input_sort_order = 'desc' THEN v.user_verification_created_at END DESC
        LIMIT input_page_size
        OFFSET (input_page_number - 1) * input_page_size
    )
    SELECT jsonb_agg(row_to_json(filtered_data))
    INTO return_data
    FROM filtered_data;

    RETURN COALESCE(return_data, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql;

-- Process Verification Request
CREATE OR REPLACE FUNCTION process_verification_request(
    input_data JSONB
)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    input_request_id UUID := (input_data->>'request_id')::UUID;
    input_status TEXT := input_data->>'status'; -- 'approved' or 'rejected'
    input_reason TEXT := input_data->>'reason';
    
    var_user_id UUID;
    return_data JSONB;
BEGIN
    -- Get user id from request
    SELECT user_verification_user_id INTO var_user_id
    FROM user_schema.user_verification_table
    WHERE user_verification_id = input_request_id;

    IF var_user_id IS NULL THEN
        RAISE EXCEPTION 'Verification request not found';
    END IF;

    -- Update verification request status
    UPDATE user_schema.user_verification_table
    SET
        user_verification_status = input_status,
        user_verification_reason = COALESCE(input_reason, user_verification_reason),
        user_verification_updated_at = NOW()
    WHERE user_verification_id = input_request_id;

    -- If approved, update user verification status
    IF input_status = 'approved' THEN
        UPDATE user_schema.user_table
        SET
            user_is_verified = TRUE,
            user_updated_at = NOW()
        WHERE user_id = var_user_id;
    ELSIF input_status = 'rejected' THEN
         UPDATE user_schema.user_table
        SET
            user_is_verified = FALSE,
            user_updated_at = NOW()
        WHERE user_id = var_user_id;
    END IF;

    return_data := jsonb_build_object('success', true);
    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Get latest verification status for user
CREATE OR REPLACE FUNCTION get_user_latest_verification(input_user_id UUID)
RETURNS JSONB
SET search_path TO ''
AS $$
DECLARE
    return_data JSONB;
BEGIN
    SELECT to_jsonb(v.*)
    INTO return_data
    FROM user_schema.user_verification_table v
    WHERE user_verification_user_id = input_user_id
    ORDER BY user_verification_created_at DESC
    LIMIT 1;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Get user referral code
CREATE OR REPLACE FUNCTION get_user_referral_code(input_user_id UUID)
RETURNS TEXT
SET search_path TO ''
AS $$
DECLARE
  referral_code TEXT;
BEGIN
  SELECT user_referral_code INTO referral_code
  FROM user_schema.user_table
  WHERE user_id = input_user_id;

  RETURN referral_code;
END;
$$ LANGUAGE plpgsql;