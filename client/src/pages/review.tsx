import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VocabularyWordWithProgress, UserSettings } from "@shared/schema";
import ReviewExercise from "@/components/review-exercise";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateNextReview, getNextReviewDate, getQualityFromAccuracy } from "@/lib/spaced-repetition";

export default function Review() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [currentAnswered, setCurrentAnswered] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Check if we're in "all words" mode
  const isAllWordsMode = location.includes("mode=all");

  // First fetch user settings to get reviewSessionSize
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  const { data: wordsForReview, isLoading } = useQuery<VocabularyWordWithProgress[]>({
    queryKey: ["/api/words/for-review", settings?.reviewSessionSize, isAllWordsMode],
    queryFn: async () => {
      const limit = settings?.reviewSessionSize || 25;
      
      // For "practice all learned words" mode, use endpoint that shows all learned words
      // For regular review, use endpoint that shows only due words
      const endpoint = isAllWordsMode 
        ? `/api/vocabulary/all-words-for-review?limit=${limit}`
        : `/api/words/for-review?limit=${limit}`;
        
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch words for review");
      return response.json();
    },
    enabled: !!settings, // Only run this query after settings are loaded
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/sessions", {
        type: "review",
        wordsCount: wordsForReview?.length || 0,
        userId: "default_user"
      });
      return response.json();
    },
    onSuccess: (session) => {
      setSessionId(session.id);
    }
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ progressId, updates }: { progressId: string; updates: any }) => {
      const response = await apiRequest("PUT", `/api/progress/${progressId}`, updates);
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
    if (wordsForReview && wordsForReview.length > 0 && !sessionId) {
      createSessionMutation.mutate();
    }
  }, [wordsForReview]);

  const handleAnswer = async (correct: boolean, selectedAnswer: string) => {
    if (!wordsForReview || currentAnswered) return;

    setCurrentAnswered(true);
    const newTotalAnswers = totalAnswers + 1;
    const newCorrectAnswers = correct ? correctAnswers + 1 : correctAnswers;
    
    setTotalAnswers(newTotalAnswers);
    setCorrectAnswers(newCorrectAnswers);

    const currentWord = wordsForReview[currentWordIndex];
    if (currentWord.progress) {
      const quality = getQualityFromAccuracy(correct);
      const nextReview = calculateNextReview(
        currentWord.progress.interval || 1,
        currentWord.progress.easeFactor || 250,
        currentWord.progress.level || 1,
        quality
      );

      const updates = {
        level: nextReview.level,
        correctCount: currentWord.progress.correctCount + (correct ? 1 : 0),
        incorrectCount: currentWord.progress.incorrectCount + (correct ? 0 : 1),
        lastReviewed: new Date().toISOString(),
        nextReview: getNextReviewDate(nextReview.interval).toISOString(),
        easeFactor: nextReview.easeFactor,
        interval: nextReview.interval
      };

      await updateProgressMutation.mutateAsync({
        progressId: currentWord.progress.id,
        updates
      });
    }
  };

  const handleNext = async () => {
    if (!wordsForReview) return;

    setCurrentAnswered(false);

    if (currentWordIndex < wordsForReview.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    } else {
      // Round complete
      const duration = Math.round((Date.now() - sessionStartTime) / 1000 / 60);
      await updateSessionMutation.mutateAsync({
        completed: true,
        duration,
        correctAnswers,
        totalAnswers
      });

      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
      toast({
        title: `Round ${currentRound} Complete!`,
        description: `You scored ${accuracy}% accuracy on ${totalAnswers} questions. Ready for another round?`,
      });

      // Reset for next round but keep the session going
      setCurrentRound(currentRound + 1);
      setCurrentWordIndex(0);
      setCorrectAnswers(0);
      setTotalAnswers(0);
      
      // Invalidate and refetch words for a new randomized set
      queryClient.invalidateQueries({ queryKey: ["/api/words/for-review"] });
    }
  };

  const startNewSession = () => {
    // Force refetch of words for a fresh session
    queryClient.invalidateQueries({ queryKey: ["/api/words/for-review"] });
    setCurrentWordIndex(0);
    setCorrectAnswers(0);
    setTotalAnswers(0);
    setCurrentRound(1);
    setSessionId(null);
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
              <p className="text-gray-600">Preparing your review session...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!wordsForReview || wordsForReview.length === 0) {
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Words Due for Review</h2>
            <p className="text-gray-600 mb-6">
              {isAllWordsMode 
                ? "No words available for practice. Add some vocabulary first!"
                : "Excellent! You're all caught up with your reviews. Come back later or start learning new words."
              }
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

  const currentWord = wordsForReview[currentWordIndex];
  const progress = ((currentWordIndex + 1) / wordsForReview.length) * 100;

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
                Question {currentWordIndex + 1} of {wordsForReview.length}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {isAllWordsMode ? "Practice Session" : "Review Session"}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="progress-bar bg-secondary" />
          </div>

          {/* Review Exercise */}
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
