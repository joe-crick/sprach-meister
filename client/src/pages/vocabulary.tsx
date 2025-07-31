import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { VocabularyWordWithProgress } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Brain, Search, Edit, PlayCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import AddWordModal from "@/components/add-word-modal";
import { generateVocabulary, processCsvFile } from "@/lib/openai";
import { GermanWordAudioButton } from "@/components/audio-button";

export default function Vocabulary() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: vocabulary, isLoading } = useQuery<VocabularyWordWithProgress[]>({
    queryKey: ["/api/vocabulary"],
    queryFn: async () => {
      const response = await fetch("/api/vocabulary", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch vocabulary");
      return response.json();
    },
  });

  const uploadCsvMutation = useMutation({
    mutationFn: async (file: File) => {
      return await processCsvFile(file);
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/vocabulary"] });
        toast({
          title: "Success",
          description: result.message,
        });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload CSV file",
        variant: "destructive",
      });
    }
  });

  const generateVocabularyMutation = useMutation({
    mutationFn: async (data: { topic: string; count: number }) => {
      const response = await fetch("/api/vocabulary/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate vocabulary");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vocabulary"] });
      toast({
        title: "Success",
        description: data.message,
      });
      setIsGenerating(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate vocabulary with AI",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === "text/csv") {
      uploadCsvMutation.mutate(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAiGeneration = async () => {
    const topic = prompt("What topic would you like to generate vocabulary for?");
    if (!topic) return;

    const countStr = prompt("How many words would you like to generate? (1-20)", "10");
    const count = parseInt(countStr || "10");
    
    if (isNaN(count) || count < 1 || count > 20) {
      toast({
        title: "Error",
        description: "Please enter a valid number between 1 and 20",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateVocabularyMutation.mutate({ topic, count });
  };

  const getGenderColor = (article: string) => {
    switch (article) {
      case "der": return "der-blue";
      case "die": return "die-green";
      case "das": return "das-purple";
      default: return "der-blue";
    }
  };

  const getGenderLabel = (article: string) => {
    switch (article) {
      case "der": return "masculine";
      case "die": return "feminine";
      case "das": return "neuter";
      default: return "masculine";
    }
  };

  const getDaysUntilReview = (nextReview: string | null | undefined): string => {
    if (!nextReview) return "Not scheduled";
    
    const reviewDate = new Date(nextReview);
    const now = new Date();
    const diffTime = reviewDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Due now";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `${diffDays} days`;
  };

  // Filter vocabulary based on search and filters
  const filteredVocabulary = vocabulary?.filter(word => {
    const matchesSearch = searchTerm === "" || 
      word.german.toLowerCase().includes(searchTerm.toLowerCase()) ||
      word.english.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGender = genderFilter === "all" || word.article === genderFilter;
    const matchesCategory = categoryFilter === "all" || word.category === categoryFilter;
    
    return matchesSearch && matchesGender && matchesCategory;
  }) || [];

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(vocabulary?.map(w => w.category) || []));

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="space-y-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Vocabulary Management</h2>
          <p className="text-gray-600">Manage your vocabulary lists and add new words</p>
        </div>

        {/* Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={() => setShowAddModal(true)}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Word
              </Button>
              
              <div className="flex-1">
                <Label 
                  htmlFor="csv-upload" 
                  className="flex flex-col items-center justify-center w-full h-12 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Upload className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-500 font-medium">
                      {uploadCsvMutation.isPending ? "Uploading..." : "Upload CSV File"}
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="csv-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={uploadCsvMutation.isPending}
                  />
                </Label>
              </div>

              <Button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/api/template/vocabulary-csv';
                  link.download = 'vocabulary-template.csv';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast({
                    title: "Template Downloaded",
                    description: "Use this CSV template to upload your vocabulary.",
                  });
                }}
                variant="outline"
                className="flex-1"
              >
                <Upload className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>

              <Button 
                onClick={handleAiGeneration}
                disabled={isGenerating}
                className="flex-1 bg-secondary hover:bg-secondary/90"
              >
                <Brain className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "AI Word Discovery"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search vocabulary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="der">der (masculine)</SelectItem>
                  <SelectItem value="die">die (feminine)</SelectItem>
                  <SelectItem value="das">das (neuter)</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Continue Learning Section */}
        {filteredVocabulary.length > 0 && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Learn?</h3>
                  <p className="text-gray-600">You have {filteredVocabulary.length} words in your vocabulary. Start practicing!</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => navigate("/learn")}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Start Learning
                  </Button>
                  <Button 
                    onClick={() => navigate("/review")}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Review Due Words
                  </Button>
                  <Button 
                    onClick={() => navigate("/review?mode=all")}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Practice All Words
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vocabulary Table */}
        <Card>
          <CardHeader>
            <CardTitle>Vocabulary List ({filteredVocabulary.length} words)</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredVocabulary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Word
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Translation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Progress
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Next Review
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVocabulary.map((word) => {
                      const genderColor = getGenderColor(word.article);
                      const accuracyRate = word.accuracyRate || 0;
                      
                      return (
                        <tr key={word.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span 
                                className={cn("gender-badge mr-2", word.article)}
                                style={{ backgroundColor: `var(--${genderColor})` }}
                              >
                                {word.article}
                              </span>
                              <span className="text-sm font-medium text-gray-900 mr-2">
                                {word.german}
                              </span>
                              <GermanWordAudioButton 
                                german={word.german} 
                                article={word.article}
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {word.english}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {word.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${accuracyRate}%`,
                                    backgroundColor: accuracyRate >= 80 ? 'var(--secondary)' : 
                                                   accuracyRate >= 60 ? 'var(--primary)' : '#eab308'
                                  }}
                                />
                              </div>
                              <span className="text-sm text-gray-500">
                                {Math.round(accuracyRate)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getDaysUntilReview(word.progress?.nextReview || null)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">No vocabulary words found</div>
                <Button onClick={() => setShowAddModal(true)}>
                  Add Your First Word
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Word Modal */}
        <AddWordModal 
          open={showAddModal} 
          onClose={() => setShowAddModal(false)} 
        />
      </div>
    </div>
  );
}
