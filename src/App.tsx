import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { StatesPage } from "@/pages/admin/StatesPage";
import { DistrictsPage } from "@/pages/admin/DistrictsPage";
import { BlocksPage } from "@/pages/admin/BlocksPage";
import { SchoolsPage } from "@/pages/admin/SchoolsPage";
import { StudentsPage } from "@/pages/admin/StudentsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="states" element={<StatesPage />} />
            <Route path="districts" element={<DistrictsPage />} />
            <Route path="blocks" element={<BlocksPage />} />
            <Route path="schools" element={<SchoolsPage />} />
            <Route path="students" element={<StudentsPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
