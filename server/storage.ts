import { type VocabularyWord, type InsertVocabularyWord, type UserProgress, type InsertUserProgress, type LearningSession, type InsertLearningSession, type UserSettings, type InsertUserSettings, type VocabularyWordWithProgress, type DashboardStats, type CategoryProgress } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { vocabularyWords, userProgress, learningSessions, userSettings } from "@shared/schema";
import { eq, and, desc, sql, lt, gte } from "drizzle-orm";

export interface IStorage {
  // Vocabulary words
  getVocabularyWords(): Promise<VocabularyWord[]>;
  getVocabularyWordById(id: string): Promise<VocabularyWord | undefined>;
  getVocabularyWordsByCategory(category: string): Promise<VocabularyWord[]>;
  createVocabularyWord(word: InsertVocabularyWord): Promise<VocabularyWord>;
  createVocabularyWords(words: InsertVocabularyWord[]): Promise<VocabularyWord[]>;
  updateVocabularyWord(id: string, word: Partial<VocabularyWord>): Promise<VocabularyWord | undefined>;
  deleteVocabularyWord(id: string): Promise<boolean>;
  
  // User progress
  getUserProgress(userId?: string): Promise<UserProgress[]>;
  getUserProgressForWord(wordId: string, userId?: string): Promise<UserProgress | undefined>;
  createUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateUserProgress(id: string, progress: Partial<UserProgress>): Promise<UserProgress | undefined>;
  createOrUpdateUserProgressForWord(wordId: string, userId: string, correct: boolean): Promise<UserProgress>;
  
  // Learning sessions
  getLearningSession(id: string): Promise<LearningSession | undefined>;
  createLearningSession(session: InsertLearningSession): Promise<LearningSession>;
  updateLearningSession(id: string, session: Partial<LearningSession>): Promise<LearningSession | undefined>;
  getRecentSessions(userId?: string, limit?: number): Promise<LearningSession[]>;
  
  // User settings
  getUserSettings(userId?: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<UserSettings | undefined>;
  
  // Complex queries
  getVocabularyWordsWithProgress(userId?: string): Promise<VocabularyWordWithProgress[]>;
  getWordsForReview(userId?: string, limit?: number): Promise<VocabularyWordWithProgress[]>;
  getAllWordsForReview(userId?: string, limit?: number): Promise<VocabularyWordWithProgress[]>;
  getWordsForLearning(userId?: string, limit?: number): Promise<VocabularyWordWithProgress[]>;
  getDashboardStats(userId?: string): Promise<DashboardStats>;
  getCategoryProgress(userId?: string): Promise<CategoryProgress[]>;
}

export class MemStorage implements IStorage {
  private vocabularyWords: Map<string, VocabularyWord>;
  private userProgress: Map<string, UserProgress>;
  private learningSessions: Map<string, LearningSession>;
  private userSettings: Map<string, UserSettings>;

  constructor() {
    this.vocabularyWords = new Map();
    this.userProgress = new Map();
    this.learningSessions = new Map();
    this.userSettings = new Map();
    
    // Initialize with default TELC B1 vocabulary
    this.initializeDefaultVocabulary();
  }

