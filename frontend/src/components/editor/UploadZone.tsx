'use client';

import { useRef, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { ACCEPTED_VIDEO_TYPES, ACCEPTED_VIDEO_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/constants';
import { Card } from '@/components/shared/Card';
import { X } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

export function UploadZone() {
  const { state, dispatch, addToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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
        dispatch({ type: 'ADD_FILES', files: valid });
        addToast(`📤 ${valid.length} footage ditambahkan`);
      }
    },
    [state.uploadedFiles, dispatch, addToast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <Card header="📤 Upload Footage" icon="📤">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 bg-[var(--bg-input)] active:scale-[0.98] max-md:p-6 ${
          dragOver ? 'border-[var(--accent)] bg-[var(--bg-card)]' : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--bg-card)]'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Upload size={36} className="mx-auto mb-2 text-[var(--text-muted)]" />
        <p className="font-semibold text-sm mb-0.5">Klik atau drag & drop untuk upload</p>
        <p className="text-[var(--text-muted)] text-xs">
          {ACCEPTED_VIDEO_EXTENSIONS} — Maks 500MB/file
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_EXTENSIONS}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* File chips or stored metadata */}
      {state.uploadedFiles.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {state.uploadedFiles.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-3 py-1 text-xs flex items-center gap-1.5 text-[var(--text-secondary)]"
            >
              🎬 {f.name}{' '}
              <span className="text-[var(--text-muted)] text-[0.68rem]">
                ({formatFileSize(f.size)})
              </span>
              <X
                size={14}
                className="cursor-pointer text-[var(--danger)] font-bold p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'REMOVE_FILE', index: i });
                  addToast('🗑️ Footage dihapus');
                }}
              />
            </span>
          ))}
        </div>
      ) : state.uploadedFileMeta.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {state.uploadedFileMeta.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-3 py-1 text-xs flex items-center gap-1.5 text-[var(--text-secondary)]"
            >
              🎬 {f.name}{' '}
              <span className="text-[var(--text-muted)] text-[0.68rem]">
                ({formatFileSize(f.size)}, stored)
              </span>
              <X
                size={14}
                className="cursor-pointer text-[var(--danger)] font-bold p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  // Remove from stored metadata
                  const newMeta = state.uploadedFileMeta.filter((_, j) => j !== i);
                  dispatch({ type: 'LOAD_STATE', state: { ...state, uploadedFileMeta: newMeta } });
                }}
              />
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[var(--text-muted)] text-xs text-center py-2">
          Belum ada footage terupload
        </p>
      )}
    </Card>
  );
}
