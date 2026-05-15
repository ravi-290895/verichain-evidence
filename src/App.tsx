import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import UploadEvidence from "./pages/UploadEvidence";
import VerifyEvidence from "./pages/VerifyEvidence";
import Registry from "./pages/Registry";
import EvidenceDetail from "./pages/EvidenceDetail";
import AuditLog from "./pages/AuditLog";
import AdminUsers from "./pages/AdminUsers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />

            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={
                <ProtectedRoute roles={["officer", "admin"]}><UploadEvidence /></ProtectedRoute>
              } />
              <Route path="/verify" element={<VerifyEvidence />} />
              <Route path="/registry" element={<Registry />} />
              <Route path="/evidence/:id" element={<EvidenceDetail />} />
              <Route path="/audit" element={
                <ProtectedRoute roles={["judge", "admin"]}><AuditLog /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute roles={["admin"]}><AdminUsers /></ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
