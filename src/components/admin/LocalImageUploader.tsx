import React, { useState, useRef } from 'react';
import { Upload, RefreshCw, Trash2, Eye, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dataService } from '../../services/dataService';

interface LocalImageUploaderProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  folder?: string;
  label?: string;
}

export const LocalImageUploader: React.FC<LocalImageUploaderProps> = ({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  folder = 'competitions',
  label = 'Cover / Banner Image'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validation
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setError('Unsupported file type. Please choose a JPG, PNG, or WebP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds 5MB size limit. Please select a smaller or compressed image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const res = await dataService.uploadLocalImage(file, folder, (pct: number) => {
        setProgress(pct);
      });
      onImageUploaded(res.url);
      setProgress(100);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setError(null);
    if (onImageRemoved) {
      onImageRemoved();
    } else {
      onImageUploaded('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-slate-300 block">{label}</label>
        {currentImageUrl && (
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Image attached
          </span>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Main Preview Box & Actions */}
      <div className="p-3 bg-[#08080D] border border-violet-500/25 rounded-xl space-y-3">
        {currentImageUrl ? (
          <div className="space-y-3">
            <div className="relative h-32 w-full rounded-lg overflow-hidden bg-black/60 border border-violet-500/20 group">
              <img
                src={currentImageUrl}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="p-1.5 bg-black/70 hover:bg-black text-white rounded-lg text-xs flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-semibold text-violet-300 bg-violet-950/70 border border-violet-500/30 rounded-lg hover:bg-violet-900 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${uploading ? 'animate-spin' : ''}`} />
                <span>Replace Image</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 bg-[#171426] border border-violet-500/20 rounded-lg hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-violet-400" />
                <span>Preview Image</span>
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={handleRemove}
                className="px-3 py-1.5 text-xs font-semibold text-red-300 bg-red-950/50 border border-red-500/30 rounded-lg hover:bg-red-900 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Image</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-violet-950/50 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-medium">Choose an image from your laptop</p>
              <p className="text-[10px] text-slate-500 font-mono">JPG, PNG, or WebP up to 5MB</p>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading {progress}%...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload progress bar */}
        {uploading && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Uploading to cloud storage...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#171426] rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2 bg-red-950/50 border border-red-500/30 rounded-lg text-[11px] text-red-200 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {previewOpen && currentImageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="relative max-w-3xl max-h-[85vh] p-2 bg-[#171426] border border-violet-500/40 rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img
              src={currentImageUrl}
              alt="Fullscreen Preview"
              className="max-w-full max-h-[75vh] object-contain rounded-xl"
            />
            <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400 px-2">
              <span className="truncate max-w-md">{currentImageUrl}</span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
