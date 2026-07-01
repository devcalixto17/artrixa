import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export const Layout = ({ children, showSidebar = true }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col gradient-dark overflow-x-hidden">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {showSidebar ? (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">{children}</div>
            <Sidebar />
          </div>
        ) : (
          children
        )}
      </main>
      <Footer />
    </div>
  );
};
