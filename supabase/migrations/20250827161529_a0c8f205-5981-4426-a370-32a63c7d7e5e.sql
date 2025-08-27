-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'school');

-- Create states table
CREATE TABLE public.states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create districts table
CREATE TABLE public.districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID REFERENCES public.states(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(state_id, name),
    UNIQUE(state_id, code)
);

-- Create blocks table
CREATE TABLE public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID REFERENCES public.districts(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(district_id, name),
    UNIQUE(district_id, code)
);

-- Create schools table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(block_id, name)
);

-- Create user_profiles table (for admin and school users)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'school',
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Admin users don't need school_id, but school users must have one
    CONSTRAINT check_school_role CHECK (
        (role = 'admin' AND school_id IS NULL) OR 
        (role = 'school' AND school_id IS NOT NULL)
    )
);

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    srn_no TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class TEXT NOT NULL,
    section TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    photo_url TEXT,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- SRN should be unique within a school
    UNIQUE(school_id, srn_no)
);

-- Enable RLS
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_profiles WHERE user_profiles.user_id = $1;
$$;

-- Create function to get user's school
CREATE OR REPLACE FUNCTION public.get_user_school(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT school_id FROM public.user_profiles WHERE user_profiles.user_id = $1;
$$;

-- RLS Policies for states (readable by all authenticated users)
CREATE POLICY "States are viewable by authenticated users" 
ON public.states FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "States are manageable by admins" 
ON public.states FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for districts
CREATE POLICY "Districts are viewable by authenticated users" 
ON public.districts FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Districts are manageable by admins" 
ON public.districts FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for blocks
CREATE POLICY "Blocks are viewable by authenticated users" 
ON public.blocks FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Blocks are manageable by admins" 
ON public.blocks FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for schools
CREATE POLICY "Schools are viewable by authenticated users" 
ON public.schools FOR SELECT 
TO authenticated USING (true);

CREATE POLICY "Schools are manageable by admins" 
ON public.schools FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles FOR SELECT 
TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" 
ON public.user_profiles FOR SELECT 
TO authenticated USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all profiles" 
ON public.user_profiles FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for students
CREATE POLICY "Schools can manage their own students" 
ON public.students FOR ALL 
TO authenticated 
USING (
    public.get_user_role(auth.uid()) = 'school' AND 
    school_id = public.get_user_school(auth.uid())
);

CREATE POLICY "Admins can view all students" 
ON public.students FOR SELECT 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage all students" 
ON public.students FOR ALL 
TO authenticated 
USING (public.get_user_role(auth.uid()) = 'admin');

-- Create indexes for performance
CREATE INDEX idx_districts_state_id ON public.districts(state_id);
CREATE INDEX idx_blocks_district_id ON public.blocks(district_id);
CREATE INDEX idx_schools_block_id ON public.schools(block_id);
CREATE INDEX idx_students_school_id ON public.students(school_id);
CREATE INDEX idx_students_srn_search ON public.students(srn_no);
CREATE INDEX idx_students_registration_date ON public.students(registration_date);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_school_id ON public.user_profiles(school_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_states_updated_at
    BEFORE UPDATE ON public.states
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_districts_updated_at
    BEFORE UPDATE ON public.districts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at
    BEFORE UPDATE ON public.blocks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample data
INSERT INTO public.states (name, code) VALUES 
('Karnataka', 'KA'),
('Tamil Nadu', 'TN'),
('Maharashtra', 'MH');

INSERT INTO public.districts (state_id, name, code) VALUES 
((SELECT id FROM public.states WHERE code = 'KA'), 'Bangalore Urban', 'BU'),
((SELECT id FROM public.states WHERE code = 'KA'), 'Mysore', 'MY'),
((SELECT id FROM public.states WHERE code = 'TN'), 'Chennai', 'CH');

INSERT INTO public.blocks (district_id, name, code) VALUES 
((SELECT id FROM public.districts WHERE code = 'BU'), 'Bangalore North', 'BN'),
((SELECT id FROM public.districts WHERE code = 'BU'), 'Bangalore South', 'BS'),
((SELECT id FROM public.districts WHERE code = 'MY'), 'Mysore Urban', 'MU');

-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', false);

-- Create storage policies for student photos
CREATE POLICY "Authenticated users can view student photos" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'student-photos');

CREATE POLICY "Schools can upload their students' photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'student-photos' AND
    (public.get_user_role(auth.uid()) = 'admin' OR public.get_user_role(auth.uid()) = 'school')
);

CREATE POLICY "Schools can update their students' photos" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
    bucket_id = 'student-photos' AND
    (public.get_user_role(auth.uid()) = 'admin' OR public.get_user_role(auth.uid()) = 'school')
);

CREATE POLICY "Schools can delete their students' photos" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
    bucket_id = 'student-photos' AND
    (public.get_user_role(auth.uid()) = 'admin' OR public.get_user_role(auth.uid()) = 'school')
);