import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, RefreshCw, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { GermanWordAudioButton } from "@/components/audio-button";

// German verb forms and their descriptions
const VERB_FORMS = {
  present: {
    name: "Present (Präsens)",
    description: "Present tense conjugation",
    persons: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"]
  },
  preterite: {
    name: "Simple Past (Präteritum)",
    description: "Simple past tense conjugation", 
    persons: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"]
  },
  perfect: {
    name: "Present Perfect (Perfekt)",
    description: "Present perfect with haben/sein + past participle",
    persons: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"]
  },
  subjunctive: {
    name: "Subjunctive II (Konjunktiv II)",
    description: "Subjunctive mood for hypothetical situations",
    persons: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"]
  }
};

// Essential German verbs with their conjugations
const ESSENTIAL_VERBS = [
  {
    infinitive: "sein",
    english: "to be",
    category: "irregular",
    forms: {
      present: ["bin", "bist", "ist", "sind", "seid", "sind"],
      preterite: ["war", "warst", "war", "waren", "wart", "waren"],
      perfect: ["bin gewesen", "bist gewesen", "ist gewesen", "sind gewesen", "seid gewesen", "sind gewesen"],
      subjunctive: ["wäre", "wärst", "wäre", "wären", "wärt", "wären"]
    }
  },
  {
    infinitive: "haben",
    english: "to have",
    category: "irregular",
    forms: {
      present: ["habe", "hast", "hat", "haben", "habt", "haben"],
      preterite: ["hatte", "hattest", "hatte", "hatten", "hattet", "hatten"],
      perfect: ["habe gehabt", "hast gehabt", "hat gehabt", "haben gehabt", "habt gehabt", "haben gehabt"],
      subjunctive: ["hätte", "hättest", "hätte", "hätten", "hättet", "hätten"]
    }
  }
];

// Generate verb conjugations for regular German verbs
const generateRegularVerbConjugation = (infinitive: string, auxiliary: 'haben' | 'sein' = 'haben') => {
  const stem = infinitive.replace(/(en|n)$/, '');
  const pastParticiple = infinitive.startsWith('ge') ? infinitive : `ge${stem}t`;
  const auxVerb = auxiliary === 'haben' ? ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'] : ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];
  
  return {
    present: [`${stem}e`, `${stem}st`, `${stem}t`, `${stem}en`, `${stem}t`, `${stem}en`],
    preterite: [`${stem}te`, `${stem}test`, `${stem}te`, `${stem}ten`, `${stem}tet`, `${stem}ten`],
    perfect: auxVerb.map(aux => `${aux} ${pastParticiple}`),
    subjunctive: [`${stem}te`, `${stem}test`, `${stem}te`, `${stem}ten`, `${stem}tet`, `${stem}ten`]
  };
};

interface Verb {
  infinitive: string;
  english: string;
  category: string;
  forms: {
    present: string[];
    preterite: string[];
    perfect: string[];
    subjunctive: string[];
  };
}

interface VerbExercise {
  verb: Verb;
  form: keyof typeof VERB_FORMS;
  person: number;
  userAnswer: string;
  isCorrect: boolean | null;
  hasValidated: boolean;
}

