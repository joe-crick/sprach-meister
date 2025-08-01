import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertVocabularyWordSchema, insertUserProgressSchema, insertLearningSessionSchema, insertUserSettingsSchema } from "@shared/schema";
import { explainGrammarTopic, generateGrammarExercises, generateSentencePrompt, evaluateSentence, generateGrammarSentencePrompt } from "./services/anthropic";
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

  // Moved to end to avoid route conflicts

  app.post("/api/vocabulary", async (req, res) => {
    try {
      const validation = insertVocabularyWordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid word data", errors: validation.error.errors });
      }

      // Check for duplicate before creating
      const existingWords = await storage.getVocabularyWords();
      const isDuplicate = existingWords.some(w => w.german.toLowerCase() === validation.data.german.toLowerCase());
      
      if (isDuplicate) {
        return res.status(400).json({ message: `Word "${validation.data.german}" already exists` });
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

  // Clean up duplicate words
  app.post("/api/vocabulary/cleanup-duplicates", async (req, res) => {
    try {
      const words = await storage.getVocabularyWords();
      const duplicateMap = new Map<string, VocabularyWord[]>();
      
      // Group words by lowercase German word
      words.forEach(word => {
        const key = word.german.toLowerCase();
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key)!.push(word as any);
      });
      
      let duplicatesRemoved = 0;
      
      // For each group with duplicates, keep the first one and delete the rest
      const entries = Array.from(duplicateMap.entries());
      for (const [germanWord, duplicates] of entries) {
        if (duplicates.length > 1) {
          // Sort by creation date, keep the oldest
          duplicates.sort((a: any, b: any) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
          
          // Delete all but the first one
          for (let i = 1; i < duplicates.length; i++) {
            await storage.deleteVocabularyWord(duplicates[i].id);
            duplicatesRemoved++;
          }
        }
      }
      
      res.json({ message: `Cleaned up ${duplicatesRemoved} duplicate words` });
    } catch (error) {
      res.status(500).json({ message: "Failed to cleanup duplicates" });
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
      const words = await storage.getAllWordsForReview(userId, limit);
      res.json(words);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch words for review" });
    }
  });

  // CSV upload route
  app.post("/api/vocabulary/upload-csv", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          message: "No CSV file uploaded",
          details: "Please select a CSV file to upload."
        });
      }

      // Check file type
      if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
        return res.status(400).json({
          message: "Invalid file type",
          details: "Please upload a CSV file (.csv extension)."
        });
      }

      const csvData = req.file.buffer.toString("utf8");
      
      // Check if file is empty
      if (!csvData.trim()) {
        return res.status(400).json({
          message: "Empty CSV file",
          details: "The uploaded CSV file contains no data."
        });
      }

      const parsed = Papa.parse(csvData, { 
        header: true,
        skipEmptyLines: true
      });

      if (parsed.errors.length > 0) {
        const errorDetails = parsed.errors.map(e => {
          if (e.row !== undefined) {
            return `Row ${e.row + 2}: ${e.message}`; // +2 because Papa.parse is 0-indexed and we have headers
          }
          return e.message;
        });
        
        return res.status(400).json({ 
          message: "CSV parsing errors", 
          details: `Found ${parsed.errors.length} parsing error(s):`,
          errors: errorDetails
        });
      }

      if (!parsed.data || parsed.data.length === 0) {
        return res.status(400).json({
          message: "No data rows found",
          details: "The CSV file appears to have headers but no data rows."
        });
      }

      // Check for required columns
      const firstRow = parsed.data[0] as any;
      const availableColumns = Object.keys(firstRow);
      const hasGerman = availableColumns.some(col => col.toLowerCase().includes('german'));
      const hasEnglish = availableColumns.some(col => col.toLowerCase().includes('english'));

      if (!hasGerman) {
        return res.status(400).json({
          message: "Missing required column: 'german'",
          details: `Available columns: ${availableColumns.join(', ')}. Please ensure you have a column named 'german' or 'German'.`
        });
      }

      if (!hasEnglish) {
        return res.status(400).json({
          message: "Missing required column: 'english'",
          details: `Available columns: ${availableColumns.join(', ')}. Please ensure you have a column named 'english' or 'English'.`
        });
      }

      const errors: string[] = [];
      const words = parsed.data.map((row: any, index: number) => {
        const rowNum = index + 2; // +2 for header and 0-indexing
        
        // Clean up article field - treat "-", "none", or empty as undefined
        let article = row.article || row.Article;
        if (article === "-" || article === "none" || article === "" || !article) {
          article = undefined;
        }
        
        // Determine word type - if no article or article is "-", default to verb
        let wordType = row.wordType || row["Word Type"] || row.type || "noun";
        
        // Validate and normalize wordType
        const validWordTypes = ["noun", "verb", "adjective", "adverb", "expression", "phrase", "other"];
        if (!validWordTypes.includes(wordType.toLowerCase())) {
          errors.push(`Row ${rowNum}: Invalid wordType '${wordType}'. Valid options: ${validWordTypes.join(', ')}`);
          wordType = "noun"; // Default fallback
        } else {
          wordType = wordType.toLowerCase();
        }

        const german = row.german || row.German;
        const english = row.english || row.English;

        // Validate required fields
        if (!german || german.trim() === "") {
          errors.push(`Row ${rowNum}: Missing or empty 'german' field`);
        }
        
        if (!english || english.trim() === "") {
          errors.push(`Row ${rowNum}: Missing or empty 'english' field`);
        }

        // Validate article for nouns
        if (wordType === "noun" && !article) {
          errors.push(`Row ${rowNum}: Word '${german}' is marked as a noun but has no article. Please provide der/die/das or change wordType.`);
        }

        // Validate article values
        if (article && !["der", "die", "das"].includes(article.toLowerCase())) {
          errors.push(`Row ${rowNum}: Invalid article '${article}' for word '${german}'. Must be 'der', 'die', or 'das'.`);
        }
        
        return {
          german: german?.trim(),
          article: article?.toLowerCase(),
          english: english?.trim(),
          category: (row.category || row.Category || "Other").trim(),
          wordType: wordType,
          exampleSentence: (row.exampleSentence || row["Example Sentence"] || "").trim(),
          exampleTranslation: (row.exampleTranslation || row["Example Translation"] || "").trim(),
          memoryTip: (row.memoryTip || row["Memory Tip"] || "").trim()
        };
      });

      // Return validation errors if any
      if (errors.length > 0) {
        return res.status(400).json({
          message: `Found ${errors.length} validation error(s)`,
          details: "Please fix the following issues in your CSV:",
          errors: errors
        });
      }

      const validation = z.array(insertVocabularyWordSchema).safeParse(words);
      if (!validation.success) {
        const detailedErrors = validation.error.errors.map(err => {
          const path = err.path.length > 0 ? `Field '${err.path.join('.')}': ` : '';
          return `${path}${err.message}`;
        });
        
        return res.status(400).json({ 
          message: "Schema validation failed", 
          details: "The CSV data doesn't match the expected format:",
          errors: detailedErrors 
        });
      }

      const createdWords = await storage.createVocabularyWords(validation.data);
      const duplicatesSkipped = validation.data.length - createdWords.length;
      
      let message = `${createdWords.length} words imported successfully`;
      if (duplicatesSkipped > 0) {
        message += ` (${duplicatesSkipped} duplicates skipped)`;
      }
      
      res.status(201).json({ message, words: createdWords });
    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ 
        message: "Failed to process CSV file",
        details: "An unexpected error occurred while processing your CSV file. Please check the file format and try again."
      });
    }
  });

  // AI vocabulary generation (simplified - remove for now)
  app.post("/api/vocabulary/ai-generate", async (req, res) => {
    try {
      res.status(501).json({ 
        message: "AI vocabulary generation temporarily unavailable",
        details: "This feature is being updated. Please use manual word entry or CSV upload for now."
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate vocabulary" });
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

  app.get("/api/progress/word/:wordId", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      const wordId = req.params.wordId;
      const progress = await storage.getUserProgressForWord(wordId, userId);
      
      if (!progress) {
        return res.status(404).json({ message: "Progress not found" });
      }
      
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch progress for word" });
    }
  });

  app.post("/api/progress/word/:wordId", async (req, res) => {
    try {
      const userId = req.body.userId || "default_user";
      const wordId = req.params.wordId;
      const correct = req.body.correct === true;
      
      // Check if progress already exists
      const existingProgress = await storage.getUserProgressForWord(wordId, userId);
      
      if (existingProgress) {
        // Update existing progress
        const updates = {
          correctCount: (existingProgress.correctCount || 0) + (correct ? 1 : 0),
          incorrectCount: (existingProgress.incorrectCount || 0) + (correct ? 0 : 1),
          lastReviewed: new Date(),
          nextReview: new Date(Date.now() + (correct ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)),
          easeFactor: correct ? Math.min((existingProgress.easeFactor || 250) + 10, 300) : Math.max((existingProgress.easeFactor || 250) - 20, 130),
          interval: correct ? (existingProgress.interval || 1) + 1 : 1,
          level: correct ? (existingProgress.level || 1) + 1 : Math.max((existingProgress.level || 1) - 1, 1)
        };
        
        const progress = await storage.updateUserProgress(existingProgress.id, updates);
        res.json(progress);
      } else {
        // Create new progress
        const progress = await storage.createUserProgress({
          wordId,
          userId,
          level: 1,
          correctCount: correct ? 1 : 0,
          incorrectCount: correct ? 0 : 1,
          lastReviewed: new Date(),
          nextReview: new Date(Date.now() + (correct ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)),
          easeFactor: correct ? 250 : 200,
          interval: correct ? 1 : 0
        });
        res.json(progress);
      }
    } catch (error) {
      console.error('Progress update error:', error);
      res.status(500).json({ message: "Failed to update progress for word" });
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



  // Grammar explanation route
  // Sentence practice routes
  app.post("/api/sentence-practice/generate", async (req, res) => {
    try {
      const { words, difficulty = "intermediate" } = req.body;
      
      if (!words || !Array.isArray(words) || words.length < 2) {
        return res.status(400).json({ message: "Need at least 2 words for sentence practice" });
      }

      const wordList = words.map(w => `${w.article ? w.article + ' ' : ''}${w.german} (${w.english})`).join(", ");
      const categories = [...new Set(words.map(w => w.category))].join(", ");
      
      const prompt = await generateSentencePrompt(words, difficulty);
      
      res.json({
        prompt,
        difficulty,
        categories
      });
    } catch (error) {
      console.error('Sentence practice generation error:', error);
      res.status(500).json({ message: "Failed to generate sentence practice" });
    }
  });

  app.post("/api/sentence-practice/evaluate", async (req, res) => {
    try {
      const { sentence, words, prompt } = req.body;
      
      if (!sentence || !words || !Array.isArray(words)) {
        return res.status(400).json({ message: "Invalid sentence practice data" });
      }

      const feedback = await evaluateSentence(sentence, words, prompt);
      
      res.json(feedback);
    } catch (error) {
      console.error('Sentence evaluation error:', error);
      res.status(500).json({ message: "Failed to evaluate sentence" });
    }
  });

  app.post("/api/sentence-practice/generate-grammar", async (req, res) => {
    try {
      const { words, grammarTopic, difficulty = "intermediate" } = req.body;
      
      if (!words || !Array.isArray(words) || words.length < 2) {
        return res.status(400).json({ message: "Need at least 2 words for sentence practice" });
      }

      if (!grammarTopic) {
        return res.status(400).json({ message: "Grammar topic is required" });
      }

      const prompt = await generateGrammarSentencePrompt(grammarTopic, words, difficulty);
      
      res.json({
        prompt,
        difficulty,
        grammarTopic,
        type: "grammar-focused"
      });
    } catch (error) {
      console.error('Grammar sentence practice generation error:', error);
      res.status(500).json({ message: "Failed to generate grammar sentence practice" });
    }
  });

  app.post("/api/grammar/explain", async (req, res) => {
    try {
      const { topic, language } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      const explanation = await explainGrammarTopic(topic, language || 'english');
      res.json({ explanation });
    } catch (error: any) {
      console.error('Grammar explanation error:', error);
      const errorMessage = error.message || "Failed to generate grammar explanation";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Grammar exercises route
  app.post("/api/grammar/exercises", async (req, res) => {
    try {
      const { topic, language } = req.body;
      
      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      const exercises = await generateGrammarExercises(topic, language || 'english');
      res.json({ exercises });
    } catch (error: any) {
      console.error('Grammar exercises error:', error);
      const errorMessage = error.message || "Failed to generate grammar exercises";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const userId = req.query.userId as string || "default_user";
      let settings = await storage.getUserSettings(userId);
      
      // Create default settings if none exist
      if (!settings) {
        settings = await storage.createUserSettings({
          userId,
          newWordsPerSession: 10,
          reviewSessionSize: 25,
          autoPronounce: true,
          showTips: true,
          spacedRepetitionDifficulty: "normal",
          enableNotifications: true,
          language: "english",
          reminderTime: "18:00",
          enableWhatsappReminders: false
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const validation = insertUserSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid settings data", errors: validation.error.errors });
      }

      const userId = validation.data.userId || "default_user";
      let settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        // Create new settings
        settings = await storage.createUserSettings(validation.data);
      } else {
        // Update existing settings
        settings = await storage.updateUserSettings(userId, validation.data);
      }
      
      if (!settings) {
        return res.status(404).json({ message: "Failed to update settings" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Send test SMS message using TextBelt API (free for testing)
  app.post("/api/settings/test-notification", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const testMessage = `🎓 SprachMeister Test SMS!

Hello! This is a test message to confirm your SMS notifications are working.

Your daily German learning reminders will be sent to this number.

Viel Erfolg beim Deutschlernen! 🇩🇪`;

      // Try multiple SMS services in sequence for better reliability
      const smsServices = [
        {
          name: 'TextBelt',
          url: 'https://textbelt.com/text',
          body: {
            phone: phoneNumber,
            message: testMessage,
            key: 'textbelt'
          }
        },
        {
          name: 'SMSApi (alternative)',
          url: 'https://api.sms.to/sms/send',
          headers: {
            'Authorization': 'Bearer demo', // Demo key for testing
            'Content-Type': 'application/json'
          },
          body: {
            to: phoneNumber,
            message: testMessage,
            sender_id: 'SprachMeister'
          }
        }
      ];

      let lastError = null;
      
      for (const service of smsServices) {
        try {
          console.log(`Attempting SMS via ${service.name} to ${phoneNumber}`);
          
          const response = await fetch(service.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...service.headers
            },
            body: JSON.stringify(service.body)
          });

          const result = await response.json();
          console.log(`${service.name} response:`, result);

          // Handle TextBelt response format
          if (service.name === 'TextBelt' && result.success) {
            res.json({ 
              success: true, 
              message: `Test SMS sent successfully via ${service.name}`,
              phoneNumber: phoneNumber,
              timestamp: new Date().toISOString(),
              quotaRemaining: result.quotaRemaining,
              service: service.name
            });
            return;
          }
          
          // Handle SMS.to response format
          if (service.name.includes('SMSApi') && result.success) {
            res.json({ 
              success: true, 
              message: `Test SMS sent successfully via ${service.name}`,
              phoneNumber: phoneNumber,
              timestamp: new Date().toISOString(),
              service: service.name
            });
            return;
          }
          
          // If this service failed, try the next one
          lastError = result.error || result.message || 'Unknown error';
          console.log(`${service.name} failed:`, lastError);
          
        } catch (apiError) {
          console.error(`${service.name} API error:`, apiError);
          lastError = apiError.message;
        }
      }
      
      // If all services failed, provide helpful error message
      res.status(400).json({ 
        success: false,
        message: `SMS delivery failed. This might be due to: 
        1. Country restrictions on free SMS services
        2. Invalid phone number format
        3. SMS service limitations
        
        Last error: ${lastError}
        
        For production use, consider setting up Twilio, AWS SNS, or another paid SMS service.`,
        phoneNumber: phoneNumber,
        suggestion: "Try a different phone number or consider using browser notifications as an alternative."
      });
    } catch (error) {
      console.error('SMS test error:', error);
      res.status(500).json({ message: "Failed to send test SMS" });
    }
  });

  // Export database schema
  app.get("/api/export/schema", async (req, res) => {
    try {
      const schema = {
        tables: {
          vocabulary_words: {
            description: "German vocabulary words with translations and metadata",
            columns: {
              id: "UUID primary key",
              german: "German word or phrase",
              article: "German article (der/die/das) - required only for nouns",
              english: "English translation",
              category: "Learning category",
              word_type: "Type: noun, verb, adjective, adverb, expression, phrase, other",
              example_sentence: "German example sentence",
              example_translation: "English translation of example",
              memory_tip: "Mnemonic or memory aid",
              difficulty: "Difficulty level (1-5)",
              created_at: "Timestamp when added"
            }
          },
          user_progress: {
            description: "Spaced repetition progress tracking",
            columns: {
              id: "UUID primary key",
              word_id: "Reference to vocabulary word",
              user_id: "User identifier",
              level: "Spaced repetition level",
              correct_count: "Number of correct answers",
              incorrect_count: "Number of incorrect answers",
              last_reviewed: "Last review timestamp",
              next_review: "Next review due timestamp",
              ease_factor: "Spaced repetition ease factor",
              interval: "Days until next review",
              created_at: "Progress tracking start date"
            }
          },
          learning_sessions: {
            description: "Learning session history and statistics",
            columns: {
              id: "UUID primary key",
              user_id: "User identifier",
              type: "Session type: learn or review",
              words_count: "Number of words in session",
              correct_answers: "Correct answers in session",
              total_answers: "Total answers in session",
              duration: "Session duration in minutes",
              completed: "Whether session was completed",
              created_at: "Session start timestamp"
            }
          },
          user_settings: {
            description: "User preferences and configuration",
            columns: {
              id: "UUID primary key",
              user_id: "User identifier",
              new_words_per_session: "Words per learning session",
              review_session_size: "Words per review session",
              auto_pronounce: "Auto-play pronunciation",
              show_tips: "Show memory tips",
              spaced_repetition_difficulty: "Algorithm difficulty: easy, normal, hard",
              enable_notifications: "Enable review notifications",
              language: "App language: english, german",
              whatsapp_number: "Phone number for WhatsApp reminders",
              reminder_time: "Daily reminder time (HH:MM)",
              enable_whatsapp_reminders: "Enable WhatsApp notifications",
              created_at: "Settings creation timestamp"
            }
          }
        },
        relationships: {
          "user_progress -> vocabulary_words": "Many-to-one via word_id",
          "learning_sessions -> user": "Many-to-one via user_id",
          "user_settings -> user": "One-to-one via user_id"
        },
        export_info: {
          generated_at: new Date().toISOString(),
          app_name: "SprachMeister - German B1 Trainer",
          version: "1.0",
          database_type: "PostgreSQL with Drizzle ORM"
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="sprachmeister-schema.json"');
      res.json(schema);
    } catch (error) {
      console.error('Schema export error:', error);
      res.status(500).json({ message: "Failed to export database schema" });
    }
  });

  // Export vocabulary as CSV
  app.get("/api/export/vocabulary", async (req, res) => {
    try {
      const words = await storage.getVocabularyWords();
      
      // CSV headers
      const headers = [
        "German",
        "Article", 
        "English",
        "Category",
        "Word Type",
        "Example Sentence",
        "Example Translation",
        "Memory Tip",
        "Difficulty"
      ];

      // Convert words to CSV format
      const csvRows = [
        headers.join(","),
        ...words.map(word => [
          `"${(word.german || "").replace(/"/g, '""')}"`,
          `"${(word.article || "").replace(/"/g, '""')}"`,
          `"${(word.english || "").replace(/"/g, '""')}"`,
          `"${(word.category || "").replace(/"/g, '""')}"`,
          `"${(word.wordType || "noun").replace(/"/g, '""')}"`,
          `"${(word.exampleSentence || "").replace(/"/g, '""')}"`,
          `"${(word.exampleTranslation || "").replace(/"/g, '""')}"`,
          `"${(word.memoryTip || "").replace(/"/g, '""')}"`,
          `"${word.difficulty || 1}"`
        ].join(","))
      ];

      const csvContent = csvRows.join("\n");
      const filename = `german-vocabulary-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Vocabulary export error:', error);
      res.status(500).json({ message: "Failed to export vocabulary" });
    }
  });

  // Download CSV template
  app.get("/api/template/vocabulary-csv", async (req, res) => {
    try {
      const headers = [
        "German",
        "Article", 
        "English",
        "Category",
        "Word Type",
        "Example Sentence",
        "Example Translation",
        "Memory Tip",
        "Difficulty"
      ];

      const sampleRows = [
        [
          "Hund",
          "der",
          "dog",
          "Animals",
          "noun",
          "Der Hund bellt laut.",
          "The dog barks loudly.",
          "Think of a hound dog - both start with 'h'",
          "1"
        ],
        [
          "laufen",
          "",
          "to run",
          "Verbs",
          "verb",
          "Ich laufe jeden Tag.",
          "I run every day.",
          "Laufen sounds like 'loafen' - but it means the opposite!",
          "2"
        ],
        [
          "schnell",
          "",
          "fast, quick",
          "Adjectives",
          "adjective",
          "Das Auto ist sehr schnell.",
          "The car is very fast.",
          "Schnell sounds like 'snail' but means the opposite - fast!",
          "1"
        ]
      ];

      const csvRows = [
        headers.join(","),
        ...sampleRows.map(row => 
          row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")
        )
      ];

      const csvContent = csvRows.join("\n");

      res.setHeader('Content-Type', 'text/csv;charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="vocabulary-template.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error('Template export error:', error);
      res.status(500).json({ message: "Failed to generate CSV template" });
    }
  });

  // Single word by ID - moved to end to avoid route conflicts
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

  const httpServer = createServer(app);
  return httpServer;
}
