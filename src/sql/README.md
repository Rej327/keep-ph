# Database Setup Instructions

This folder contains the SQL scripts required to set up the Keep PH database.

## Prerequisites

- PostgreSQL database (Supabase recommended)
- Access to run SQL scripts (Supabase SQL Editor)

## Installation Order

Run the scripts in the following order to ensure dependencies are met:

1.  **`0_schema_setup.sql`**

    - Sets up storage buckets for documents and user avatars.
    - Creates all database schemas (status_schema, user_schema, mailroom_schema, etc.).
    - Grants appropriate permissions on all schemas.
    - **Run this FIRST before any other scripts.**

2.  **`1_schema.sql`**

    - Sets up storage buckets for documents and user avatars.
    - Creates all database schemas (status_schema, user_schema, mailroom_schema, etc.).
    - Creates all necessary tables in their respective schemas:
      - status_schema: mailbox_status_table, mail_item_status_table, virtual_address_status_table, dispose_request_status_table, retrieval_request_status_table, pickup_request_status_table, scan_request_status_table, referral_status_table
      - user_schema: user_role_table, account_type_table, account_table (created on subscription), user_table (with subscription status, username, first_name, last_name, avatar support)
      - mailroom_schema: mailbox_table (owned by accounts), mail_item_table, virtual_address_table (owned by accounts)
      - request_schema: dispose_request_table, retrieval_request_table, pickup_request_table, scan_request_table (all owned by accounts)
      - referral_schema: referral_invitation_table, referral_reward_table (for referral program)
      - analytics_schema: visitor_analytics_table, new_account_count_table, subscription_account_count_table, error_table
    - Inserts default data for all lookup tables.
    - Uses strict naming conventions with table prefixes for columns.
    - Grants permissions on all schemas and tables.

3.  **`2_foreign_keys.sql`**

    - Establishes foreign key relationships between tables to ensure data integrity.
    - Sets up cascading deletes where appropriate.

4.  **`3_rpc.sql`**

    - Installs all Stored Procedures (RPCs) for the API.
    - Includes functions for Authentication, Customer operations, Mailbox management, and Admin tasks.
    - Follows strictly defined coding conventions (snake_case, variable naming).

5.  **`4_policy.sql`**
    - Enables Row Level Security (RLS) on all tables.
    - Adds basic policies for user access control.
