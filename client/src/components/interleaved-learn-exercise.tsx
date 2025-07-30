import { useState } from "react";
import { VocabularyWordWithProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton, SentenceAudioButton } from "@/components/audio-button";

interface InterleavedLearnExerciseProps {
  word: VocabularyWordWithProgress;
  onAnswer: (correct: boolean, userAnswer: string) => void;
  onNext: () => void;
  exerciseNumber: number;
  totalExercises: number;
}

type ExercisePhase = "presentation" | "test" | "feedback";

export default function InterleavedLearnExercise({ 
  word, 
  onAnswer, 
  onNext, 
  exerciseNumber, 
  totalExercises 
}: InterleavedLearnExerciseProps) {
  const [phase, setPhase] = useState<ExercisePhase>("presentation");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  const getGenderColor = (article: string | null) => {
    if (!article) return "text-gray-600";
    switch (article) {
      case "der": return "text-blue-600";
      case "die": return "text-green-600"; 
      case "das": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  const getGenderBadge = (article: string | null) => {
    if (!article) return null;
    
    const colors = {
      der: "bg-blue-100 text-blue-800 border-blue-200",
      die: "bg-green-100 text-green-800 border-green-200", 
      das: "bg-purple-100 text-purple-800 border-purple-200"
    };
    
    const labels = {
      der: "masculine",
      die: "feminine",
      das: "neuter"
    };

    return (
      <div className={cn("inline-flex px-3 py-1 rounded-full text-sm font-medium border", colors[article as keyof typeof colors])}>
        {labels[article as keyof typeof labels]}
      </div>
    );
  };

  const createBlankSentence = (sentence: string, wordToBlank: string) => {
    if (!sentence || !wordToBlank) return sentence;
    
    const regex = new RegExp(`\\b${wordToBlank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const blanks = '_'.repeat(Math.max(wordToBlank.length, 8));
    return sentence.replace(regex, blanks);
  };

  const handleContinueFromPresentation = () => {
    setPhase("test");
  };

  const handleSubmitAnswer = () => {
    const correct = userAnswer.toLowerCase().trim() === word.german.toLowerCase().trim();
    setIsCorrect(correct);
    setPhase("feedback");
    onAnswer(correct, userAnswer);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && phase === "test") {
      handleSubmitAnswer();
    }
  };

  const handleContinueFromFeedback = () => {
    onNext();
  };

  // Presentation phase - show the word to learn
  if (phase === "presentation") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            Word {exerciseNumber} of {totalExercises}
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Learn this word:
          </h2>
        </div>

        <Card className="p-8">
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <div className="text-4xl font-bold">
                <span className={getGenderColor(word.article)}>
                  {word.article && `${word.article} `}
                </span>
                <span className="text-gray-900">{word.german}</span>
                <GermanWordAudioButton german={word.german} article={word.article || ""} className="ml-3" />
              </div>
              
              <div className="text-xl text-gray-600">
                {word.english}
              </div>

              {word.article && (
                <div className="flex justify-center">
                  {getGenderBadge(word.article)}
                </div>
              )}

              <div className="text-sm text-gray-500 uppercase tracking-wide">
                {word.wordType || 'noun'}
              </div>
            </div>

            {word.exampleSentence && (
              <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                <div className="text-lg text-gray-700">
                  {word.exampleSentence}
                  <SentenceAudioButton sentence={word.exampleSentence} className="ml-2" />
                </div>
                {word.exampleTranslation && (
                  <div className="text-gray-500">
                    {word.exampleTranslation}
                  </div>
                )}
              </div>
            )}

            {word.memoryTip && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-800">
                  <strong>💡 Memory Tip:</strong> {word.memoryTip}
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={handleContinueFromPresentation} size="lg" className="min-w-40">
                I've learned this word <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Test phase - fill in the blank
  if (phase === "test") {
    const blankSentence = word.exampleSentence 
      ? createBlankSentence(word.exampleSentence, word.german)
      : `Use "${word.german}" in a sentence.`;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            Word {exerciseNumber} of {totalExercises} - Test
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Fill in the blank
          </h2>
        </div>

        <Card className="p-6">
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-lg text-gray-700 mb-4">
                {blankSentence}
              </div>
              
              <div className="text-sm text-gray-500 mb-4">
                English: {word.english}
              </div>

              <div className="flex justify-center items-center space-x-4 mb-6">
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type the German word..."
                  className="max-w-xs text-center text-lg"
                  autoFocus
                />
              </div>

              <Button 
                onClick={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
                className="min-w-32"
              >
                Check Answer
              </Button>
            </div>
          </CardContent>
        </Card>

        {word.memoryTip && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm">
                <strong>💡 Memory Tip:</strong> {word.memoryTip}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Feedback phase - show result and correct answer
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          Word {exerciseNumber} of {totalExercises} - Result
        </div>
        <div className={cn(
          "inline-flex items-center space-x-2 px-4 py-2 rounded-full text-white text-lg font-semibold",
          isCorrect ? "bg-green-500" : "bg-red-500"
        )}>
          {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span>{isCorrect ? "Correct!" : "Not quite"}</span>
        </div>
      </div>

      <Card className="p-6">
        <CardContent className="space-y-4">
          <div className="text-center space-y-4">
            <div className="text-2xl font-bold">
              <span className={getGenderColor(word.article)}>
                {word.article && `${word.article} `}
              </span>
              <span className="text-gray-900">{word.german}</span>
              <GermanWordAudioButton german={word.german} article={word.article || ""} className="ml-2" />
            </div>
            
            <div className="text-lg text-gray-600">
              {word.english}
            </div>

            {word.exampleSentence && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-gray-700 mb-2">
                  {word.exampleSentence}
                  <SentenceAudioButton sentence={word.exampleSentence} className="ml-2" />
                </div>
                {word.exampleTranslation && (
                  <div className="text-sm text-gray-500">
                    {word.exampleTranslation}
                  </div>
                )}
              </div>
            )}

            {!isCorrect && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-sm text-red-700">
                  <strong>Your answer:</strong> {userAnswer}
                </div>
                <div className="text-sm text-red-700">
                  <strong>Correct answer:</strong> {word.german}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {word.memoryTip && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-sm">
              <strong>💡 Memory Tip:</strong> {word.memoryTip}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button onClick={handleContinueFromFeedback} className="min-w-32">
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}