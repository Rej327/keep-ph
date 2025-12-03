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



-- RPC to get mailroom data
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

-- RPC to update mail item locations
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
      -- Update item
      UPDATE mailroom_schema.mail_item_table
      SET mail_item_mailbox_id = v_new_mailbox_id,
          mail_item_updated_at = NOW()
      WHERE mail_item_id = v_item_id;

      -- Update counters (Remaining Space)
      -- Old mailbox: Increment remaining space (freed up)
      IF v_item_type = 'MAIL' THEN
        UPDATE mailroom_schema.mailbox_table
        SET mailbox_mail_remaining_space = mailbox_mail_remaining_space + 1
        WHERE mailbox_id = v_old_mailbox_id;

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
