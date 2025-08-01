import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Brain, Target, Clock, CheckCircle, RotateCcw, Star } from "lucide-react";
import { Link } from "wouter";
import { DashboardStats, LearningSession } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentSessions, isLoading: sessionsLoading } = useQuery<LearningSession[]>({
    queryKey: ["/api/sessions"],
    queryFn: async () => {
      const response = await fetch("/api/sessions?limit=5", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json();
    },
  });

  if (statsLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow">
                  <div className="h-12 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-gray-600">Ready to continue your German B1 journey?</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Flame className="h-8 w-8 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Current Streak</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.streak || 0} days
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Words Learned</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.wordsLearned || 0} / {stats?.totalWords || 0}
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="h-8 w-8 text-secondary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Accuracy</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.accuracy || 0}%
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">Due for Review</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.dueWords || 0} words
                  </dd>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-primary to-blue-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">Learn New Words</h3>
              <p className="text-blue-100 mb-4">Interactive learning with fill-in-the-blank exercises</p>
              <Link href="/learn">
                <Button className="bg-white text-primary hover:bg-blue-50">
                  Start Learning
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-secondary to-green-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">Review Due Words</h3>
              <p className="text-green-100 mb-4">Practice words scheduled for review</p>
              <Link href="/review">
                <Button className="bg-white text-secondary hover:bg-green-50">
                  Start Review
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">Practice Learned Words</h3>
              <p className="text-purple-100 mb-4">Review your learned vocabulary anytime</p>
              <Link href="/practice">
                <Button className="bg-white text-purple-600 hover:bg-purple-50">
                  Start Practice
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        session.type === "learn" ? "bg-primary" : "bg-secondary"
                      }`}>
                        {session.type === "learn" ? (
                          <Brain className="h-4 w-4 text-white" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {session.type === "learn" 
                          ? `Learned ${session.wordsCount} new words`
                          : `Reviewed ${session.wordsCount} words with ${Math.round((session.correctAnswers || 0) / Math.max(session.totalAnswers || 1, 1) * 100)}% accuracy`
                        }
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(session.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity. Start learning to see your progress here!</p>
                <Link href="/learn">
                  <Button className="mt-4">Start Your First Session</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
