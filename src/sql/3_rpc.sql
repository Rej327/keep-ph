-- =============================================
-- User Management RPCs
-- =============================================

-- Get user profile by user ID
CREATE OR REPLACE FUNCTION get_user_profile(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'user_id', user_id,
      'user_username', user_username,
      'user_email', user_email,
      'user_first_name', user_first_name,
      'user_last_name', user_last_name,
      'user_role', user_role,
      'user_is_subscribed', user_is_subscribed,
      'user_subscription_ends_at', user_subscription_ends_at,
      'user_avatar_bucket_path', user_avatar_bucket_path,
      'user_created_at', user_created_at
    ) INTO return_data
  FROM user_schema.user_table
  WHERE user_id = input_user_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update user profile
CREATE OR REPLACE FUNCTION update_user_profile(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_user_username TEXT := (input_data->>'user_username')::TEXT;
  input_user_first_name TEXT := (input_data->>'user_first_name')::TEXT;
  input_user_last_name TEXT := (input_data->>'user_last_name')::TEXT;
  input_user_avatar_bucket_path TEXT := COALESCE((input_data->>'user_avatar_bucket_path')::TEXT, NULL);
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE user_schema.user_table
  SET 
    user_username = COALESCE(input_user_username, user_username),
    user_first_name = COALESCE(input_user_first_name, user_first_name),
    user_last_name = COALESCE(input_user_last_name, user_last_name),
    user_avatar_bucket_path = COALESCE(input_user_avatar_bucket_path, user_avatar_bucket_path),
    user_updated_at = NOW()
  WHERE user_id = input_user_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'user_id', user_id,
      'user_username', user_username,
      'user_first_name', user_first_name,
      'user_last_name', user_last_name,
      'user_avatar_bucket_path', user_avatar_bucket_path,
      'user_updated_at', user_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get user subscription status
CREATE OR REPLACE FUNCTION get_user_subscription_status(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  -- Function variables
  var_account_id UUID;
  var_account_type TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  -- Get account information
  SELECT 
    account_id, 
    account_type 
  INTO 
    var_account_id, 
    var_account_type
  FROM user_schema.account_table
  WHERE account_user_id = input_user_id;

  -- Get subscription status
  SELECT 
    JSON_BUILD_OBJECT(
      'user_id', user_table.user_id,
      'user_is_subscribed', user_table.user_is_subscribed,
      'user_subscription_ends_at', user_table.user_subscription_ends_at,
      'account_id', var_account_id,
      'account_type', var_account_type,
      'account_type_value', account_type_table.account_type_value
    ) INTO return_data
  FROM user_schema.user_table
  JOIN user_schema.account_type_table ON account_type_table.account_type_id = var_account_type
  WHERE user_table.user_id = input_user_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update user subscription
CREATE OR REPLACE FUNCTION update_user_subscription(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_account_type TEXT := (input_data->>'account_type')::TEXT;
  input_is_subscribed BOOLEAN := (input_data->>'is_subscribed')::BOOLEAN;
  input_subscription_ends_at TIMESTAMPTZ := (input_data->>'subscription_ends_at')::TIMESTAMPTZ;
  -- Function variables
  var_account_id UUID;
  -- Return variable
  return_data JSON;
BEGIN
  -- Get account ID
  SELECT account_id INTO var_account_id
  FROM user_schema.account_table
  WHERE account_user_id = input_user_id;

  -- Update account type
  UPDATE user_schema.account_table
  SET 
    account_type = input_account_type,
    account_updated_at = NOW()
  WHERE account_id = var_account_id;

  -- Update user subscription status
  UPDATE user_schema.user_table
  SET 
    user_is_subscribed = input_is_subscribed,
    user_subscription_ends_at = input_subscription_ends_at,
    user_updated_at = NOW()
  WHERE user_id = input_user_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'user_id', user_id,
      'user_is_subscribed', user_is_subscribed,
      'user_subscription_ends_at', user_subscription_ends_at,
      'user_updated_at', user_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get user accounts
CREATE OR REPLACE FUNCTION get_user_accounts(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'account_id', account_id,
        'account_number', account_number,
        'account_area_code', account_area_code,
        'account_type', account_type,
        'account_created_at', account_created_at
      )
    ) INTO return_data
  FROM user_schema.account_table
  WHERE account_user_id = input_user_id;

  RETURN COALESCE(return_data, '[]'::JSON);
END;
$$
LANGUAGE plpgsql;

-- Create new account for user
CREATE OR REPLACE FUNCTION create_user_account(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_area_code TEXT := (input_data->>'area_code')::TEXT;
  input_account_type TEXT := COALESCE((input_data->>'account_type')::TEXT, 'AT-FREE');
  -- Function variables
  var_account_number TEXT;
  var_new_account_id UUID;
  -- Return variable
  return_data JSON;
BEGIN
  -- Generate account number (format: Q42025-0001)
  -- This is a simplified version, in production you'd want to ensure uniqueness
  SELECT CONCAT('Q', EXTRACT(QUARTER FROM NOW()), EXTRACT(YEAR FROM NOW()), '-', 
         LPAD((COUNT(*) + 1)::TEXT, 4, '0'))
  INTO var_account_number
  FROM user_schema.account_table;

  -- Create new account
  INSERT INTO user_schema.account_table (
    account_user_id,
    account_number,
    account_area_code,
    account_type
  ) VALUES (
    input_user_id,
    var_account_number,
    input_area_code,
    input_account_type
  )
  RETURNING 
    account_id,
    JSON_BUILD_OBJECT(
      'account_id', account_id,
      'account_number', account_number,
      'account_area_code', account_area_code,
      'account_type', account_type,
      'account_created_at', account_created_at
    ) INTO var_new_account_id, return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all users
CREATE OR REPLACE FUNCTION admin_list_users(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_search TEXT := COALESCE((input_data->>'search')::TEXT, NULL);
  -- Function variables
  var_search_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add search condition if provided
  IF input_search IS NOT NULL THEN
    var_search_condition := format(' AND (user_email ILIKE %L OR user_username ILIKE %L OR user_first_name ILIKE %L OR user_last_name ILIKE %L)',
                                  '%' || input_search || '%',
                                  '%' || input_search || '%',
                                  '%' || input_search || '%',
                                  '%' || input_search || '%');
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM user_schema.user_table
    WHERE TRUE %s', var_search_condition)
  INTO var_total_count;

  -- Get users with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''users'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''user_id'', user_id,
          ''user_username'', user_username,
          ''user_email'', user_email,
          ''user_first_name'', user_first_name,
          ''user_last_name'', user_last_name,
          ''user_role'', user_role,
          ''user_is_subscribed'', user_is_subscribed,
          ''user_subscription_ends_at'', user_subscription_ends_at,
          ''user_created_at'', user_created_at
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT *
      FROM user_schema.user_table
      WHERE TRUE %s
      ORDER BY user_created_at DESC
      LIMIT %L OFFSET %L
    ) AS users', var_total_count, var_search_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: Update user role
CREATE OR REPLACE FUNCTION admin_update_user_role(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_user_id UUID := (input_data->>'user_id')::UUID;
  input_user_role TEXT := (input_data->>'user_role')::TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE user_schema.user_table
  SET 
    user_role = input_user_role,
    user_updated_at = NOW()
  WHERE user_id = input_user_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'user_id', user_id,
      'user_role', user_role,
      'user_updated_at', user_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Mailbox Management RPCs
-- =============================================

-- Get mailboxes by account ID
CREATE OR REPLACE FUNCTION get_account_mailboxes(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_AGG(
      JSON_BUILD_OBJECT(
        'mailbox_id', mailbox_id,
        'mailbox_label', mailbox_label,
        'mailbox_status_id', mailbox_status_id,
        'mailbox_status_value', mailbox_status_table.mailbox_status_value,
        'mailbox_max_items', mailbox_max_items,
        'mailbox_created_at', mailbox_created_at
      )
    ) INTO return_data
  FROM mailroom_schema.mailbox_table
  JOIN status_schema.mailbox_status_table ON mailbox_status_table.mailbox_status_id = mailbox_table.mailbox_status_id
  WHERE mailbox_account_id = input_account_id;

  RETURN COALESCE(return_data, '[]'::JSON);
END;
$$
LANGUAGE plpgsql;

-- Create new mailbox
CREATE OR REPLACE FUNCTION create_mailbox(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_mailbox_label TEXT := COALESCE((input_data->>'mailbox_label')::TEXT, NULL);
  input_mailbox_max_items INTEGER := COALESCE((input_data->>'mailbox_max_items')::INTEGER, 154);
  -- Function variables
  var_mailbox_status_id TEXT := 'MBS-ACTIVE'; -- Default to active
  -- Return variable
  return_data JSON;
BEGIN
  INSERT INTO mailroom_schema.mailbox_table (
    mailbox_account_id,
    mailbox_status_id,
    mailbox_label,
    mailbox_max_items
  ) VALUES (
    input_account_id,
    var_mailbox_status_id,
    input_mailbox_label,
    input_mailbox_max_items
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'mailbox_id', mailbox_id,
      'mailbox_account_id', mailbox_account_id,
      'mailbox_status_id', mailbox_status_id,
      'mailbox_label', mailbox_label,
      'mailbox_max_items', mailbox_max_items,
      'mailbox_created_at', mailbox_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update mailbox
CREATE OR REPLACE FUNCTION update_mailbox(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mailbox_id UUID := (input_data->>'mailbox_id')::UUID;
  input_mailbox_label TEXT := COALESCE((input_data->>'mailbox_label')::TEXT, NULL);
  input_mailbox_max_items INTEGER := COALESCE((input_data->>'mailbox_max_items')::INTEGER, NULL);
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.mailbox_table
  SET 
    mailbox_label = COALESCE(input_mailbox_label, mailbox_label),
    mailbox_max_items = COALESCE(input_mailbox_max_items, mailbox_max_items),
    mailbox_updated_at = NOW()
  WHERE mailbox_id = input_mailbox_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'mailbox_id', mailbox_id,
      'mailbox_label', mailbox_label,
      'mailbox_max_items', mailbox_max_items,
      'mailbox_updated_at', mailbox_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update mailbox status
CREATE OR REPLACE FUNCTION update_mailbox_status(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mailbox_id UUID := (input_data->>'mailbox_id')::UUID;
  input_mailbox_status_id TEXT := (input_data->>'mailbox_status_id')::TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.mailbox_table
  SET 
    mailbox_status_id = input_mailbox_status_id,
    mailbox_updated_at = NOW()
  WHERE mailbox_id = input_mailbox_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'mailbox_id', mailbox_id,
      'mailbox_status_id', mailbox_status_id,
      'mailbox_updated_at', mailbox_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get mailbox details
CREATE OR REPLACE FUNCTION get_mailbox_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mailbox_id UUID := (input_data->>'mailbox_id')::UUID;
  -- Function variables
  var_mail_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Count mail items in mailbox
  SELECT COUNT(*) INTO var_mail_count
  FROM mailroom_schema.mail_item_table
  WHERE mail_item_mailbox_id = input_mailbox_id
  AND mail_item_is_deleted = FALSE;
  
  -- Get mailbox details
  SELECT 
    JSON_BUILD_OBJECT(
      'mailbox_id', mailbox_table.mailbox_id,
      'mailbox_label', mailbox_table.mailbox_label,
      'mailbox_status_id', mailbox_table.mailbox_status_id,
      'mailbox_status_value', mailbox_status_table.mailbox_status_value,
      'mailbox_max_items', mailbox_table.mailbox_max_items,
      'current_mail_count', var_mail_count,
      'is_full', (var_mail_count >= mailbox_table.mailbox_max_items),
      'mailbox_created_at', mailbox_table.mailbox_created_at,
      'mailbox_updated_at', mailbox_table.mailbox_updated_at
    ) INTO return_data
  FROM mailroom_schema.mailbox_table
  JOIN status_schema.mailbox_status_table ON mailbox_status_table.mailbox_status_id = mailbox_table.mailbox_status_id
  WHERE mailbox_table.mailbox_id = input_mailbox_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all mailboxes
CREATE OR REPLACE FUNCTION admin_list_mailboxes(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND mailbox_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM mailroom_schema.mailbox_table
    WHERE TRUE %s', var_status_condition)
  INTO var_total_count;

  -- Get mailboxes with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''mailboxes'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''mailbox_id'', mailbox_id,
          ''mailbox_account_id'', mailbox_account_id,
          ''mailbox_status_id'', mailbox_status_id,
          ''mailbox_status_value'', mailbox_status_value,
          ''mailbox_label'', mailbox_label,
          ''mailbox_max_items'', mailbox_max_items,
          ''mailbox_created_at'', mailbox_created_at,
          ''account_number'', account_number,
          ''account_area_code'', account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        mailbox_table.*,
        mailbox_status_table.mailbox_status_value,
        account_table.account_number,
        account_table.account_area_code
      FROM mailroom_schema.mailbox_table
      JOIN status_schema.mailbox_status_table ON mailbox_status_table.mailbox_status_id = mailbox_table.mailbox_status_id
      JOIN user_schema.account_table ON account_table.account_id = mailbox_table.mailbox_account_id
      WHERE TRUE %s
      ORDER BY mailbox_created_at DESC
      LIMIT %L OFFSET %L
    ) AS mailboxes', var_total_count, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: Update mailbox settings
CREATE OR REPLACE FUNCTION admin_update_mailbox_settings(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_mailbox_id UUID := (input_data->>'mailbox_id')::UUID;
  input_mailbox_status_id TEXT := COALESCE((input_data->>'mailbox_status_id')::TEXT, NULL);
  input_mailbox_max_items INTEGER := COALESCE((input_data->>'mailbox_max_items')::INTEGER, NULL);
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.mailbox_table
  SET 
    mailbox_status_id = COALESCE(input_mailbox_status_id, mailbox_status_id),
    mailbox_max_items = COALESCE(input_mailbox_max_items, mailbox_max_items),
    mailbox_updated_at = NOW()
  WHERE mailbox_id = input_mailbox_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'mailbox_id', mailbox_id,
      'mailbox_status_id', mailbox_status_id,
      'mailbox_max_items', mailbox_max_items,
      'mailbox_updated_at', mailbox_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Mail Item Management RPCs
-- =============================================

-- Get mail items by mailbox ID
CREATE OR REPLACE FUNCTION get_mailbox_mail_items(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mailbox_id UUID := (input_data->>'mailbox_id')::UUID;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  input_is_read BOOLEAN := COALESCE((input_data->>'is_read')::BOOLEAN, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_read_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND mail_item_status_id = %L', input_status_id);
  END IF;

  -- Add read condition if provided
  IF input_is_read IS NOT NULL THEN
    var_read_condition := format(' AND mail_item_is_read = %L', input_is_read);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM mailroom_schema.mail_item_table
    WHERE mail_item_mailbox_id = %L
    AND mail_item_is_deleted = FALSE %s %s', 
    input_mailbox_id, var_status_condition, var_read_condition)
  INTO var_total_count;

  -- Get mail items with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''mail_items'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''mail_item_id'', mail_item_id,
          ''mail_item_mailbox_id'', mail_item_mailbox_id,
          ''mail_item_sender'', mail_item_sender,
          ''mail_item_image_path'', mail_item_image_path,
          ''mail_item_received_at'', mail_item_received_at,
          ''mail_item_status_id'', mail_item_status_id,
          ''mail_item_status_value'', mail_item_status_value,
          ''mail_item_is_read'', mail_item_is_read,
          ''mail_item_created_at'', mail_item_created_at
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        mail_item_table.*,
        mail_item_status_table.mail_item_status_value
      FROM mailroom_schema.mail_item_table
      JOIN status_schema.mail_item_status_table ON mail_item_status_table.mail_item_status_id = mail_item_table.mail_item_status_id
      WHERE mail_item_mailbox_id = %L
      AND mail_item_is_deleted = FALSE %s %s
      ORDER BY mail_item_received_at DESC
      LIMIT %L OFFSET %L
    ) AS mail_items', 
    var_total_count, input_mailbox_id, var_status_condition, var_read_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get mail item details
CREATE OR REPLACE FUNCTION get_mail_item_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  -- Mark as read
  UPDATE mailroom_schema.mail_item_table
  SET mail_item_is_read = TRUE
  WHERE mail_item_id = input_mail_item_id;
  
  -- Get mail item details
  SELECT 
    JSON_BUILD_OBJECT(
      'mail_item_id', mail_item_table.mail_item_id,
      'mail_item_mailbox_id', mail_item_table.mail_item_mailbox_id,
      'mail_item_sender', mail_item_table.mail_item_sender,
      'mail_item_image_path', mail_item_table.mail_item_image_path,
      'mail_item_received_at', mail_item_table.mail_item_received_at,
      'mail_item_status_id', mail_item_table.mail_item_status_id,
      'mail_item_status_value', mail_item_status_table.mail_item_status_value,
      'mail_item_is_read', mail_item_table.mail_item_is_read,
      'mail_item_created_at', mail_item_table.mail_item_created_at,
      'mail_item_updated_at', mail_item_table.mail_item_updated_at,
      'mailbox_label', mailbox_table.mailbox_label
    ) INTO return_data
  FROM mailroom_schema.mail_item_table
  JOIN status_schema.mail_item_status_table ON mail_item_status_table.mail_item_status_id = mail_item_table.mail_item_status_id
  JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
  WHERE mail_item_table.mail_item_id = input_mail_item_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Create new mail item (admin function)
CREATE OR REPLACE FUNCTION admin_create_mail_item(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_mailbox_id UUID := (input_data->>'mailbox_id')::UUID;
  input_sender TEXT := COALESCE((input_data->>'sender')::TEXT, NULL);
  input_image_path TEXT := COALESCE((input_data->>'image_path')::TEXT, NULL);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, 'MIS-RECEIVED');
  -- Return variable
  return_data JSON;
BEGIN
  INSERT INTO mailroom_schema.mail_item_table (
    mail_item_mailbox_id,
    mail_item_sender,
    mail_item_image_path,
    mail_item_status_id
  ) VALUES (
    input_mailbox_id,
    input_sender,
    input_image_path,
    input_status_id
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'mail_item_id', mail_item_id,
      'mail_item_mailbox_id', mail_item_mailbox_id,
      'mail_item_sender', mail_item_sender,
      'mail_item_image_path', mail_item_image_path,
      'mail_item_received_at', mail_item_received_at,
      'mail_item_status_id', mail_item_status_id,
      'mail_item_created_at', mail_item_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update mail item status
CREATE OR REPLACE FUNCTION update_mail_item_status(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  input_status_id TEXT := (input_data->>'status_id')::TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.mail_item_table
  SET 
    mail_item_status_id = input_status_id,
    mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'mail_item_id', mail_item_id,
      'mail_item_status_id', mail_item_status_id,
      'mail_item_updated_at', mail_item_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Mark mail item as read/unread
CREATE OR REPLACE FUNCTION update_mail_item_read_status(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  input_is_read BOOLEAN := (input_data->>'is_read')::BOOLEAN;
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.mail_item_table
  SET 
    mail_item_is_read = input_is_read,
    mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'mail_item_id', mail_item_id,
      'mail_item_is_read', mail_item_is_read,
      'mail_item_updated_at', mail_item_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Soft delete mail item
CREATE OR REPLACE FUNCTION delete_mail_item(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.mail_item_table
  SET 
    mail_item_is_deleted = TRUE,
    mail_item_updated_at = NOW()
  WHERE mail_item_id = input_mail_item_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'mail_item_id', mail_item_id,
      'mail_item_is_deleted', mail_item_is_deleted,
      'mail_item_updated_at', mail_item_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all mail items
CREATE OR REPLACE FUNCTION admin_list_mail_items(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  input_account_id UUID := COALESCE((input_data->>'account_id')::UUID, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_account_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND mail_item_table.mail_item_status_id = %L', input_status_id);
  END IF;

  -- Add account condition if provided
  IF input_account_id IS NOT NULL THEN
    var_account_condition := format(' AND mailbox_table.mailbox_account_id = %L', input_account_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM mailroom_schema.mail_item_table
    JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
    WHERE mail_item_is_deleted = FALSE %s %s', 
    var_status_condition, var_account_condition)
  INTO var_total_count;

  -- Get mail items with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''mail_items'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''mail_item_id'', mail_item_id,
          ''mail_item_mailbox_id'', mail_item_mailbox_id,
          ''mail_item_sender'', mail_item_sender,
          ''mail_item_image_path'', mail_item_image_path,
          ''mail_item_received_at'', mail_item_received_at,
          ''mail_item_status_id'', mail_item_status_id,
          ''mail_item_status_value'', mail_item_status_value,
          ''mail_item_is_read'', mail_item_is_read,
          ''mailbox_label'', mailbox_label,
          ''account_number'', account_number,
          ''account_area_code'', account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        mail_item_table.*,
        mail_item_status_table.mail_item_status_value,
        mailbox_table.mailbox_label,
        account_table.account_number,
        account_table.account_area_code
      FROM mailroom_schema.mail_item_table
      JOIN status_schema.mail_item_status_table ON mail_item_status_table.mail_item_status_id = mail_item_table.mail_item_status_id
      JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
      JOIN user_schema.account_table ON account_table.account_id = mailbox_table.mailbox_account_id
      WHERE mail_item_is_deleted = FALSE %s %s
      ORDER BY mail_item_received_at DESC
      LIMIT %L OFFSET %L
    ) AS mail_items', 
    var_total_count, var_status_condition, var_account_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Search mail items
CREATE OR REPLACE FUNCTION search_mail_items(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_search TEXT := (input_data->>'search')::TEXT;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  -- Function variables
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM mailroom_schema.mail_item_table
    JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
    WHERE mailbox_table.mailbox_account_id = %L
    AND mail_item_table.mail_item_is_deleted = FALSE
    AND (mail_item_table.mail_item_sender ILIKE %L)', 
    input_account_id, '%' || input_search || '%')
  INTO var_total_count;

  -- Search mail items with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''mail_items'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''mail_item_id'', mail_item_id,
          ''mail_item_mailbox_id'', mail_item_mailbox_id,
          ''mail_item_sender'', mail_item_sender,
          ''mail_item_image_path'', mail_item_image_path,
          ''mail_item_received_at'', mail_item_received_at,
          ''mail_item_status_id'', mail_item_status_id,
          ''mail_item_status_value'', mail_item_status_value,
          ''mail_item_is_read'', mail_item_is_read,
          ''mailbox_label'', mailbox_label
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        mail_item_table.*,
        mail_item_status_table.mail_item_status_value,
        mailbox_table.mailbox_label
      FROM mailroom_schema.mail_item_table
      JOIN status_schema.mail_item_status_table ON mail_item_status_table.mail_item_status_id = mail_item_table.mail_item_status_id
      JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
      WHERE mailbox_table.mailbox_account_id = %L
      AND mail_item_table.mail_item_is_deleted = FALSE
      AND (mail_item_table.mail_item_sender ILIKE %L)
      ORDER BY mail_item_table.mail_item_received_at DESC
      LIMIT %L OFFSET %L
    ) AS mail_items', 
    var_total_count, input_account_id, '%' || input_search || '%', input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Request Management RPCs - Disposal Requests
-- =============================================

-- Create disposal request
CREATE OR REPLACE FUNCTION create_disposal_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_notes TEXT := COALESCE((input_data->>'notes')::TEXT, NULL);
  -- Function variables
  var_status_id TEXT := 'DRS-PENDING'; -- Default to pending
  -- Return variable
  return_data JSON;
BEGIN
  INSERT INTO request_schema.dispose_request_table (
    dispose_request_mail_item_id,
    dispose_request_account_id,
    dispose_request_status_id,
    dispose_request_notes
  ) VALUES (
    input_mail_item_id,
    input_account_id,
    var_status_id,
    input_notes
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'dispose_request_id', dispose_request_id,
      'dispose_request_mail_item_id', dispose_request_mail_item_id,
      'dispose_request_account_id', dispose_request_account_id,
      'dispose_request_status_id', dispose_request_status_id,
      'dispose_request_notes', dispose_request_notes,
      'dispose_request_requested_at', dispose_request_requested_at,
      'dispose_request_created_at', dispose_request_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get disposal requests by account ID
CREATE OR REPLACE FUNCTION get_account_disposal_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND dispose_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.dispose_request_table
    WHERE dispose_request_account_id = %L %s', 
    input_account_id, var_status_condition)
  INTO var_total_count;

  -- Get disposal requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''dispose_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''dispose_request_id'', dispose_request_id,
          ''dispose_request_mail_item_id'', dispose_request_mail_item_id,
          ''dispose_request_status_id'', dispose_request_status_id,
          ''dispose_request_status_value'', dispose_request_status_value,
          ''dispose_request_notes'', dispose_request_notes,
          ''dispose_request_requested_at'', dispose_request_requested_at,
          ''dispose_request_processed_at'', dispose_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''mail_item_image_path'', mail_item_image_path
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        dispose_request_table.*,
        dispose_request_status_table.dispose_request_status_value,
        mail_item_table.mail_item_sender,
        mail_item_table.mail_item_image_path
      FROM request_schema.dispose_request_table
      JOIN status_schema.dispose_request_status_table ON dispose_request_status_table.dispose_request_status_id = dispose_request_table.dispose_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = dispose_request_table.dispose_request_mail_item_id
      WHERE dispose_request_account_id = %L %s
      ORDER BY dispose_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS dispose_requests', 
    var_total_count, input_account_id, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get disposal request details
CREATE OR REPLACE FUNCTION get_disposal_request_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_dispose_request_id UUID := (input_data->>'dispose_request_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'dispose_request_id', dispose_request_table.dispose_request_id,
      'dispose_request_mail_item_id', dispose_request_table.dispose_request_mail_item_id,
      'dispose_request_account_id', dispose_request_table.dispose_request_account_id,
      'dispose_request_status_id', dispose_request_table.dispose_request_status_id,
      'dispose_request_status_value', dispose_request_status_table.dispose_request_status_value,
      'dispose_request_notes', dispose_request_table.dispose_request_notes,
      'dispose_request_requested_at', dispose_request_table.dispose_request_requested_at,
      'dispose_request_processed_at', dispose_request_table.dispose_request_processed_at,
      'dispose_request_created_at', dispose_request_table.dispose_request_created_at,
      'dispose_request_updated_at', dispose_request_table.dispose_request_updated_at,
      'mail_item_sender', mail_item_table.mail_item_sender,
      'mail_item_image_path', mail_item_table.mail_item_image_path,
      'mail_item_received_at', mail_item_table.mail_item_received_at,
      'mailbox_label', mailbox_table.mailbox_label,
      'account_number', account_table.account_number
    ) INTO return_data
  FROM request_schema.dispose_request_table
  JOIN status_schema.dispose_request_status_table ON dispose_request_status_table.dispose_request_status_id = dispose_request_table.dispose_request_status_id
  JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = dispose_request_table.dispose_request_mail_item_id
  JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
  JOIN user_schema.account_table ON account_table.account_id = dispose_request_table.dispose_request_account_id
  WHERE dispose_request_table.dispose_request_id = input_dispose_request_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: Process disposal request
CREATE OR REPLACE FUNCTION admin_process_disposal_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_dispose_request_id UUID := (input_data->>'dispose_request_id')::UUID;
  input_status_id TEXT := (input_data->>'status_id')::TEXT;
  -- Function variables
  var_mail_item_id UUID;
  -- Return variable
  return_data JSON;
BEGIN
  -- Get mail item ID
  SELECT dispose_request_mail_item_id INTO var_mail_item_id
  FROM request_schema.dispose_request_table
  WHERE dispose_request_id = input_dispose_request_id;

  -- Update disposal request status
  UPDATE request_schema.dispose_request_table
  SET 
    dispose_request_status_id = input_status_id,
    dispose_request_processed_at = NOW(),
    dispose_request_updated_at = NOW()
  WHERE dispose_request_id = input_dispose_request_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'dispose_request_id', dispose_request_id,
      'dispose_request_status_id', dispose_request_status_id,
      'dispose_request_processed_at', dispose_request_processed_at,
      'dispose_request_updated_at', dispose_request_updated_at
    ) INTO return_data;

  -- If approved and completed, update mail item status to disposed
  IF input_status_id = 'DRS-COMPLETED' THEN
    UPDATE mailroom_schema.mail_item_table
    SET 
      mail_item_status_id = 'MIS-DISPOSED',
      mail_item_updated_at = NOW()
    WHERE mail_item_id = var_mail_item_id;
  END IF;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all disposal requests
CREATE OR REPLACE FUNCTION admin_list_disposal_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND dispose_request_table.dispose_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.dispose_request_table
    WHERE TRUE %s', var_status_condition)
  INTO var_total_count;

  -- Get disposal requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''dispose_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''dispose_request_id'', dispose_request_id,
          ''dispose_request_mail_item_id'', dispose_request_mail_item_id,
          ''dispose_request_account_id'', dispose_request_account_id,
          ''dispose_request_status_id'', dispose_request_status_id,
          ''dispose_request_status_value'', dispose_request_status_value,
          ''dispose_request_notes'', dispose_request_notes,
          ''dispose_request_requested_at'', dispose_request_requested_at,
          ''dispose_request_processed_at'', dispose_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''account_number'', account_number,
          ''account_area_code'', account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        dispose_request_table.*,
        dispose_request_status_table.dispose_request_status_value,
        mail_item_table.mail_item_sender,
        account_table.account_number,
        account_table.account_area_code
      FROM request_schema.dispose_request_table
      JOIN status_schema.dispose_request_status_table ON dispose_request_status_table.dispose_request_status_id = dispose_request_table.dispose_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = dispose_request_table.dispose_request_mail_item_id
      JOIN user_schema.account_table ON account_table.account_id = dispose_request_table.dispose_request_account_id
      WHERE TRUE %s
      ORDER BY dispose_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS dispose_requests', 
    var_total_count, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Request Management RPCs - Retrieval Requests
-- =============================================

-- Create retrieval request
CREATE OR REPLACE FUNCTION create_retrieval_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_address TEXT := (input_data->>'address')::TEXT;
  input_courier TEXT := COALESCE((input_data->>'courier')::TEXT, NULL);
  input_notes TEXT := COALESCE((input_data->>'notes')::TEXT, NULL);
  -- Function variables
  var_status_id TEXT := 'RRS-PENDING'; -- Default to pending
  -- Return variable
  return_data JSON;
BEGIN
  INSERT INTO request_schema.retrieval_request_table (
    retrieval_request_mail_item_id,
    retrieval_request_account_id,
    retrieval_request_status_id,
    retrieval_request_address,
    retrieval_request_courier,
    retrieval_request_notes
  ) VALUES (
    input_mail_item_id,
    input_account_id,
    var_status_id,
    input_address,
    input_courier,
    input_notes
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'retrieval_request_id', retrieval_request_id,
      'retrieval_request_mail_item_id', retrieval_request_mail_item_id,
      'retrieval_request_account_id', retrieval_request_account_id,
      'retrieval_request_status_id', retrieval_request_status_id,
      'retrieval_request_address', retrieval_request_address,
      'retrieval_request_courier', retrieval_request_courier,
      'retrieval_request_notes', retrieval_request_notes,
      'retrieval_request_requested_at', retrieval_request_requested_at,
      'retrieval_request_created_at', retrieval_request_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get retrieval requests by account ID
CREATE OR REPLACE FUNCTION get_account_retrieval_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND retrieval_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.retrieval_request_table
    WHERE retrieval_request_account_id = %L %s', 
    input_account_id, var_status_condition)
  INTO var_total_count;

  -- Get retrieval requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''retrieval_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''retrieval_request_id'', retrieval_request_id,
          ''retrieval_request_mail_item_id'', retrieval_request_mail_item_id,
          ''retrieval_request_status_id'', retrieval_request_status_id,
          ''retrieval_request_status_value'', retrieval_request_status_value,
          ''retrieval_request_address'', retrieval_request_address,
          ''retrieval_request_courier'', retrieval_request_courier,
          ''retrieval_request_tracking_number'', retrieval_request_tracking_number,
          ''retrieval_request_notes'', retrieval_request_notes,
          ''retrieval_request_requested_at'', retrieval_request_requested_at,
          ''retrieval_request_processed_at'', retrieval_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''mail_item_image_path'', mail_item_image_path
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        retrieval_request_table.*,
        retrieval_request_status_table.retrieval_request_status_value,
        mail_item_table.mail_item_sender,
        mail_item_table.mail_item_image_path
      FROM request_schema.retrieval_request_table
      JOIN status_schema.retrieval_request_status_table ON retrieval_request_status_table.retrieval_request_status_id = retrieval_request_table.retrieval_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = retrieval_request_table.retrieval_request_mail_item_id
      WHERE retrieval_request_account_id = %L %s
      ORDER BY retrieval_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS retrieval_requests', 
    var_total_count, input_account_id, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get retrieval request details
CREATE OR REPLACE FUNCTION get_retrieval_request_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_retrieval_request_id UUID := (input_data->>'retrieval_request_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'retrieval_request_id', retrieval_request_table.retrieval_request_id,
      'retrieval_request_mail_item_id', retrieval_request_table.retrieval_request_mail_item_id,
      'retrieval_request_account_id', retrieval_request_table.retrieval_request_account_id,
      'retrieval_request_status_id', retrieval_request_table.retrieval_request_status_id,
      'retrieval_request_status_value', retrieval_request_status_table.retrieval_request_status_value,
      'retrieval_request_address', retrieval_request_table.retrieval_request_address,
      'retrieval_request_courier', retrieval_request_table.retrieval_request_courier,
      'retrieval_request_tracking_number', retrieval_request_table.retrieval_request_tracking_number,
      'retrieval_request_notes', retrieval_request_table.retrieval_request_notes,
      'retrieval_request_requested_at', retrieval_request_table.retrieval_request_requested_at,
      'retrieval_request_processed_at', retrieval_request_table.retrieval_request_processed_at,
      'retrieval_request_created_at', retrieval_request_table.retrieval_request_created_at,
      'retrieval_request_updated_at', retrieval_request_table.retrieval_request_updated_at,
      'mail_item_sender', mail_item_table.mail_item_sender,
      'mail_item_image_path', mail_item_table.mail_item_image_path,
      'mail_item_received_at', mail_item_table.mail_item_received_at,
      'mailbox_label', mailbox_table.mailbox_label,
      'account_number', account_table.account_number
    ) INTO return_data
  FROM request_schema.retrieval_request_table
  JOIN status_schema.retrieval_request_status_table ON retrieval_request_status_table.retrieval_request_status_id = retrieval_request_table.retrieval_request_status_id
  JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = retrieval_request_table.retrieval_request_mail_item_id
  JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
  JOIN user_schema.account_table ON account_table.account_id = retrieval_request_table.retrieval_request_account_id
  WHERE retrieval_request_table.retrieval_request_id = input_retrieval_request_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: Process retrieval request
CREATE OR REPLACE FUNCTION admin_process_retrieval_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_retrieval_request_id UUID := (input_data->>'retrieval_request_id')::UUID;
  input_status_id TEXT := (input_data->>'status_id')::TEXT;
  input_tracking_number TEXT := COALESCE((input_data->>'tracking_number')::TEXT, NULL);
  -- Return variable
  return_data JSON;
BEGIN
  -- Update retrieval request status
  UPDATE request_schema.retrieval_request_table
  SET 
    retrieval_request_status_id = input_status_id,
    retrieval_request_tracking_number = COALESCE(input_tracking_number, retrieval_request_tracking_number),
    retrieval_request_processed_at = CASE WHEN input_status_id IN ('RRS-APPROVED', 'RRS-REJECTED') THEN NOW() ELSE retrieval_request_processed_at END,
    retrieval_request_updated_at = NOW()
  WHERE retrieval_request_id = input_retrieval_request_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'retrieval_request_id', retrieval_request_id,
      'retrieval_request_status_id', retrieval_request_status_id,
      'retrieval_request_tracking_number', retrieval_request_tracking_number,
      'retrieval_request_processed_at', retrieval_request_processed_at,
      'retrieval_request_updated_at', retrieval_request_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all retrieval requests
CREATE OR REPLACE FUNCTION admin_list_retrieval_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND retrieval_request_table.retrieval_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.retrieval_request_table
    WHERE TRUE %s', var_status_condition)
  INTO var_total_count;

  -- Get retrieval requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''retrieval_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''retrieval_request_id'', retrieval_request_id,
          ''retrieval_request_mail_item_id'', retrieval_request_mail_item_id,
          ''retrieval_request_account_id'', retrieval_request_account_id,
          ''retrieval_request_status_id'', retrieval_request_status_id,
          ''retrieval_request_status_value'', retrieval_request_status_value,
          ''retrieval_request_address'', retrieval_request_address,
          ''retrieval_request_courier'', retrieval_request_courier,
          ''retrieval_request_tracking_number'', retrieval_request_tracking_number,
          ''retrieval_request_requested_at'', retrieval_request_requested_at,
          ''retrieval_request_processed_at'', retrieval_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''account_number'', account_number,
          ''account_area_code'', account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        retrieval_request_table.*,
        retrieval_request_status_table.retrieval_request_status_value,
        mail_item_table.mail_item_sender,
        account_table.account_number,
        account_table.account_area_code
      FROM request_schema.retrieval_request_table
      JOIN status_schema.retrieval_request_status_table ON retrieval_request_status_table.retrieval_request_status_id = retrieval_request_table.retrieval_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = retrieval_request_table.retrieval_request_mail_item_id
      JOIN user_schema.account_table ON account_table.account_id = retrieval_request_table.retrieval_request_account_id
      WHERE TRUE %s
      ORDER BY retrieval_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS retrieval_requests', 
    var_total_count, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Request Management RPCs - Pickup Requests
-- =============================================

-- Create pickup request
CREATE OR REPLACE FUNCTION create_pickup_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_schedule_date TIMESTAMPTZ := COALESCE((input_data->>'schedule_date')::TIMESTAMPTZ, NULL);
  input_notes TEXT := COALESCE((input_data->>'notes')::TEXT, NULL);
  -- Function variables
  var_status_id TEXT := 'PRS-PENDING'; -- Default to pending
  -- Return variable
  return_data JSON;
BEGIN
  INSERT INTO request_schema.pickup_request_table (
    pickup_request_mail_item_id,
    pickup_request_account_id,
    pickup_request_status_id,
    pickup_request_schedule_date,
    pickup_request_notes
  ) VALUES (
    input_mail_item_id,
    input_account_id,
    var_status_id,
    input_schedule_date,
    input_notes
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'pickup_request_id', pickup_request_id,
      'pickup_request_mail_item_id', pickup_request_mail_item_id,
      'pickup_request_account_id', pickup_request_account_id,
      'pickup_request_status_id', pickup_request_status_id,
      'pickup_request_schedule_date', pickup_request_schedule_date,
      'pickup_request_notes', pickup_request_notes,
      'pickup_request_requested_at', pickup_request_requested_at,
      'pickup_request_created_at', pickup_request_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get pickup requests by account ID
CREATE OR REPLACE FUNCTION get_account_pickup_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND pickup_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.pickup_request_table
    WHERE pickup_request_account_id = %L %s', 
    input_account_id, var_status_condition)
  INTO var_total_count;

  -- Get pickup requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''pickup_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''pickup_request_id'', pickup_request_id,
          ''pickup_request_mail_item_id'', pickup_request_mail_item_id,
          ''pickup_request_status_id'', pickup_request_status_id,
          ''pickup_request_status_value'', pickup_request_status_value,
          ''pickup_request_schedule_date'', pickup_request_schedule_date,
          ''pickup_request_notes'', pickup_request_notes,
          ''pickup_request_requested_at'', pickup_request_requested_at,
          ''pickup_request_processed_at'', pickup_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''mail_item_image_path'', mail_item_image_path
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        pickup_request_table.*,
        pickup_request_status_table.pickup_request_status_value,
        mail_item_table.mail_item_sender,
        mail_item_table.mail_item_image_path
      FROM request_schema.pickup_request_table
      JOIN status_schema.pickup_request_status_table ON pickup_request_status_table.pickup_request_status_id = pickup_request_table.pickup_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = pickup_request_table.pickup_request_mail_item_id
      WHERE pickup_request_account_id = %L %s
      ORDER BY pickup_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS pickup_requests', 
    var_total_count, input_account_id, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get pickup request details
CREATE OR REPLACE FUNCTION get_pickup_request_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_pickup_request_id UUID := (input_data->>'pickup_request_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'pickup_request_id', pickup_request_table.pickup_request_id,
      'pickup_request_mail_item_id', pickup_request_table.pickup_request_mail_item_id,
      'pickup_request_account_id', pickup_request_table.pickup_request_account_id,
      'pickup_request_status_id', pickup_request_table.pickup_request_status_id,
      'pickup_request_status_value', pickup_request_status_table.pickup_request_status_value,
      'pickup_request_schedule_date', pickup_request_table.pickup_request_schedule_date,
      'pickup_request_notes', pickup_request_table.pickup_request_notes,
      'pickup_request_requested_at', pickup_request_table.pickup_request_requested_at,
      'pickup_request_processed_at', pickup_request_table.pickup_request_processed_at,
      'pickup_request_created_at', pickup_request_table.pickup_request_created_at,
      'pickup_request_updated_at', pickup_request_table.pickup_request_updated_at,
      'mail_item_sender', mail_item_table.mail_item_sender,
      'mail_item_image_path', mail_item_table.mail_item_image_path,
      'mail_item_received_at', mail_item_table.mail_item_received_at,
      'mailbox_label', mailbox_table.mailbox_label,
      'account_number', account_table.account_number
    ) INTO return_data
  FROM request_schema.pickup_request_table
  JOIN status_schema.pickup_request_status_table ON pickup_request_status_table.pickup_request_status_id = pickup_request_table.pickup_request_status_id
  JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = pickup_request_table.pickup_request_mail_item_id
  JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
  JOIN user_schema.account_table ON account_table.account_id = pickup_request_table.pickup_request_account_id
  WHERE pickup_request_table.pickup_request_id = input_pickup_request_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: Process pickup request
CREATE OR REPLACE FUNCTION admin_process_pickup_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_pickup_request_id UUID := (input_data->>'pickup_request_id')::UUID;
  input_status_id TEXT := (input_data->>'status_id')::TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  -- Update pickup request status
  UPDATE request_schema.pickup_request_table
  SET 
    pickup_request_status_id = input_status_id,
    pickup_request_processed_at = CASE WHEN input_status_id IN ('PRS-APPROVED', 'PRS-REJECTED', 'PRS-COMPLETED') THEN NOW() ELSE pickup_request_processed_at END,
    pickup_request_updated_at = NOW()
  WHERE pickup_request_id = input_pickup_request_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'pickup_request_id', pickup_request_id,
      'pickup_request_status_id', pickup_request_status_id,
      'pickup_request_processed_at', pickup_request_processed_at,
      'pickup_request_updated_at', pickup_request_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all scan requests
CREATE OR REPLACE FUNCTION admin_list_scan_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND scan_request_table.scan_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.scan_request_table
    WHERE TRUE %s', var_status_condition)
  INTO var_total_count;

  -- Get scan requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''scan_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''scan_request_id'', scan_request_id,
          ''scan_request_mail_item_id'', scan_request_mail_item_id,
          ''scan_request_account_id'', scan_request_account_id,
          ''scan_request_status_id'', scan_request_status_id,
          ''scan_request_status_value'', scan_request_status_value,
          ''scan_request_instructions'', scan_request_instructions,
          ''scan_request_requested_at'', scan_request_requested_at,
          ''scan_request_processed_at'', scan_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''account_number'', account_number,
          ''account_area_code'', account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        scan_request_table.*,
        scan_request_status_table.scan_request_status_value,
        mail_item_table.mail_item_sender,
        account_table.account_number,
        account_table.account_area_code
      FROM request_schema.scan_request_table
      JOIN status_schema.scan_request_status_table ON scan_request_status_table.scan_request_status_id = scan_request_table.scan_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = scan_request_table.scan_request_mail_item_id
      JOIN user_schema.account_table ON account_table.account_id = scan_request_table.scan_request_account_id
      WHERE TRUE %s
      ORDER BY scan_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS scan_requests', 
    var_total_count, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Request Management RPCs - Scan Requests
-- =============================================

-- Create scan request
CREATE OR REPLACE FUNCTION create_scan_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_mail_item_id UUID := (input_data->>'mail_item_id')::UUID;
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_instructions TEXT := COALESCE((input_data->>'instructions')::TEXT, NULL);
  -- Function variables
  var_status_id TEXT := 'SRS-PENDING'; -- Default to pending
  -- Return variable
  return_data JSON;
BEGIN
  INSERT INTO request_schema.scan_request_table (
    scan_request_mail_item_id,
    scan_request_account_id,
    scan_request_status_id,
    scan_request_instructions
  ) VALUES (
    input_mail_item_id,
    input_account_id,
    var_status_id,
    input_instructions
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'scan_request_id', scan_request_id,
      'scan_request_mail_item_id', scan_request_mail_item_id,
      'scan_request_account_id', scan_request_account_id,
      'scan_request_status_id', scan_request_status_id,
      'scan_request_instructions', scan_request_instructions,
      'scan_request_requested_at', scan_request_requested_at,
      'scan_request_created_at', scan_request_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get scan requests by account ID
CREATE OR REPLACE FUNCTION get_account_scan_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND scan_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.scan_request_table
    WHERE scan_request_account_id = %L %s', 
    input_account_id, var_status_condition)
  INTO var_total_count;

  -- Get scan requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''scan_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''scan_request_id'', scan_request_id,
          ''scan_request_mail_item_id'', scan_request_mail_item_id,
          ''scan_request_status_id'', scan_request_status_id,
          ''scan_request_status_value'', scan_request_status_value,
          ''scan_request_instructions'', scan_request_instructions,
          ''scan_request_requested_at'', scan_request_requested_at,
          ''scan_request_processed_at'', scan_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''mail_item_image_path'', mail_item_image_path
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        scan_request_table.*,
        scan_request_status_table.scan_request_status_value,
        mail_item_table.mail_item_sender,
        mail_item_table.mail_item_image_path
      FROM request_schema.scan_request_table
      JOIN status_schema.scan_request_status_table ON scan_request_status_table.scan_request_status_id = scan_request_table.scan_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = scan_request_table.scan_request_mail_item_id
      WHERE scan_request_account_id = %L %s
      ORDER BY scan_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS scan_requests', 
    var_total_count, input_account_id, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get scan request details
CREATE OR REPLACE FUNCTION get_scan_request_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_scan_request_id UUID := (input_data->>'scan_request_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'scan_request_id', scan_request_table.scan_request_id,
      'scan_request_mail_item_id', scan_request_table.scan_request_mail_item_id,
      'scan_request_account_id', scan_request_table.scan_request_account_id,
      'scan_request_status_id', scan_request_table.scan_request_status_id,
      'scan_request_status_value', scan_request_status_table.scan_request_status_value,
      'scan_request_instructions', scan_request_table.scan_request_instructions,
      'scan_request_requested_at', scan_request_table.scan_request_requested_at,
      'scan_request_processed_at', scan_request_table.scan_request_processed_at,
      'scan_request_created_at', scan_request_table.scan_request_created_at,
      'scan_request_updated_at', scan_request_table.scan_request_updated_at,
      'mail_item_sender', mail_item_table.mail_item_sender,
      'mail_item_image_path', mail_item_table.mail_item_image_path,
      'mail_item_received_at', mail_item_table.mail_item_received_at,
      'mailbox_label', mailbox_table.mailbox_label,
      'account_number', account_table.account_number
    ) INTO return_data
  FROM request_schema.scan_request_table
  JOIN status_schema.scan_request_status_table ON scan_request_status_table.scan_request_status_id = scan_request_table.scan_request_status_id
  JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = scan_request_table.scan_request_mail_item_id
  JOIN mailroom_schema.mailbox_table ON mailbox_table.mailbox_id = mail_item_table.mail_item_mailbox_id
  JOIN user_schema.account_table ON account_table.account_id = scan_request_table.scan_request_account_id
  WHERE scan_request_table.scan_request_id = input_scan_request_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: Process scan request
CREATE OR REPLACE FUNCTION admin_process_scan_request(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_scan_request_id UUID := (input_data->>'scan_request_id')::UUID;
  input_status_id TEXT := (input_data->>'status_id')::TEXT;
  -- Function variables
  var_mail_item_id UUID;
  -- Return variable
  return_data JSON;
BEGIN
  -- Get mail item ID
  SELECT scan_request_mail_item_id INTO var_mail_item_id
  FROM request_schema.scan_request_table
  WHERE scan_request_id = input_scan_request_id;

  -- Update scan request status
  UPDATE request_schema.scan_request_table
  SET 
    scan_request_status_id = input_status_id,
    scan_request_processed_at = CASE WHEN input_status_id IN ('SRS-COMPLETED', 'SRS-REJECTED') THEN NOW() ELSE scan_request_processed_at END,
    scan_request_updated_at = NOW()
  WHERE scan_request_id = input_scan_request_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'scan_request_id', scan_request_id,
      'scan_request_status_id', scan_request_status_id,
      'scan_request_processed_at', scan_request_processed_at,
      'scan_request_updated_at', scan_request_updated_at
    ) INTO return_data;

  -- If completed, update mail item status to scanned
  IF input_status_id = 'SRS-COMPLETED' THEN
    UPDATE mailroom_schema.mail_item_table
    SET 
      mail_item_status_id = 'MIS-SCANNED',
      mail_item_updated_at = NOW()
    WHERE mail_item_id = var_mail_item_id;
  END IF;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all scan requests
CREATE OR REPLACE FUNCTION admin_list_scan_requests(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND scan_request_table.scan_request_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM request_schema.scan_request_table
    WHERE TRUE %s', var_status_condition)
  INTO var_total_count;

  -- Get scan requests with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''scan_requests'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''scan_request_id'', scan_request_id,
          ''scan_request_mail_item_id'', scan_request_mail_item_id,
          ''scan_request_account_id'', scan_request_account_id,
          ''scan_request_status_id'', scan_request_status_id,
          ''scan_request_status_value'', scan_request_status_value,
          ''scan_request_instructions'', scan_request_instructions,
          ''scan_request_requested_at'', scan_request_requested_at,
          ''scan_request_processed_at'', scan_request_processed_at,
          ''mail_item_sender'', mail_item_sender,
          ''account_number'', account_number,
          ''account_area_code'', account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        scan_request_table.*,
        scan_request_status_table.scan_request_status_value,
        mail_item_table.mail_item_sender,
        account_table.account_number,
        account_table.account_area_code
      FROM request_schema.scan_request_table
      JOIN status_schema.scan_request_status_table ON scan_request_status_table.scan_request_status_id = scan_request_table.scan_request_status_id
      JOIN mailroom_schema.mail_item_table ON mail_item_table.mail_item_id = scan_request_table.scan_request_mail_item_id
      JOIN user_schema.account_table ON account_table.account_id = scan_request_table.scan_request_account_id
      WHERE TRUE %s
      ORDER BY scan_request_requested_at DESC
      LIMIT %L OFFSET %L
    ) AS scan_requests', 
    var_total_count, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Referral Management RPCs
-- =============================================

-- Create referral
CREATE OR REPLACE FUNCTION create_referral(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_referrer_account_id UUID := (input_data->>'referrer_account_id')::UUID;
  input_email TEXT := (input_data->>'email')::TEXT;
  input_name TEXT := (input_data->>'name')::TEXT;
  input_message TEXT := COALESCE((input_data->>'message')::TEXT, NULL);
  -- Function variables
  var_status_id TEXT := 'RFS-PENDING'; -- Default to pending
  var_code TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  -- Generate unique referral code
  SELECT SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FOR 8) INTO var_code;
  
  INSERT INTO referral_schema.referral_table (
    referral_referrer_account_id,
    referral_status_id,
    referral_email,
    referral_name,
    referral_message,
    referral_code
  ) VALUES (
    input_referrer_account_id,
    var_status_id,
    input_email,
    input_name,
    input_message,
    var_code
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'referral_id', referral_id,
      'referral_referrer_account_id', referral_referrer_account_id,
      'referral_status_id', referral_status_id,
      'referral_email', referral_email,
      'referral_name', referral_name,
      'referral_message', referral_message,
      'referral_code', referral_code,
      'referral_created_at', referral_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get referrals by account ID
CREATE OR REPLACE FUNCTION get_account_referrals(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND referral_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM referral_schema.referral_table
    WHERE referral_referrer_account_id = %L %s', 
    input_account_id, var_status_condition)
  INTO var_total_count;

  -- Get referrals with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''referrals'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''referral_id'', referral_id,
          ''referral_referrer_account_id'', referral_referrer_account_id,
          ''referral_status_id'', referral_status_id,
          ''referral_status_value'', referral_status_value,
          ''referral_email'', referral_email,
          ''referral_name'', referral_name,
          ''referral_message'', referral_message,
          ''referral_code'', referral_code,
          ''referral_created_at'', referral_created_at,
          ''referral_updated_at'', referral_updated_at,
          ''referral_converted_at'', referral_converted_at
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        referral_table.*,
        referral_status_table.referral_status_value
      FROM referral_schema.referral_table
      JOIN status_schema.referral_status_table ON referral_status_table.referral_status_id = referral_table.referral_status_id
      WHERE referral_referrer_account_id = %L %s
      ORDER BY referral_created_at DESC
      LIMIT %L OFFSET %L
    ) AS referrals', 
    var_total_count, input_account_id, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get referral details
CREATE OR REPLACE FUNCTION get_referral_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_referral_id UUID := (input_data->>'referral_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'referral_id', referral_table.referral_id,
      'referral_referrer_account_id', referral_table.referral_referrer_account_id,
      'referral_status_id', referral_table.referral_status_id,
      'referral_status_value', referral_status_table.referral_status_value,
      'referral_email', referral_table.referral_email,
      'referral_name', referral_table.referral_name,
      'referral_message', referral_table.referral_message,
      'referral_code', referral_table.referral_code,
      'referral_created_at', referral_table.referral_created_at,
      'referral_updated_at', referral_table.referral_updated_at,
      'referral_converted_at', referral_table.referral_converted_at,
      'referrer_account_number', account_table.account_number,
      'referrer_account_area_code', account_table.account_area_code
    ) INTO return_data
  FROM referral_schema.referral_table
  JOIN status_schema.referral_status_table ON referral_status_table.referral_status_id = referral_table.referral_status_id
  JOIN user_schema.account_table ON account_table.account_id = referral_table.referral_referrer_account_id
  WHERE referral_table.referral_id = input_referral_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Validate referral code
CREATE OR REPLACE FUNCTION validate_referral_code(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_code TEXT := (input_data->>'code')::TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'referral_id', referral_id,
      'referral_referrer_account_id', referral_referrer_account_id,
      'referral_status_id', referral_status_id,
      'referral_status_value', referral_status_value,
      'referral_email', referral_email,
      'referral_name', referral_name,
      'referral_code', referral_code,
      'is_valid', CASE WHEN referral_status_id = 'RFS-PENDING' THEN TRUE ELSE FALSE END
    ) INTO return_data
  FROM referral_schema.referral_table
  JOIN status_schema.referral_status_table ON referral_status_table.referral_status_id = referral_table.referral_status_id
  WHERE referral_table.referral_code = input_code;

  -- If no referral found with this code
  IF return_data IS NULL THEN
    return_data := JSON_BUILD_OBJECT(
      'is_valid', FALSE,
      'message', 'Invalid referral code'
    );
  END IF;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Convert referral
CREATE OR REPLACE FUNCTION convert_referral(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_referral_id UUID := (input_data->>'referral_id')::UUID;
  input_referred_account_id UUID := (input_data->>'referred_account_id')::UUID;
  -- Function variables
  var_status_id TEXT := 'RFS-CONVERTED';
  -- Return variable
  return_data JSON;
BEGIN
  -- Update referral status to converted
  UPDATE referral_schema.referral_table
  SET 
    referral_status_id = var_status_id,
    referral_referred_account_id = input_referred_account_id,
    referral_converted_at = NOW(),
    referral_updated_at = NOW()
  WHERE referral_id = input_referral_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'referral_id', referral_id,
      'referral_status_id', referral_status_id,
      'referral_referred_account_id', referral_referred_account_id,
      'referral_converted_at', referral_converted_at,
      'referral_updated_at', referral_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all referrals
CREATE OR REPLACE FUNCTION admin_list_referrals(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND referral_table.referral_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM referral_schema.referral_table
    WHERE TRUE %s', var_status_condition)
  INTO var_total_count;

  -- Get referrals with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''referrals'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''referral_id'', referral_id,
          ''referral_referrer_account_id'', referral_referrer_account_id,
          ''referral_referred_account_id'', referral_referred_account_id,
          ''referral_status_id'', referral_status_id,
          ''referral_status_value'', referral_status_value,
          ''referral_email'', referral_email,
          ''referral_name'', referral_name,
          ''referral_code'', referral_code,
          ''referral_created_at'', referral_created_at,
          ''referral_converted_at'', referral_converted_at,
          ''referrer_account_number'', referrer_account.account_number,
          ''referrer_account_area_code'', referrer_account.account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        referral_table.*,
        referral_status_table.referral_status_value,
        referrer_account.account_number as referrer_account_number,
        referrer_account.account_area_code as referrer_account_area_code
      FROM referral_schema.referral_table
      JOIN status_schema.referral_status_table ON referral_status_table.referral_status_id = referral_table.referral_status_id
      JOIN user_schema.account_table referrer_account ON referrer_account.account_id = referral_table.referral_referrer_account_id
      WHERE TRUE %s
      ORDER BY referral_created_at DESC
      LIMIT %L OFFSET %L
    ) AS referrals', 
    var_total_count, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- =============================================
-- Virtual Address Management RPCs
-- =============================================

-- Create virtual address
CREATE OR REPLACE FUNCTION create_virtual_address(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_address_line1 TEXT := (input_data->>'address_line1')::TEXT;
  input_address_line2 TEXT := COALESCE((input_data->>'address_line2')::TEXT, NULL);
  input_city TEXT := (input_data->>'city')::TEXT;
  input_state TEXT := (input_data->>'state')::TEXT;
  input_postal_code TEXT := (input_data->>'postal_code')::TEXT;
  input_country TEXT := (input_data->>'country')::TEXT;
  -- Function variables
  var_status_id TEXT := 'VAS-ACTIVE'; -- Default to active
  -- Return variable
  return_data JSON;
BEGIN
  INSERT INTO mailroom_schema.virtual_address_table (
    virtual_address_account_id,
    virtual_address_status_id,
    virtual_address_line1,
    virtual_address_line2,
    virtual_address_city,
    virtual_address_state,
    virtual_address_postal_code,
    virtual_address_country
  ) VALUES (
    input_account_id,
    var_status_id,
    input_address_line1,
    input_address_line2,
    input_city,
    input_state,
    input_postal_code,
    input_country
  )
  RETURNING 
    JSON_BUILD_OBJECT(
      'virtual_address_id', virtual_address_id,
      'virtual_address_account_id', virtual_address_account_id,
      'virtual_address_status_id', virtual_address_status_id,
      'virtual_address_line1', virtual_address_line1,
      'virtual_address_line2', virtual_address_line2,
      'virtual_address_city', virtual_address_city,
      'virtual_address_state', virtual_address_state,
      'virtual_address_postal_code', virtual_address_postal_code,
      'virtual_address_country', virtual_address_country,
      'virtual_address_created_at', virtual_address_created_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get virtual addresses by account ID
CREATE OR REPLACE FUNCTION get_account_virtual_addresses(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_account_id UUID := (input_data->>'account_id')::UUID;
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND virtual_address_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM mailroom_schema.virtual_address_table
    WHERE virtual_address_account_id = %L %s', 
    input_account_id, var_status_condition)
  INTO var_total_count;

  -- Get virtual addresses with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''virtual_addresses'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''virtual_address_id'', virtual_address_id,
          ''virtual_address_account_id'', virtual_address_account_id,
          ''virtual_address_status_id'', virtual_address_status_id,
          ''virtual_address_status_value'', virtual_address_status_value,
          ''virtual_address_line1'', virtual_address_line1,
          ''virtual_address_line2'', virtual_address_line2,
          ''virtual_address_city'', virtual_address_city,
          ''virtual_address_state'', virtual_address_state,
          ''virtual_address_postal_code'', virtual_address_postal_code,
          ''virtual_address_country'', virtual_address_country,
          ''virtual_address_created_at'', virtual_address_created_at,
          ''virtual_address_updated_at'', virtual_address_updated_at
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        virtual_address_table.*,
        virtual_address_status_table.virtual_address_status_value
      FROM mailroom_schema.virtual_address_table
      JOIN status_schema.virtual_address_status_table ON virtual_address_status_table.virtual_address_status_id = virtual_address_table.virtual_address_status_id
      WHERE virtual_address_account_id = %L %s
      ORDER BY virtual_address_created_at DESC
      LIMIT %L OFFSET %L
    ) AS virtual_addresses', 
    var_total_count, input_account_id, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Get virtual address details
CREATE OR REPLACE FUNCTION get_virtual_address_details(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_virtual_address_id UUID := (input_data->>'virtual_address_id')::UUID;
  -- Return variable
  return_data JSON;
BEGIN
  SELECT 
    JSON_BUILD_OBJECT(
      'virtual_address_id', virtual_address_table.virtual_address_id,
      'virtual_address_account_id', virtual_address_table.virtual_address_account_id,
      'virtual_address_status_id', virtual_address_table.virtual_address_status_id,
      'virtual_address_status_value', virtual_address_status_table.virtual_address_status_value,
      'virtual_address_line1', virtual_address_table.virtual_address_line1,
      'virtual_address_line2', virtual_address_table.virtual_address_line2,
      'virtual_address_city', virtual_address_table.virtual_address_city,
      'virtual_address_state', virtual_address_table.virtual_address_state,
      'virtual_address_postal_code', virtual_address_table.virtual_address_postal_code,
      'virtual_address_country', virtual_address_table.virtual_address_country,
      'virtual_address_created_at', virtual_address_table.virtual_address_created_at,
      'virtual_address_updated_at', virtual_address_table.virtual_address_updated_at,
      'account_number', account_table.account_number,
      'account_area_code', account_table.account_area_code
    ) INTO return_data
  FROM mailroom_schema.virtual_address_table
  JOIN status_schema.virtual_address_status_table ON virtual_address_status_table.virtual_address_status_id = virtual_address_table.virtual_address_status_id
  JOIN user_schema.account_table ON account_table.account_id = virtual_address_table.virtual_address_account_id
  WHERE virtual_address_table.virtual_address_id = input_virtual_address_id;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update virtual address
CREATE OR REPLACE FUNCTION update_virtual_address(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_virtual_address_id UUID := (input_data->>'virtual_address_id')::UUID;
  input_address_line1 TEXT := COALESCE((input_data->>'address_line1')::TEXT, NULL);
  input_address_line2 TEXT := COALESCE((input_data->>'address_line2')::TEXT, NULL);
  input_city TEXT := COALESCE((input_data->>'city')::TEXT, NULL);
  input_state TEXT := COALESCE((input_data->>'state')::TEXT, NULL);
  input_postal_code TEXT := COALESCE((input_data->>'postal_code')::TEXT, NULL);
  input_country TEXT := COALESCE((input_data->>'country')::TEXT, NULL);
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.virtual_address_table
  SET 
    virtual_address_line1 = COALESCE(input_address_line1, virtual_address_line1),
    virtual_address_line2 = COALESCE(input_address_line2, virtual_address_line2),
    virtual_address_city = COALESCE(input_city, virtual_address_city),
    virtual_address_state = COALESCE(input_state, virtual_address_state),
    virtual_address_postal_code = COALESCE(input_postal_code, virtual_address_postal_code),
    virtual_address_country = COALESCE(input_country, virtual_address_country),
    virtual_address_updated_at = NOW()
  WHERE virtual_address_id = input_virtual_address_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'virtual_address_id', virtual_address_id,
      'virtual_address_line1', virtual_address_line1,
      'virtual_address_line2', virtual_address_line2,
      'virtual_address_city', virtual_address_city,
      'virtual_address_state', virtual_address_state,
      'virtual_address_postal_code', virtual_address_postal_code,
      'virtual_address_country', virtual_address_country,
      'virtual_address_updated_at', virtual_address_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Update virtual address status
CREATE OR REPLACE FUNCTION update_virtual_address_status(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
  -- Input variables
  input_virtual_address_id UUID := (input_data->>'virtual_address_id')::UUID;
  input_status_id TEXT := (input_data->>'status_id')::TEXT;
  -- Return variable
  return_data JSON;
BEGIN
  UPDATE mailroom_schema.virtual_address_table
  SET 
    virtual_address_status_id = input_status_id,
    virtual_address_updated_at = NOW()
  WHERE virtual_address_id = input_virtual_address_id
  RETURNING 
    JSON_BUILD_OBJECT(
      'virtual_address_id', virtual_address_id,
      'virtual_address_status_id', virtual_address_status_id,
      'virtual_address_updated_at', virtual_address_updated_at
    ) INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;

-- Admin: List all virtual addresses
CREATE OR REPLACE FUNCTION admin_list_virtual_addresses(input_data JSON)
RETURNS JSON
SET search_path TO ''
SECURITY DEFINER
AS $$
DECLARE
  -- Input variables
  input_limit INTEGER := COALESCE((input_data->>'limit')::INTEGER, 100);
  input_offset INTEGER := COALESCE((input_data->>'offset')::INTEGER, 0);
  input_status_id TEXT := COALESCE((input_data->>'status_id')::TEXT, NULL);
  -- Function variables
  var_status_condition TEXT := '';
  var_total_count INTEGER;
  -- Return variable
  return_data JSON;
BEGIN
  -- Add status condition if provided
  IF input_status_id IS NOT NULL THEN
    var_status_condition := format(' AND virtual_address_table.virtual_address_status_id = %L', input_status_id);
  END IF;

  -- Get total count
  EXECUTE format('
    SELECT COUNT(*)
    FROM mailroom_schema.virtual_address_table
    WHERE TRUE %s', var_status_condition)
  INTO var_total_count;

  -- Get virtual addresses with pagination
  EXECUTE format('
    SELECT JSON_BUILD_OBJECT(
      ''total'', %L,
      ''virtual_addresses'', COALESCE(JSON_AGG(
        JSON_BUILD_OBJECT(
          ''virtual_address_id'', virtual_address_id,
          ''virtual_address_account_id'', virtual_address_account_id,
          ''virtual_address_status_id'', virtual_address_status_id,
          ''virtual_address_status_value'', virtual_address_status_value,
          ''virtual_address_line1'', virtual_address_line1,
          ''virtual_address_line2'', virtual_address_line2,
          ''virtual_address_city'', virtual_address_city,
          ''virtual_address_state'', virtual_address_state,
          ''virtual_address_postal_code'', virtual_address_postal_code,
          ''virtual_address_country'', virtual_address_country,
          ''account_number'', account_number,
          ''account_area_code'', account_area_code
        )
      ), ''[]''::JSON)
    )
    FROM (
      SELECT 
        virtual_address_table.*,
        virtual_address_status_table.virtual_address_status_value,
        account_table.account_number,
        account_table.account_area_code
      FROM mailroom_schema.virtual_address_table
      JOIN status_schema.virtual_address_status_table ON virtual_address_status_table.virtual_address_status_id = virtual_address_table.virtual_address_status_id
      JOIN user_schema.account_table ON account_table.account_id = virtual_address_table.virtual_address_account_id
      WHERE TRUE %s
      ORDER BY virtual_address_created_at DESC
      LIMIT %L OFFSET %L
    ) AS virtual_addresses', 
    var_total_count, var_status_condition, input_limit, input_offset)
  INTO return_data;

  RETURN return_data;
END;
$$
LANGUAGE plpgsql;
