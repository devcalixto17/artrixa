import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { BanChecker } from "@/components/auth/BanChecker";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Downloads from "./pages/Downloads";
import DownloadDetail from "./pages/DownloadDetail";
import CreateDownload from "./pages/CreateDownload";
import EditDownload from "./pages/EditDownload";
import PendingDownloads from "./pages/PendingDownloads";
import Category from "./pages/Category";
import NotFound from "./pages/NotFound";
import Banned from "./pages/Banned";
import Skins from "./pages/Skins";
import VipArea from "./pages/VipArea";

const queryClient = new QueryClient();


import { SupportWidget } from "@/components/support/SupportWidget";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BanChecker>
            <ThemeSwitcher />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/download/:id" element={<DownloadDetail />} />
              <Route path="/downloads/new" element={<CreateDownload />} />
              <Route path="/downloads/edit/:id" element={<EditDownload />} />
              <Route path="/downloads/pending" element={<PendingDownloads />} />
              <Route path="/categoria/:slug" element={<Category />} />
              <Route path="/banned" element={<Banned />} />
              <Route path="/skins" element={<Skins />} />
              <Route path="/vip" element={<VipArea />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SupportWidget />
          </BanChecker>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;