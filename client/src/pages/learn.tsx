import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VocabularyWordWithProgress } from "@shared/schema";
import LearnExercise from "@/components/learn-exercise";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, Home } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Learn() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: wordsForLearning, isLoading } = useQuery<VocabularyWordWithProgress[]>({
    queryKey: ["/api/words/for-learning"],
    queryFn: async () => {
      const response = await fetch("/api/words/for-learning?limit=10", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch words for learning");
      return response.json();
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sessions", {
        type: "learn",
        wordsCount: wordsForLearning?.length || 0,
        userId: "default_user"
      });
      return response.json();
    },
    onSuccess: (session) => {
      setSessionId(session.id);
    }
  });

  const createProgressMutation = useMutation({
    mutationFn: async ({ wordId, correct }: { wordId: string; correct: boolean }) => {
      const response = await apiRequest("POST", "/api/progress", {
        wordId,
        userId: "default_user",
        level: 1,
        correctCount: correct ? 1 : 0,
        incorrectCount: correct ? 0 : 1,
        lastReviewed: new Date().toISOString(),
        nextReview: new Date(Date.now() + (correct ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)).toISOString(), // 1 day if correct, 12 hours if incorrect
        easeFactor: correct ? 250 : 200,
        interval: correct ? 1 : 0
      });
      return response.json();
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!sessionId) return;
      const response = await apiRequest("PUT", `/api/sessions/${sessionId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    }
  });

  // Create session when component mounts and we have words
  useEffect(() => {
    if (wordsForLearning && wordsForLearning.length > 0 && !sessionId) {
      createSessionMutation.mutate();
    }
  }, [wordsForLearning]);

  const handleAnswer = async (correct: boolean, selectedAnswer: string) => {
    if (!wordsForLearning) return;

    const newTotalAnswers = totalAnswers + 1;
    const newCorrectAnswers = correct ? correctAnswers + 1 : correctAnswers;
    
    setTotalAnswers(newTotalAnswers);
    setCorrectAnswers(newCorrectAnswers);

    const currentWord = wordsForLearning[currentWordIndex];
    
    // Create progress record for this word
    await createProgressMutation.mutateAsync({ wordId: currentWord.id, correct });
  };

  const handleNext = async () => {
    if (!wordsForLearning) return;

    if (currentWordIndex < wordsForLearning.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      // Session complete
      const duration = Math.round((Date.now() - sessionStartTime) / 1000 / 60);
      await updateSessionMutation.mutateAsync({
        completed: true,
        duration,
        correctAnswers,
        totalAnswers
      });

      toast({
        title: "Session Complete!",
        description: `You completed ${wordsForLearning.length} words with ${Math.round((correctAnswers/totalAnswers) * 100)}% accuracy. Great job!`,
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
  };

  const handleExit = async () => {
    if (sessionId) {
      const duration = Math.round((Date.now() - sessionStartTime) / 1000 / 60);
      await updateSessionMutation.mutateAsync({
        completed: false,
        duration,
        correctAnswers,
        totalAnswers
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Preparing your learning session...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!wordsForLearning || wordsForLearning.length === 0) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No New Words Available</h2>
            <p className="text-gray-600 mb-6">
              Great job! You've learned all available words. Check back later for more vocabulary or add your own words.
            </p>
            <div className="space-x-4">
              <Link href="/vocabulary">
                <Button>Manage Vocabulary</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = wordsForLearning[currentWordIndex];
  const progress = ((currentWordIndex + 1) / wordsForLearning.length) * 100;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Session Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link href="/" onClick={handleExit}>
                <Button variant="ghost" size="sm">
                  <X className="h-5 w-5" />
                </Button>
              </Link>
              <div className="text-sm text-gray-600">
                Word {currentWordIndex + 1} of {wordsForLearning.length}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Learning Session
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="progress-bar" />
          </div>

          {/* Learning Exercise */}
          <LearnExercise 
            word={currentWord} 
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  );
}
