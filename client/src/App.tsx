import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Learn from "@/pages/learn";
import Review from "@/pages/review";
import Progress from "@/pages/progress";
import Vocabulary from "@/pages/vocabulary";
import Verbs from "@/pages/verbs";
import Grammar from "@/pages/grammar";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import { useIsMobile } from "@/hooks/use-mobile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/learn" component={Learn} />
      <Route path="/review" component={Review} />
      <Route path="/progress" component={Progress} />
      <Route path="/vocabulary" component={Vocabulary} />
      <Route path="/verbs" component={Verbs} />
      <Route path="/grammar" component={Grammar} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const isMobile = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex bg-gray-50">
          {!isMobile && <Sidebar />}
          <div className="flex-1 lg:pl-64">
            {isMobile && (
              <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h1 className="text-lg font-semibold text-gray-900">German B1 Trainer</h1>
              </div>
            )}
            <Router />
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
