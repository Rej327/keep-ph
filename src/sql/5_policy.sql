-- --------------------------------------------------------
-- POLICIES FOR "KEEP-PH-DOCUMENTS" BUCKET
-- --------------------------------------------------------
CREATE POLICY "KEEP-PH-DOCUMENTS: Allow authenticated uploads" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'KEEP-PH-DOCUMENTS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "KEEP-PH-DOCUMENTS: Allow public downloads" ON storage.objects
FOR SELECT
USING (bucket_id = 'KEEP-PH-DOCUMENTS');

CREATE POLICY "KEEP-PH-DOCUMENTS: Allow users to delete their own files" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'KEEP-PH-DOCUMENTS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "KEEP-PH-DOCUMENTS: Allow users to update their own files" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'KEEP-PH-DOCUMENTS'
  AND auth.role() = 'authenticated'
);

-- --------------------------------------------------------
-- POLICIES FOR "USER-AVATARS" BUCKET
-- --------------------------------------------------------
CREATE POLICY "USER-AVATARS: Allow authenticated uploads" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'USER-AVATARS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "USER-AVATARS: Allow authenticated view" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'USER-AVATARS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "USER-AVATARS: Allow authenticated delete" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'USER-AVATARS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "USER-AVATARS: Allow authenticated update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'USER-AVATARS'
  AND auth.role() = 'authenticated'
);

-- --------------------------------------------------------
-- POLICIES FOR "KEEP-PH-ATTACHMENTS" BUCKET
-- --------------------------------------------------------
CREATE POLICY "KEEP-PH-ATTACHMENTS: Allow authenticated uploads" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'KEEP-PH-ATTACHMENTS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "KEEP-PH-ATTACHMENTS: Allow public downloads" ON storage.objects
FOR SELECT
USING (bucket_id = 'KEEP-PH-ATTACHMENTS');

CREATE POLICY "KEEP-PH-ATTACHMENTS: Allow users to delete their own files" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'KEEP-PH-ATTACHMENTS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "KEEP-PH-ATTACHMENTS: Allow users to update their own files" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'KEEP-PH-ATTACHMENTS'
  AND auth.role() = 'authenticated'
);

-- --------------------------------------------------------
-- POLICIES FOR "USER-KYC-DOCUMENTS" BUCKET
-- --------------------------------------------------------
CREATE POLICY "USER-KYC-DOCUMENTS: Allow authenticated uploads" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'USER-KYC-DOCUMENTS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "USER-KYC-DOCUMENTS: Allow authenticated view" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'USER-KYC-DOCUMENTS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "USER-KYC-DOCUMENTS: Allow authenticated delete" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'USER-KYC-DOCUMENTS'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "USER-KYC-DOCUMENTS: Allow authenticated update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'USER-KYC-DOCUMENTS'
  AND auth.role() = 'authenticated'
);
