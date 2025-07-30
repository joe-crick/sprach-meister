import { CategoryProgress } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressChartProps {
  categories: CategoryProgress[];
}

export default function ProgressChart({ categories }: ProgressChartProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-blue-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.category} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{category.category}</h4>
                <span className="text-sm text-gray-500">
                  {category.learned}/{category.total}
                </span>
              </div>
              <Progress 
                value={category.percentage} 
                className="mb-2"
              />
              <p className="text-sm text-gray-600">{category.percentage}% complete</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
