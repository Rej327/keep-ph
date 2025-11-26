-- Foreign Key Constraints

-- Mailbox Foreign Keys
ALTER TABLE mailroom_schema.mailbox_table
    ADD CONSTRAINT fk_mailbox_account
    FOREIGN KEY (mailbox_account_id)
    REFERENCES user_schema.account_table(account_id)
    ON DELETE CASCADE;

ALTER TABLE mailroom_schema.mailbox_table
    ADD CONSTRAINT fk_mailbox_status
    FOREIGN KEY (mailbox_status_id)
    REFERENCES status_schema.mailbox_status_table(mailbox_status_id)
    ON DELETE RESTRICT;

-- Mail Item Foreign Keys
ALTER TABLE mailroom_schema.mail_item_table
    ADD CONSTRAINT fk_mail_item_mailbox
    FOREIGN KEY (mail_item_mailbox_id)
    REFERENCES mailroom_schema.mailbox_table(mailbox_id)
    ON DELETE CASCADE;

ALTER TABLE mailroom_schema.mail_item_table
    ADD CONSTRAINT fk_mail_item_status
    FOREIGN KEY (mail_item_status_id)
    REFERENCES status_schema.mail_item_status_table(mail_item_status_id)
    ON DELETE RESTRICT;

-- Dispose Request Foreign Keys
ALTER TABLE request_schema.dispose_request_table
    ADD CONSTRAINT fk_dispose_request_account
    FOREIGN KEY (dispose_request_account_id)
    REFERENCES user_schema.account_table(account_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.dispose_request_table
    ADD CONSTRAINT fk_dispose_request_mail_item
    FOREIGN KEY (dispose_request_mail_item_id)
    REFERENCES mailroom_schema.mail_item_table(mail_item_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.dispose_request_table
    ADD CONSTRAINT fk_dispose_request_status
    FOREIGN KEY (dispose_request_status_id)
    REFERENCES status_schema.dispose_request_status_table(dispose_request_status_id)
    ON DELETE RESTRICT;

-- Retrieval Request Foreign Keys
ALTER TABLE request_schema.retrieval_request_table
    ADD CONSTRAINT fk_retrieval_request_account
    FOREIGN KEY (retrieval_request_account_id)
    REFERENCES user_schema.account_table(account_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.retrieval_request_table
    ADD CONSTRAINT fk_retrieval_request_mail_item
    FOREIGN KEY (retrieval_request_mail_item_id)
    REFERENCES mailroom_schema.mail_item_table(mail_item_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.retrieval_request_table
    ADD CONSTRAINT fk_retrieval_request_status
    FOREIGN KEY (retrieval_request_status_id)
    REFERENCES status_schema.retrieval_request_status_table(retrieval_request_status_id)
    ON DELETE RESTRICT;

-- Pickup Request Foreign Keys
ALTER TABLE request_schema.pickup_request_table
    ADD CONSTRAINT fk_pickup_request_account
    FOREIGN KEY (pickup_request_account_id)
    REFERENCES user_schema.account_table(account_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.pickup_request_table
    ADD CONSTRAINT fk_pickup_request_mail_item
    FOREIGN KEY (pickup_request_mail_item_id)
    REFERENCES mailroom_schema.mail_item_table(mail_item_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.pickup_request_table
    ADD CONSTRAINT fk_pickup_request_status
    FOREIGN KEY (pickup_request_status_id)
    REFERENCES status_schema.pickup_request_status_table(pickup_request_status_id)
    ON DELETE RESTRICT;

-- Account Foreign Keys
ALTER TABLE user_schema.account_table
    ADD CONSTRAINT fk_account_user
    FOREIGN KEY (account_user_id)
    REFERENCES user_schema.user_table(user_id)
    ON DELETE CASCADE;

ALTER TABLE user_schema.account_table
    ADD CONSTRAINT fk_account_type
    FOREIGN KEY (account_type)
    REFERENCES user_schema.account_type_table(account_type_id)
    ON DELETE RESTRICT;

-- User Role Foreign Keys
ALTER TABLE user_schema.user_table
    ADD CONSTRAINT fk_user_role
    FOREIGN KEY (user_role)
    REFERENCES user_schema.user_role_table(user_role_id)
    ON DELETE RESTRICT;

-- Virtual Address Foreign Keys
ALTER TABLE mailroom_schema.virtual_address_table
    ADD CONSTRAINT fk_virtual_address_account
    FOREIGN KEY (virtual_address_account_id)
    REFERENCES user_schema.account_table(account_id)
    ON DELETE CASCADE;

ALTER TABLE mailroom_schema.virtual_address_table
    ADD CONSTRAINT fk_virtual_address_status
    FOREIGN KEY (virtual_address_status_id)
    REFERENCES status_schema.virtual_address_status_table(virtual_address_status_id)
    ON DELETE RESTRICT;

-- Error Foreign Keys
ALTER TABLE analytics_schema.error_table
    ADD CONSTRAINT fk_error_user
    FOREIGN KEY (error_user_id)
    REFERENCES user_schema.user_table(user_id)
    ON DELETE SET NULL;

-- Scan Request Foreign Keys
ALTER TABLE request_schema.scan_request_table
    ADD CONSTRAINT fk_scan_request_mail_item
    FOREIGN KEY (scan_request_mail_item_id)
    REFERENCES mailroom_schema.mail_item_table(mail_item_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.scan_request_table
    ADD CONSTRAINT fk_scan_request_account
    FOREIGN KEY (scan_request_account_id)
    REFERENCES user_schema.account_table(account_id)
    ON DELETE CASCADE;

ALTER TABLE request_schema.scan_request_table
    ADD CONSTRAINT fk_scan_request_status
    FOREIGN KEY (scan_request_status_id)
    REFERENCES status_schema.scan_request_status_table(scan_request_status_id)
    ON DELETE RESTRICT;

-- Referral Foreign Keys
ALTER TABLE referral_schema.referral_invitation_table
    ADD CONSTRAINT fk_referral_invitation_sender_user
    FOREIGN KEY (referral_invitation_sender_user_id)
    REFERENCES user_schema.user_table(user_id)
    ON DELETE CASCADE;

ALTER TABLE referral_schema.referral_invitation_table
    ADD CONSTRAINT fk_referral_invitation_accepted_user
    FOREIGN KEY (referral_invitation_accepted_user_id)
    REFERENCES user_schema.user_table(user_id)
    ON DELETE SET NULL;

ALTER TABLE referral_schema.referral_invitation_table
    ADD CONSTRAINT fk_referral_invitation_status
    FOREIGN KEY (referral_invitation_status_id)
    REFERENCES status_schema.referral_status_table(referral_status_id)
    ON DELETE RESTRICT;

ALTER TABLE referral_schema.referral_reward_table
    ADD CONSTRAINT fk_referral_reward_invitation
    FOREIGN KEY (referral_reward_invitation_id)
    REFERENCES referral_schema.referral_invitation_table(referral_invitation_id)
    ON DELETE CASCADE;