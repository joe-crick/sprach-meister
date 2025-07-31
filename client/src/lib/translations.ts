// Translation system for German B1 Trainer
export type Language = 'english' | 'german';

export interface Translations {
  // Navigation
  dashboard: string;
  learn: string;
  review: string;
  vocabulary: string;
  verbs: string;
  grammar: string;
  sentencePractice: string;
  progress: string;
  settings: string;

  // Dashboard
  dashboardTitle: string;
  wordsLearned: string;
  totalWords: string;
  accuracyRate: string;
  currentStreak: string;
  days: string;
  startLearning: string;
  reviewDue: string;
  practiceAll: string;
  recentSessions: string;
  noSessions: string;

  // Learning
  learnNew: string;
  wordsToLearn: string;
  continue: string;
  startTest: string;
  correct: string;
  incorrect: string;
  sessionComplete: string;
  wordsCompleted: string;
  accuracy: string;
  timeSpent: string;
  minutes: string;
  backToDashboard: string;

  // Review
  reviewWords: string;
  wordsToReview: string;
  nextReview: string;
  reviewComplete: string;

  // Settings
  settingsTitle: string;
  learningSettings: string;
  newWordsPerSession: string;
  reviewSessionSize: string;
  autoPronounce: string;
  autoPronounceDesc: string;
  showTips: string;
  showTipsDesc: string;
  language: string;
  audioSettings: string;
  speechRate: string;
  speechVolume: string;
  spacedRepetition: string;
  algorithmDifficulty: string;
  easy: string;
  normal: string;
  hard: string;
  smsReminders: string;
  enableSmsReminders: string;
  enableSmsRemindersDesc: string;
  phoneNumber: string;
  reminderTime: string;
  test: string;
  save: string;

  // Vocabulary
  addWord: string;
  germanWord: string;
  article: string;
  englishTranslation: string;
  category: string;
  wordType: string;
  exampleSentence: string;
  exampleTranslation: string;
  memoryTip: string;
  difficulty: string;
  cancel: string;
  update: string;
  delete: string;
  edit: string;

  // Common
  loading: string;
  error: string;
  success: string;
  close: string;
  ok: string;
  yes: string;
  no: string;
}

