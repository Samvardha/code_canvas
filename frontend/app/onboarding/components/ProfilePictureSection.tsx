"use client";

import { Camera, Pencil } from "lucide-react";

interface ProfilePictureSectionProps {
  avatarUrl: string;
  onUploadClick: () => void;
}

export function ProfilePictureSection({
  avatarUrl,
  onUploadClick,
}: ProfilePictureSectionProps) {
  return (
    <div className="flex flex-col items-center gap-4 mb-8 md:mb-0 w-full">
      <div className="relative group">
        <div className="w-40 h-40 border-2 border-border bg-background overflow-hidden relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-surface">
              <Camera className="w-10 h-10 text-text-secondary" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onUploadClick}
          className="absolute -bottom-2 -right-2 bg-accent text-black p-2 hover:bg-white transition-colors border-2 border-black cursor-pointer shadow-lg"
          title="Change Avatar"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] font-mono text-text-secondary uppercase font-bold tracking-widest text-center">
        Profile Picture
      </p>
    </div>
  );
}
