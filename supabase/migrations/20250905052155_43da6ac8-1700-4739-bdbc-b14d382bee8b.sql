-- Add new user role option for editors
ALTER TYPE user_role ADD VALUE 'editor';

-- Create table for Excel import tracking
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  successful_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  errors TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on import logs
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for import logs
CREATE POLICY "Admins can view all import logs" 
ON public.import_logs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

CREATE POLICY "Users can view their own import logs" 
ON public.import_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create import logs" 
ON public.import_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);