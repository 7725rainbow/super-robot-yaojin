import React, { useState, useRef, useCallback, memo } from 'react';

// Define constants for better readability and maintenance
const INPUT_PLACEHOLDER = '说吧，有何烦忧？';
const SEND_MESSAGE_LABEL = '发送消息';
const UPLOAD_IMAGE_LABEL = '上传图片';
const REMOVE_IMAGE_LABEL = '移除图片';

interface ChatInputProps {
  onSend: (text: string, imageFile: File | null) => void;
  isLoading: boolean;
}

// Consolidate image-related state into a single object
interface ImageState {
  file: File | null;
  previewUrl: string | null;
}

// Memoized component for rendering the image preview to prevent unnecessary re-renders
const ImagePreview = memo(({ url, onRemove }: { url: string; onRemove: () => void }) => (
  <div className="max-w-4xl mx-auto mb-3">
    <div className="relative w-24 h-24 rounded-md overflow-hidden border border-black/10">
      <img src={url} alt="Preview" className="w-full h-full object-cover" />
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition-colors"
        aria-label={REMOVE_IMAGE_LABEL}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
));

const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<ImageState>({ file: null, previewUrl: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearImage = useCallback(() => {
    setImage({ file: null, previewUrl: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage({ file, previewUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || image.file) && !isLoading) {
      onSend(input, image.file);
      setInput('');
      clearImage();
    }
  }, [input, image.file, isLoading, onSend, clearImage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const syntheticEvent = e as unknown as React.FormEvent;
        handleSubmit(syntheticEvent);
    }
  }, [handleSubmit]);

  return (
    <footer className="p-4 border-t border-black/10 shadow-md sticky bottom-0" style={{ backgroundColor: 'var(--nav-background-color)' }}>
      {image.previewUrl && <ImagePreview url={image.previewUrl} onRemove={clearImage} />}
      <div className="max-w-4xl mx-auto relative">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 rounded-full bg-white/80 border border-black/10 focus-within:ring-2 focus-within:ring-[var(--nav-background-color)] transition-all duration-300">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ml-2 p-2 text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0 disabled:opacity-50"
            aria-label={UPLOAD_IMAGE_LABEL}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={INPUT_PLACEHOLDER}
            className="flex-grow bg-transparent border-none py-2 px-1 text-black placeholder-gray-500 focus:outline-none focus:ring-0"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !image.file)}
            className="bg-[var(--yaojin-bubble-color)] text-white rounded-full p-2 mr-1 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex-shrink-0"
            aria-label={SEND_MESSAGE_LABEL}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform -rotate-45" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </footer>
  );
};

export default ChatInput;