  private async initializeDefaultVocabulary() {
    const defaultWords: InsertVocabularyWord[] = [
      {
        german: "Speisekarte",
        article: "die",
        english: "menu",
        category: "Food & Dining",
        wordType: "noun",
        exampleSentence: "Ich möchte gerne die Speisekarte sehen.",
        exampleTranslation: "I would like to see the menu, please.",
        memoryTip: "'Speise' means food/dish, 'Karte' means card - so 'Speisekarte' is literally a 'food card' or menu."
      },
      {
        german: "Kaffee",
        article: "der",
        english: "coffee",
        category: "Food & Dining",
        wordType: "noun",
        exampleSentence: "Ich trinke gerne Kaffee am Morgen.",
        exampleTranslation: "I like to drink coffee in the morning.",
        memoryTip: "Coffee is masculine in German - remember 'der Kaffee'."
      },
      {
        german: "Restaurant",
        article: "das",
        english: "restaurant",
        category: "Food & Dining",
        wordType: "noun",
        exampleSentence: "Das Restaurant ist sehr gut.",
        exampleTranslation: "The restaurant is very good.",
        memoryTip: "Restaurant is neuter - 'das Restaurant'."
      },
      {
        german: "Bahnhof",
        article: "der",
        english: "train station",
        category: "Transportation",
        wordType: "noun",
        exampleSentence: "Der Bahnhof ist nicht weit von hier.",
        exampleTranslation: "The train station is not far from here.",
        memoryTip: "'Bahn' means railway, 'Hof' means yard - so 'Bahnhof' is a railway yard."
      },
      {
        german: "Straßenbahn",
        article: "die",
        english: "tram",
        category: "Transportation",
        wordType: "noun",
        exampleSentence: "Die Straßenbahn kommt alle 10 Minuten.",
        exampleTranslation: "The tram comes every 10 minutes.",
        memoryTip: "'Straße' means street, 'Bahn' means railway - street railway = tram."
      }
    ];

    for (const word of defaultWords) {
      await this.createVocabularyWord(word);
    }

    // Initialize default settings
    await this.createUserSettings({
      userId: "default_user",
      newWordsPerSession: 10,
      reviewSessionSize: 25,
      autoPronounce: true,
      showTips: true,
      spacedRepetitionDifficulty: "normal",
      enableNotifications: true
    });
  }

  async getVocabularyWords(): Promise<VocabularyWord[]> {
    return Array.from(this.vocabularyWords.values());
  }

  async getVocabularyWordById(id: string): Promise<VocabularyWord | undefined> {
    return this.vocabularyWords.get(id);
  }

  async getVocabularyWordsByCategory(category: string): Promise<VocabularyWord[]> {
    return Array.from(this.vocabularyWords.values()).filter(word => word.category === category);
  }

  async createVocabularyWord(insertWord: InsertVocabularyWord): Promise<VocabularyWord> {
    const id = randomUUID();
    const word: VocabularyWord = {
      ...insertWord,
      id,
      createdAt: new Date(),
    };
    this.vocabularyWords.set(id, word);
    return word;
  }

  async createVocabularyWords(words: InsertVocabularyWord[]): Promise<VocabularyWord[]> {
    const createdWords: VocabularyWord[] = [];
    
    // Filter out duplicates based on german word (case insensitive)
    const existingWords = await this.getVocabularyWords();
    const existingGermanWords = new Set(existingWords.map(w => w.german.toLowerCase()));
    
    const uniqueWords = words.filter(word => {
      const isDuplicate = existingGermanWords.has(word.german.toLowerCase());
      if (!isDuplicate) {
        existingGermanWords.add(word.german.toLowerCase()); // Prevent duplicates within the same batch
      }
      return !isDuplicate;
    });
    
    console.log(`Filtering duplicates: ${words.length} submitted, ${uniqueWords.length} unique words to add`);
    
    for (const word of uniqueWords) {
      createdWords.push(await this.createVocabularyWord(word));
    }
    return createdWords;
  }

  async updateVocabularyWord(id: string, updates: Partial<VocabularyWord>): Promise<VocabularyWord | undefined> {
    const word = this.vocabularyWords.get(id);
    if (!word) return undefined;
    
    const updatedWord = { ...word, ...updates };
    this.vocabularyWords.set(id, updatedWord);
    return updatedWord;
  }

  async deleteVocabularyWord(id: string): Promise<boolean> {
    return this.vocabularyWords.delete(id);
  }

  async getUserProgress(userId = "default_user"): Promise<UserProgress[]> {
    return Array.from(this.userProgress.values()).filter(p => p.userId === userId);
  }

  async getUserProgressForWord(wordId: string, userId = "default_user"): Promise<UserProgress | undefined> {
    return Array.from(this.userProgress.values()).find(p => p.wordId === wordId && p.userId === userId);
  }

