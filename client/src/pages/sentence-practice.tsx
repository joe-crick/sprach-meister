// ... other imports and component code

export default function SentencePractice() {
  const [currentExercise, setCurrentExercise] = useState<SentencePracticeExercise | null>(null);
  const [userSentence, setUserSentence] = useState("");
  const [feedback, setFeedback] = useState<SentenceFeedback | null>(null);
  // Removed the local isSubmitting state
  // const [isSubmitting, setIsSubmitting] = useState(false);
  const [exerciseMode, setExerciseMode] = useState<"vocabulary" | "grammar">("vocabulary");
  const [selectedGrammarTopic, setSelectedGrammarTopic] = useState<string>("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ... (get learned words query remains the same)

  // ... (generate new exercise mutation remains the same)

  // Submit sentence for feedback mutation
  const submitSentenceMutation = useMutation({
    mutationFn: async (sentence: string) => {
      if (!currentExercise) throw new Error("No exercise available");

      const response = await apiRequest("POST", "/api/sentence-practice/evaluate", {
        sentence,
        words: currentExercise.words.map(w => ({
          german: w.german,
          english: w.english,
          article: w.article,
          wordType: w.wordType
        })),
        prompt: currentExercise.prompt
      });

      return response.json();
    },
    onSuccess: (feedbackData) => {
      setFeedback(feedbackData);

      toast({
        title: feedbackData.isCorrect ? "Great job!" : "Keep practicing!",
        description: feedbackData.isCorrect ? "Your sentence is correct!" : "Check the feedback for improvements",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to evaluate sentence",
        variant: "destructive",
      });
    }
  });

  const handleSubmitSentence = () => {
    if (!userSentence.trim()) {
      toast({
        title: "Error",
        description: "Please write a sentence first",
        variant: "destructive",
      });
      return;
    }

    // Call mutate function directly.
    // The `isPending` state from the mutation hook will now be used to manage the button's disabled state.
    submitSentenceMutation.mutate(userSentence);
  };

  // ... (getGenderColor and useEffect hooks remain the same)

  // ... (return statement)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ... (other JSX) */}

      {currentExercise && (
        <Card>
          <CardHeader>
            {/* ... (CardTitle) */}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ... (Exercise Prompt and Words to Use sections) */}

            {/* Sentence Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your German sentences (write 4 separate sentences):
              </label>
              <Textarea
                value={userSentence}
                onChange={(e) => setUserSentence(e.target.value)}
                placeholder="Write 4 separate sentences here, using one word from the list in each sentence..."
                className="min-h-[150px]"
                // Use the isPending state from the mutation hook to disable the textarea
                disabled={submitSentenceMutation.isPending}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitSentence}
                  // Use the isPending state from the mutation hook to disable the button
                  disabled={!userSentence.trim() || submitSentenceMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Check Sentence
                </Button>
                {/* ... (New Exercise button remains the same) */}
              </div>
            </div>

            {/* ... (Feedback section) */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
