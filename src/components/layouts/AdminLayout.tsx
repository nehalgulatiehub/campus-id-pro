import { useState, useEffect } from "react";
import { Outlet, useLocation, NavLink, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Building2, 
  MapPin, 
  Map, 
  School, 
  Users, 
  Menu,
  X,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />
  },
  {
    title: "States",
    href: "/dashboard/states",
    icon: <Map className="h-4 w-4" />
  },
  {
    title: "Districts",
    href: "/dashboard/districts",
    icon: <MapPin className="h-4 w-4" />
  },
  {
    title: "Blocks",
    href: "/dashboard/blocks",
    icon: <Building2 className="h-4 w-4" />
  },
  {
    title: "Schools",
    href: "/dashboard/schools",
    icon: <School className="h-4 w-4" />
  },
  {
    title: "Students",
    href: "/dashboard/students",
    icon: <Users className="h-4 w-4" />
  }
];

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        toast.error('Error checking permissions');
        setLoading(false);
        return;
      }

      setUserRole(profile?.role || null);
    } catch (error) {
      console.error('Error checking user role:', error);
      toast.error('Error checking permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <LoadingState message="Checking permissions..." />;
  }

  if (userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Admin Panel</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === "/dashboard"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.title}
              </NavLink>
            ))}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <div></div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};