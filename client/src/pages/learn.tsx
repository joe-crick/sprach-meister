import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VocabularyWordWithProgress } from "@shared/schema";
import InterleavedLearnExercise from "@/components/interleaved-learn-exercise";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { X, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Learn() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [wordQueue, setWordQueue] = useState<Array<{word: VocabularyWordWithProgress, isFirstTime: boolean}>>([]);

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

  // Create session and interleaved word queue when component mounts
  useEffect(() => {
    if (wordsForLearning && wordsForLearning.length > 0 && !sessionId) {
      createSessionMutation.mutate();
      
      // Create Memrise-style interleaved queue
      // Each word appears multiple times throughout the session
      const interleavedQueue = createInterleavedQueue(wordsForLearning);
      setWordQueue(interleavedQueue);
      console.log(`Learning session created with ${wordsForLearning.length} unique words, ${interleavedQueue.length} total exercises`);
    }
  }, [wordsForLearning, sessionId]);

  // Create interleaved queue like Memrise: ensures each word appears multiple times
  const createInterleavedQueue = (words: VocabularyWordWithProgress[]): Array<{word: VocabularyWordWithProgress, isFirstTime: boolean}> => {
    const queue: Array<{word: VocabularyWordWithProgress, isFirstTime: boolean}> = [];
    
    // Memrise-style algorithm: each word appears 4 times
    // 1st time: presentation + test
    // 2nd, 3rd, 4th times: just test (with increasing spacing)
    
    // First, add all words for initial learning (presentation + test)
    words.forEach(word => {
      queue.push({ word, isFirstTime: true });
    });
    
    // Then add review tests with intelligent spacing
    const reviewRounds = 3; // Additional review attempts per word
    
    for (let round = 1; round <= reviewRounds; round++) {
      words.forEach((word, wordIndex) => {
        // Calculate where to insert this review based on spacing algorithm
        // Early reviews come sooner, later reviews have more spacing
        const minGap = Math.max(2, round); // At least 2-3 words between reviews
        const idealPosition = queue.length + (wordIndex * minGap);
        
        // Insert the review test
        queue.splice(Math.min(idealPosition, queue.length), 0, { 
          word, 
          isFirstTime: false 
        });
      });
    }
    
    console.log('Memrise-style queue created:');
    queue.forEach((item, i) => {
      console.log(`${i + 1}: ${item.word.german} (${item.isFirstTime ? 'LEARN' : 'TEST'})`);
    });
    console.log(`Total exercises: ${queue.length}, Unique words: ${words.length}`);
    
    return queue;
  };

  const handleAnswer = (correct: boolean, userAnswer: string) => {
    const newCorrectAnswers = correct ? correctAnswers + 1 : correctAnswers;
    const newTotalAnswers = totalAnswers + 1;
    
    setCorrectAnswers(newCorrectAnswers);
    setTotalAnswers(newTotalAnswers);

    if (wordQueue.length > 0) {
      const currentItem = wordQueue[currentWordIndex];
      createProgressMutation.mutate({ 
        wordId: currentItem.word.id, 
        correct 
      });
    }
  };

  const handleNext = () => {
    if (currentWordIndex < wordQueue.length - 1) {
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
        title: "Session Complete!",
        description: `You got ${correctAnswers} out of ${totalAnswers} answers correct.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/words/for-learning"] });
    }
  };



  if (isLoading || wordQueue.length === 0) {
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

  const handleExit = async () => {
    if (sessionId) {
      const duration = Math.round((Date.now() - sessionStartTime) / 60000);
      await updateSessionMutation.mutateAsync({
        completed: false,
        duration,
        correctAnswers,
        totalAnswers
      });
    }
  };

  // Session completed
  if (isCompleted) {
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
    
    return (
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-3xl font-semibold text-gray-900 mb-4">
              Session Complete!
            </h2>
            <div className="text-lg text-gray-600 mb-6">
              You completed {wordsForLearning?.length || 0} words with {accuracy}% accuracy.
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
                <div className="text-sm text-green-600">Correct</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{totalAnswers - correctAnswers}</div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
            </div>
            <div className="space-x-4">
              <Link href="/review">
                <Button>Practice More</Button>
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

  // Main learning interface with interleaved exercises
  const currentItem = wordQueue[currentWordIndex];
  const progress = ((currentWordIndex + 1) / wordQueue.length) * 100;

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
                Interleaved Learning
              </div>
            </div>
            <div className="text-sm text-gray-600">
              {correctAnswers}/{totalAnswers} correct
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <Progress value={progress} className="progress-bar" />
          </div>

          {/* Interleaved Exercise */}
          <InterleavedLearnExercise 
            word={currentItem.word} 
            isFirstTime={currentItem.isFirstTime}
            onAnswer={handleAnswer}
            onNext={handleNext}
            exerciseNumber={currentWordIndex + 1}
            totalExercises={wordQueue.length}
          />
        </div>
      </div>
    </div>
  );
}
