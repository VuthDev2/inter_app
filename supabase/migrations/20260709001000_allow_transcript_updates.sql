CREATE POLICY "Session members can update own transcripts"
  ON public.transcripts FOR UPDATE TO authenticated
  USING (speaker_id = auth.uid() AND public.is_session_member(session_id, auth.uid()))
  WITH CHECK (speaker_id = auth.uid() AND public.is_session_member(session_id, auth.uid()));
