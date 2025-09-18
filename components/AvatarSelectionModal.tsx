import React, { useRef } from 'react';

interface AvatarSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (avatarBase64: string) => void;
  onUpload: (file: File) => void;
}

const AvatarSelectionModal: React.FC<AvatarSelectionModalProps> = ({
  isOpen,
  onClose,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-up"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">选择头像</h2>
        <p className="text-gray-600 mb-6">上传你自己的图片。</p>

        <div className="flex justify-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
          <button
            onClick={handleUploadClick}
            className="px-4 py-2 rounded-full text-white bg-[var(--nav-background-color)] hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 w-full"
          >
            上传图片
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarSelectionModal;