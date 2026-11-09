import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Upload, 
  Check, 
  Trash2, 
  Image as ImageIcon, 
  AlertTriangle, 
  Loader2, 
  Sparkles,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { ImageLibraryItem } from '../../types';

interface ImageLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (imageUrl: string, imageItem?: ImageLibraryItem) => void;
  currentSelectedUrl?: string;
  defaultCategory?: string;
}

const CATEGORIES = [
  'All',
  'Vibe Coding / AI Hackathon',
  'CodeRush',
  'Mechanical / RoboRace',
  'Cybersecurity / CTF',
  'Civil / Engineering',
  'General Student Groups'
] as const;

export const ImageLibraryModal: React.FC<ImageLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  currentSelectedUrl,
  defaultCategory = 'All'
}) => {
  const [images, setImages] = useState<ImageLibraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ImageLibraryItem | null>(null);

  // Upload Form State
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showUploadPanel, setShowUploadPanel] = useState<boolean>(false);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<string>('Vibe Coding / AI Hackathon');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteInUseError, setDeleteInUseError] = useState<string | null>(null);

  // Fetch images on mount
  useEffect(() => {
    if (!isOpen) return;
    loadLibrary();
  }, [isOpen]);

  const loadLibrary = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await dataService.getImageLibrary();
      setImages(list);
      if (currentSelectedUrl) {
        const found = list.find((img) => img.url === currentSelectedUrl);
        if (found) setSelectedItem(found);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load image library.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered images
  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const matchesCategory = selectedCategory === 'All' || img.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        img.title.toLowerCase().includes(q) || 
        img.category.toLowerCase().includes(q) || 
        (img.file_name && img.file_name.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [images, selectedCategory, searchQuery]);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image file size must be less than 5MB.');
      return;
    }

    setUploadFile(file);
    if (!uploadTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      setUploadTitle(cleanName);
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setErrorMsg(null);
  };

  // Upload handler
  const handlePerformUpload = async () => {
    if (!uploadFile || !uploadPreview) {
      setErrorMsg('Please select an image file to upload.');
      return;
    }
    if (!uploadTitle.trim()) {
      setErrorMsg('Please provide an image title.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setErrorMsg(null);

    try {
      setUploadProgress(40);
      const res = await dataService.uploadAdminImage(uploadPreview, uploadFile.name);
      setUploadProgress(70);

      const newItem = await dataService.addImageToLibrary({
        title: uploadTitle.trim(),
        category: uploadCategory,
        url: res.url,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        dimensions: '1920x1080',
        is_system_preset: false
      });

      setUploadProgress(100);
      setImages((prev) => [newItem, ...prev]);
      setSelectedItem(newItem);
      setShowUploadPanel(false);
      setUploadFile(null);
      setUploadPreview(null);
      setUploadTitle('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Safe delete handler
  const handleDeleteImage = async (item: ImageLibraryItem) => {
    setDeleteInUseError(null);
    if (!window.confirm(`Are you sure you want to permanently delete "${item.title}" from the Image Library?`)) {
      return;
    }

    try {
      await dataService.deleteImageFromLibrary(item.id);
      setImages((prev) => prev.filter((img) => img.id !== item.id));
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
    } catch (err: any) {
      setDeleteInUseError(err.message || 'Failed to delete image.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-6xl max-h-[92vh] bg-[#120f20] border border-violet-500/30 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.3)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-violet-500/20 flex items-center justify-between gap-4 shrink-0 bg-[#161228]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-950/80 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>NEXORA Centralized Image Library</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-950/80 border border-violet-500/30 text-violet-300 font-mono">
                  {images.length} Assets
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Curated competition covers, engineering banners, and team credentials.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowUploadPanel(!showUploadPanel)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all ${
                showUploadPanel
                  ? 'bg-violet-950 text-violet-300 border border-violet-500/50'
                  : 'bg-violet-600 text-white hover:bg-violet-500 shadow-md'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>{showUploadPanel ? 'Back to Library' : 'Upload New Asset'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Error Notice */}
        {(errorMsg || deleteInUseError) && (
          <div className="px-6 py-3 bg-red-950/50 border-b border-red-500/30 text-xs text-red-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg || deleteInUseError}</span>
            </div>
            <button
              onClick={() => { setErrorMsg(null); setDeleteInUseError(null); }}
              className="text-xs text-red-400 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upload Panel */}
        {showUploadPanel ? (
          <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1">
            <div className="max-w-2xl mx-auto space-y-6 bg-[#171426] p-6 sm:p-8 rounded-2xl border border-violet-500/25">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Upload New Asset</h3>
                <p className="text-xs text-slate-400">
                  Select a high-resolution cover image for competitions or team profile photo.
                </p>
              </div>

              {/* File Drop Area */}
              <div className="relative border-2 border-dashed border-violet-500/30 hover:border-violet-400/60 rounded-2xl p-6 text-center cursor-pointer bg-[#0d0c17]/50 transition-colors">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {uploadPreview ? (
                  <div className="space-y-3">
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded-xl object-cover border border-violet-500/30"
                    />
                    <span className="text-xs text-violet-300 block font-mono">
                      {uploadFile?.name} ({(uploadFile ? uploadFile.size / 1024 : 0).toFixed(0)} KB)
                    </span>
                    <span className="text-[11px] text-slate-400 block">Click or drag another image to replace</span>
                  </div>
                ) : (
                  <div className="space-y-3 py-6">
                    <div className="w-12 h-12 rounded-xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">Click to select image</span>
                      <span className="text-xs text-slate-400 block mt-1">PNG, JPG, or WebP up to 5MB</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Category Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 block">Asset Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. AI Hackathon Arena Banner"
                    className="w-full px-3.5 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-xl text-white focus:outline-none focus:border-violet-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 block">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-[#11101B] border border-violet-500/25 rounded-xl text-white focus:outline-none focus:border-violet-400"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-violet-300">
                    <span>Uploading asset...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-violet-950 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-purple-400 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadPanel(false)}
                  className="px-5 py-2.5 text-xs font-medium text-slate-300 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!uploadFile || isUploading}
                  onClick={handlePerformUpload}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save to Image Library</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Library View */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Main Gallery Area */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-violet-500/20">
              
              {/* Filter Tabs & Search Bar */}
              <div className="p-4 border-b border-violet-500/20 space-y-3 bg-[#141024]">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, file name, or category..."
                    className="w-full pl-10 pr-4 py-2 text-xs bg-[#1b1630] border border-violet-500/20 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 text-[11px] font-mono rounded-lg whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-violet-600 text-white font-semibold shadow-sm'
                          : 'bg-[#1a172e] text-slate-400 hover:text-slate-200 border border-violet-500/15'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    <span className="text-xs font-mono text-slate-400">Loading assets from library...</span>
                  </div>
                ) : filteredImages.length === 0 ? (
                  <div className="py-20 text-center space-y-3 max-w-sm mx-auto">
                    <ImageIcon className="w-10 h-10 text-slate-500 mx-auto" />
                    <h4 className="text-sm font-semibold text-white">No images found</h4>
                    <p className="text-xs text-slate-400">
                      Try searching for a different keyword or upload a new image for this category.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
                    {filteredImages.map((img) => {
                      const isSelected = selectedItem?.id === img.id || currentSelectedUrl === img.url;
                      return (
                        <div
                          key={img.id}
                          onClick={() => setSelectedItem(img)}
                          className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all aspect-[16/10] bg-[#0d0c15] ${
                            isSelected
                              ? 'border-violet-400 ring-2 ring-violet-400/50 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                              : 'border-violet-500/20 hover:border-violet-400/50 hover:shadow-lg'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.title}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Gradient Vignette */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                          {/* Category Badge */}
                          <div className="absolute top-2 left-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-violet-300 border border-white/10">
                              {img.category}
                            </span>
                          </div>

                          {/* Selected Checkmark */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}

                          {/* Title Bottom Overlay */}
                          <div className="absolute bottom-2 left-2 right-2">
                            <span className="text-xs font-semibold text-white block truncate drop-shadow-md">
                              {img.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Preview & Action Inspector */}
            <div className="w-full md:w-80 shrink-0 p-6 flex flex-col justify-between bg-[#141026] overflow-y-auto space-y-6">
              {selectedItem ? (
                <div className="space-y-5">
                  <span className="text-[11px] font-mono text-violet-400 uppercase tracking-wider block">
                    Selected Asset Details
                  </span>

                  {/* Thumbnail Preview */}
                  <div className="aspect-[16/10] rounded-2xl overflow-hidden border border-violet-500/30 bg-[#0d0c15]">
                    <img
                      src={selectedItem.url}
                      alt={selectedItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Title</span>
                      <span className="text-white font-medium block truncate">{selectedItem.title}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Category</span>
                      <span className="text-violet-300">{selectedItem.category}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Asset URL</span>
                      <span className="text-[11px] text-slate-400 block truncate">{selectedItem.url}</span>
                    </div>

                    {selectedItem.dimensions && (
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block">Dimensions</span>
                        <span className="text-slate-300">{selectedItem.dimensions}</span>
                      </div>
                    )}
                  </div>

                  {/* Safe Delete Button (Only for non-presets or with confirmation) */}
                  {!selectedItem.is_system_preset && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(selectedItem)}
                        className="w-full py-2 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/60 border border-red-500/20 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Asset (Safety Verified)</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 text-center space-y-3 text-slate-400">
                  <ImageIcon className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-xs">
                    Select an image from the library to inspect details and assign.
                  </p>
                </div>
              )}

              {/* Bottom Apply Buttons */}
              <div className="pt-4 border-t border-violet-500/20 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={!selectedItem}
                  onClick={() => {
                    if (selectedItem) {
                      onSelectImage(selectedItem.url, selectedItem);
                      onClose();
                    }
                  }}
                  className="w-full py-3 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Use This Image</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
