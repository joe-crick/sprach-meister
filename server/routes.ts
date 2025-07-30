import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertVocabularyWordSchema, insertUserProgressSchema, insertLearningSessionSchema, insertUserSettingsSchema } from "@shared/schema";
import { generateVocabulary, generateMemoryTip, validateGrammarExplanation } from "./services/openai";
import multer from "multer";
import Papa from "papaparse";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Vocabulary routes
  app.get("/api/vocabulary", async (req, res) => {
    try {
      const words = await storage.getVocabularyWordsWithProgress();
      res.json(words);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vocabulary" });
    }
  });

  app.get("/api/vocabulary/:id", async (req, res) => {
    try {
      const word = await storage.getVocabularyWordById(req.params.id);
      if (!word) {
        return res.status(404).json({ message: "Word not found" });
      }
      res.json(word);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch word" });
    }
  });

  app.post("/api/vocabulary", async (req, res) => {
    try {
      const validation = insertVocabularyWordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid word data", errors: validation.error.errors });
      }

      const word = await storage.createVocabularyWord(validation.data);
      res.status(201).json(word);
    } catch (error) {
      res.status(500).json({ message: "Failed to create word" });
    }
  });

  app.post("/api/vocabulary/bulk", async (req, res) => {
    try {
      const wordsSchema = z.array(insertVocabularyWordSchema);
      const validation = wordsSchema.safeParse(req.body.words);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid words data", errors: validation.error.errors });
      }

      const words = await storage.createVocabularyWords(validation.data);
      res.status(201).json(words);
    } catch (error) {
      res.status(500).json({ message: "Failed to create words" });
    }
  });

  app.put("/api/vocabulary/:id", async (req, res) => {
    try {
      const updates = insertVocabularyWordSchema.partial().parse(req.body);
      const word = await storage.updateVocabularyWord(req.params.id, updates);
      if (!word) {
        return res.status(404).json({ message: "Word not found" });
      }
      res.json(word);
    } catch (error) {
      res.status(500).json({ message: "Failed to update word" });
    }
  });

  app.delete("/api/vocabulary/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteVocabularyWord(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Word not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete word" });
    }
  });

  // Learning-specific routes
  app.get("/api/vocabulary/words-for-learning", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const limit = parseInt(req.query.limit as string) || 10;
      const words = await storage.getWordsForLearning(userId, limit);
      res.json(words);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch words for learning" });
    }
  });

  app.get("/api/vocabulary/words-for-review", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const limit = parseInt(req.query.limit as string) || 25;
      const words = await storage.getWordsForReview(userId, limit);
      res.json(words);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch words for review" });
    }
  });

  // All words review (not just due words)
  app.get("/api/vocabulary/all-words-for-review", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const limit = parseInt(req.query.limit as string) || 50;
      const category = req.query.category as string;
      
      // Get all words with progress, not just due ones
      const allWords = await storage.getAllVocabularyWords();
      const wordsWithProgress = await Promise.all(
        allWords.map(async (word) => {
          const progress = await storage.getUserProgressForWord(userId, word.id);
          return { ...word, progress };
        })
      );

      // Filter by category if specified
      let filteredWords = wordsWithProgress;
      if (category && category !== "all") {
        filteredWords = wordsWithProgress.filter(word => word.category === category);
      }

      // Shuffle and limit
      const shuffled = filteredWords.sort(() => 0.5 - Math.random());
      const limitedWords = shuffled.slice(0, limit);

      res.json(limitedWords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch words for review" });
    }
  });

  // CSV upload route
  app.post("/api/vocabulary/upload-csv", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString("utf8");
      const parsed = Papa.parse(csvData, { 
        header: true,
        skipEmptyLines: true
      });

      if (parsed.errors.length > 0) {
        return res.status(400).json({ message: "CSV parsing error", errors: parsed.errors });
      }

      const words = parsed.data.map((row: any) => ({
        german: row.german || row.German,
        article: row.article || row.Article,
        english: row.english || row.English,
        category: row.category || row.Category || "Other",
        exampleSentence: row.exampleSentence || row["Example Sentence"] || "",
        exampleTranslation: row.exampleTranslation || row["Example Translation"] || "",
        memoryTip: row.memoryTip || row["Memory Tip"] || ""
      }));

      const validation = z.array(insertVocabularyWordSchema).safeParse(words);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid CSV data format", errors: validation.error.errors });
      }

      const createdWords = await storage.createVocabularyWords(validation.data);
      res.status(201).json({ message: `${createdWords.length} words imported successfully`, words: createdWords });
    } catch (error) {
      res.status(500).json({ message: "Failed to process CSV file" });
    }
  });

  // AI vocabulary generation
  app.post("/api/vocabulary/ai-generate", async (req, res) => {
    try {
      const schema = z.object({
        topic: z.string(),
        count: z.number().min(1).max(50),
        level: z.string().default("B1")
      });

      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validation.error.errors });
      }

      const generatedWords = await generateVocabulary(validation.data);
      
      const wordsToCreate = generatedWords.map(word => ({
        german: word.german,
        article: word.article,
        english: word.english,
        category: word.category,
        exampleSentence: word.exampleSentence,
        exampleTranslation: word.exampleTranslation,
        memoryTip: word.memoryTip
      }));

      const createdWords = await storage.createVocabularyWords(wordsToCreate);
      res.status(201).json({ message: `${createdWords.length} words generated and added`, words: createdWords });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate vocabulary with AI" });
    }
  });

  // Progress routes
  app.get("/api/progress", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post("/api/progress", async (req, res) => {
    try {
      const validation = insertUserProgressSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid progress data", errors: validation.error.errors });
      }

      // Convert date strings to Date objects if needed
      const progressData = {
        ...validation.data,
        lastReviewed: validation.data.lastReviewed ? new Date(validation.data.lastReviewed) : undefined,
        nextReview: validation.data.nextReview ? new Date(validation.data.nextReview) : undefined,
      };

      const progress = await storage.createUserProgress(progressData);
      res.status(201).json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to create progress record" });
    }
  });

  app.put("/api/progress/:id", async (req, res) => {
    try {
      const updates = insertUserProgressSchema.partial().parse(req.body);
      
      // Convert date strings to Date objects if needed
      const progressUpdates = {
        ...updates,
        lastReviewed: updates.lastReviewed ? new Date(updates.lastReviewed) : undefined,
        nextReview: updates.nextReview ? new Date(updates.nextReview) : undefined,
      };

      const progress = await storage.updateUserProgress(req.params.id, progressUpdates);
      if (!progress) {
        return res.status(404).json({ message: "Progress record not found" });
      }
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Learning session routes
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getLearningSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const validation = insertLearningSessionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid session data", errors: validation.error.errors });
      }

      const session = await storage.createLearningSession(validation.data);
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const updates = insertLearningSessionSchema.partial().parse(req.body);
      const session = await storage.updateLearningSession(req.params.id, updates);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const limit = parseInt(req.query.limit as string) || 10;
      const sessions = await storage.getRecentSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const userId = req.body.userId || "default_user";
      const updates = insertUserSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateUserSettings(userId, updates);
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Dashboard and analytics routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/category-progress", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const progress = await storage.getCategoryProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category progress" });
    }
  });

  // Learning and review word fetching
  app.get("/api/words/for-learning", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const limit = parseInt(req.query.limit as string) || 10;
      const words = await storage.getWordsForLearning(userId, limit);
      res.json(words);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch words for learning" });
    }
  });

  app.get("/api/words/for-review", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const limit = parseInt(req.query.limit as string) || 25;
      const words = await storage.getWordsForReview(userId, limit);
      res.json(words);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch words for review" });
    }
  });

  // Grammar validation route
  app.post("/api/grammar/validate", async (req, res) => {
    try {
      const { topic, explanation, examples, rules } = req.body;
      
      if (!topic || !explanation) {
        return res.status(400).json({ message: "Topic and explanation are required" });
      }

      const feedback = await validateGrammarExplanation({
        topic,
        explanation,
        examples: examples || [],
        rules: rules || []
      });

      res.json(feedback);
    } catch (error) {
      console.error('Grammar validation error:', error);
      res.status(500).json({ message: "Failed to validate grammar explanation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
