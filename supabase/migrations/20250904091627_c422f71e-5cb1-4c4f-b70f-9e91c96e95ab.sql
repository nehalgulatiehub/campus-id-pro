-- Create RLS policies for student-photos storage bucket
-- Allow schools to upload photos for their own students
CREATE POLICY "Schools can upload student photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'student-photos' 
  AND (
    get_user_role(auth.uid()) = 'admin'::user_role 
    OR (
      get_user_role(auth.uid()) = 'school'::user_role 
      AND (storage.foldername(name))[1] = get_user_school(auth.uid())::text
    )
  )
);

-- Allow schools to view photos for their own students
CREATE POLICY "Schools can view their student photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'student-photos' 
  AND (
    get_user_role(auth.uid()) = 'admin'::user_role 
    OR (
      get_user_role(auth.uid()) = 'school'::user_role 
      AND (storage.foldername(name))[1] = get_user_school(auth.uid())::text
    )
  )
);

-- Allow schools to update photos for their own students
CREATE POLICY "Schools can update their student photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'student-photos' 
  AND (
    get_user_role(auth.uid()) = 'admin'::user_role 
    OR (
      get_user_role(auth.uid()) = 'school'::user_role 
      AND (storage.foldername(name))[1] = get_user_school(auth.uid())::text
    )
  )
);

-- Allow schools to delete photos for their own students
CREATE POLICY "Schools can delete their student photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'student-photos' 
  AND (
    get_user_role(auth.uid()) = 'admin'::user_role 
    OR (
      get_user_role(auth.uid()) = 'school'::user_role 
      AND (storage.foldername(name))[1] = get_user_school(auth.uid())::text
    )
  )
);