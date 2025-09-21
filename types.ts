// Fix: Define interfaces for shared data structures.
// Fix: Added specific flow types to support GuidePrompts and resolve type errors.
export type Flow = 'chat' | 'news' | 'guidance' | 'daily' | 'game';

export interface User {
  username: string;
  email: string;
  isGuest?: boolean;
}

export interface DivinationResult {
  type: string;
  name: string;
  description: string;
}

export interface DiceResult {
  values: number[];
  modifier: number | null;
  total: number;
}

export interface GroundingChunk {
  web?: {
    // Fix: Made uri and title optional to match the type from @google/genai, resolving a type error in geminiService.
    uri?: string;
    title?: string;
  };
}

export interface IntimacyLevel {
  level: number;
  name:string;
  progress: number; // 0-100
}

export interface Message {
  id: string;
  sender: 'user' | 'bot' | 'notification';
  text: string;
  image?: string; // image preview url
  // Fix: Added fields to store raw image data for conversation history.
  imageBase64?: string; // base64 encoded image data
  imageMimeType?: string; // mime type of the image
  isLoading?: boolean;
  divinationResult?: DivinationResult;
  diceResult?: DiceResult;
  quickReplies?: string[];
  notificationContent?: string;
  errorType?: 'rate_limit' | 'safety' | 'server' | 'unknown';
  generatedImageBase64?: string; // For AI-generated images in "You Describe, I Draw"
}
