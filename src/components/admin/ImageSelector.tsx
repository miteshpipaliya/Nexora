import React, { useState } from 'react';
import { Image as ImageIcon, FolderOpen, Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { ImageLibraryModal } from './ImageLibraryModal';
import { ImageLibraryItem } from '../../types';

interface ImageSelectorProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  defaultCategory?: string;
  helperText?: string;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  label,
  value,
  onChange,
  defaultCategory = 'All',
  helperText = 'Select an image from the centralized library or upload a new asset.'
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300 block">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 p-3 bg-[#11101B] border border-violet-500/25 rounded-2xl">
        {/* Thumbnail Preview */}
        <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-violet-500/30 bg-[#0d0c15] shrink-0 flex items-center justify-center">
          {value ? (
            <img
              src={value}
              alt="Asset Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                // fallback
                (e.target as HTMLImageElement).src = '/images/competitions/zerocode.jpg';
              }}
            />
          ) : (
            <ImageIcon className="w-6 h-6 text-slate-600" />
          )}
        </div>

        {/* Action Controls */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{value ? 'Change Image' : 'Choose from Library'}</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 line-clamp-1 truncate max-w-sm">
            {value || helperText}
          </p>
        </div>
      </div>

      {/* Centralized Modal */}
      <ImageLibraryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentSelectedUrl={value}
        defaultCategory={defaultCategory}
        onSelectImage={(newUrl) => {
          onChange(newUrl);
        }}
      />
    </div>
  );
};
