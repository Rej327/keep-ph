-- Function to delete a user profile from user_schema.user_table
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

  -- Delete related records in other tables first (maintain referential integrity)
  -- This assumes foreign keys with CASCADE DELETE are not set up
  
  -- Delete from user_schema.user_address_table if it exists
  DELETE FROM user_schema.user_address_table WHERE user_address_user_id = input_user_id;
  
  -- Delete from user_schema.account_table if it exists
  -- This will cascade to mailbox_table if you have foreign keys set up
  DELETE FROM user_schema.account_table WHERE account_user_id = input_user_id;
  
  -- Finally delete the user from user_schema.user_table
  DELETE FROM user_schema.user_table WHERE user_id = input_user_id;
  
  -- Return success
  return_data := json_build_object('success', true, 'message', 'User profile deleted successfully');
  
  RETURN return_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_profile TO service_role;
