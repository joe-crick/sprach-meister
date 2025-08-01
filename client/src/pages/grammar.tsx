import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Search, Lightbulb, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { UserSettings } from "@shared/schema";
import { useTranslation, Language } from "@/lib/translations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactMarkdown from "react-markdown";
import LoadingSpinner from "@lib//loading-spinner";

export default function Grammar() {
  const [grammarTopic, setGrammarTopic] = useState("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [exercises, setExercises] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  
  const { toast } = useToast();

  // Get user language setting
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  const currentLanguage = (settings?.language as Language) || 'english';
  const { t } = useTranslation(currentLanguage);

  const explainGrammarMutation = useMutation({
    mutationFn: async (topic: string) => {
      setIsLoadingExplanation(true);
      const response = await apiRequest("POST", "/api/grammar/explain", {
        topic,
        language: currentLanguage
      });
      return response.json();
    },
    onSuccess: (result) => {
      setExplanation(result.explanation);
      setIsLoadingExplanation(false);
      toast({
        title: currentLanguage === 'german' ? "Erklärung erhalten!" : "Explanation received!",
        description: currentLanguage === 'german' 
          ? "Die Grammatik wurde erfolgreich erklärt." 
          : "Grammar topic has been explained successfully.",
      });
    },
    onError: () => {
      setIsLoadingExplanation(false);
      toast({
        title: currentLanguage === 'german' ? "Fehler" : "Error",
        description: currentLanguage === 'german' 
          ? "Fehler beim Erstellen der Erklärung. Bitte versuche es erneut." 
          : "Failed to generate explanation. Please try again.",
        variant: "destructive",
      });
    }
  });

  const generateExercisesMutation = useMutation({
    mutationFn: async (topic: string) => {
      setIsLoadingExercises(true);
      const response = await apiRequest("POST", "/api/grammar/exercises", {
        topic,
        language: currentLanguage
      });
      return response.json();
    },
    onSuccess: (result) => {
      setExercises(result.exercises);
      setIsLoadingExercises(false);
      toast({
        title: currentLanguage === 'german' ? "Übungen erstellt!" : "Exercises generated!",
        description: currentLanguage === 'german' 
          ? "Übungen wurden erfolgreich generiert." 
          : "Practice exercises have been generated successfully.",
      });
    },
    onError: () => {
      setIsLoadingExercises(false);
      toast({
        title: currentLanguage === 'german' ? "Fehler" : "Error",
        description: currentLanguage === 'german' 
          ? "Fehler beim Erstellen der Übungen. Bitte versuche es erneut." 
          : "Failed to generate exercises. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleExplainGrammar = () => {
    if (!grammarTopic.trim()) {
      toast({
        title: currentLanguage === 'german' ? "Thema erforderlich" : "Topic required",
        description: currentLanguage === 'german' 
          ? "Bitte gib ein Grammatikthema ein." 
          : "Please enter a grammar topic.",
        variant: "destructive",
      });
      return;
    }
    explainGrammarMutation.mutate(grammarTopic);
  };

  const handleGenerateExercises = () => {
    if (!grammarTopic.trim()) {
      toast({
        title: currentLanguage === 'german' ? "Thema erforderlich" : "Topic required",
        description: currentLanguage === 'german' 
          ? "Bitte gib ein Grammatikthema ein." 
          : "Please enter a grammar topic.",
        variant: "destructive",
      });
      return;
    }
    generateExercisesMutation.mutate(grammarTopic);
  };

  const resetAll = () => {
    setGrammarTopic("");
    setExplanation(null);
    setExercises(null);
  };

  // Common grammar topics for suggestions
  const commonTopics = currentLanguage === 'german' ? [
    "Der, die, das - Deutsche Artikel",
    "Akkusativ und Dativ",
    "Modalverben (können, müssen, wollen)",
    "Perfekt vs. Präteritum",
    "Adjektivdeklination",
    "Relativsätze",
    "Konjunktiv II",
    "Reflexive Verben"
  ] : [
    "Der, die, das - German Articles", 
    "Accusative and Dative Cases",
    "Modal Verbs (können, müssen, wollen)",
    "Perfect vs. Simple Past",
    "Adjective Declension",
    "Relative Clauses",
    "Subjunctive II",
    "Reflexive Verbs"
  ];

  return (
    <div className="flex-1 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {currentLanguage === 'german' ? 'Grammatik-Nachschlagewerk' : 'Grammar Lookup'}
          </h2>
          <p className="text-gray-600">
            {currentLanguage === 'german' 
              ? 'Gib ein Grammatikthema ein und erhalte eine verständliche Erklärung mit Übungen'
              : 'Enter a grammar topic and get an easy-to-understand explanation with exercises'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  {currentLanguage === 'german' ? 'Grammatikthema' : 'Grammar Topic'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Input
                    placeholder={currentLanguage === 'german' 
                      ? "z.B. Deutsche Artikel, Akkusativ..." 
                      : "e.g. German articles, accusative case..."
                    }
                    value={grammarTopic}
                    onChange={(e) => setGrammarTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleExplainGrammar();
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleExplainGrammar}
                    disabled={isLoadingExplanation || !grammarTopic.trim()}
                    className="w-full"
                  >
                    {isLoadingExplanation ? <LoadingSpinner size="h-5 w-5" /> : <Lightbulb className="h-4 w-4" />}
                    <span className="ml-2">
                      {isLoadingExplanation 
                        ? (currentLanguage === 'german' ? "Erkläre..." : "Explaining...") 
                        : (currentLanguage === 'german' ? "Erklären" : "Explain")
                      }
                    </span>
                  </Button>
                  
                  <Button
                    onClick={handleGenerateExercises}
                    disabled={isLoadingExercises || !grammarTopic.trim()}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoadingExercises ? <LoadingSpinner size="h-5 w-5" /> : <FileText className="h-4 w-4" />}
                    <span className="ml-2">
                      {isLoadingExercises 
                        ? (currentLanguage === 'german' ? "Erstelle..." : "Generating...") 
                        : (currentLanguage === 'german' ? "Übungen" : "Exercises")
                      }
                    </span>
                  </Button>

                  <Button
                    onClick={resetAll}
                    variant="outline"
                    className="w-full"
                  >
                    {currentLanguage === 'german' ? 'Zurücksetzen' : 'Reset'}
                  </Button>
                </div>

                {/* Common Topics */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">
                    {currentLanguage === 'german' ? 'Häufige Themen:' : 'Common Topics:'}
                  </h4>
                  <div className="space-y-2">
                    {commonTopics.map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => setGrammarTopic(topic)}
                        className="w-full text-left text-sm text-blue-600 hover:text-blue-800 hover:underline p-1 rounded"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Loading State for Results */}
            {(isLoadingExplanation || isLoadingExercises) && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <LoadingSpinner size="h-10 w-10" border="border-4" color="border-gray-400" />
                </CardContent>
              </Card>
            )}

            {/* Explanation Card */}
            {explanation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-600" />
                    {currentLanguage === 'german' ? 'Erklärung' : 'Explanation'}: {grammarTopic}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription className="text-base prose prose-sm max-w-none">
                      <ReactMarkdown>{explanation}</ReactMarkdown>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Exercises Card */}
            {exercises && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    {currentLanguage === 'german' ? 'Übungen' : 'Practice Exercises'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription className="text-base prose prose-sm max-w-none">
                      <ReactMarkdown>{exercises}</ReactMarkdown>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!explanation && !exercises && !(isLoadingExplanation || isLoadingExercises) && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {currentLanguage === 'german' ? 'Beginne deine Grammatik-Suche' : 'Start Your Grammar Lookup'}
                    </h3>
                    <p className="text-gray-600">
                      {currentLanguage === 'german' 
                        ? 'Gib ein Grammatikthema ein, um eine detaillierte Erklärung zu erhalten'
                        : 'Enter a grammar topic to get a detailed explanation'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
