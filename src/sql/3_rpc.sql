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
    account_type
  ) VALUES (
    input_user_id,
    var_account_number,
    var_area_code,
    input_account_type
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


-- User Table
CREATE TABLE user_schema.user_table (
    user_id UUID PRIMARY KEY NOT NULL,
    user_username VARCHAR(30),
    user_email VARCHAR(254) NOT NULL UNIQUE,
    user_first_name VARCHAR(254),
    user_last_name VARCHAR(254),
    user_is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    user_avatar_bucket_path VARCHAR(256),
    user_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Account Table
CREATE TABLE user_schema.account_table (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_user_id UUID NOT NULL, -- FK to user_schema.user_table.user_id
    account_number TEXT NOT NULL UNIQUE, -- Q42025-0001
    account_area_code TEXT NOT NULL, -- Derived from virtual_address_address (MNL, CEB, DVO, etc.)
    account_type TEXT NOT NULL DEFAULT 'AT-FREE', -- FK to user_schema.account_type_table.account_type_id
    account_is_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
    account_subscription_ends_at TIMESTAMPTZ,
    account_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    account_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Virtual Address Table
CREATE TABLE mailroom_schema.virtual_address_table (
    virtual_address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    virtual_address_account_id UUID NOT NULL, -- FK to user_schema.account_table.account_id
    virtual_address_address TEXT NOT NULL UNIQUE, -- Full address string
    virtual_address_street TEXT, -- Street address
    virtual_address_city TEXT NOT NULL, -- City/Municipality
    virtual_address_province TEXT NOT NULL, -- Province/State
    virtual_address_postal_code TEXT, -- ZIP/Postal code
    virtual_address_country TEXT NOT NULL, -- Country
    virtual_address_area_code TEXT NOT NULL, -- MNL, CEB, DVO, etc. (computed from city/province)
    virtual_address_status_id TEXT NOT NULL, -- FK to status_schema.virtual_address_status_table.virtual_address_status_id
    virtual_address_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    virtual_address_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_schema.account_type_table (
    account_type_id TEXT PRIMARY KEY,
    account_type_value TEXT NOT NULL UNIQUE,
    account_type_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    account_type_sort_order INTEGER NOT NULL DEFAULT 0
);

-- Insert default account types
INSERT INTO user_schema.account_type_table (account_type_id, account_type_value, account_type_sort_order) VALUES
    ('AT-FREE', 'free', 1),
    ('AT-DIGITAL', 'digital', 2),
    ('AT-PERSONAL', 'personal', 3),
    ('AT-BUSINESS', 'business', 4);
    
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
      'account_subscription_ends_at', a.account_subscription_ends_at
    ) FROM user_schema.account_table a
    JOIN user_schema.account_type_table at ON a.account_type = at.account_type_id
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