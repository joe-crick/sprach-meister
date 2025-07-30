import { type VocabularyWord, type InsertVocabularyWord, type UserProgress, type InsertUserProgress, type LearningSession, type InsertLearningSession, type UserSettings, type InsertUserSettings, type VocabularyWordWithProgress, type DashboardStats, type CategoryProgress } from "@shared/schema";
import { randomUUID } from "crypto";

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
        exampleSentence: "Ich möchte gerne die Speisekarte sehen.",
        exampleTranslation: "I would like to see the menu, please.",
        memoryTip: "'Speise' means food/dish, 'Karte' means card - so 'Speisekarte' is literally a 'food card' or menu."
      },
      {
        german: "Kaffee",
        article: "der",
        english: "coffee",
        category: "Food & Dining",
        exampleSentence: "Ich trinke gerne der Kaffee am Morgen.",
        exampleTranslation: "I like to drink coffee in the morning.",
        memoryTip: "Coffee is masculine in German - remember 'der Kaffee'."
      },
      {
        german: "Restaurant",
        article: "das",
        english: "restaurant",
        category: "Food & Dining",
        exampleSentence: "Das Restaurant ist sehr gut.",
        exampleTranslation: "The restaurant is very good.",
        memoryTip: "Restaurant is neuter - 'das Restaurant'."
      },
      {
        german: "Bahnhof",
        article: "der",
        english: "train station",
        category: "Transportation",
        exampleSentence: "Der Bahnhof ist nicht weit von hier.",
        exampleTranslation: "The train station is not far from here.",
        memoryTip: "'Bahn' means railway, 'Hof' means yard - so 'Bahnhof' is a railway yard."
      },
      {
        german: "Straßenbahn",
        article: "die",
        english: "tram",
        category: "Transportation",
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
    for (const word of words) {
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
    const now = new Date();
    
    return wordsWithProgress
      .filter(word => word.progress && word.progress.nextReview && new Date(word.progress.nextReview) <= now)
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

export const storage = new MemStorage();
