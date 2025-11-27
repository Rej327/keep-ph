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

-- Get mail access limit
CREATE OR REPLACE FUNCTION get_mail_access_limit(input_user_id UUID, input_plan_id TEXT)
RETURNS INTEGER
SET search_path TO ''
AS $$
DECLARE
  var_account_type TEXT;
  var_account_is_subscribed BOOLEAN;
  var_account_remaining_mailbox_access SMALLINT;
  var_account_max_mailbox_access INTEGER; -- Default to null
  return_data INTEGER;
BEGIN
  -- Get user's current account state (if account exists)
  SELECT
    account_is_subscribed,
    account_remaining_mailbox_access
  INTO
    var_account_is_subscribed,
    var_account_remaining_mailbox_access
  FROM user_schema.account_table
  WHERE account_user_id = input_user_id;

  -- Get max mailbox access for the account type
  SELECT
    account_max_mailbox_access INTO var_account_max_mailbox_access
  FROM user_schema.account_type_table
  WHERE account_type_id = input_plan_id;

  -- If user has no account (new user), default to free plan
  IF var_account_remaining_mailbox_access IS NULL THEN return_data := var_account_max_mailbox_access;
  ELSE
    -- Return remaining access for existing subscribed users
    return_data := var_account_remaining_mailbox_access;
  END IF;

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