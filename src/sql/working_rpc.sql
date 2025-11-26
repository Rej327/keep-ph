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
    user_last_name,
    user_role
  ) VALUES (
    input_user_id,
    input_email,
    input_first_name,
    input_last_name,
    'UR-CUSTOMER'
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