  async createOrUpdateUserProgressForWord(wordId: string, userId: string, correct: boolean): Promise<UserProgress> {
    const existing = await this.getUserProgressForWord(wordId, userId);
    
    if (existing) {
      // Update existing progress
      const updates = {
        correctCount: (existing.correctCount || 0) + (correct ? 1 : 0),
        incorrectCount: (existing.incorrectCount || 0) + (correct ? 0 : 1),
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + (correct ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)),
        easeFactor: correct ? Math.min((existing.easeFactor || 250) + 10, 300) : Math.max((existing.easeFactor || 250) - 20, 130),
        interval: correct ? (existing.interval || 1) + 1 : 1,
        level: correct ? (existing.level || 1) + 1 : Math.max((existing.level || 1) - 1, 1)
      };
      
      return await this.updateUserProgress(existing.id, updates) || existing;
    } else {
      // Create new progress
      return await this.createUserProgress({
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
    }
  }

  async createUserProgress(insertProgress: InsertUserProgress): Promise<UserProgress> {
    const id = randomUUID();
    const progress: UserProgress = {
      ...insertProgress,
      id,
      createdAt: new Date(),
    };
    this.userProgress.set(id, progress);
    return progress;
  }

  async updateUserProgress(id: string, updates: Partial<UserProgress>): Promise<UserProgress | undefined> {
    const progress = this.userProgress.get(id);
    if (!progress) return undefined;
    
    const updatedProgress = { ...progress, ...updates };
    this.userProgress.set(id, updatedProgress);
    return updatedProgress;
  }

  async getLearningSession(id: string): Promise<LearningSession | undefined> {
    return this.learningSessions.get(id);
  }

  async createLearningSession(insertSession: InsertLearningSession): Promise<LearningSession> {
    const id = randomUUID();
    const session: LearningSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.learningSessions.set(id, session);
    return session;
  }

  async updateLearningSession(id: string, updates: Partial<LearningSession>): Promise<LearningSession | undefined> {
    const session = this.learningSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.learningSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getRecentSessions(userId = "default_user", limit = 10): Promise<LearningSession[]> {
    return Array.from(this.learningSessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  async getUserSettings(userId = "default_user"): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(s => s.userId === userId);
  }

  async createUserSettings(insertSettings: InsertUserSettings): Promise<UserSettings> {
    const id = randomUUID();
    const settings: UserSettings = {
      ...insertSettings,
      id,
      createdAt: new Date(),
    };
    this.userSettings.set(id, settings);
    return settings;
  }

  async updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings | undefined> {
    const settings = Array.from(this.userSettings.values()).find(s => s.userId === userId);
    if (!settings) return undefined;
    
    const updatedSettings = { ...settings, ...updates };
    this.userSettings.set(settings.id, updatedSettings);
    return updatedSettings;
  }

  async getVocabularyWordsWithProgress(userId = "default_user"): Promise<VocabularyWordWithProgress[]> {
    const words = await this.getVocabularyWords();
    const progressList = await this.getUserProgress(userId);
    
    return words.map(word => {
      const progress = progressList.find(p => p.wordId === word.id);
      const accuracyRate = progress ? 
        (progress.correctCount / Math.max(progress.correctCount + progress.incorrectCount, 1)) * 100 : 0;
      
      const daysUntilReview = progress?.nextReview ? 
        Math.ceil((new Date(progress.nextReview).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        ...word,
        progress,
        accuracyRate,
        daysUntilReview
      };
    });
  }

  async getWordsForReview(userId = "default_user", limit = 25): Promise<VocabularyWordWithProgress[]> {
    const wordsWithProgress = await this.getVocabularyWordsWithProgress(userId);
    
    // Return only words that are due for review (scheduled review)
    return wordsWithProgress
      .filter(word => 
        word.progress && 
        word.progress.lastReviewed && 
        word.progress.nextReview &&
        new Date() >= new Date(word.progress.nextReview)
      )
      .sort(() => Math.random() - 0.5) // Randomize order
      .slice(0, limit);
  }

  async getAllWordsForReview(userId = "default_user", limit = 50): Promise<VocabularyWordWithProgress[]> {
    const wordsWithProgress = await this.getVocabularyWordsWithProgress(userId);
    
    // Return all learned words (words that have been reviewed at least once)
    // This allows practicing any learned vocabulary, regardless of review schedule
    return wordsWithProgress
      .filter(word => 
        word.progress && 
        word.progress.lastReviewed // Must have been learned/reviewed at least once
      )
      .sort(() => Math.random() - 0.5) // Randomize order
      .slice(0, limit);
  }

  async getWordsForLearning(userId = "default_user", limit = 10): Promise<VocabularyWordWithProgress[]> {
    const wordsWithProgress = await this.getVocabularyWordsWithProgress(userId);
    
    return wordsWithProgress
      .filter(word => !word.progress) // Words not yet learned
      .sort(() => Math.random() - 0.5) // Randomize order
      .slice(0, limit);
  }

  async getDashboardStats(userId = "default_user"): Promise<DashboardStats> {
    const sessions = await this.getRecentSessions(userId, 30);
    const wordsWithProgress = await this.getVocabularyWordsWithProgress(userId);
    const totalWords = wordsWithProgress.length;
    const wordsLearned = wordsWithProgress.filter(w => w.progress).length;
    
    // Calculate streak
    let streak = 0;
    const today = new Date();
    const sortedSessions = sessions.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
    
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.createdAt!);
      const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else {
        break;
      }
    }

    // Calculate accuracy
    const totalAnswers = sessions.reduce((sum, s) => sum + (s.totalAnswers || 0), 0);
    const correctAnswers = sessions.reduce((sum, s) => sum + (s.correctAnswers || 0), 0);
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    // Count due words
    const dueWords = wordsWithProgress.filter(w => 
      w.progress && w.progress.nextReview && new Date(w.progress.nextReview) <= today
    ).length;

    return {
      streak,
      wordsLearned,
      totalWords,
      accuracy,
      dueWords
    };
  }

  async getCategoryProgress(userId = "default_user"): Promise<CategoryProgress[]> {
    const wordsWithProgress = await this.getVocabularyWordsWithProgress(userId);
    const categories = [...new Set(wordsWithProgress.map(w => w.category))];
    
    return categories.map(category => {
      const categoryWords = wordsWithProgress.filter(w => w.category === category);
      const learned = categoryWords.filter(w => w.progress).length;
      const total = categoryWords.length;
      
      return {
        category,
        learned,
        total,
        percentage: total > 0 ? Math.round((learned / total) * 100) : 0
      };
    });
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  private async initializeDefaultData() {
    // Check if we already have vocabulary words
    const existingWords = await db.select().from(vocabularyWords).limit(1);
    if (existingWords.length > 0) {
      return; // Already initialized
    }

    // Initialize with default TELC B1 vocabulary
    const defaultWords: InsertVocabularyWord[] = [
      {
        german: "Speisekarte",
        article: "die",
        english: "menu",
        category: "Food & Dining",
        exampleSentence: "Ich möchte gerne die Speisekarte sehen.",
        exampleTranslation: "I would like to see the menu, please.",
        memoryTip: "'Speise' means food/dish, 'Karte' means card - so 'Speisekarte' is literally a 'food card' or menu."
      },
      {
        german: "Kaffee",
        article: "der",
        english: "coffee",
        category: "Food & Dining",
        exampleSentence: "Ich trinke gerne Kaffee am Morgen.",
        exampleTranslation: "I like to drink coffee in the morning.",
        memoryTip: "Coffee is masculine in German - remember 'der Kaffee'."
      },
      {
        german: "Rechnung",
        article: "die",
        english: "bill",
        category: "Food & Dining",
        exampleSentence: "Können Sie mir bitte die Rechnung bringen?",
        exampleTranslation: "Could you please bring me the bill?",
        memoryTip: "Think of 'reckoning' - calculating what you owe."
      },
      {
        german: "Termin",
        article: "der",
        english: "appointment",
        category: "Healthcare",
        exampleSentence: "Ich brauche einen Termin beim Arzt.",
        exampleTranslation: "I need an appointment with the doctor.",
        memoryTip: "'Termin' sounds like 'terminate' - ending your wait for an appointment."
      },
      {
        german: "Krankenhaus",
        article: "das",
        english: "hospital",
        category: "Healthcare",
        exampleSentence: "Das Krankenhaus ist sehr modern.",
        exampleTranslation: "The hospital is very modern.",
        memoryTip: "'Kranken' (sick) + 'haus' (house) = sick house = hospital."
      }
    ];

    await db.insert(vocabularyWords).values(defaultWords);
  }

  async getVocabularyWords(): Promise<VocabularyWord[]> {
    return await db.select().from(vocabularyWords);
  }

  async getVocabularyWordById(id: string): Promise<VocabularyWord | undefined> {
    const [word] = await db.select().from(vocabularyWords).where(eq(vocabularyWords.id, id));
    return word || undefined;
  }

  async getVocabularyWordsByCategory(category: string): Promise<VocabularyWord[]> {
    return await db.select().from(vocabularyWords).where(eq(vocabularyWords.category, category));
  }

  async createVocabularyWord(word: InsertVocabularyWord): Promise<VocabularyWord> {
    const [created] = await db.insert(vocabularyWords).values(word).returning();
    return created;
  }

  async createVocabularyWords(words: InsertVocabularyWord[]): Promise<VocabularyWord[]> {
    // Filter out duplicates based on german word (case insensitive)
    const existingWords = await this.getVocabularyWords();
    const existingGermanWords = new Set(existingWords.map(w => w.german.toLowerCase()));
    
    const uniqueWords = words.filter(word => {
      const isDuplicate = existingGermanWords.has(word.german.toLowerCase());
      if (!isDuplicate) {
        existingGermanWords.add(word.german.toLowerCase()); // Prevent duplicates within the same batch
      }
      return !isDuplicate;
    });
    
    console.log(`Filtering duplicates: ${words.length} submitted, ${uniqueWords.length} unique words to add`);
    
    if (uniqueWords.length === 0) {
      return [];
    }
    
    return await db.insert(vocabularyWords).values(uniqueWords).returning();
  }

  async updateVocabularyWord(id: string, word: Partial<VocabularyWord>): Promise<VocabularyWord | undefined> {
    const [updated] = await db.update(vocabularyWords).set(word).where(eq(vocabularyWords.id, id)).returning();
    return updated || undefined;
  }

  async deleteVocabularyWord(id: string): Promise<boolean> {
    const result = await db.delete(vocabularyWords).where(eq(vocabularyWords.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUserProgress(userId = "default_user"): Promise<UserProgress[]> {
    return await db.select().from(userProgress).where(eq(userProgress.userId, userId));
  }

  async getUserProgressForWord(wordId: string, userId = "default_user"): Promise<UserProgress | undefined> {
    const [progress] = await db.select().from(userProgress)
      .where(and(eq(userProgress.wordId, wordId), eq(userProgress.userId, userId)));
    return progress || undefined;
  }

  async createUserProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [created] = await db.insert(userProgress).values(progress).returning();
    return created;
  }

  async updateUserProgress(id: string, progressUpdate: Partial<UserProgress>): Promise<UserProgress | undefined> {
    const [updated] = await db.update(userProgress).set(progressUpdate).where(eq(userProgress.id, id)).returning();
    return updated || undefined;
  }

  async getLearningSession(id: string): Promise<LearningSession | undefined> {
    const [session] = await db.select().from(learningSessions).where(eq(learningSessions.id, id));
    return session || undefined;
  }

  async createLearningSession(session: InsertLearningSession): Promise<LearningSession> {
    const [created] = await db.insert(learningSessions).values(session).returning();
    return created;
  }

  async updateLearningSession(id: string, sessionUpdate: Partial<LearningSession>): Promise<LearningSession | undefined> {
    const [updated] = await db.update(learningSessions).set(sessionUpdate).where(eq(learningSessions.id, id)).returning();
    return updated || undefined;
  }

  async getRecentSessions(userId = "default_user", limit = 10): Promise<LearningSession[]> {
    return await db.select().from(learningSessions)
      .where(eq(learningSessions.userId, userId))
      .orderBy(desc(learningSessions.createdAt))
      .limit(limit);
  }

  async getUserSettings(userId = "default_user"): Promise<UserSettings | undefined> {
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [created] = await db.insert(userSettings).values(settings).returning();
    return created;
  }

  async updateUserSettings(userId: string, settingsUpdate: Partial<UserSettings>): Promise<UserSettings | undefined> {
    const [updated] = await db.update(userSettings).set(settingsUpdate).where(eq(userSettings.userId, userId)).returning();
    return updated || undefined;
  }

  async getVocabularyWordsWithProgress(userId = "default_user"): Promise<VocabularyWordWithProgress[]> {
    const result = await db
      .select({
        id: vocabularyWords.id,
        german: vocabularyWords.german,
        article: vocabularyWords.article,
        english: vocabularyWords.english,
        category: vocabularyWords.category,
        wordType: vocabularyWords.wordType,
        exampleSentence: vocabularyWords.exampleSentence,
        exampleTranslation: vocabularyWords.exampleTranslation,
        memoryTip: vocabularyWords.memoryTip,
        difficulty: vocabularyWords.difficulty,
        createdAt: vocabularyWords.createdAt,
        progressId: userProgress.id,
        progressCreatedAt: userProgress.createdAt,
        wordId: userProgress.wordId,
        progressUserId: userProgress.userId,
        level: userProgress.level,
        correctCount: userProgress.correctCount,
        incorrectCount: userProgress.incorrectCount,
        lastReviewed: userProgress.lastReviewed,
        nextReview: userProgress.nextReview,
        easeFactor: userProgress.easeFactor,
        interval: userProgress.interval,
      })
      .from(vocabularyWords)
      .leftJoin(userProgress, and(
        eq(vocabularyWords.id, userProgress.wordId),
        eq(userProgress.userId, userId)
      ));

    return result.map(row => ({
      id: row.id,
      german: row.german,
      article: row.article,
      english: row.english,
      category: row.category,
      wordType: row.wordType,
      exampleSentence: row.exampleSentence,
      exampleTranslation: row.exampleTranslation,
      memoryTip: row.memoryTip,
      difficulty: row.difficulty,
      createdAt: row.createdAt,
      progress: row.progressId ? {
        id: row.progressId,
        createdAt: row.progressCreatedAt,
        wordId: row.wordId!,
        userId: row.progressUserId!,
        level: row.level,
        correctCount: row.correctCount,
        incorrectCount: row.incorrectCount,
        lastReviewed: row.lastReviewed,
        nextReview: row.nextReview,
        easeFactor: row.easeFactor,
        interval: row.interval,
      } : undefined,
      accuracyRate: (row.correctCount && row.incorrectCount !== null && (row.correctCount + row.incorrectCount) > 0) 
        ? Math.round((row.correctCount / (row.correctCount + row.incorrectCount)) * 100)
        : undefined
    }));
  }

  async getWordsForReview(userId = "default_user", limit = 25): Promise<VocabularyWordWithProgress[]> {
    const now = new Date();
    const allWords = await this.getVocabularyWordsWithProgress(userId);
    
    return allWords
      .filter(word => word.progress?.nextReview && word.progress.nextReview <= now)
      .slice(0, limit);
  }

  async getAllWordsForReview(userId = "default_user", limit = 25): Promise<VocabularyWordWithProgress[]> {
    const allWords = await this.getVocabularyWordsWithProgress(userId);
    
    // Get words that have been learned (have progress) and randomize them
    const learnedWords = allWords
      .filter(word => word.progress?.lastReviewed)
      .sort(() => Math.random() - 0.5); // Randomize the order
    
    // If we don't have enough learned words, include some unlearned words
    if (learnedWords.length < limit) {
      const unlearnedWords = allWords
        .filter(word => !word.progress?.lastReviewed)
        .sort(() => Math.random() - 0.5)
        .slice(0, limit - learnedWords.length);
      
      return [...learnedWords, ...unlearnedWords].slice(0, limit);
    }
    
    return learnedWords.slice(0, limit);
  }

  async getWordsForLearning(userId = "default_user", limit = 10): Promise<VocabularyWordWithProgress[]> {
    const allWords = await this.getVocabularyWordsWithProgress(userId);
    
    return allWords
      .filter(word => !word.progress?.lastReviewed)
      .slice(0, limit);
  }

  async getDashboardStats(userId = "default_user"): Promise<DashboardStats> {
    const allWords = await this.getVocabularyWordsWithProgress(userId);
    const wordsLearned = allWords.filter(word => word.progress?.lastReviewed).length;
    const totalWords = allWords.length;
    const dueWords = allWords.filter(word => word.progress?.nextReview && word.progress.nextReview <= new Date()).length;
    
    const recentSessions = await this.getRecentSessions(userId, 7);
    const streak = this.calculateStreak(recentSessions);
    
    // Calculate accuracy from recent sessions
    const totalAnswers = recentSessions.reduce((sum, session) => sum + (session.totalAnswers || 0), 0);
    const correctAnswers = recentSessions.reduce((sum, session) => sum + (session.correctAnswers || 0), 0);
    const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

    return {
      streak,
      wordsLearned,
      totalWords,
      accuracy,
      dueWords
    };
  }

  async getCategoryProgress(userId = "default_user"): Promise<CategoryProgress[]> {
    const allWords = await this.getVocabularyWordsWithProgress(userId);
    const categories = new Map<string, { total: number; learned: number; }>();

    allWords.forEach(word => {
      if (!categories.has(word.category)) {
        categories.set(word.category, { total: 0, learned: 0 });
      }
      const cat = categories.get(word.category)!;
      cat.total++;
      if (word.progress?.lastReviewed) {
        cat.learned++;
      }
    });

    return Array.from(categories.entries()).map(([category, stats]) => ({
      category,
      learned: stats.learned,
      total: stats.total,
      percentage: Math.round((stats.learned / stats.total) * 100)
    }));
  }

  async createOrUpdateUserProgressForWord(wordId: string, userId: string, correct: boolean): Promise<UserProgress> {
    const existing = await this.getUserProgressForWord(wordId, userId);
    
    if (existing) {
      // Update existing progress
      const updates = {
        correctCount: (existing.correctCount || 0) + (correct ? 1 : 0),
        incorrectCount: (existing.incorrectCount || 0) + (correct ? 0 : 1),
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + (correct ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)),
        easeFactor: correct ? Math.min((existing.easeFactor || 250) + 10, 300) : Math.max((existing.easeFactor || 250) - 20, 130),
        interval: correct ? (existing.interval || 1) + 1 : 1,
        level: correct ? (existing.level || 1) + 1 : Math.max((existing.level || 1) - 1, 1)
      };
      
      const [updated] = await db.update(userProgress).set(updates).where(eq(userProgress.id, existing.id)).returning();
      return updated;
    } else {
      // Create new progress
      const [created] = await db.insert(userProgress).values({
        wordId,
        userId,
        level: 1,
        correctCount: correct ? 1 : 0,
        incorrectCount: correct ? 0 : 1,
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + (correct ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000)),
        easeFactor: correct ? 250 : 200,
        interval: correct ? 1 : 0
      }).returning();
      return created;
    }
  }

  private calculateStreak(sessions: LearningSession[]): number {
    if (sessions.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let streak = 0;
    let currentDate = new Date(today);
    
    for (let i = 0; i < 30; i++) { // Check up to 30 days back
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const hasSessionOnDay = sessions.some(session => {
        const sessionDate = new Date(session.createdAt!);
        return sessionDate >= dayStart && sessionDate <= dayEnd && session.completed;
      });
      
      if (hasSessionOnDay) {
        streak++;
      } else if (streak > 0) {
        break; // Break streak if no session found
      }
      
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  }
}

export const storage = new DatabaseStorage();
