import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { SchoolDashboard } from "@/components/dashboard/SchoolDashboard";
import { toast } from "sonner";

const Dashboard = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from("user_profiles")
          .select(`
            *,
            school:schools(
              id,
              name,
              code,
              block:blocks(
                name,
                district:districts(
                  name,
                  state:states(name)
                )
              )
            )
          `)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching user profile:", error);
          toast.error("Error loading profile");
        } else if (data) {
          setUserProfile(data);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {userProfile?.role === 'admin' ? (
        <AdminDashboard />
      ) : userProfile?.role === 'school' ? (
        <SchoolDashboard userProfile={userProfile} />
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">Profile Setup Required</h2>
          <p className="text-muted-foreground">
            Your account needs to be set up by an administrator before you can access the dashboard.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Dashboard;