import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VocabularyWordWithProgress, UserSettings } from "@shared/schema";
import ReviewExercise from "@/components/review-exercise";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Practice() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get user settings for session size
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Get learned words for practice
  const { data: learnedWords, isLoading } = useQuery<VocabularyWordWithProgress[]>({
    queryKey: ["/api/practice-words", settings?.reviewSessionSize],
    queryFn: async () => {
      const limit = settings?.reviewSessionSize || 25;
      const response = await fetch(`/api/vocabulary/all-words-for-review?userId=default_user&limit=${limit}`, { 
        credentials: "include" 
      });
      if (!response.ok) throw new Error("Failed to fetch learned words");
      return response.json();
    },
    enabled: !!settings,
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sessions", {
        type: "practice",
        wordsCount: learnedWords?.length || 0,
        userId: "default_user"
      });
      return response.json();
    },
    onSuccess: (session) => {
      setSessionId(session.id);
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ wordId, correct }: { wordId: string; correct: boolean }) => {
      const response = await apiRequest("POST", `/api/progress/word/${wordId}`, {
        userId: "default_user",
        correct
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

  // Create session when words are loaded
  useEffect(() => {
    if (learnedWords && learnedWords.length > 0 && !sessionId) {
      createSessionMutation.mutate();
    }
  }, [learnedWords, sessionId]);

  const handleAnswer = (correct: boolean, userAnswer: string) => {
    const newCorrectAnswers = correct ? correctAnswers + 1 : correctAnswers;
    const newTotalAnswers = totalAnswers + 1;
    
    setCorrectAnswers(newCorrectAnswers);
    setTotalAnswers(newTotalAnswers);

    if (learnedWords && learnedWords.length > 0) {
      const currentWord = learnedWords[currentWordIndex];
      updateProgressMutation.mutate({ 
        wordId: currentWord.id, 
        correct 
      });
    }
  };

  const handleNext = () => {
    if (currentWordIndex < (learnedWords?.length || 0) - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      // Session completed
      const duration = Math.round((Date.now() - sessionStartTime) / 60000);
      updateSessionMutation.mutate({
        correctAnswers,
        totalAnswers,
        duration,
        completed: true
      });
      
      setIsCompleted(true);
      
      toast({
        title: "Practice Complete!",
        description: `You got ${correctAnswers} out of ${totalAnswers} answers correct.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/practice-words"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your learned words...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!learnedWords || learnedWords.length === 0) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Words Available for Practice</h2>
            <p className="text-gray-600 mb-6">
              You haven't learned any words yet. Start by learning some vocabulary first, then come back here to practice!
            </p>
            <div className="space-x-4">
              <Link href="/learn">
                <Button>Learn New Words</Button>
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

  if (isCompleted) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Practice Session Complete!</h2>
            <p className="text-gray-600 mb-6">
              Great job! You scored {correctAnswers} out of {totalAnswers} correct ({Math.round((correctAnswers / totalAnswers) * 100)}%).
            </p>
            <div className="space-x-4">
              <Link href="/practice">
                <Button>Practice Again</Button>
              </Link>
              <Link href="/learn">
                <Button variant="outline">Learn New Words</Button>
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

  const currentWord = learnedWords[currentWordIndex];
  const progress = ((currentWordIndex + 1) / learnedWords.length) * 100;

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
                Question {currentWordIndex + 1} of {learnedWords.length}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Practice Session
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="progress-bar bg-secondary" />
          </div>

          {/* Practice Exercise */}
          <ReviewExercise 
            word={currentWord} 
            onAnswer={handleAnswer}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  );
}