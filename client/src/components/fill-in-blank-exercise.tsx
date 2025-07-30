import { useState } from "react";
import { VocabularyWordWithProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton, SentenceAudioButton } from "@/components/audio-button";

interface FillInBlankExerciseProps {
  word: VocabularyWordWithProgress;
  onAnswer: (correct: boolean, userAnswer: string) => void;
  onNext: () => void;
  exerciseNumber: number;
  totalExercises: number;
}

type ExerciseState = "question" | "feedback";

export default function FillInBlankExercise({ 
  word, 
  onAnswer, 
  onNext, 
  exerciseNumber, 
  totalExercises 
}: FillInBlankExerciseProps) {
  const [state, setState] = useState<ExerciseState>("question");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);

  // Create the sentence with blank
  const createBlankSentence = (sentence: string, wordToBlank: string) => {
    if (!sentence || !wordToBlank) return sentence;
    
    // Create a regex that matches the word (case insensitive, word boundaries)
    const regex = new RegExp(`\\b${wordToBlank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const blanks = '_'.repeat(Math.max(wordToBlank.length, 8));
    return sentence.replace(regex, blanks);
  };

  const handleSubmit = () => {
    if (state === "question") {
      // Check if answer is correct (case insensitive, trim whitespace)
      const correct = userAnswer.toLowerCase().trim() === word.german.toLowerCase().trim();
      setIsCorrect(correct);
      setState("feedback");
      onAnswer(correct, userAnswer);
    } else {
      onNext();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const getGenderColor = (article: string | null) => {
    if (!article) return "text-gray-600";
    switch (article) {
      case "der": return "text-blue-600";
      case "die": return "text-green-600"; 
      case "das": return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  const blankSentence = word.exampleSentence 
    ? createBlankSentence(word.exampleSentence, word.german)
    : `Use "${word.german}" in a sentence.`;

  if (state === "question") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-sm text-gray-500 mb-2">
            Exercise {exerciseNumber} of {totalExercises}
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
                onClick={handleSubmit}
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

  // Feedback state
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          Exercise {exerciseNumber} of {totalExercises}
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
              <GermanWordAudioButton word={word.german} className="ml-2" />
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
        <Button onClick={handleSubmit} className="min-w-32">
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}