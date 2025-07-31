import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const vocabularyWords = pgTable("vocabulary_words", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  german: text("german").notNull(),
  article: text("article"), // der, die, das (optional for non-nouns)
  english: text("english").notNull(),
  category: text("category").notNull(),
  wordType: text("word_type").default("noun"), // noun, verb, adjective, expression, etc.
  exampleSentence: text("example_sentence"),
  exampleTranslation: text("example_translation"),
  memoryTip: text("memory_tip"),
  difficulty: integer("difficulty").default(1), // 1-5 scale
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wordId: varchar("word_id").notNull().references(() => vocabularyWords.id),
  userId: varchar("user_id").notNull().default("default_user"), // Single user for now
  level: integer("level").default(1), // Spaced repetition level
  correctCount: integer("correct_count").default(0),
  incorrectCount: integer("incorrect_count").default(0),
  lastReviewed: timestamp("last_reviewed"),
  nextReview: timestamp("next_review"),
  easeFactor: integer("ease_factor").default(250), // Spaced repetition ease factor (250 = 2.5)
  interval: integer("interval").default(1), // Days until next review
  createdAt: timestamp("created_at").defaultNow(),
});

export const learningSessions = pgTable("learning_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default("default_user"),
  type: text("type").notNull(), // 'learn' or 'review'
  wordsCount: integer("words_count").notNull(),
  correctAnswers: integer("correct_answers").default(0),
  totalAnswers: integer("total_answers").default(0),
  duration: integer("duration"), // in minutes
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default("default_user"),
  newWordsPerSession: integer("new_words_per_session").default(10),
  reviewSessionSize: integer("review_session_size").default(25),
  autoPronounce: boolean("auto_pronounce").default(true),
  showTips: boolean("show_tips").default(true),
  spacedRepetitionDifficulty: text("spaced_repetition_difficulty").default("normal"), // easy, normal, hard
  enableNotifications: boolean("enable_notifications").default(true),
  language: text("language").default("english"), // english, german
  whatsappNumber: text("whatsapp_number"), // phone number for WhatsApp reminders
  reminderTime: text("reminder_time").default("18:00"), // daily reminder time (HH:MM format)
  enableWhatsappReminders: boolean("enable_whatsapp_reminders").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertVocabularyWordSchema = createInsertSchema(vocabularyWords)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    wordType: z.enum(["noun", "verb", "adjective", "adverb", "expression", "phrase", "other"]).default("noun"),
  });

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  createdAt: true,
}).extend({
  lastReviewed: z.union([z.date(), z.string()]).optional(),
  nextReview: z.union([z.date(), z.string()]).optional(),
});

export const insertLearningSessionSchema = createInsertSchema(learningSessions).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
});

// Types
export type VocabularyWord = typeof vocabularyWords.$inferSelect;
export type InsertVocabularyWord = z.infer<typeof insertVocabularyWordSchema>;

export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;

export type LearningSession = typeof learningSessions.$inferSelect;
export type InsertLearningSession = z.infer<typeof insertLearningSessionSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Extended types for frontend
export type VocabularyWordWithProgress = VocabularyWord & {
  progress?: UserProgress;
  accuracyRate?: number;
  daysUntilReview?: number;
};

export type DashboardStats = {
  streak: number;
  wordsLearned: number;
  totalWords: number;
  accuracy: number;
  dueWords: number;
};

export type CategoryProgress = {
  category: string;
  learned: number;
  total: number;
  percentage: number;
};
