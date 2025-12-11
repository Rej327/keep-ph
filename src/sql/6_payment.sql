-- =============================================
-- 1. Schema Definition
-- =============================================
-- Created in 1_schema.sql, but ensuring here
DROP SCHEMA IF EXISTS billing_schema CASCADE;
CREATE SCHEMA billing_schema AUTHORIZATION postgres;

-- =============================================
-- 2. Table Definitions
-- =============================================

-- Customer Billing Information
CREATE TABLE billing_schema.customer_billing_information (
    customer_billing_information_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_billing_information_user_id UUID NOT NULL REFERENCES user_schema.user_table(user_id) ON DELETE CASCADE,
    customer_billing_information_full_name TEXT,
    customer_billing_information_email TEXT,
    customer_billing_information_phone TEXT,
    customer_billing_information_address TEXT,
    customer_billing_information_created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_billing_information_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Subscriptions
CREATE TABLE billing_schema.customer_subscriptions (
    customer_subscriptions_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_subscriptions_user_id UUID NOT NULL REFERENCES user_schema.user_table(user_id) ON DELETE CASCADE,
    customer_subscriptions_plan_id TEXT NOT NULL, -- e.g., 'AT-STARTER'
    customer_subscriptions_status TEXT NOT NULL DEFAULT 'pending', -- pending, active, failed, cancelled
    customer_subscriptions_start_date TIMESTAMPTZ,
    customer_subscriptions_end_date TIMESTAMPTZ,
    customer_subscriptions_paymongo_id TEXT, -- External Subscription ID if needed later
    customer_subscriptions_created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_subscriptions_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer PayMongo Payments
CREATE TABLE billing_schema.customer_paymongo_payments (
    customer_paymongo_payments_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_paymongo_payments_user_id UUID NOT NULL REFERENCES user_schema.user_table(user_id) ON DELETE CASCADE,
    customer_paymongo_payments_subscription_id UUID REFERENCES billing_schema.customer_subscriptions(customer_subscriptions_id),
    customer_paymongo_payments_intent_id TEXT NOT NULL, -- The Payment Intent ID or Checkout Session ID
    customer_paymongo_payments_amount INTEGER NOT NULL, -- In cents
    customer_paymongo_payments_status TEXT NOT NULL, -- succeeded, awaiting_payment_method, etc.
    customer_paymongo_payments_metadata JSONB DEFAULT '{}'::JSONB,
    customer_paymongo_payments_created_at TIMESTAMPTZ DEFAULT NOW(),
    customer_paymongo_payments_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. Trigger Functions (Auto-update updated_at)
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.customer_billing_information_updated_at = NOW(); -- Generic logic if generic trigger, but here specific
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Specific triggers for each table (or reuse a generic one if properly named, but sticking to explicit)
CREATE OR REPLACE FUNCTION trigger_update_billing_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.customer_billing_information_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_billing_information_modtime
BEFORE UPDATE ON billing_schema.customer_billing_information
FOR EACH ROW EXECUTE PROCEDURE trigger_update_billing_timestamp();

CREATE OR REPLACE FUNCTION trigger_update_subscriptions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.customer_subscriptions_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_subscriptions_modtime
BEFORE UPDATE ON billing_schema.customer_subscriptions
FOR EACH ROW EXECUTE PROCEDURE trigger_update_subscriptions_timestamp();

CREATE OR REPLACE FUNCTION trigger_update_payments_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.customer_paymongo_payments_updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_paymongo_payments_modtime
BEFORE UPDATE ON billing_schema.customer_paymongo_payments
FOR EACH ROW EXECUTE PROCEDURE trigger_update_payments_timestamp();


-- =============================================
-- 4. RPC Definitions
-- =============================================

-- RPC: Create Billing Info (Upsert)
CREATE OR REPLACE FUNCTION upsert_customer_billing_information(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_full_name TEXT := (input_data->>'full_name')::TEXT;
    input_email TEXT := (input_data->>'email')::TEXT;
    input_phone TEXT := (input_data->>'phone')::TEXT;
    input_address TEXT := (input_data->>'address')::TEXT;
    
    -- Return variable
    return_data JSON;
BEGIN
    INSERT INTO billing_schema.customer_billing_information (
        customer_billing_information_user_id,
        customer_billing_information_full_name,
        customer_billing_information_email,
        customer_billing_information_phone,
        customer_billing_information_address
    ) VALUES (
        input_user_id,
        input_full_name,
        input_email,
        input_phone,
        input_address
    )
    ON CONFLICT (customer_billing_information_user_id) DO UPDATE
    SET
        customer_billing_information_full_name = EXCLUDED.customer_billing_information_full_name,
        customer_billing_information_email = EXCLUDED.customer_billing_information_email,
        customer_billing_information_phone = EXCLUDED.customer_billing_information_phone,
        customer_billing_information_address = EXCLUDED.customer_billing_information_address;

    SELECT row_to_json(r) INTO return_data
    FROM billing_schema.customer_billing_information r
    WHERE customer_billing_information_user_id = input_user_id;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- RPC: Initialize Subscription & Payment (Pending State)
CREATE OR REPLACE FUNCTION public.init_subscription_payment(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_user_id UUID := (input_data->>'user_id')::UUID;
    input_plan_id TEXT := (input_data->>'plan_id')::TEXT;
    input_intent_id TEXT := (input_data->>'intent_id')::TEXT;
    input_amount INTEGER := (input_data->>'amount')::INTEGER;
    input_metadata JSONB := (input_data->>'metadata')::JSONB;
    
    -- Function variables
    new_subscription_id UUID;
    
    -- Return variable
    return_data JSON;
BEGIN
    -- 1. Create Subscription (Pending)
    INSERT INTO billing_schema.customer_subscriptions (
        customer_subscriptions_user_id,
        customer_subscriptions_plan_id,
        customer_subscriptions_status
    ) VALUES (
        input_user_id,
        input_plan_id,
        'pending'
    ) RETURNING customer_subscriptions_id INTO new_subscription_id;

    -- 2. Log Payment (Pending)
    INSERT INTO billing_schema.customer_paymongo_payments (
        customer_paymongo_payments_user_id,
        customer_paymongo_payments_subscription_id,
        customer_paymongo_payments_intent_id,
        customer_paymongo_payments_amount,
        customer_paymongo_payments_status,
        customer_paymongo_payments_metadata
    ) VALUES (
        input_user_id,
        new_subscription_id,
        input_intent_id,
        input_amount,
        'awaiting_payment_method', -- Initial status for intent/checkout
        input_metadata
    );

    return_data := json_build_object(
        'subscription_id', new_subscription_id,
        'status', 'pending'
    );

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- RPC: Process PayMongo Webhook
CREATE OR REPLACE FUNCTION process_paymongo_webhook(input_data JSON)
RETURNS JSON
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_intent_id TEXT := (input_data->>'intent_id')::TEXT;
    input_payment_status TEXT := (input_data->>'payment_status')::TEXT; -- succeeded, failed
    input_event_type TEXT := (input_data->>'event_type')::TEXT;
    
    -- Function variables
    var_payment_record billing_schema.customer_paymongo_payments%ROWTYPE;
    var_subscription_record billing_schema.customer_subscriptions%ROWTYPE;
    var_subscription_id UUID;
    
    -- Return variable
    return_data JSON;
BEGIN
    -- 1. Find the payment record
    SELECT * INTO var_payment_record
    FROM billing_schema.customer_paymongo_payments
    WHERE customer_paymongo_payments_intent_id = input_intent_id
    LIMIT 1;

    IF var_payment_record IS NULL THEN
        RETURN json_build_object('status', 'error', 'message', 'Payment intent not found');
    END IF;

    -- Idempotency check: If already succeeded, do nothing
    IF var_payment_record.customer_paymongo_payments_status = 'succeeded' THEN
        RETURN json_build_object('status', 'ignored', 'message', 'Payment already processed');
    END IF;

    -- 2. Update Payment Status
    UPDATE billing_schema.customer_paymongo_payments
    SET customer_paymongo_payments_status = input_payment_status
    WHERE customer_paymongo_payments_id = var_payment_record.customer_paymongo_payments_id;

    var_subscription_id := var_payment_record.customer_paymongo_payments_subscription_id;

    -- 3. Update Subscription if Succeeded
    IF input_payment_status = 'succeeded' OR input_payment_status = 'paid' THEN
        -- Activate subscription
        UPDATE billing_schema.customer_subscriptions
        SET 
            customer_subscriptions_status = 'active',
            customer_subscriptions_start_date = NOW(),
            customer_subscriptions_end_date = NOW() + INTERVAL '1 month' -- Default to 1 month, adjust logic if needed
        WHERE customer_subscriptions_id = var_subscription_id;

        -- Auto-provision account if data exists
        IF var_payment_record.customer_paymongo_payments_metadata ? 'provisioning_data' THEN
            DECLARE
                prov_data JSONB := var_payment_record.customer_paymongo_payments_metadata->'provisioning_data';
                action_type TEXT := prov_data->>'action';
            BEGIN
                IF action_type = 'ADD_MAILBOX' THEN
                     PERFORM public.add_mailboxes_to_account(prov_data::JSON);
                ELSE
                    -- Default to creating/updating subscription account
                    PERFORM public.create_user_subscription_account(prov_data::JSON);
                END IF;
            END;
        END IF;

        -- Optionally: Update user table to reflect subscription status if you mirror it there
        -- UPDATE user_schema.user_table SET ...
    ELSE
        -- Mark as failed
        UPDATE billing_schema.customer_subscriptions
        SET customer_subscriptions_status = 'failed'
        WHERE customer_subscriptions_id = var_subscription_id;
    END IF;

    return_data := json_build_object('status', 'success', 'subscription_id', var_subscription_id);
    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- RPC: Get Latest Pending Payment
CREATE OR REPLACE FUNCTION get_latest_pending_payment(input_user_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    payment_record billing_schema.customer_paymongo_payments%ROWTYPE;
BEGIN
    SELECT * INTO payment_record
    FROM billing_schema.customer_paymongo_payments
    WHERE customer_paymongo_payments_user_id = input_user_id
      AND customer_paymongo_payments_status != 'succeeded'
    ORDER BY customer_paymongo_payments_created_at DESC
    LIMIT 1;

    IF payment_record IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN row_to_json(payment_record);
END;
$$ LANGUAGE plpgsql;

-- RPC: Get Subscription Status
CREATE OR REPLACE FUNCTION get_user_subscription_status(input_data JSON)
RETURNS JSON
SET search_path TO ''
AS $$
DECLARE
    -- Input variables
    input_user_id UUID := (input_data->>'user_id')::UUID;
    
    -- Return variable
    return_data JSON;
BEGIN
    SELECT json_build_object(
        'status', cs.customer_subscriptions_status,
        'plan_id', cs.customer_subscriptions_plan_id,
        'start_date', cs.customer_subscriptions_start_date,
        'end_date', cs.customer_subscriptions_end_date
    ) INTO return_data
    FROM billing_schema.customer_subscriptions cs
    WHERE cs.customer_subscriptions_user_id = input_user_id
    ORDER BY cs.customer_subscriptions_created_at DESC
    LIMIT 1;

    IF return_data IS NULL THEN
        return_data := json_build_object('status', 'none');
    END IF;

    RETURN return_data;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions on billing_schema
GRANT ALL ON ALL TABLES IN SCHEMA billing_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA billing_schema TO postgres;
GRANT ALL ON SCHEMA billing_schema TO postgres;
GRANT ALL ON SCHEMA billing_schema TO public;
