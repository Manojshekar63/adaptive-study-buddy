
CREATE POLICY "Users read own study notes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'study-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own study notes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'study-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own study notes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'study-notes' AND auth.uid()::text = (storage.foldername(name))[1]);
