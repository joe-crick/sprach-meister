import { VocabularyWordWithProgress } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton, SentenceAudioButton } from "@/components/audio-button";

interface WordPresentationProps {
  word: VocabularyWordWithProgress;
  onContinue: () => void;
  wordNumber: number;
  totalWords: number;
}

export default function WordPresentation({ 
  word, 
  onContinue, 
  wordNumber, 
  totalWords 
}: WordPresentationProps) {
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-sm text-gray-500 mb-2">
          Learning word {wordNumber} of {totalWords}
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
              <GermanWordAudioButton word={word.german} className="ml-3" />
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
            <Button onClick={onContinue} size="lg" className="min-w-40">
              I've learned this word <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}