import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Home, Brain, RotateCcw, TrendingUp, Book, FileText, GraduationCap, PenTool, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { UserSettings } from "@shared/schema";
import { useTranslation, Language } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function MobileNav() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch user settings to determine language
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  const currentLanguage = (settings?.language as Language) || 'english';
  const { t } = useTranslation(currentLanguage);

  // Navigation items with translations
  const navigation = [
    { name: t.dashboard, href: "/", icon: Home },
    { name: t.learn, href: "/learn", icon: Brain },
    { name: t.review, href: "/review", icon: RotateCcw },
    { name: t.progress, href: "/progress", icon: TrendingUp },
    { name: t.vocabulary, href: "/vocabulary", icon: Book },
    { name: t.verbs, href: "/verbs", icon: FileText },
    { name: t.grammar, href: "/grammar", icon: GraduationCap },
    { name: t.sentencePractice || "Sentence Practice", href: "/sentence-practice", icon: PenTool },
    { name: t.settings, href: "/settings", icon: Settings },
  ];

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-900">{t.dashboardTitle}</h1>
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="right" className="w-80 p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="text-left">{t.dashboardTitle}</SheetTitle>
          </SheetHeader>
          
          <nav className="p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link key={item.name} href={item.href}>
                  <a
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 h-5 w-5",
                        isActive
                          ? "text-white"
                          : "text-gray-500"
                      )}
                    />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}