export const translations: Record<Language, Translations> = {
  english: {
    // Navigation
    dashboard: "Dashboard",
    learn: "Learn",
    review: "Review",
    vocabulary: "Vocabulary",
    verbs: "Verbs",
    grammar: "Grammar",
    sentencePractice: "Sentence Practice",
    progress: "Progress",
    settings: "Settings",

    // Dashboard
    dashboardTitle: "German B1 Trainer",
    wordsLearned: "Words Learned",
    totalWords: "Total Words",
    accuracyRate: "Accuracy Rate",
    currentStreak: "Current Streak",
    days: "days",
    startLearning: "Start Learning",
    reviewDue: "Review Due",
    practiceAll: "Practice All",
    recentSessions: "Recent Sessions",
    noSessions: "No learning sessions yet. Start your German journey!",

    // Learning
    learnNew: "Learn New Words",
    wordsToLearn: "words to learn",
    continue: "Continue",
    startTest: "Start Test",
    correct: "Correct!",
    incorrect: "Incorrect",
    sessionComplete: "Session Complete!",
    wordsCompleted: "words completed",
    accuracy: "Accuracy",
    timeSpent: "Time spent",
    minutes: "minutes",
    backToDashboard: "Back to Dashboard",

    // Review
    reviewWords: "Review Words",
    wordsToReview: "words to review",
    nextReview: "Next Review",
    reviewComplete: "Review Complete!",

    // Settings
    settingsTitle: "Settings",
    learningSettings: "Learning Settings",
    newWordsPerSession: "New words per session",
    reviewSessionSize: "Review session size",
    autoPronounce: "Auto-pronounce words during learning",
    autoPronounceDesc: "Automatically play pronunciation when learning new words",
    showTips: "Show memory tips and mnemonics",
    showTipsDesc: "Display helpful memory aids during learning",
    language: "Language",
    audioSettings: "Audio Settings",
    speechRate: "Speech Rate",
    speechVolume: "Speech Volume",
    spacedRepetition: "Spaced Repetition",
    algorithmDifficulty: "Algorithm difficulty",
    easy: "Easy",
    normal: "Normal",
    hard: "Hard",
    smsReminders: "SMS Reminders",
    enableSmsReminders: "Enable SMS Reminders",
    enableSmsRemindersDesc: "Get daily practice reminders via SMS text message",
    phoneNumber: "Phone Number for SMS",
    reminderTime: "Daily Reminder Time",
    test: "Test",
    save: "Save",

    // Vocabulary
    addWord: "Add Word",
    germanWord: "German Word",
    article: "Article",
    englishTranslation: "English Translation",
    category: "Category",
    wordType: "Word Type",
    exampleSentence: "Example Sentence",
    exampleTranslation: "Example Translation",
    memoryTip: "Memory Tip",
    difficulty: "Difficulty",
    cancel: "Cancel",
    update: "Update",
    delete: "Delete",
    edit: "Edit",

    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    close: "Close",
    ok: "OK",
    yes: "Yes",
    no: "No",
  },

  german: {
    // Navigation
    dashboard: "Übersicht",
    learn: "Lernen",
    review: "Wiederholen",
    vocabulary: "Wortschatz",
    verbs: "Verben",
    grammar: "Grammatik",
    sentencePractice: "Satzübungen",
    progress: "Fortschritt",
    settings: "Einstellungen",

    // Dashboard
    dashboardTitle: "Deutsch B1 Trainer",
    wordsLearned: "Gelernte Wörter",
    totalWords: "Wörter Gesamt",
    accuracyRate: "Genauigkeitsrate",
    currentStreak: "Aktuelle Serie",
    days: "Tage",
    startLearning: "Lernen Beginnen",
    reviewDue: "Fällige Wiederholung",
    practiceAll: "Alle Üben",
    recentSessions: "Letzte Sitzungen",
    noSessions: "Noch keine Lernsitzungen. Beginne deine Deutsche Reise!",

    // Learning
    learnNew: "Neue Wörter Lernen",
    wordsToLearn: "Wörter zu lernen",
    continue: "Weiter",
    startTest: "Test Starten",
    correct: "Richtig!",
    incorrect: "Falsch",
    sessionComplete: "Sitzung Abgeschlossen!",
    wordsCompleted: "Wörter abgeschlossen",
    accuracy: "Genauigkeit",
    timeSpent: "Verbrachte Zeit",
    minutes: "Minuten",
    backToDashboard: "Zurück zur Übersicht",

    // Review
    reviewWords: "Wörter Wiederholen",
    wordsToReview: "Wörter zu wiederholen",
    nextReview: "Nächste Wiederholung",
    reviewComplete: "Wiederholung Abgeschlossen!",

    // Settings
    settingsTitle: "Einstellungen",
    learningSettings: "Lerneinstellungen",
    newWordsPerSession: "Neue Wörter pro Sitzung",
    reviewSessionSize: "Größe der Wiederholungssitzung",
    autoPronounce: "Wörter automatisch aussprechen beim Lernen",
    autoPronounceDesc: "Aussprache automatisch wiedergeben beim Lernen neuer Wörter",
    showTips: "Merkhilfen und Eselsbrücken anzeigen",
    showTipsDesc: "Hilfreiche Gedächtnisstützen beim Lernen anzeigen",
    language: "Sprache",
    audioSettings: "Audio-Einstellungen",
    speechRate: "Sprechgeschwindigkeit",
    speechVolume: "Sprechlautstärke",
    spacedRepetition: "Verteilte Wiederholung",
    algorithmDifficulty: "Algorithmus-Schwierigkeit",
    easy: "Einfach",
    normal: "Normal",
    hard: "Schwer",
    smsReminders: "SMS-Erinnerungen",
    enableSmsReminders: "SMS-Erinnerungen aktivieren",
    enableSmsRemindersDesc: "Tägliche Übungserinnerungen per SMS erhalten",
    phoneNumber: "Telefonnummer für SMS",
    reminderTime: "Tägliche Erinnerungszeit",
    test: "Testen",
    save: "Speichern",

    // Vocabulary
    addWord: "Wort Hinzufügen",
    germanWord: "Deutsches Wort",
    article: "Artikel",
    englishTranslation: "Englische Übersetzung",
    category: "Kategorie",
    wordType: "Wortart",
    exampleSentence: "Beispielsatz",
    exampleTranslation: "Beispielübersetzung",
    memoryTip: "Merkhilfe",
    difficulty: "Schwierigkeit",
    cancel: "Abbrechen",
    update: "Aktualisieren",
    delete: "Löschen",
    edit: "Bearbeiten",

    // Common
    loading: "Laden...",
    error: "Fehler",
    success: "Erfolg",
    close: "Schließen",
    ok: "OK",
    yes: "Ja",
    no: "Nein",
  },
};

// Translation hook
export function useTranslation(language: Language = 'english') {
  return {
    t: translations[language],
    language,
  };
}