import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, BookOpen, Brain, Lightbulb, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

const GRAMMAR_TOPICS = [
  { id: "adjective_endings", name: "Adjective Endings", level: "B1" },
  { id: "subjunctive", name: "Subjunctive (Konjunktiv)", level: "B1" },
  { id: "passive_voice", name: "Passive Voice", level: "B1" },
  { id: "relative_clauses", name: "Relative Clauses", level: "B1" },
  { id: "indirect_speech", name: "Indirect Speech", level: "B1" },
  { id: "conditional_sentences", name: "Conditional Sentences", level: "B1" },
  { id: "modal_particles", name: "Modal Particles", level: "B1" },
  { id: "word_formation", name: "Word Formation", level: "B1" },
  { id: "reflexive_verbs", name: "Reflexive Verbs (Advanced)", level: "B1" },
  { id: "temporal_expressions", name: "Temporal Expressions", level: "B1" },
  { id: "complex_sentence_structure", name: "Complex Sentence Structure", level: "B1" },
  { id: "participial_constructions", name: "Participial Constructions", level: "B1" }
];

interface GrammarExplanation {
  topic: string;
  explanation: string;
  examples: string[];
  rules: string[];
}

interface AIFeedback {
  isCorrect: boolean;
  accuracy: number; // 0-100
  feedback: string;
  corrections: string[];
  additionalInfo: string;
  status: 'Good' | 'Has Some Issues' | 'Needs Work';
}

