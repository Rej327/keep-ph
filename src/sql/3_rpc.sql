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
    account_area_code,
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

-- Check if account is subscribed
CREATE OR REPLACE FUNCTION is_account_subscribed(input_account_user_id UUID)
RETURNS BOOLEAN
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_schema.account_table at
    WHERE at.account_user_id = input_account_user_id AND at.account_is_subscribed = TRUE
  );
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
      'user_avatar_bucket_path', u.user_avatar_bucket_path
    ) FROM user_schema.user_table u WHERE u.user_id = input_user_id),
    'account', (SELECT JSON_BUILD_OBJECT(
      'account_id', a.account_id,
      'account_user_id', a.account_user_id,
      'account_number', a.account_number,
      'account_area_code', a.account_area_code,
      'account_type', a.account_type,
      'account_type_value', at.account_type_value,
      'account_is_subscribed', a.account_is_subscribed,
      'account_max_quantity_storage', at.account_max_quantity_storage,
      'account_max_gb_storage', at.account_max_gb_storage,
      'account_max_mailbox_access', at.account_max_mailbox_access,
      'account_subscription_status_id', a.account_subscription_status_id,
      'account_subscription_status_value', ss.subscription_status_value,
      'account_subscription_ends_at', a.account_subscription_ends_at
    ) FROM user_schema.account_table a
    JOIN user_schema.account_type_table at ON a.account_type = at.account_type_id
    JOIN status_schema.subscription_status_table ss ON a.account_subscription_status_id = ss.subscription_status_id
    WHERE a.account_user_id = input_user_id),
    'virtual_address', (SELECT JSON_BUILD_OBJECT(
      'virtual_address_id', v.virtual_address_id,
      'virtual_address_account_id', v.virtual_address_account_id,
      'virtual_address_address', v.virtual_address_address,
      'virtual_address_street', v.virtual_address_street,
      'virtual_address_city', v.virtual_address_city,
      'virtual_address_province', v.virtual_address_province,
      'virtual_address_postal_code', v.virtual_address_postal_code,
      'virtual_address_country', v.virtual_address_country,
      'virtual_address_area_code', v.virtual_address_area_code,
      'virtual_address_status_id', v.virtual_address_status_id,
      'virtual_address_status_value', vs.virtual_address_status_value
    ) FROM mailroom_schema.virtual_address_table v
    JOIN status_schema.virtual_address_status_table vs ON v.virtual_address_status_id = vs.virtual_address_status_id
    WHERE v.virtual_address_account_id = (SELECT account_id FROM user_schema.account_table WHERE account_user_id = input_user_id))
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
  var_mailbox_space_remaining SMALLINT;

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
    var_mailbox_space_remaining := (var_mailbox_item->>'mailbox_space_remaining')::SMALLINT;

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

  -- Function variables
  var_current_space SMALLINT;
  var_new_mail_item_id UUID;

  -- Return variable
  return_data JSON;
BEGIN
  -- 1. Check current space remaining
  SELECT mailbox_space_remaining INTO var_current_space
  FROM mailroom_schema.mailbox_table
  WHERE mailbox_id = input_mailbox_id;

  IF var_current_space IS NULL THEN
    RAISE EXCEPTION 'Mailbox not found';
  END IF;

  IF var_current_space <= 0 THEN
    RAISE EXCEPTION 'Mailbox capacity full, no storage space remaining';
  END IF;

  -- 2. Decrement space
  UPDATE mailroom_schema.mailbox_table
  SET mailbox_space_remaining = mailbox_space_remaining - 1,
      mailbox_updated_at = NOW()
  WHERE mailbox_id = input_mailbox_id;

  -- 3. Insert mail item
  INSERT INTO mailroom_schema.mail_item_table (
    mail_item_mailbox_id,
    mail_item_sender,
    mail_item_received_at,
    mail_item_status_id,
    mail_item_name,
    mail_item_description
  ) VALUES (
    input_mailbox_id,
    input_sender,
    input_received_at,
    input_status_id,
    input_name,
    input_description
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
        'account_area_code', a.account_area_code,
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
      mis.mail_item_status_value,
      ma.mail_attachment_unopened_scan_file_path,
      ma.mail_attachment_item_scan_file_path,
      mb.mailbox_label

    FROM mailroom_schema.mail_item_table mi
    JOIN mailroom_schema.mailbox_table mb ON mi.mail_item_mailbox_id = mb.mailbox_id
    JOIN user_schema.account_table acc ON mb.mailbox_account_id = acc.account_id
    JOIN status_schema.mail_item_status_table mis ON mi.mail_item_status_id = mis.mail_item_status_id
    LEFT JOIN mailroom_schema.mail_attachment_table ma ON mi.mail_item_id = ma.mail_attachment_mail_item_id
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
                'mailbox_remaining_space', mb.mailbox_space_remaining,
                'account_id', acc.account_id,
                'account_number', acc.account_number,
								'account_area_code', acc.account_area_code,
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
        'user_email', u.user_email
      ) as request_data
    FROM request_schema.dispose_request_table dr
    JOIN status_schema.dispose_request_status_table drs ON dr.dispose_request_status_id = drs.dispose_request_status_id
    JOIN mailroom_schema.mail_item_table mi ON dr.dispose_request_mail_item_id = mi.mail_item_id
    JOIN user_schema.account_table acc ON dr.dispose_request_account_id = acc.account_id
    JOIN user_schema.user_table u ON acc.account_user_id = u.user_id
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
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_email VARCHAR(254) := (input_data->>'email')::VARCHAR;
  input_first_name VARCHAR(254) := (input_data->>'first_name')::VARCHAR;
  input_last_name VARCHAR(254) := (input_data->>'last_name')::VARCHAR;
  input_avatar VARCHAR(254) := (input_data->>'avatar_bucket_path')::VARCHAR;
  
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

  -- Function variables
  var_account_number TEXT;
  var_mailbox_item JSON;
  var_mailbox_status_id TEXT;
  var_mailbox_label TEXT;
  var_mailbox_mail_remaining_space SMALLINT;
  var_mailbox_package_remaining_space SMALLINT;
  
  -- Return variable
  return_data JSON;
BEGIN
  -- 1. Generate account number (format: Q[Quarter][Year]-[Seq])
  SELECT CONCAT('Q', EXTRACT(QUARTER FROM NOW()), EXTRACT(YEAR FROM NOW()), '-', 
         LPAD((COUNT(*) + 1)::TEXT, 4, '0'))
  INTO var_account_number
  FROM user_schema.account_table;

  -- 2. Create or update account subscription details
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

  -- 3. Insert mailboxes
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

  -- 5. Build return data
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