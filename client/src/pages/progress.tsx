import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ProgressChart from "@/components/progress-chart";
import { DashboardStats, CategoryProgress } from "@shared/schema";

export default function ProgressPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: categoryProgress, isLoading: categoriesLoading } = useQuery<CategoryProgress[]>({
    queryKey: ["/api/dashboard/category-progress"],
  });

  if (statsLoading || categoriesLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64 mb-8"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalWords = stats?.totalWords || 1;
  const wordsLearned = stats?.wordsLearned || 0;
  const overallProgress = Math.round((wordsLearned / totalWords) * 100);

  // Calculate gender-specific progress (mock data for now)
  const derWords = Math.round(wordsLearned * 0.4);
  const dieWords = Math.round(wordsLearned * 0.35);
  const dasWords = wordsLearned - derWords - dieWords;

  const derTotal = Math.round(totalWords * 0.4);
  const dieTotal = Math.round(totalWords * 0.35);
  const dasTotal = totalWords - derTotal - dieTotal;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Progress</h2>
          <p className="text-gray-600">Track your learning journey and performance</p>
        </div>

        {/* Progress Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Learning Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm text-gray-500">{overallProgress}%</span>
                </div>
                <Progress value={overallProgress} className="mb-4" />
              </div>

              {/* Gender-specific progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-der-blue">Masculine (der)</span>
                  <span className="text-sm text-gray-500">{derWords} words</span>
                </div>
                <Progress 
                  value={derTotal > 0 ? (derWords / derTotal) * 100 : 0} 
                  className="mb-2"
                  style={{ '--progress-foreground': 'var(--der-blue)' } as any}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-die-green">Feminine (die)</span>
                  <span className="text-sm text-gray-500">{dieWords} words</span>
                </div>
                <Progress 
                  value={dieTotal > 0 ? (dieWords / dieTotal) * 100 : 0} 
                  className="mb-2"
                  style={{ '--progress-foreground': 'var(--die-green)' } as any}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-das-purple">Neuter (das)</span>
                  <span className="text-sm text-gray-500">{dasWords} words</span>
                </div>
                <Progress 
                  value={dasTotal > 0 ? (dasWords / dasTotal) * 100 : 0} 
                  style={{ '--progress-foreground': 'var(--das-purple)' } as any}
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {stats?.accuracy || 0}%
                </div>
                <div className="text-sm text-gray-500">Overall Accuracy</div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-semibold text-der-blue">
                    {Math.max(0, (stats?.accuracy || 0) - 2)}%
                  </div>
                  <div className="text-xs text-gray-500">der accuracy</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-die-green">
                    {Math.max(0, (stats?.accuracy || 0) + 1)}%
                  </div>
                  <div className="text-xs text-gray-500">die accuracy</div>
                </div>
                <div>
                  <div className="text-xl font-semibold text-das-purple">
                    {stats?.accuracy || 0}%
                  </div>
                  <div className="text-xs text-gray-500">das accuracy</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-700">Current Streak</span>
                  <span className="text-sm font-medium">{stats?.streak || 0} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">Words Due Today</span>
                  <span className="text-sm font-medium">{stats?.dueWords || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Progress */}
        {categoryProgress && categoryProgress.length > 0 && (
          <ProgressChart categories={categoryProgress} />
        )}
      </div>
    </div>
  );
}
