import { useState } from "react";
import { VocabularyWordWithProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton, SentenceAudioButton } from "@/components/audio-button";

interface LearnExerciseProps {
  word: VocabularyWordWithProgress;
  onAnswer: (correct: boolean, selectedAnswer: string) => void;
  onNext: () => void;
}

type ExercisePhase = "learn" | "test" | "feedback";
type AnswerState = "none" | "correct" | "incorrect";

export default function LearnExercise({ word, onAnswer, onNext }: LearnExerciseProps) {
  const [phase, setPhase] = useState<ExercisePhase>("learn");
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerState, setAnswerState] = useState<AnswerState>("none");
  const [showTranslation, setShowTranslation] = useState(true);

  const articles = ["der", "die", "das"];
  const correctAnswer = word.article;

  const handleStartTest = () => {
    setPhase("test");
    setShowTranslation(false);
  };

  const handleAnswerSelect = (answer: string) => {
    if (phase !== "test") return;

    setSelectedAnswer(answer);
    const isCorrect = answer === correctAnswer;
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setPhase("feedback");
    
    onAnswer(isCorrect, answer);
  };

  const handleContinue = () => {
    if (phase === "learn") {
      handleStartTest();
    } else {
      onNext();
    }
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

  const genderColor = getGenderColor(word.article);

  if (phase === "learn") {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Learn this word:</h2>
        
        {/* Gender indicator */}
        <div className="flex justify-center mb-4">
          <span className={cn("gender-badge", word.article)}>
            <div className="w-2 h-2 rounded-full bg-white mr-2" />
            {word.article} ({getGenderLabel(word.article)})
          </span>
        </div>

        {/* Context sentence with highlighted word */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xl leading-relaxed text-gray-800 flex-1">
                  {word.exampleSentence?.split(new RegExp(`(${word.article}\\s+${word.german})`, 'gi')).map((part, index) => {
                    if (part.toLowerCase().includes(word.german.toLowerCase()) && part.toLowerCase().includes(word.article.toLowerCase())) {
                      return (
                        <strong key={index} className={cn("vocabulary-highlight", word.article)}>
                          {part}
                        </strong>
                      );
                    }
                    return part;
                  })}
                </p>
                {word.exampleSentence && (
                  <SentenceAudioButton 
                    sentence={word.exampleSentence}
                    showLabel={false}
                    className="ml-3 flex-shrink-0"
                  />
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-600 text-lg flex-1">
                  {showTranslation && word.exampleTranslation}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="ml-3 flex-shrink-0"
                >
                  {showTranslation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Word details */}
        <Card className={cn("mb-6 border-2", `border-${word.article}`)} style={{ borderColor: `var(--${genderColor})` }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn("text-lg font-semibold", `text-${word.article}`)} style={{ color: `var(--${genderColor})` }}>
                {word.article} {word.german}
              </h3>
              <GermanWordAudioButton 
                german={word.german} 
                article={word.article}
                showLabel={true}
                variant="outline"
              />
            </div>
            <p className="text-gray-600 text-sm mb-1">
              {getGenderLabel(word.article)} noun
            </p>
            <p className="text-gray-800">{word.english}</p>
          </CardContent>
        </Card>

        {/* Memory tip */}
        {word.memoryTip && (
          <Card className="bg-blue-50 border border-blue-200 mb-6">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800">
                <span className="font-medium">💡 Memory tip:</span> {word.memoryTip}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Test yourself button */}
        <Button 
          onClick={handleContinue}
          size="lg" 
          className="bg-primary hover:bg-primary/90"
        >
          Test Yourself <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (phase === "test") {
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
              <div className="flex items-center justify-between">
                <p className="text-gray-600 flex-1">
                  {showTranslation && (word.exampleTranslation || `I need the ${word.english}.`)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="ml-3 flex-shrink-0"
                >
                  {showTranslation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multiple choice options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {articles.map((article) => {
            const genderColor = getGenderColor(article);
            
            return (
              <button
                key={article}
                onClick={() => handleAnswerSelect(article)}
                className={`answer-option p-4 border-2 rounded-lg text-left transition-all duration-200 border-gray-200 hover:border-${genderColor} hover:bg-${genderColor}/10`}
              >
                <div className="flex items-center">
                  <div 
                    className={cn("w-4 h-4 rounded-full border-2 mr-3")}
                    style={{ borderColor: `var(--${genderColor})` }}
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
      </div>
    );
  }

  // Feedback phase
  return (
    <div className="text-center">
      <div className="flex justify-center mb-4">
        {answerState === "correct" ? (
          <CheckCircle className="h-12 w-12 text-green-500" />
        ) : (
          <XCircle className="h-12 w-12 text-red-500" />
        )}
      </div>

      <h2 className={cn("text-2xl font-semibold mb-4", answerState === "correct" ? "text-green-700" : "text-red-700")}>
        {answerState === "correct" ? "Correct!" : "Not quite right"}
      </h2>

      {answerState === "incorrect" && (
        <p className="text-gray-600 mb-4">
          You selected "{selectedAnswer}" but the correct answer is "{correctAnswer}".
        </p>
      )}

      {/* Show the correct answer */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-xl text-gray-800 mb-2">
              <strong className={cn("vocabulary-highlight", word.article)}>
                {word.article} {word.german}
              </strong> - {word.english}
            </p>
            <p className="text-gray-600">
              {word.exampleTranslation || `I need the ${word.english}.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Memory tip for incorrect answers */}
      {answerState === "incorrect" && word.memoryTip && (
        <Card className="bg-blue-50 border border-blue-200 mb-6">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">💡 Remember:</span> {word.memoryTip}
            </p>
          </CardContent>
        </Card>
      )}

      <Button 
        onClick={handleContinue}
        size="lg" 
        className="bg-primary hover:bg-primary/90"
      >
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}