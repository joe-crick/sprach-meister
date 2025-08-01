import { useState, useEffect } from "react";
import { VocabularyWordWithProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton, SentenceAudioButton } from "@/components/audio-button";

interface ReviewExerciseProps {
  word: VocabularyWordWithProgress;
  onAnswer: (correct: boolean, selectedAnswer: string) => void;
  onNext: () => void;
}

type AnswerState = "none" | "correct" | "incorrect";

type ExerciseType = "article" | "translation" | "multiple_choice" | "fill_blank";

export default function ReviewExercise({ word, onAnswer, onNext }: ReviewExerciseProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answerState, setAnswerState] = useState<AnswerState>("none");
  const [showFeedback, setShowFeedback] = useState(false);
  const [exerciseType, setExerciseType] = useState<ExerciseType>("translation");

  // Reset state when word changes and determine exercise type
  useEffect(() => {
    setSelectedAnswer("");
    setAnswerState("none");
    setShowFeedback(false);
    
    // Randomly choose exercise type based on word properties
    const possibleTypes: ExerciseType[] = [];
    
    // Article questions only for nouns with articles
    if (word.wordType === "noun" && word.article) {
      possibleTypes.push("article");
    }
    
    // Translation questions for all words
    possibleTypes.push("translation");
    
    // Multiple choice for all words
    possibleTypes.push("multiple_choice");
    
    // Fill in the blank if we have example sentences
    if (word.exampleSentence) {
      possibleTypes.push("fill_blank");
    }
    
    // Randomly select from available types
    const randomType = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
    setExerciseType(randomType);
  }, [word.id]);

  const articles = ["der", "die", "das"];

  const handleAnswerSelect = (answer: string) => {
    if (showFeedback) return; // Prevent selection after feedback is shown

    setSelectedAnswer(answer);
    
    // Get correct answer based on exercise type
    let correctAnswer: string;
    if (exerciseType === "article") {
      correctAnswer = word.article || "";
    } else {
      correctAnswer = word.english;
    }
    
    const isCorrect = answer === correctAnswer;
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setShowFeedback(true);
    
    onAnswer(isCorrect, answer);
  };

  const handleTranslationSubmit = () => {
    if (showFeedback) return;

    const userInput = selectedAnswer.toLowerCase().trim();
    const correctTranslation = word.english.toLowerCase().trim();
    const isCorrect = userInput === correctTranslation;
    
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setShowFeedback(true);
    
    onAnswer(isCorrect, selectedAnswer);
  };

  const handleMultipleChoiceSelect = (answer: string) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === word.english;
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setShowFeedback(true);
    
    onAnswer(isCorrect, answer);
  };

  const handleFillBlankSubmit = () => {
    if (showFeedback) return;

    const userInput = selectedAnswer.toLowerCase().trim();
    const correctAnswer = word.german.toLowerCase().trim();
    const isCorrect = userInput === correctAnswer;
    
    setAnswerState(isCorrect ? "correct" : "incorrect");
    setShowFeedback(true);
    
    onAnswer(isCorrect, selectedAnswer);
  };

  // Generate wrong answers for multiple choice
  const generateWrongAnswers = (): string[] => {
    const commonWords = [
      "house", "car", "book", "water", "food", "time", "person", "work", "day", "life",
      "hand", "eye", "place", "number", "part", "right", "new", "good", "first", "last",
      "long", "great", "little", "own", "other", "old", "right", "big", "high", "different"
    ];
    
    const wrongAnswers: string[] = [];
    const correctAnswer = word.english.toLowerCase();
    
    // Get 3 random wrong answers that aren't the correct answer
    while (wrongAnswers.length < 3) {
      const randomWord = commonWords[Math.floor(Math.random() * commonWords.length)];
      if (randomWord !== correctAnswer && !wrongAnswers.includes(randomWord)) {
        wrongAnswers.push(randomWord);
      }
    }
    
    return wrongAnswers;
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

  // Article exercise for nouns
  if (exerciseType === "article") {
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
          const isCorrect = article === word.article;
          
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
                  <span className="font-medium">Correct! "{word.article} {word.german}" is {getGenderLabel(word.article!)}.</span>
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-5 w-5" />
                  <span className="font-medium">Incorrect. The correct answer is "{word.article} {word.german}" ({getGenderLabel(word.article!)}).</span>
                </>
              )}
            </div>
            <div className="flex justify-center mt-3">
              <GermanWordAudioButton 
                german={word.german} 
                article={word.article || ""}
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

  // Multiple choice exercise
  if (exerciseType === "multiple_choice") {
    const wrongAnswers = generateWrongAnswers();
    const allChoices = [...wrongAnswers, word.english].sort(() => Math.random() - 0.5);
    
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">What does this German word mean?</h2>
        
        {/* Question context */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
                {word.article && <span className={getGenderColor(word.article)}>{word.article}</span>}
                {word.german}
                <GermanWordAudioButton 
                  german={word.german} 
                  article={word.article || ""} 
                  size="sm"
                />
              </div>
              <div className="text-sm text-gray-500 uppercase">
                {word.wordType || 'word'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multiple choice options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {allChoices.map((choice, index) => {
            const isSelected = selectedAnswer === choice;
            const isCorrect = choice === word.english;
            
            return (
              <button
                key={index}
                onClick={() => handleMultipleChoiceSelect(choice)}
                disabled={showFeedback}
                className={cn(
                  "p-4 border-2 rounded-lg text-left transition-all duration-200",
                  showFeedback && isSelected
                    ? isCorrect
                      ? "bg-green-50 border-green-500 text-green-800"
                      : "bg-red-50 border-red-500 text-red-800"
                    : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                )}
              >
                <div className="flex items-center">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 mr-3",
                    showFeedback && isSelected
                      ? isCorrect ? "border-green-500 bg-green-500" : "border-red-500 bg-red-500"
                      : "border-gray-300"
                  )} />
                  <span className="font-medium capitalize">{choice}</span>
                </div>
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
                    <span className="font-medium">Correct! "{word.german}" means "{word.english}".</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-5 w-5" />
                    <span className="font-medium">Incorrect. "{word.german}" means "{word.english}".</span>
                  </>
                )}
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

  // Fill in the blank exercise
  if (exerciseType === "fill_blank" && word.exampleSentence) {
    const blankSentence = word.exampleSentence.replace(
      new RegExp(`\\b${word.german}\\b`, 'gi'), 
      '______'
    );
    
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Fill in the blank:</h2>
        
        {/* Question context */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-xl text-gray-800 leading-relaxed">
                {blankSentence}
              </div>
              {word.exampleTranslation && (
                <div className="text-gray-600 italic">
                  "{word.exampleTranslation}"
                </div>
              )}
              <div className="text-sm text-gray-500">
                Fill in the German word that completes this sentence.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fill in the blank input */}
        <div className="mb-6">
          <Input
            value={selectedAnswer}
            onChange={(e) => setSelectedAnswer(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !showFeedback && handleFillBlankSubmit()}
            placeholder="Enter the German word..."
            disabled={showFeedback}
            className="text-center text-lg max-w-md mx-auto"
          />
          {!showFeedback && (
            <Button 
              onClick={handleFillBlankSubmit}
              disabled={!selectedAnswer.trim()}
              className="mt-4"
              size="lg"
            >
              Submit Answer
            </Button>
          )}
        </div>

        {/* Feedback area */}
        {showFeedback && (
          <Card className={cn("mb-6", answerState === "correct" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
            <CardContent className="pt-4">
              <div className={cn("flex items-center justify-center", answerState === "correct" ? "text-green-800" : "text-red-800")}>
                {answerState === "correct" ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    <span className="font-medium">Correct! The word is "{word.german}" ({word.english}).</span>
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-5 w-5" />
                    <span className="font-medium">Incorrect. The correct word is "{word.german}" ({word.english}).</span>
                  </>
                )}
              </div>
              <div className="flex justify-center mt-3">
                <GermanWordAudioButton 
                  german={word.german} 
                  article={word.article || ""}
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

  // Translation exercise (default fallback)
  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Translate this German word:</h2>
      
      {/* Question context */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
              {word.german}
              <GermanWordAudioButton 
                german={word.german} 
                article={word.article || ""} 
                size="sm"
              />
            </div>
            <div className="text-sm text-gray-500 uppercase">
              {word.wordType || 'word'}
            </div>
            {word.exampleSentence && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-lg text-gray-700 mb-2 flex items-center justify-center gap-2">
                  {word.exampleSentence}
                  <SentenceAudioButton 
                    sentence={word.exampleSentence}
                    showLabel={false}
                    size="sm"
                  />
                </div>
                {word.exampleTranslation && (
                  <div className="text-gray-500 text-sm">
                    {word.exampleTranslation}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Translation input */}
      <div className="mb-6">
        <Input
          value={selectedAnswer}
          onChange={(e) => setSelectedAnswer(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !showFeedback && handleTranslationSubmit()}
          placeholder="Enter English translation..."
          disabled={showFeedback}
          className="text-center text-lg max-w-md mx-auto"
        />
        {!showFeedback && (
          <Button 
            onClick={handleTranslationSubmit}
            disabled={!selectedAnswer.trim()}
            className="mt-4"
            size="lg"
          >
            Submit Answer
          </Button>
        )}
      </div>

      {/* Feedback area */}
      {showFeedback && (
        <Card className={cn("mb-6", answerState === "correct" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200")}>
          <CardContent className="pt-4">
            <div className={cn("flex items-center justify-center", answerState === "correct" ? "text-green-800" : "text-red-800")}>
              {answerState === "correct" ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  <span className="font-medium">Correct! "{word.german}" means "{word.english}".</span>
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-5 w-5" />
                  <span className="font-medium">Incorrect. "{word.german}" means "{word.english}".</span>
                </>
              )}
            </div>
            <div className="flex justify-center mt-3">
              <GermanWordAudioButton 
                german={word.german} 
                article={word.article || ""}
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