export default function Grammar() {
  const { toast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [customTopic, setCustomTopic] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [examples, setExamples] = useState<string[]>(["", "", ""]);
  const [rules, setRules] = useState<string[]>(["", ""]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);

  const validateGrammarMutation = useMutation({
    mutationFn: async (grammarData: GrammarExplanation): Promise<AIFeedback> => {
      const response = await fetch('/api/grammar/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(grammarData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to validate grammar');
      }
      
      return response.json();
    },
    onSuccess: (data: AIFeedback) => {
      setAiFeedback(data);
      setIsSubmitted(true);
      toast({
        title: "Grammar validated!",
        description: `Your explanation received a grade of ${data.grade}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Validation failed",
        description: "Could not validate grammar explanation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExampleChange = (index: number, value: string) => {
    const newExamples = [...examples];
    newExamples[index] = value;
    setExamples(newExamples);
  };

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...rules];
    newRules[index] = value;
    setRules(newRules);
  };

  const addExample = () => {
    setExamples([...examples, ""]);
  };

  const addRule = () => {
    setRules([...rules, ""]);
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const topicToUse = selectedTopic === "custom" ? customTopic.trim() : selectedTopic;
    
    if (!topicToUse || !explanation.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a topic (or enter a custom one) and provide an explanation.",
        variant: "destructive",
      });
      return;
    }

    const grammarData: GrammarExplanation = {
      topic: topicToUse,
      explanation: explanation.trim(),
      examples: examples.filter(ex => ex.trim() !== ""),
      rules: rules.filter(rule => rule.trim() !== "")
    };

    validateGrammarMutation.mutate(grammarData);
  };

  const resetForm = () => {
    setSelectedTopic("");
    setCustomTopic("");
    setExplanation("");
    setExamples(["", "", ""]);
    setRules(["", ""]);
    setIsSubmitted(false);
    setAiFeedback(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return "text-green-600 bg-green-100";
      case 'Has Some Issues': return "text-orange-600 bg-orange-100";
      case 'Needs Work': return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1': return "bg-green-100 text-green-800";
      case 'A2': return "bg-blue-100 text-blue-800";
      case 'B1': return "bg-purple-100 text-purple-800";
      case 'B2': return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Grammar Teaching</h2>
          <p className="text-gray-600">
            Teach the app a German grammar concept and receive AI-powered feedback on your explanation
          </p>
        </div>

        {!isSubmitted ? (
          <div className="space-y-6">
            {/* Topic Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Choose Grammar Topic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="topic">Select a grammar topic to explain:</Label>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a grammar topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAMMAR_TOPICS.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{topic.name}</span>
                            <Badge className={cn("ml-2 text-xs", getLevelColor(topic.level))}>
                              {topic.level}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">
                        <div className="flex items-center gap-2">
                          <span>🆕 Enter Custom Topic</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedTopic === "custom" && (
                    <div className="mt-3">
                      <Label htmlFor="customTopic">Enter your grammar topic:</Label>
                      <Input
                        id="customTopic"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="e.g., Genitive Case, Reflexive Pronouns, etc."
                        className="mt-1"
                      />
                    </div>
                  )}
                  {selectedTopic && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <Lightbulb className="h-4 w-4 inline mr-1" />
                        Explain this topic as if you're teaching it to another German learner. 
                        Include clear explanations, examples, and rules.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Explanation Section */}
            {selectedTopic && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Your Explanation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="explanation">
                      Explain the grammar concept (minimum 100 words):
                    </Label>
                    <Textarea
                      id="explanation"
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Provide a clear, detailed explanation of this grammar concept..."
                      className="min-h-32 mt-2"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {explanation.length}/100 characters minimum
                    </div>
                  </div>

                  {/* Examples Section */}
                  <div>
                    <Label>Examples (provide at least 2 good examples):</Label>
                    <div className="space-y-2 mt-2">
                      {examples.map((example, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={example}
                            onChange={(e) => handleExampleChange(index, e.target.value)}
                            placeholder={`Example ${index + 1}...`}
                          />
                          {examples.length > 2 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeExample(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addExample}>
                        Add Example
                      </Button>
                    </div>
                  </div>

                  {/* Rules Section */}
                  <div>
                    <Label>Key Rules (provide important rules or patterns):</Label>
                    <div className="space-y-2 mt-2">
                      {rules.map((rule, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={rule}
                            onChange={(e) => handleRuleChange(index, e.target.value)}
                            placeholder={`Rule ${index + 1}...`}
                          />
                          {rules.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeRule(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addRule}>
                        Add Rule
                      </Button>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    disabled={validateGrammarMutation.isPending || !selectedTopic || explanation.length < 100}
                    className="w-full"
                  >
                    {validateGrammarMutation.isPending ? "Validating..." : "Submit for AI Review"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Results Section */
          <div className="space-y-6">
            {aiFeedback && (
              <>
                {/* Grade Card */}
                <Card className="border-2 border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>AI Evaluation Results</span>
                      <Badge className={cn("text-lg px-3 py-1", getStatusColor(aiFeedback.status))}>
                        {aiFeedback.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      {aiFeedback.isCorrect ? (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      ) : (
                        <XCircle className="h-8 w-8 text-red-500" />
                      )}
                      <div>
                        <p className="text-lg font-medium">
                          {aiFeedback.isCorrect ? "Correct Explanation!" : "Needs Improvement"}
                        </p>
                        <p className="text-sm text-gray-600">
                          Accuracy: {aiFeedback.accuracy}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Feedback Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">AI Assessment:</h4>
                      <p className="text-gray-800">{aiFeedback.feedback}</p>
                    </div>

                    {aiFeedback.corrections.length > 0 && (
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <h4 className="font-medium mb-2 text-orange-800 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Corrections Needed:
                        </h4>
                        <ul className="space-y-1">
                          {aiFeedback.corrections.map((correction, index) => (
                            <li key={index} className="text-orange-700 text-sm">
                              • {correction}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiFeedback.additionalInfo && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium mb-2 text-blue-800">Additional Information:</h4>
                        <p className="text-blue-700 text-sm">{aiFeedback.additionalInfo}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button onClick={resetForm} variant="outline" className="flex-1">
                    Try Another Topic
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsSubmitted(false);
                      setAiFeedback(null);
                    }} 
                    className="flex-1"
                  >
                    Revise This Explanation
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Info Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How Grammar Teaching Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <h4 className="font-medium mb-1">1. Choose Topic</h4>
                <p className="text-sm text-gray-600">Select a German grammar concept you want to explain</p>
              </div>
              <div className="text-center p-4">
                <Brain className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <h4 className="font-medium mb-1">2. Teach It</h4>
                <p className="text-sm text-gray-600">Provide explanations, examples, and rules</p>
              </div>
              <div className="text-center p-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <h4 className="font-medium mb-1">3. Get Feedback</h4>
                <p className="text-sm text-gray-600">Receive AI validation and improvement suggestions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}