import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || ""
});

export interface VocabularyAcquisitionRequest {
  topic: string;
  count: number;
  level: string; // B1, B2, etc.
}

export interface GeneratedVocabularyWord {
  german: string;
  article: string;
  english: string;
  category: string;
  exampleSentence: string;
  exampleTranslation: string;
  memoryTip: string;
}

export async function generateVocabulary(request: VocabularyAcquisitionRequest): Promise<GeneratedVocabularyWord[]> {
  try {
    const prompt = `Generate ${request.count} German vocabulary words for ${request.level} level learners on the topic "${request.topic}". 
    
    For each word, provide:
    - The German word with its article (der/die/das)
    - English translation
    - A category classification
    - An example sentence in German using the word
    - English translation of the example sentence
    - A memory tip to help remember the word or its gender
    
    Focus on words that would be useful for TELC German ${request.level} exam preparation.
    
    Respond with JSON in this exact format:
    {
      "words": [
        {
          "german": "word",
          "article": "der|die|das",
          "english": "translation",
          "category": "category name",
          "exampleSentence": "German sentence with the word",
          "exampleTranslation": "English translation of the sentence",
          "memoryTip": "helpful memory aid"
        }
      ]
    }`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a German language teacher specializing in TELC exam preparation. Generate authentic, useful vocabulary with accurate articles and helpful memory aids."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.words || [];
  } catch (error) {
    console.error("Error generating vocabulary:", error);
    throw new Error("Failed to generate vocabulary using AI");
  }
}

export async function generateMemoryTip(german: string, article: string, english: string): Promise<string> {
  try {
    const prompt = `Create a helpful memory tip for remembering the German word "${article} ${german}" which means "${english}". 
    
    The tip should help with:
    1. Remembering the word itself
    2. Remembering the correct article (gender)
    
    Make it memorable, fun, and educational. Keep it concise (1-2 sentences).
    
    Respond with JSON: {"tip": "your memory tip here"}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a German language teacher who creates memorable and effective learning aids."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.tip || "Remember to practice this word regularly!";
  } catch (error) {
    console.error("Error generating memory tip:", error);
    return "Remember to practice this word regularly!";
  }
}

export interface GrammarExplanation {
  topic: string;
  explanation: string;
  examples: string[];
  rules: string[];
}

export interface AIGrammarFeedback {
  isCorrect: boolean;
  accuracy: number; // 0-100
  feedback: string;
  corrections: string[];
  additionalInfo: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export async function validateGrammarExplanation(explanation: GrammarExplanation): Promise<AIGrammarFeedback> {
  try {
    const prompt = `As a German language expert and teacher, evaluate this student's explanation of a German grammar concept.

Topic: ${explanation.topic}
Explanation: ${explanation.explanation}
Examples provided: ${explanation.examples.join('; ')}
Rules provided: ${explanation.rules.join('; ')}

Please evaluate the explanation for:
1. Accuracy of grammar information
2. Completeness of explanation
3. Quality of examples
4. Clarity and pedagogical value
5. Any missing important information

Provide detailed feedback and assign a grade (A-F). Be constructive and educational.

Respond with JSON in this exact format:
{
  "isCorrect": boolean,
  "accuracy": number (0-100),
  "feedback": "detailed assessment of the explanation",
  "corrections": ["correction 1", "correction 2"],
  "additionalInfo": "supplementary information or teaching points",
  "grade": "A|B|C|D|F"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert German language teacher and linguist. Evaluate grammar explanations thoroughly and provide constructive, educational feedback. Be fair but thorough in your assessment."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3 // Lower temperature for more consistent grading
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      isCorrect: result.isCorrect || false,
      accuracy: Math.max(0, Math.min(100, result.accuracy || 0)),
      feedback: result.feedback || "Unable to provide feedback at this time.",
      corrections: Array.isArray(result.corrections) ? result.corrections : [],
      additionalInfo: result.additionalInfo || "",
      grade: ['A', 'B', 'C', 'D', 'F'].includes(result.grade) ? result.grade : 'F'
    };
  } catch (error: any) {
    console.error("Error validating grammar explanation:", error);
    
    // Provide specific error messages for common OpenAI issues
    if (error.status === 429) {
      throw new Error("OpenAI quota exceeded. Please check your billing and add credits to your OpenAI account.");
    } else if (error.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your API key is correct.");
    } else if (error.status === 403) {
      throw new Error("OpenAI API access denied. Please verify your account permissions.");
    }
    
    throw new Error("Failed to validate grammar explanation using AI");
  }
}