export default function Verbs() {
  const { toast } = useToast();
  const [selectedForm, setSelectedForm] = useState<keyof typeof VERB_FORMS>("present");
  const [selectedVerb, setSelectedVerb] = useState<string>("");
  const [currentExercise, setCurrentExercise] = useState<VerbExercise | null>(null);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    total: 0,
    streak: 0
  });

  // Fetch vocabulary words to get verbs
  const { data: vocabularyWords = [] } = useQuery({
    queryKey: ['/api/vocabulary'],
    queryFn: async () => {
      const response = await fetch('/api/vocabulary');
      if (!response.ok) throw new Error('Failed to fetch vocabulary');
      return response.json();
    }
  });

  // Create combined verb list
  const vocabularyVerbs = vocabularyWords
    .filter((word: any) => word.wordType === 'verb')
    .map((word: any) => ({
      infinitive: word.german,
      english: word.english,
      category: 'regular', // Assume regular unless specified
      forms: generateRegularVerbConjugation(word.german)
    }));

  const availableVerbs: Verb[] = [
    ...ESSENTIAL_VERBS,
    ...vocabularyVerbs
  ];

  const generateExercise = () => {
    if (!selectedVerb || !selectedForm || availableVerbs.length === 0) return;

    const verb = availableVerbs.find(v => v.infinitive === selectedVerb);
    if (!verb) return;

    const randomPerson = Math.floor(Math.random() * 6);
    
    setCurrentExercise({
      verb,
      form: selectedForm,
      person: randomPerson,
      userAnswer: "",
      isCorrect: null,
      hasValidated: false
    });
  };

  const validateAnswer = (answer: string) => {
    if (!currentExercise) return;

    const correctAnswer = currentExercise.verb.forms[currentExercise.form][currentExercise.person];
    const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

    setCurrentExercise(prev => prev ? {
      ...prev,
      userAnswer: answer,
      isCorrect,
      hasValidated: true
    } : null);

    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      streak: isCorrect ? prev.streak + 1 : 0
    }));

    if (isCorrect) {
      toast({
        title: "Richtig!",
        description: "Correct conjugation!",
      });
    } else {
      toast({
        title: "Nicht ganz richtig",
        description: `The correct answer is: ${correctAnswer}`,
        variant: "destructive",
      });
    }
  };

  const handleInputBlur = (value: string) => {
    if (value.trim() && !currentExercise?.hasValidated) {
      validateAnswer(value);
    }
  };

  const nextExercise = () => {
    generateExercise();
  };

  const resetSession = () => {
    setSessionStats({ correct: 0, total: 0, streak: 0 });
    setCurrentExercise(null);
  };

  const getVerbCategoryColor = (category: string) => {
    switch (category) {
      case "irregular": return "bg-red-100 text-red-800";
      case "strong": return "bg-blue-100 text-blue-800";
      case "modal": return "bg-purple-100 text-purple-800";
      default: return "bg-green-100 text-green-800";
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Verb Practice</h2>
          <p className="text-gray-600">Practice German verb conjugations across different tenses and moods</p>
        </div>

        {/* Session Stats */}
        {sessionStats.total > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                    <div className="text-sm text-gray-600">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">{sessionStats.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{sessionStats.streak}</div>
                    <div className="text-sm text-gray-600">Streak</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={sessionStats.total > 0 ? (sessionStats.correct / sessionStats.total) * 100 : 0} 
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600">
                    {Math.round(sessionStats.total > 0 ? (sessionStats.correct / sessionStats.total) * 100 : 0)}%
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={resetSession}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Setup Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Practice Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Verb Form
                </Label>
                <Select value={selectedForm} onValueChange={(value: keyof typeof VERB_FORMS) => setSelectedForm(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verb form" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VERB_FORMS).map(([key, form]) => (
                      <SelectItem key={key} value={key}>
                        {form.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedForm && (
                  <p className="text-sm text-gray-600 mt-1">
                    {VERB_FORMS[selectedForm].description}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Verb
                </Label>
                <Select value={selectedVerb} onValueChange={setSelectedVerb}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a verb to practice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVerbs.map((verb) => (
                      <SelectItem key={verb.infinitive} value={verb.infinitive}>
                        <div className="flex items-center gap-2">
                          <span>{verb.infinitive}</span>
                          <span className="text-gray-500">({verb.english})</span>
                          <Badge className={cn("text-xs", getVerbCategoryColor(verb.category))}>
                            {verb.category}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={generateExercise} 
                disabled={!selectedForm || !selectedVerb || availableVerbs.length === 0}
                className="w-full"
              >
                Start Practice
              </Button>
            </CardContent>
          </Card>

          {/* Exercise Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Current Exercise</CardTitle>
            </CardHeader>
            <CardContent>
              {currentExercise ? (
                <div className="space-y-4">
                  {/* Verb Info */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{currentExercise.verb.infinitive}</h3>
                      <GermanWordAudioButton 
                        german={currentExercise.verb.infinitive}
                        article=""
                        size="sm"
                        variant="ghost"
                      />
                    </div>
                    <p className="text-gray-600">{currentExercise.verb.english}</p>
                    <Badge className={cn("mt-1", getVerbCategoryColor(currentExercise.verb.category))}>
                      {currentExercise.verb.category} verb
                    </Badge>
                  </div>

                  {/* Form Info */}
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">
                      {VERB_FORMS[currentExercise.form].name}
                    </p>
                    <p className="text-lg font-medium">
                      {VERB_FORMS[currentExercise.form].persons[currentExercise.person]} ___
                    </p>
                  </div>

                  {/* Answer Input */}
                  <div className="space-y-2">
                    <Label htmlFor="verbAnswer">Your answer:</Label>
                    <div className="flex gap-2">
                      <Input
                        id="verbAnswer"
                        value={currentExercise.userAnswer}
                        onChange={(e) => setCurrentExercise(prev => prev ? {
                          ...prev,
                          userAnswer: e.target.value
                        } : null)}
                        onBlur={(e) => handleInputBlur(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            handleInputBlur(e.currentTarget.value);
                          }
                        }}
                        placeholder="Enter the conjugated form..."
                        className={cn(
                          currentExercise.hasValidated && (
                            currentExercise.isCorrect 
                              ? "border-green-500 bg-green-50" 
                              : "border-red-500 bg-red-50"
                          )
                        )}
                        disabled={currentExercise.hasValidated}
                      />
                      {currentExercise.hasValidated && (
                        <div className="flex items-center">
                          {currentExercise.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feedback */}
                  {currentExercise.hasValidated && (
                    <div className={cn(
                      "p-3 rounded-lg",
                      currentExercise.isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                    )}>
                      {currentExercise.isCorrect ? (
                        <p className="text-green-800">
                          <CheckCircle className="h-4 w-4 inline mr-1" />
                          Correct! Well done.
                        </p>
                      ) : (
                        <div className="text-red-800">
                          <p className="flex items-center">
                            <XCircle className="h-4 w-4 mr-1" />
                            Incorrect.
                          </p>
                          <p className="mt-1">
                            Correct answer: <strong>{currentExercise.verb.forms[currentExercise.form][currentExercise.person]}</strong>
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next Button */}
                  {currentExercise.hasValidated && (
                    <Button onClick={nextExercise} className="w-full">
                      Next Exercise
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Select a verb form and verb to start practicing!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Verb Forms Reference */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Reference: German Verb Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(VERB_FORMS).map(([key, form]) => (
                <div key={key} className="p-3 border rounded-lg">
                  <h4 className="font-medium text-gray-900">{form.name}</h4>
                  <p className="text-sm text-gray-600">{form.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Persons: {form.persons.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}