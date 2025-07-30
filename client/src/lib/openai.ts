import { apiRequest } from "./queryClient";

export interface VocabularyGenerationRequest {
  topic: string;
  count: number;
  level?: string;
}

export interface GeneratedWord {
  german: string;
  article: string;
  english: string;
  category: string;
  exampleSentence: string;
  exampleTranslation: string;
  memoryTip: string;
}

export async function generateVocabulary(request: VocabularyGenerationRequest): Promise<GeneratedWord[]> {
  try {
    const response = await apiRequest("POST", "/api/vocabulary/ai-generate", request);
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error("Error generating vocabulary:", error);
    throw new Error("Failed to generate vocabulary using AI");
  }
}

export async function processCsvFile(file: File): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/vocabulary/upload-csv", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to process CSV file");
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message,
      count: data.words?.length || 0
    };
  } catch (error) {
    console.error("Error processing CSV:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to process CSV file"
    };
  }
}
