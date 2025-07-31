// Audio pronunciation service using Web Speech API and fallback options
import { useState, useEffect } from 'react';

export interface AudioService {
  speak(text: string, language?: string): Promise<void>;
  isSupported(): boolean;
  setRate(rate: number): void;
  setVolume(volume: number): void;
  stop(): void;
}

class WebSpeechAudioService implements AudioService {
  private synthesis: SpeechSynthesis;
  private rate: number = 0.8;
  private volume: number = 1.0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  async speak(text: string, language: string = 'de-DE'): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Speech synthesis not supported');
    }

    // Stop any currently playing audio
    this.stop();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      
      utterance.lang = language;
      utterance.rate = this.rate;
      utterance.volume = this.volume;
      
      // Function to find and set the voice
      const setVoice = () => {
        const voices = this.synthesis.getVoices();
        const germanVoice = voices.find(voice => 
          voice.lang.startsWith('de') || 
          voice.name.toLowerCase().includes('german') ||
          voice.name.toLowerCase().includes('deutsch')
        );
        
        if (germanVoice) {
          utterance.voice = germanVoice;
        }
      };

      // Set voice immediately if available
      setVoice();

      // If no voices are loaded yet, wait for them
      if (this.synthesis.getVoices().length === 0) {
        this.synthesis.addEventListener('voiceschanged', setVoice, { once: true });
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Small delay to ensure browser is ready
      setTimeout(() => {
        try {
          this.synthesis.speak(utterance);
        } catch (error) {
          reject(new Error(`Failed to start speech synthesis: ${error}`));
        }
      }, 100);
    });
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(10, rate));
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  stop(): void {
    if (this.synthesis.speaking || this.synthesis.pending) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }
}

// Alternative audio service using external API (for better German pronunciation)
class ExternalAudioService implements AudioService {
  private rate: number = 0.8;
  private volume: number = 1.0;
  private currentAudio: HTMLAudioElement | null = null;

  isSupported(): boolean {
    return true; // HTML audio is widely supported
  }

  async speak(text: string, language: string = 'de'): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    try {
      // Using Google Translate TTS as a fallback (free tier)
      const encodedText = encodeURIComponent(text);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${language}&client=tw-ob&q=${encodedText}`;
      
      return new Promise((resolve, reject) => {
        const audio = new Audio();
        this.currentAudio = audio;
        
        audio.volume = this.volume;
        audio.playbackRate = this.rate;
        
        audio.onended = () => {
          this.currentAudio = null;
          resolve();
        };
        
        audio.onerror = () => {
          this.currentAudio = null;
          reject(new Error('Failed to load audio'));
        };
        
        audio.src = url;
        audio.play().catch(reject);
      });
    } catch (error) {
      throw new Error(`External audio service error: ${error}`);
    }
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.25, Math.min(4, rate));
    if (this.currentAudio) {
      this.currentAudio.playbackRate = this.rate;
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}

// Main audio service that tries different methods
class GermanAudioService implements AudioService {
  private primaryService: AudioService;
  private fallbackService: AudioService;
  private currentService: AudioService;

  constructor() {
    this.primaryService = new WebSpeechAudioService();
    this.fallbackService = new ExternalAudioService();
    this.currentService = this.primaryService.isSupported() ? this.primaryService : this.fallbackService;
  }

  isSupported(): boolean {
    return this.primaryService.isSupported() || this.fallbackService.isSupported();
  }

  async speak(text: string, language: string = 'de-DE'): Promise<void> {
    try {
      await this.currentService.speak(text, language);
    } catch (error) {
      // Try fallback service if primary fails
      if (this.currentService === this.primaryService) {
        console.warn('Primary audio service failed, trying fallback:', error);
        try {
          await this.fallbackService.speak(text, language.split('-')[0]); // Use language code without region
        } catch (fallbackError) {
          console.error('Both audio services failed:', fallbackError);
          throw new Error('Audio playback not available');
        }
      } else {
        throw error;
      }
    }
  }

  setRate(rate: number): void {
    this.primaryService.setRate(rate);
    this.fallbackService.setRate(rate);
  }

  setVolume(volume: number): void {
    this.primaryService.setVolume(volume);
    this.fallbackService.setVolume(volume);
  }

  stop(): void {
    this.primaryService.stop();
    this.fallbackService.stop();
  }
}

// Export singleton instance
export const audioService = new GermanAudioService();

// Utility functions
export async function speakGermanWord(word: string, article?: string): Promise<void> {
  const textToSpeak = article ? `${article} ${word}` : word;
  return audioService.speak(textToSpeak, 'de-DE');
}

export async function speakGermanSentence(sentence: string): Promise<void> {
  return audioService.speak(sentence, 'de-DE');
}

// Hook for React components

export function useAudio() {
  const [speechRate, setSpeechRateState] = useState(0.8);
  const [speechVolume, setSpeechVolumeState] = useState(1.0);

  // Sync with audio service when values change
  useEffect(() => {
    audioService.setRate(speechRate);
  }, [speechRate]);

  useEffect(() => {
    audioService.setVolume(speechVolume);
  }, [speechVolume]);

  const speak = async (text: string, language?: string) => {
    try {
      await audioService.speak(text, language);
    } catch (error) {
      console.error('Audio playback failed:', error);
      // Don't throw error to avoid breaking UI
    }
  };

  const speakWord = async (word: string, article?: string) => {
    try {
      await speakGermanWord(word, article);
    } catch (error) {
      console.error('Word audio playback failed:', error);
      // Don't throw error to avoid breaking UI
    }
  };

  const speakSentence = async (sentence: string) => {
    try {
      await speakGermanSentence(sentence);
    } catch (error) {
      console.error('Sentence audio playback failed:', error);
      // Don't throw error to avoid breaking UI
    }
  };

  const stop = () => {
    audioService.stop();
  };

  const setSpeechRate = (rate: number) => {
    setSpeechRateState(rate);
    audioService.setRate(rate);
  };

  const setSpeechVolume = (volume: number) => {
    setSpeechVolumeState(volume);
    audioService.setVolume(volume);
  };

  const isSupported = audioService.isSupported();

  return {
    speak,
    speakWord,
    speakSentence,
    stop,
    isSupported,
    speechRate,
    setSpeechRate,
    speechVolume,
    setSpeechVolume
  };
}