import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InsertVocabularyWord } from "@shared/schema";

interface AddWordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddWordModal({ open, onClose }: AddWordModalProps) {
  const [formData, setFormData] = useState<InsertVocabularyWord>({
    german: "",
    article: "",
    english: "",
    category: "Other",
    wordType: "noun",
    exampleSentence: "",
    exampleTranslation: "",
    memoryTip: "",
    difficulty: 1
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addWordMutation = useMutation({
    mutationFn: async (word: InsertVocabularyWord) => {
      const response = await apiRequest("POST", "/api/vocabulary", word);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vocabulary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Success",
        description: "Word added successfully!",
      });
      onClose();
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add word. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      german: "",
      article: "",
      english: "",
      category: "Other",
      wordType: "noun",
      exampleSentence: "",
      exampleTranslation: "",
      memoryTip: "",
      difficulty: 1
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.german || !formData.english) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    if (formData.wordType === "noun" && !formData.article) {
      toast({
        title: "Error",
        description: "Please select an article for nouns.",
        variant: "destructive",
      });
      return;
    }
    addWordMutation.mutate(formData);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Word</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="german">German Word *</Label>
            <Input
              id="german"
              value={formData.german}
              onChange={(e) => setFormData({ ...formData, german: e.target.value })}
              placeholder="e.g., Speisekarte"
              required
            />
          </div>

          <div>
            <Label htmlFor="wordType">Word Type *</Label>
            <Select 
              value={formData.wordType} 
              onValueChange={(value) => setFormData({ ...formData, wordType: value, article: value === "noun" ? formData.article : "" })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select word type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="noun">Noun</SelectItem>
                <SelectItem value="verb">Verb</SelectItem>
                <SelectItem value="adjective">Adjective</SelectItem>
                <SelectItem value="adverb">Adverb</SelectItem>
                <SelectItem value="expression">Expression</SelectItem>
                <SelectItem value="phrase">Phrase</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.wordType === "noun" && (
            <div>
              <Label htmlFor="article">Article/Gender *</Label>
              <Select 
                value={formData.article} 
                onValueChange={(value) => setFormData({ ...formData, article: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="der">der (masculine)</SelectItem>
                  <SelectItem value="die">die (feminine)</SelectItem>
                  <SelectItem value="das">das (neuter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="english">English Translation *</Label>
            <Input
              id="english"
              value={formData.english}
              onChange={(e) => setFormData({ ...formData, english: e.target.value })}
              placeholder="e.g., menu"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Food & Dining">Food & Dining</SelectItem>
                <SelectItem value="Transportation">Transportation</SelectItem>
                <SelectItem value="Health & Body">Health & Body</SelectItem>
                <SelectItem value="Work & Career">Work & Career</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="example">Example Sentence</Label>
            <Textarea
              id="example"
              value={formData.exampleSentence || ""}
              onChange={(e) => setFormData({ ...formData, exampleSentence: e.target.value })}
              placeholder="German sentence using the word"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="translation">Example Translation</Label>
            <Textarea
              id="translation"
              value={formData.exampleTranslation || ""}
              onChange={(e) => setFormData({ ...formData, exampleTranslation: e.target.value })}
              placeholder="English translation of the example"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="tip">Memory Tip</Label>
            <Textarea
              id="tip"
              value={formData.memoryTip || ""}
              onChange={(e) => setFormData({ ...formData, memoryTip: e.target.value })}
              placeholder="Helpful memory aid"
              rows={2}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={addWordMutation.isPending}
            >
              {addWordMutation.isPending ? "Adding..." : "Add Word"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
