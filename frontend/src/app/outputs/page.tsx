'use client';

import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { BACKEND_URL, deleteOutputFromHistory, deleteCleanupConcat, deleteCleanupCaptioned } from '@/lib/api';
import { Copy, Download, Trash2, FileText, Play, X } from 'lucide-react';

export default function OutputsPage() {
  const { state, dispatch, addToast } = useApp();
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [deleteConcatConfirm, setDeleteConcatConfirm] = useState(false);
  const [deleteCaptionedConfirm, setDeleteCaptionedConfirm] = useState(false);
  const [deleteOutputConfirm, setDeleteOutputConfirm] = useState<{ id?: number; index: number; name: string } | null>(null);

  return (
    <div className="animate-fade-slide-in">
      <div className="flex flex-wrap justify-between items-end mb-6 gap-4">
        <div>
          <h1 className="text-[1.8rem] font-bold mb-1 leading-tight text-[var(--text-primary)]">
            Hasil Render
          </h1>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3">
            Video yang sudah selesai diproses dan siap diunduh beserta caption sosial medianya.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 hover:bg-red-500/10 border-red-500/20 text-xs py-1 px-3"
              onClick={() => setDeleteConcatConfirm(true)}
            >
              <Trash2 size={12} className="mr-1.5" />
              Delete Concat
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-400 hover:bg-red-500/10 border-red-500/20 text-xs py-1 px-3"
              onClick={() => setDeleteCaptionedConfirm(true)}
            >
              <Trash2 size={12} className="mr-1.5" />
              Delete Captioned
            </Button>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <span className="text-[var(--text-muted)] text-[0.85rem] whitespace-nowrap font-medium px-4 py-2 bg-[var(--bg-card)] rounded-lg border border-[var(--border)] shadow-sm">
            Total: <strong className="text-[var(--text-primary)]">{state.outputHistory.length}</strong> video
          </span>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-0 ring-1 ring-[var(--border)] p-0 shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr className="bg-[var(--bg-secondary)]/80 border-b border-[var(--border)] text-[var(--text-muted)] text-xs uppercase tracking-wider">
                <th className="py-4 px-5 font-semibold w-12 text-center">#</th>
                <th className="py-4 px-5 font-semibold w-28 text-center">Preview</th>
                <th className="py-4 px-5 font-semibold min-w-[200px]">Nama File</th>
                <th className="py-4 px-5 font-semibold min-w-[250px]">Caption (AI DeepSeek)</th>
                <th className="py-4 px-5 font-semibold text-center w-28">Durasi/Ukuran</th>
                <th className="py-4 px-5 font-semibold text-center w-36">Selesai</th>
                <th className="py-4 px-5 font-semibold text-center w-40">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {state.outputHistory.length > 0 ? (
                state.outputHistory.map((item, i) => {
                  const date = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—';
                  return (
                    <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-card)] transition-colors group">
                      <td className="py-4 px-5 text-center text-[var(--text-muted)] font-medium">{i + 1}</td>
                      <td className="py-4 px-5 text-center">
                        <div 
                          className="w-16 h-16 mx-auto bg-black rounded-lg overflow-hidden relative cursor-pointer group/thumb shadow-sm ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition-all"
                          onClick={() => setPreviewVideo(item.name)}
                        >
                          <video 
                            src={`${BACKEND_URL}/api/video/download/${item.name}#t=0.1`} 
                            className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100 transition-opacity"
                            preload="metadata"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover/thumb:bg-black/10 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/90 flex items-center justify-center text-white shadow-lg shadow-black/50 transform scale-90 group-hover/thumb:scale-100 transition-transform">
                              <Play size={14} className="ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-medium text-[var(--text-primary)]">
                        <div className="flex items-center gap-3">
                          <span className="truncate max-w-[150px] font-semibold" title={item.name}>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {item.caption ? (
                          <div className="flex items-start gap-3 bg-[var(--bg-input)] rounded-lg p-2.5 border border-[var(--border)]/50 relative group/caption">
                            <FileText size={16} className="text-[var(--accent)] mt-0.5 shrink-0" />
                            <p className="text-[0.75rem] text-[var(--text-secondary)] line-clamp-2 pr-6 leading-relaxed" title={item.caption}>
                              {item.caption}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.caption!);
                                addToast('📋 Caption Sosial Media disalin!');
                              }}
                              className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--accent)] bg-[var(--bg-input)] p-1 rounded transition-colors opacity-0 group-hover/caption:opacity-100"
                              title="Copy Caption"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs italic">Tidak ada caption</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-[var(--text-primary)] font-medium bg-[var(--bg-input)] px-2 py-0.5 rounded text-xs">{item.duration}</span>
                          <span className="text-[var(--text-muted)] text-[0.65rem]">{item.size}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center text-[var(--text-secondary)] text-[0.7rem] font-medium">{date}</td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex gap-2 justify-center opacity-80 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="success"
                            size="sm"
                            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border-0 shadow-none px-3"
                            onClick={() => {
                              window.open(`${BACKEND_URL}/api/video/download/${item.name}`, '_blank');
                              addToast('📥 Mengunduh video...');
                            }}
                            title="Unduh Video"
                          >
                            <Download size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 hover:bg-red-500 hover:text-white border-red-500/20 px-3"
                            onClick={() => setDeleteOutputConfirm({ id: item.id, index: i, name: item.name })}
                            title="Hapus Video"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-24 text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center opacity-80">
                      <div className="w-16 h-16 rounded-full bg-[var(--bg-input)] flex items-center justify-center mb-4">
                        <span className="text-3xl">📁</span>
                      </div>
                      <p className="text-base font-semibold text-[var(--text-primary)] mb-1">Belum ada video yang dirender</p>
                      <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed">
                        Proses video terlebih dahulu dari menu <strong>Video Editor</strong> untuk melihat hasilnya di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Video Player Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-sm aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-[var(--border)]">
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-red-500 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X size={20} />
            </button>
            <video 
              src={`${BACKEND_URL}/api/video/download/${previewVideo}`} 
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
            />
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setPreviewVideo(null)}></div>
        </div>
      )}

      {/* MODAL HAPUS CONCAT */}
      {deleteConcatConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-slide-in">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center mb-2 text-[var(--text-primary)]">Bersihkan Temp Concat?</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
              Ini akan menghapus semua file sementara hasil penggabungan (concat) yang tidak dipakai lagi. Lanjutkan?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" block onClick={() => setDeleteConcatConfirm(false)}>Batal</Button>
              <Button 
                variant="primary" 
                block 
                className="bg-red-500 hover:bg-red-600 text-white border-none"
                onClick={async () => {
                  setDeleteConcatConfirm(false);
                  try {
                    const res = await deleteCleanupConcat() as any;
                    addToast(`🗑️ ${res.count} file temp concat dihapus!`, 'success');
                  } catch (e) {
                    addToast('Gagal menghapus file concat', 'error');
                  }
                }}
              >Bersihkan</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS CAPTIONED */}
      {deleteCaptionedConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-slide-in">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center mb-2 text-[var(--text-primary)]">Bersihkan Temp Captioned?</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
              Ini akan menghapus semua file sementara hasil proses captioning yang tidak dipakai lagi. Lanjutkan?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" block onClick={() => setDeleteCaptionedConfirm(false)}>Batal</Button>
              <Button 
                variant="primary" 
                block 
                className="bg-red-500 hover:bg-red-600 text-white border-none"
                onClick={async () => {
                  setDeleteCaptionedConfirm(false);
                  try {
                    const res = await deleteCleanupCaptioned() as any;
                    addToast(`🗑️ ${res.count} file temp captioned dihapus!`, 'success');
                  } catch (e) {
                    addToast('Gagal menghapus file captioned', 'error');
                  }
                }}
              >Bersihkan</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HAPUS VIDEO SINGLE */}
      {deleteOutputConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-slide-in">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center mb-2 text-[var(--text-primary)]">Hapus Video Ini?</h3>
            <p className="text-sm text-[var(--text-secondary)] text-center mb-2 leading-relaxed">
              Anda yakin ingin menghapus video hasil render ini?
            </p>
            <p className="text-xs font-mono bg-[var(--bg-input)] p-2 rounded text-[var(--text-muted)] text-center mb-6 break-all">
              {deleteOutputConfirm.name}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" block onClick={() => setDeleteOutputConfirm(null)}>Batal</Button>
              <Button 
                variant="primary" 
                block 
                className="bg-red-500 hover:bg-red-600 text-white border-none"
                onClick={async () => {
                  const toDelete = deleteOutputConfirm;
                  setDeleteOutputConfirm(null);
                  if (toDelete.id) {
                    try {
                      await deleteOutputFromHistory(toDelete.id);
                    } catch (e) {
                      console.error(e);
                    }
                  }
                  dispatch({ type: 'REMOVE_OUTPUT', index: toDelete.index });
                  addToast('🗑️ Output dihapus', 'success');
                }}
              >Hapus Video</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
