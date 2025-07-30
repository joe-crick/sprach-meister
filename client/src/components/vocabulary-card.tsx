import { VocabularyWordWithProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton, SentenceAudioButton } from "@/components/audio-button";

interface VocabularyCardProps {
  word: VocabularyWordWithProgress;
  onContinue: () => void;
  showAnswer?: boolean;
}

export default function VocabularyCard({ word, onContinue, showAnswer = true }: VocabularyCardProps) {
  const getGenderColor = (article: string) => {
    switch (article) {
      case "der": return "der";
      case "die": return "die";
      case "das": return "das";
      default: return "der";
    }
  };

  const genderColor = getGenderColor(word.article);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Learn this word in context:</h2>
      
      {/* Gender indicator */}
      <div className="flex justify-center mb-4">
        <span className={cn("gender-badge", genderColor)}>
          <div className="w-2 h-2 rounded-full bg-white mr-2" />
          {word.article} ({word.article === "der" ? "masculine" : word.article === "die" ? "feminine" : "neuter"})
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
                      <strong key={index} className={cn("vocabulary-highlight", genderColor)}>
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
            {showAnswer && word.exampleTranslation && (
              <p className="text-gray-600 text-lg">
                {word.exampleTranslation}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Word details */}
      <Card className={cn("mb-6 border-2", `border-${genderColor}`)} style={{ borderColor: `var(--${genderColor})` }}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className={cn("text-lg font-semibold", `text-${genderColor}`)} style={{ color: `var(--${genderColor})` }}>
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
            {word.article === "der" ? "masculine" : word.article === "die" ? "feminine" : "neuter"} noun
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

      {/* Continue button */}
      <Button 
        onClick={onContinue}
        size="lg" 
        className="bg-primary hover:bg-primary/90"
      >
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
