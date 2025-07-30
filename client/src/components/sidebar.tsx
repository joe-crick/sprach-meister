import { Link, useLocation } from "wouter";
import { Home, Brain, RotateCcw, TrendingUp, Book, FileText, GraduationCap, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Learn", href: "/learn", icon: Brain },
  { name: "Review", href: "/review", icon: RotateCcw },
  { name: "Progress", href: "/progress", icon: TrendingUp },
  { name: "Vocabulary", href: "/vocabulary", icon: Book },
  { name: "Verbs", href: "/verbs", icon: FileText },
  { name: "Grammar", href: "/grammar", icon: GraduationCap },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center flex-shrink-0 px-4 py-5">
          <h1 className="text-xl font-bold text-gray-900">German B1 Trainer</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 pb-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "sidebar-link group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    isActive
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive
                        ? "text-white"
                        : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.name}
                </a>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
