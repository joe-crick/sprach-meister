import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { useAudio } from "@/lib/audio";
import { cn } from "@/lib/utils";

interface AudioButtonProps {
  text: string;
  language?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
}

export default function AudioButton({ 
  text, 
  language = 'de-DE',
  variant = "ghost",
  size = "sm",
  className,
  disabled = false,
  showLabel = false
}: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { speak, isSupported } = useAudio();

  const handleSpeak = async () => {
    if (!text || isPlaying || disabled) return;

    setIsPlaying(true);
    try {
      await speak(text, language);
    } catch (error) {
      console.error('Failed to play audio:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  if (!isSupported) {
    return null; // Hide button if audio is not supported
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSpeak}
      disabled={disabled || isPlaying}
      className={cn(
        "transition-all duration-200",
        isPlaying && "opacity-50 cursor-wait",
        className
      )}
      title={`Pronounce: ${text}`}
    >
      {isPlaying ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {showLabel && !isPlaying && (
        <span className="ml-1 text-xs">Listen</span>
      )}
      {showLabel && isPlaying && (
        <span className="ml-1 text-xs">Playing...</span>
      )}
    </Button>
  );
}

// Specialized component for German words with articles
interface GermanWordAudioButtonProps {
  german: string;
  article: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
}

export function GermanWordAudioButton({ 
  german, 
  article,
  variant = "ghost",
  size = "sm",
  className,
  disabled = false,
  showLabel = false
}: GermanWordAudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { speakWord, isSupported } = useAudio();

  const handleSpeak = async () => {
    if (!german || isPlaying || disabled) return;

    setIsPlaying(true);
    try {
      await speakWord(german, article);
    } catch (error) {
      console.error('Failed to play audio:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSpeak}
      disabled={disabled || isPlaying}
      className={cn(
        "transition-all duration-200",
        isPlaying && "opacity-50 cursor-wait",
        className
      )}
      title={`Pronounce: ${article} ${german}`}
    >
      {isPlaying ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {showLabel && !isPlaying && (
        <span className="ml-1 text-xs">Listen</span>
      )}
      {showLabel && isPlaying && (
        <span className="ml-1 text-xs">Playing...</span>
      )}
    </Button>
  );
}

// Component for playing full sentences
interface SentenceAudioButtonProps {
  sentence: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
  disabled?: boolean;
  showLabel?: boolean;
  autoPlay?: boolean;
}

export function SentenceAudioButton({ 
  sentence, 
  variant = "outline",
  size = "sm",
  className,
  disabled = false,
  showLabel = true,
  autoPlay = false
}: SentenceAudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { speakSentence, isSupported } = useAudio();

  const handleSpeak = async () => {
    if (!sentence || isPlaying || disabled) return;

    setIsPlaying(true);
    try {
      await speakSentence(sentence);
    } catch (error) {
      console.error('Failed to play audio:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Auto-play when enabled (useful for learning sessions)
  useState(() => {
    if (autoPlay && sentence && isSupported) {
      const timer = setTimeout(handleSpeak, 500); // Small delay to prevent overlap
      return () => clearTimeout(timer);
    }
  });

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSpeak}
      disabled={disabled || isPlaying}
      className={cn(
        "transition-all duration-200",
        isPlaying && "opacity-50 cursor-wait",
        className
      )}
      title={`Pronounce sentence: ${sentence}`}
    >
      {isPlaying ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {showLabel && !isPlaying && (
        <span className="ml-2">Play Example</span>
      )}
      {showLabel && isPlaying && (
        <span className="ml-2">Playing...</span>
      )}
    </Button>
  );
}