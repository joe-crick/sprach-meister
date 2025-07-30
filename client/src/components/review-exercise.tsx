import { useState } from "react";
import { VocabularyWordWithProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton, SentenceAudioButton } from "@/components/audio-button";

interface ReviewExerciseProps {
  word: VocabularyWordWithProgress;
  onAnswer: (correct: boolean, selectedAnswer: string) => void;
  onNext: () => void;
}

type AnswerState = "none" | "correct" | "incorrect";

export default function ReviewExercise({ word, onAnswer, onNext }: ReviewExerciseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerState, setAnswerState] = useState<AnswerState>("none");
  const [showFeedback, setShowFeedback] = useState(false);

  const articles = ["der", "die", "das"];
  const correctAnswer = word.article;

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return; // Prevent selection after feedback is shown

    setSelectedAnswer(answer);
    const isCorrect = answer === correctAnswer;
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setShowFeedback(true);
    
    onAnswer(isCorrect, answer);
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

  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Choose the correct article:</h2>
      
      {/* Question context */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xl text-gray-800 flex-1">
                {word.exampleSentence?.replace(new RegExp(`${word.article}\\s+${word.german}`, 'gi'), `___ ${word.german}`) || 
                 `Ich brauche ___ ${word.german}.`}
              </p>
              <SentenceAudioButton 
                sentence={word.exampleSentence?.replace(new RegExp(`${word.article}\\s+${word.german}`, 'gi'), `der ${word.german}`) || 
                         `Ich brauche der ${word.german}.`}
                showLabel={false}
                className="ml-3 flex-shrink-0"
              />
            </div>
            <p className="text-gray-600">
              {word.exampleTranslation || `I need the ${word.english}.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Multiple choice options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {articles.map((article) => {
          const genderColor = getGenderColor(article);
          const isSelected = selectedAnswer === article;
          const isCorrect = article === correctAnswer;
          
          let buttonClass = `answer-option p-4 border-2 rounded-lg text-left transition-all duration-200 ${
            showFeedback && isSelected
              ? isCorrect
                ? "correct border-green-500"
                : "incorrect border-red-500"
              : `border-gray-200 hover:border-${genderColor} hover:bg-${genderColor}/10`
          }`;

          return (
            <button
              key={article}
              onClick={() => handleAnswerSelect(article)}
              disabled={showFeedback}
              className={buttonClass}
              style={{
                borderColor: showFeedback && isSelected 
                  ? (isCorrect ? '#10b981' : '#ef4444')
                  : showFeedback ? '#e5e7eb' : undefined
              }}
            >
              <div className="flex items-center">
                <div 
                  className={cn("w-4 h-4 rounded-full border-2 mr-3")}
                  style={{ 
                    borderColor: `var(--${genderColor})`,
                    backgroundColor: isSelected && showFeedback ? (isCorrect ? '#10b981' : '#ef4444') : 'transparent'
                  }}
                />
                <span 
                  className="font-medium"
                  style={{ color: `var(--${genderColor})` }}
                >
                  {article}
                </span>
                <span className="ml-2 text-gray-600">{word.german}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{getGenderLabel(article)}</p>
            </button>
          );
        })}
      </div>

      {/* Feedback area */}
      {showFeedback && (
        <Card className={cn("mb-6", answerState === "correct" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
          <CardContent className="pt-4">
            <div className={cn("flex items-center justify-center", answerState === "correct" ? "text-green-800" : "text-red-800")}>
              {answerState === "correct" ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  <span className="font-medium">Correct! "{correctAnswer} {word.german}" is {getGenderLabel(correctAnswer)}.</span>
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-5 w-5" />
                  <span className="font-medium">Incorrect. The correct answer is "{correctAnswer} {word.german}" ({getGenderLabel(correctAnswer)}).</span>
                </>
              )}
            </div>
            <div className="flex justify-center mt-3">
              <GermanWordAudioButton 
                german={word.german} 
                article={correctAnswer}
                showLabel={true}
                variant="outline"
                size="sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next button */}
      {showFeedback && (
        <Button 
          onClick={onNext}
          size="lg" 
          className="bg-secondary hover:bg-secondary/90"
        >
          Next Question <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
