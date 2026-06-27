'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { Upload, X, GripVertical } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { ACCEPTED_VIDEO_TYPES, ACCEPTED_VIDEO_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/constants';
import { Card } from '@/components/shared/Card';
import { formatFileSize } from '@/lib/utils';

type SortMode = 'upload' | 'name' | 'size' | 'date';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'upload', label: 'By Upload' },
  { value: 'name', label: 'By Name (A-Z)' },
  { value: 'size', label: 'By Size' },
  { value: 'date', label: 'By Date Modified' },
];

export function UploadZone() {
  const { state, dispatch, addToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('upload');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const valid: File[] = [];
      for (const file of files) {
        if (!ACCEPTED_VIDEO_TYPES.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm)$/i)) {
          addToast(`⚠️ ${file.name} — format tidak didukung`, 'warning');
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          addToast(`⚠️ ${file.name} — ukuran > 500MB`, 'warning');
          continue;
        }
        if (state.uploadedFiles.some((f) => f.name === file.name && f.size === file.size)) {
          continue;
        }
        valid.push(file);
      }
      if (valid.length > 0) {
        // Generate thumbnails
        const newThumbs: Record<string, string> = {};
        for (const file of valid) {
          const key = `${file.name}-${file.size}`;
          const url = URL.createObjectURL(file);
          newThumbs[key] = url;
        }
        setThumbnails(prev => ({ ...prev, ...newThumbs }));
        dispatch({ type: 'ADD_FILES', files: valid });
        addToast(`📤 ${valid.length} footage ditambahkan`);
      }
    },
    [state.uploadedFiles, dispatch, addToast]
  );

  // Sorted file list
  const sortedFiles = useMemo(() => {
    const files = [...state.uploadedFiles];
    switch (sortBy) {
      case 'name':
        files.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'size':
        files.sort((a, b) => b.size - a.size);
        break;
      case 'date':
        files.sort((a, b) => b.lastModified - a.lastModified);
        break;
      // 'upload' — keep original order (FIFO)
    }
    return files;
  }, [state.uploadedFiles, sortBy]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // Find original index for number label
  const originalIndex = (file: File) => state.uploadedFiles.indexOf(file);

  return (
    <Card header="Upload Footage" icon="📤">
      {/* Sort dropdown */}
      {state.uploadedFiles.length > 1 && (
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[0.65rem] text-[var(--text-muted)]">Urutkan:</span>
          <select
            className="text-[0.65rem] px-2 py-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none cursor-pointer"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortMode)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 bg-[var(--bg-input)] active:scale-[0.98] ${
          dragOver ? 'border-[var(--accent)] bg-[var(--bg-card)]' : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-card)]'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload size={30} className="mx-auto mb-1 text-[var(--text-muted)]" />
        <p className="font-semibold text-xs mb-0.5">Klik atau drag & drop</p>
        <p className="text-[var(--text-muted)] text-[0.65rem]">
          {ACCEPTED_VIDEO_EXTENSIONS} — Maks 500MB/file
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_EXTENSIONS}
        multiple
        hidden
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Footage list with thumbnails */}
      {sortedFiles.length > 0 ? (
        <div className="mt-2.5 max-h-[420px] overflow-y-auto space-y-2 pr-0.5 content-scroll">
          {sortedFiles.map((file) => {
            const key = `${file.name}-${file.size}`;
            const idx = originalIndex(file);
            const thumbUrl = thumbnails[key];
            return (
              <div
                key={key}
                className="flex items-start gap-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 group hover:border-[var(--accent)]/30 transition-all"
              >
                {/* Number badge */}
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                  {idx + 1}
                </div>

                {/* Thumbnail */}
                <div className="w-28 h-16 rounded-lg overflow-hidden bg-black shrink-0 relative">
                  {thumbUrl ? (
                    <video
                      src={thumbUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        const vid = e.currentTarget;
                        vid.currentTime = 1; // seek to 1 second for thumbnail
                      }}
                      onSeeked={(e) => {
                        e.currentTarget.pause();
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-2xl">
                      🎬
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate leading-tight">
                    {file.name}
                  </p>
                  <p className="text-[0.65rem] text-[var(--text-muted)] mt-0.5">
                    {formatFileSize(file.size)}
                    {file.lastModified ? ` · ${new Date(file.lastModified).toLocaleDateString('id-ID')}` : ''}
                  </p>
                </div>

                {/* Remove */}
                <button
                  className="text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 p-1.5 rounded-lg transition-all shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_FILE', index: state.uploadedFiles.indexOf(file) });
                    if (thumbUrl) {
                      URL.revokeObjectURL(thumbUrl);
                      setThumbnails(prev => { const n = {...prev}; delete n[key]; return n; });
                    }
                    addToast('🗑️ Footage dihapus');
                  }}
                  title="Hapus"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[var(--text-muted)] text-xs text-center py-3">
          Belum ada footage
        </p>
      )}
    </Card>
  );
}
