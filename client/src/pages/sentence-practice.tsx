import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { VocabularyWordWithProgress } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { GermanWordAudioButton } from "@/components/audio-button";
import { CheckCircle2, XCircle, RefreshCw, PenTool, Lightbulb, Target, BookOpen, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from "@/lib/LoadingSpinner";

interface SentencePracticeExercise {
  words: VocabularyWordWithProgress[];
  prompt: string;
  difficulty: string;
  grammarTopic?: string;
  type?: string;
}

interface SentenceFeedback {
  isCorrect: boolean;
  feedback: string;
  correctedSentence?: string;
  grammarPoints: string[];
  vocabularyUsage: string[];
}

// TELC B1 Grammar Topics
const TELC_B1_GRAMMAR_TOPICS = [
  "Dativ and Akkusativ cases",
  "Modal verbs (können, müssen, sollen, wollen, dürfen, mögen)",
  "Perfect tense (Perfekt)",
  "Past tense (Präteritum) for common verbs",
  "Subordinate clauses with 'dass', 'weil', 'wenn'",
  "Adjective declension",
  "Comparative and superlative",
  "Reflexive verbs and pronouns",
  "Passive voice (basic forms)",
  "Prepositions with Dativ and Akkusativ",
  "Two-way prepositions (Wechselpräpositionen)",
  "Relative clauses",
  "Infinitive with 'zu'",
  "Conjunctions (aber, oder, und, denn)",
  "Word order in main and subordinate clauses"
];

export default function SentencePractice() {
  const [currentExercise, setCurrentExercise] = useState<SentencePracticeExercise | null>(null);
  const [userSentence, setUserSentence] = useState("");
  const [feedback, setFeedback] = useState<SentenceFeedback | null>(null);
  const [exerciseMode, setExerciseMode] = useState<"vocabulary" | "grammar">("vocabulary");
  const [selectedGrammarTopic, setSelectedGrammarTopic] = useState<string>("");


  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get learned words for practice
  const { data: learnedWords, isLoading: wordsLoading } = useQuery<VocabularyWordWithProgress[]>({
    queryKey: ["/api/vocabulary"],
    queryFn: async () => {
      const response = await fetch("/api/vocabulary");
      if (!response.ok) throw new Error("Failed to fetch vocabulary");
      const data = await response.json();
      return data.filter((word: VocabularyWordWithProgress) => word.progress?.lastReviewed);
    },
  });

  // Generate new exercise mutation
  const generateExerciseMutation = useMutation({
    mutationFn: async ({ difficulty = "intermediate", grammarTopic }: { difficulty?: string; grammarTopic?: string }) => {
      if (!learnedWords || learnedWords.length < 4) {
        throw new Error("Need at least 4 learned words for practice");
      }

      // Select 4 random learned words
      const shuffled = [...learnedWords].sort(() => 0.5 - Math.random());
      const selectedWords = shuffled.slice(0, 4);

      const endpoint = grammarTopic ? "/api/sentence-practice/generate-grammar" : "/api/sentence-practice/generate";
      const requestBody = {
        words: selectedWords.map(w => ({
          german: w.german,
          english: w.english,
          article: w.article,
          wordType: w.wordType,
          category: w.category
        })),
        difficulty,
        ...(grammarTopic && { grammarTopic })
      };

      const response = await apiRequest("POST", endpoint, requestBody);

      return {
        words: selectedWords,
        ...(await response.json())
      };
    },
    onSuccess: (exercise) => {
      setCurrentExercise(exercise);
      setUserSentence("");
      setFeedback(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate exercise",
        variant: "destructive",
      });
    }
  });

  // Submit sentence for feedback mutation
  const submitSentenceMutation = useMutation({
    mutationFn: async (sentence: string) => {
      if (!currentExercise) throw new Error("No exercise available");

      const response = await apiRequest("POST", "/api/sentence-practice/evaluate", {
        sentence,
        words: currentExercise.words.map(w => ({
          german: w.german,
          english: w.english,
          article: w.article,
          wordType: w.wordType
        })),
        prompt: currentExercise.prompt
      });

      return response.json();
    },
    onSuccess: (feedbackData) => {
      setFeedback(feedbackData);

      toast({
        title: feedbackData.isCorrect ? "Great job!" : "Keep practicing!",
        description: feedbackData.isCorrect ? "Your sentence is correct!" : "Check the feedback for improvements",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to evaluate sentence",
        variant: "destructive",
      });
    }
  });

  const handleSubmitSentence = () => {
    if (!userSentence.trim()) {
      toast({
        title: "Error",
        description: "Please write a sentence first",
        variant: "destructive",
      });
      return;
    }

    submitSentenceMutation.mutate(userSentence);
  };

  const getGenderColor = (article: string | null | undefined) => {
    switch (article) {
      case "der": return "text-blue-600 dark:text-blue-400";
      case "die": return "text-green-600 dark:text-green-400";
      case "das": return "text-purple-600 dark:text-purple-400";
      default: return "text-gray-600 dark:text-gray-400";
    }
  };

  // Generate initial exercise on component mount
  useEffect(() => {
    if (learnedWords && learnedWords.length >= 4 && !currentExercise) {
      handleGenerateNewExercise();
    }
  }, [learnedWords]);

  const handleGenerateNewExercise = () => {
    const config = { difficulty: "intermediate" as string };
    if (exerciseMode === "grammar" && selectedGrammarTopic) {
      (config as any).grammarTopic = selectedGrammarTopic;
    }
    generateExerciseMutation.mutate(config);
  };

  if (wordsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center flex flex-col items-center justify-center">
          <LoadingSpinner size="h-8 w-8" color="border-blue-600" border="border-2" />
          <p className="mt-2 text-gray-600">Loading your vocabulary...</p>
        </div>
      </div>
    );
  }

  if (!learnedWords || learnedWords.length < 4) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="text-center p-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Not Ready Yet</h3>
            <p className="text-gray-600 mb-4">
              You need to learn at least 4 words before you can practice making sentences.
            </p>
            <p className="text-sm text-gray-500">
              Go to the Learn section to start building your vocabulary!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Sentence Practice
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create sentences using your learned vocabulary and get AI feedback
        </p>
      </div>

      {/* Exercise Mode Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={exerciseMode === "vocabulary" ? "default" : "outline"}
                onClick={() => setExerciseMode("vocabulary")}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Vocabulary Practice
              </Button>
              <Button
                variant={exerciseMode === "grammar" ? "default" : "outline"}
                onClick={() => setExerciseMode("grammar")}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Grammar Practice
              </Button>
            </div>

            {exerciseMode === "grammar" && (
              <div className="flex-1 min-w-[300px]">
                <select
                  value={selectedGrammarTopic}
                  onChange={(e) => setSelectedGrammarTopic(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="">Select a TELC B1 grammar topic...</option>
                  {TELC_B1_GRAMMAR_TOPICS.map((topic, index) => (
                    <option key={index} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={handleGenerateNewExercise}
              disabled={generateExerciseMutation.isPending || (exerciseMode === "grammar" && !selectedGrammarTopic)}
              className="flex items-center gap-2"
            >
              {generateExerciseMutation.isPending ? (
                <LoadingSpinner size="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Generate Exercise
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Exercise */}
      {currentExercise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Exercise
              <div className="ml-auto flex gap-2">
                {currentExercise.grammarTopic && (
                  <Badge variant="secondary" className="text-xs">
                    {currentExercise.grammarTopic}
                  </Badge>
                )}
                <Badge variant="outline">
                  {currentExercise.difficulty}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exercise Prompt */}
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription className="text-base prose prose-sm max-w-none">
                <ReactMarkdown>{currentExercise.prompt}</ReactMarkdown>
              </AlertDescription>
            </Alert>

            {/* Words to Use */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Use these words (create 4 separate sentences, one word per sentence):
              </h3>
              <div className="flex flex-wrap gap-3">
                {currentExercise.words.map((word, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center gap-2">
                    <div className="text-center">
                      <div className="font-medium">
                        <span className={getGenderColor(word.article)}>
                          {word.article && `${word.article} `}
                        </span>
                        <span className="text-gray-900 dark:text-white">{word.german}</span>
                      </div>
                      <div className="text-sm text-gray-500">{word.english}</div>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {word.wordType}
                      </Badge>
                    </div>
                    <GermanWordAudioButton 
                      german={word.german} 
                      article={word.article || ""} 
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Sentence Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your German sentences (write 4 separate sentences):
              </label>
              <Textarea
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value)}
                placeholder="Write 4 separate sentences here, using one word from the list in each sentence..."
                className="min-h-[150px]"
                disabled={submitSentenceMutation.isPending}
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleSubmitSentence}
                  disabled={!userSentence.trim() || submitSentenceMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {submitSentenceMutation.isPending ? (
                    <LoadingSpinner size="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Check Sentence
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleGenerateNewExercise}
                  disabled={generateExerciseMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  New Exercise
                </Button>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <Card className={`border ${feedback.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {feedback.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="space-y-3 flex-1">
                      <p className="font-medium">
                        {feedback.isCorrect ? "Excellent!" : "Good attempt!"}
                      </p>
                      <p className="text-gray-700">{feedback.feedback}</p>
                      
                      {feedback.correctedSentence && (
                        <div className="bg-white p-3 rounded border">
                          <p className="text-sm font-medium text-gray-600 mb-1">Suggested correction:</p>
                          <p className="text-gray-900">{feedback.correctedSentence}</p>
                        </div>
                      )}

                      {feedback.grammarPoints.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Grammar points:</p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {feedback.grammarPoints.map((point, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-gray-400">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {feedback.vocabularyUsage.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Vocabulary usage:</p>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {feedback.vocabularyUsage.map((usage, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-gray-400">•</span>
                                {usage}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
