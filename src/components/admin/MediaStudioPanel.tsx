import React, { useState } from 'react';
import { Film, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { deleteMediaAsset, saveMediaAsset } from '../../lib/firestoreStore.ts';
import type { MediaAsset, Project } from '../../types/portfolio.ts';

interface MediaStudioPanelProps {
  assets: MediaAsset[];
  projects: Project[];
  onRefresh: () => Promise<void>;
  onAssignToProject: (projectId: string, kind: 'image' | 'video', url: string) => Promise<void>;
}

const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'] as const;
const IMAGE_SIZES = ['1K', '2K', '4K'] as const;

export function MediaStudioPanel({
  assets,
  projects,
  onRefresh,
  onAssignToProject,
}: MediaStudioPanelProps) {
  const { getIdToken } = useAuth();

  // Image Generator state
  const [imgPrompt, setImgPrompt] = useState(
    'Clean isometric technical blueprint rendering of an Amazon EKS cluster with glowing cyan nodes and amber data paths on deep Prussian blue drafting background'
  );
  const [imgModel, setImgModel] = useState<'gemini-3-pro-image-preview' | 'gemini-nano-banana-2.1'>(
    'gemini-3-pro-image-preview'
  );
  const [imgAspect, setImgAspect] = useState<(typeof ASPECT_RATIOS)[number]>('16:9');
  const [imgSize, setImgSize] = useState<(typeof IMAGE_SIZES)[number]>('2K');
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Video Generator state (text-to-video + photo-to-video)
  const [vidPrompt, setVidPrompt] = useState(
    'Slow architectural camera pan over an illuminated 3D Kubernetes cluster blueprint with glowing amber data packets moving between availability zones.'
  );
  const [vidAspect, setVidAspect] = useState<'16:9' | '9:16'>('16:9');
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>('');
  const [uploadedMimeType, setUploadedMimeType] = useState<string>('image/png');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [vidBusy, setVidBusy] = useState(false);
  const [vidError, setVidError] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImgBusy(true);
    setImgError(null);
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/admin/media/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: imgPrompt,
          model: imgModel,
          aspectRatio: imgAspect,
          imageSize: imgSize,
        }),
      });
      const data = (await resp.json()) as { dataUrl?: string; error?: string };
      if (!resp.ok || !data.dataUrl) {
        throw new Error(data.error || 'Image generation failed.');
      }
      setPreviewImage(data.dataUrl);
      await saveMediaAsset({
        kind: 'image',
        prompt: imgPrompt,
        model: imgModel,
        aspectRatio: imgAspect,
        resolution: imgSize,
        mediaUrl: data.dataUrl.length < 850000 ? data.dataUrl : '',
        visible: true,
      });
      await onRefresh();
    } catch (err) {
      setImgError(err instanceof Error ? err.message : 'Image generation error.');
    } finally {
      setImgBusy(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setVidError('Uploaded reference image must be under 8 MB.');
      return;
    }
    setUploadedMimeType(file.type || 'image/png');
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setUploadedImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setVidBusy(true);
    setVidError(null);
    try {
      const token = await getIdToken();
      const resp = await fetch('/api/admin/media/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt: vidPrompt,
          aspectRatio: vidAspect,
          imageBase64: uploadedImageBase64 || undefined,
          imageMimeType: uploadedImageBase64 ? uploadedMimeType : undefined,
        }),
      });
      const data = (await resp.json()) as { videoUrl?: string; error?: string };
      if (!resp.ok || !data.videoUrl) {
        throw new Error(data.error || 'Video generation failed.');
      }
      setPreviewVideo(data.videoUrl);
      await saveMediaAsset({
        kind: 'video',
        prompt: vidPrompt,
        model: 'gemini-omni-1.2-flash',
        aspectRatio: vidAspect,
        mediaUrl: data.videoUrl.length < 850000 ? data.videoUrl : '',
        visible: true,
      });
      await onRefresh();
    } catch (err) {
      setVidError(err instanceof Error ? err.message : 'Video generation error.');
    } finally {
      setVidBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Studio Image Generation */}
        <form
          onSubmit={handleGenerateImage}
          className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-[var(--bp-line)] pb-3">
            <ImageIcon className="h-4 w-4 text-[var(--bp-accent)]" />
            <h3 className="font-display text-base font-semibold text-[var(--bp-ink)]">
              Studio Image Generator
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="font-mono text-[11px] text-[var(--bp-ink-muted)]">Model</span>
              <select
                value={imgModel}
                onChange={(e) =>
                  setImgModel(e.target.value as 'gemini-3-pro-image-preview' | 'gemini-nano-banana-2.1')
                }
                className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-2.5 py-2 text-xs text-[var(--bp-ink)]"
              >
                <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview (Studio)</option>
                <option value="gemini-nano-banana-2.1">gemini-nano-banana-2.1 (Fast)</option>
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[11px] text-[var(--bp-ink-muted)]">Resolution</span>
              <select
                value={imgSize}
                onChange={(e) => setImgSize(e.target.value as (typeof IMAGE_SIZES)[number])}
                className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-2.5 py-2 text-xs text-[var(--bp-ink)]"
              >
                {IMAGE_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-mono text-[11px] text-[var(--bp-ink-muted)]">Aspect Ratio</span>
              <select
                value={imgAspect}
                onChange={(e) => setImgAspect(e.target.value as (typeof ASPECT_RATIOS)[number])}
                className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-2.5 py-2 text-xs text-[var(--bp-ink)]"
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar} value={ar}>
                    {ar}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="font-mono text-[11px] text-[var(--bp-ink-muted)]">Prompt</span>
            <textarea
              rows={3}
              required
              value={imgPrompt}
              onChange={(e) => setImgPrompt(e.target.value)}
              className="mt-1 w-full border border-[var(--bp-line)] bg-transparent p-2.5 text-sm text-[var(--bp-ink)]"
            />
          </label>

          {imgError && (
            <p className="border border-rose-500/50 p-2.5 font-mono text-xs text-rose-400">
              {imgError}
            </p>
          )}

          <button
            type="submit"
            disabled={imgBusy}
            className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-4 py-2.5 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] disabled:opacity-60"
          >
            {imgBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            {imgBusy ? 'Generating Image...' : 'Generate Image'}
          </button>

          {previewImage && (
            <div className="space-y-3 border-t border-[var(--bp-line)] pt-3">
              <img
                src={previewImage}
                alt="Generated preview"
                className="max-h-56 w-full border border-[var(--bp-line)] object-contain"
              />
              {projects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-2.5 py-1.5 text-xs text-[var(--bp-ink)]"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onAssignToProject(selectedProjectId, 'image', previewImage)}
                    className="border border-[var(--bp-accent)] px-3 py-1.5 font-mono text-xs text-[var(--bp-accent)]"
                  >
                    Attach to Project
                  </button>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Text-to-Video & Image-to-Video (gemini-omni-1.2-flash) */}
        <form
          onSubmit={handleGenerateVideo}
          className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-[var(--bp-line)] pb-3">
            <Film className="h-4 w-4 text-[var(--bp-accent)]" />
            <h3 className="font-display text-base font-semibold text-[var(--bp-ink)]">
              Video Generator &amp; Photo Animator (gemini-omni-1.2-flash)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-[11px] text-[var(--bp-ink-muted)]">Video Aspect Ratio</span>
              <select
                value={vidAspect}
                onChange={(e) => setVidAspect(e.target.value as '16:9' | '9:16')}
                className="mt-1 w-full border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] px-2.5 py-2 text-xs text-[var(--bp-ink)]"
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait)</option>
              </select>
            </label>

            <div className="block">
              <span className="font-mono text-[11px] text-[var(--bp-ink-muted)]">
                Optional Starting Photo (Image-to-Video)
              </span>
              <label className="mt-1 flex cursor-pointer items-center gap-2 border border-[var(--bp-line)] px-3 py-2 text-xs text-[var(--bp-ink)] hover:border-[var(--bp-accent)]">
                <Upload className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{uploadedFileName || 'Upload photo...'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {uploadedImageBase64 && (
            <div className="flex items-center justify-between border border-[var(--bp-line)] px-3 py-2 font-mono text-xs text-[var(--bp-ink-muted)]">
              <span>Photo loaded for animation ({uploadedFileName})</span>
              <button
                type="button"
                onClick={() => {
                  setUploadedImageBase64('');
                  setUploadedFileName('');
                }}
                className="text-rose-400 hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          <label className="block">
            <span className="font-mono text-[11px] text-[var(--bp-ink-muted)]">
              Motion / Scene Prompt
            </span>
            <textarea
              rows={3}
              required
              value={vidPrompt}
              onChange={(e) => setVidPrompt(e.target.value)}
              className="mt-1 w-full border border-[var(--bp-line)] bg-transparent p-2.5 text-sm text-[var(--bp-ink)]"
            />
          </label>

          {vidError && (
            <p className="border border-rose-500/50 p-2.5 font-mono text-xs text-rose-400">
              {vidError}
            </p>
          )}

          <button
            type="submit"
            disabled={vidBusy}
            className="inline-flex items-center gap-2 bg-[var(--bp-accent)] px-4 py-2.5 font-mono text-xs font-semibold text-[var(--bp-accent-fg)] disabled:opacity-60"
          >
            {vidBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            {vidBusy
              ? 'Generating Video via Interactions API...'
              : uploadedImageBase64
                ? 'Animate Photo to Video'
                : 'Generate Video from Text'}
          </button>

          {previewVideo && (
            <div className="space-y-3 border-t border-[var(--bp-line)] pt-3">
              <video
                src={previewVideo}
                controls
                playsInline
                className="max-h-56 w-full border border-[var(--bp-line)] bg-black"
              />
              {projects.length > 0 && (
                <button
                  type="button"
                  onClick={() => onAssignToProject(selectedProjectId, 'video', previewVideo)}
                  className="border border-[var(--bp-accent)] px-3 py-1.5 font-mono text-xs text-[var(--bp-accent)]"
                >
                  Attach Video to Project
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Saved Media Assets Gallery */}
      <div className="border border-[var(--bp-line)] bg-[var(--bp-surface-solid)] p-5">
        <h4 className="font-mono text-xs font-semibold uppercase text-[var(--bp-ink-muted)]">
          Media Library ({assets.length})
        </h4>
        {assets.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--bp-ink-muted)]">No saved media assets yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="border border-[var(--bp-line)] p-3 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px] text-[var(--bp-ink-muted)]">
                  <span>{asset.model}</span>
                  <span>{asset.aspectRatio} {asset.resolution || ''}</span>
                </div>
                {asset.mediaUrl && asset.kind === 'image' && (
                  <img src={asset.mediaUrl} alt={asset.prompt} className="h-32 w-full object-cover" />
                )}
                {asset.mediaUrl && asset.kind === 'video' && (
                  <video src={asset.mediaUrl} controls className="h-32 w-full object-cover bg-black" />
                )}
                <p className="line-clamp-2 text-xs text-[var(--bp-ink)]">{asset.prompt}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMediaAsset(asset.id);
                    await onRefresh();
                  }}
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-rose-400 hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
