"use client";

import React from "react";
import { Image as ImageIcon, Plus, X } from "lucide-react";
import { VideoPreview } from "./VideoPreview";

interface MediaPreview {
  url: string;
  type: string;
}

interface MediaUploadProps {
  previews: MediaPreview[];
  files: File[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  editId: string | null;
  removeFile: (index: number) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MediaUpload = ({
  previews,
  files,
  fileInputRef,
  loading,
  editId,
  removeFile,
  handleFileChange,
}: MediaUploadProps) => {
  return (
    <div>
      <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-[11px] font-mono font-black text-text-secondary uppercase tracking-widest">
          ATTACH_MEDIA
        </label>
        {editId ? (
          <p className="text-[10px] font-mono text-text-secondary/50 uppercase italic tracking-wider">
            &gt; MEDIA_IS_LOCKED_IN_EDIT_MODE
          </p>
        ) : (
          <p className="text-[10px] font-mono text-accent uppercase italic tracking-wider">
            &gt; PNG/JPEG &lt; 5MB | MP4/WEBM &lt; 50MB
          </p>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />

      {previews.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-40 border-2 border-dashed border-border hover:border-accent/40 bg-background/30 text-text-secondary hover:text-accent transition-all flex flex-col items-center justify-center gap-4 disabled:opacity-50 cursor-pointer"
          disabled={loading || !!editId}
        >
          <ImageIcon size={28} />
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] font-black">
            INITIALIZE_MEDIA_UPLOAD
          </p>
        </button>
      ) : (
        <div className="flex flex-wrap gap-4 items-start">
          {previews.map((preview, idx) => (
            <div
              key={idx}
              className="relative h-40 w-auto min-w-[120px] border border-border bg-black/40 overflow-hidden group/preview"
            >
              {preview.type === "image" ? (
                <img
                  src={preview.url}
                  alt=""
                  className="h-full w-auto object-contain"
                />
              ) : (
                <VideoPreview url={preview.url} />
              )}
              {!loading && !editId && (
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute top-2 right-2 z-10 bg-black/80 text-white p-1.5 border border-white/10 opacity-0 group-hover/preview:opacity-100 transition-all hover:bg-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`h-40 w-40 border-2 border-dashed border-border transition-all flex flex-col items-center justify-center gap-2 group ${
              files.length >= 10 || !!editId
                ? "opacity-50 cursor-not-allowed bg-surface/20 text-text-secondary"
                : "hover:border-white/40 bg-surface/50 text-text-secondary hover:text-white cursor-pointer"
            }`}
            disabled={loading || files.length >= 10 || !!editId}
          >
            <Plus size={24} />
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-center px-2">
              {editId ? "LOCKED" : files.length >= 10 ? "LIMIT_REACHED" : "ADD_MORE"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
