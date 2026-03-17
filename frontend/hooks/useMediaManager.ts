"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

export const useMediaManager = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: string }[]>([]);
  const [originalMedia, setOriginalMedia] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewsRef = useRef(previews);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((preview) => {
        if (preview.url.startsWith("blob:")) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, showToast: (m: string) => void) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;

      const remainingSlots = 10 - files.length;
      if (remainingSlots <= 0) {
        showToast("MAX_10_FILES_ALLOWED");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const filesToProcess = selectedFiles.slice(0, remainingSlots);
      if (selectedFiles.length > remainingSlots) {
        showToast(`LIMIT_REACHED_ONLY_FIRST_${remainingSlots}_FILES_ADDED`);
      }

      const addedFiles: File[] = [];
      const addedPreviews: { url: string; type: string }[] = [];

      filesToProcess.forEach((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
          showToast("ONLY_IMAGES_AND_VIDEOS_ALLOWED");
          return;
        }

        addedFiles.push(file);
        addedPreviews.push({
          url: URL.createObjectURL(file),
          type: isImage ? "image" : "video",
        });
      });

      if (addedFiles.length > 0) {
        setFiles((prev) => [...prev, ...addedFiles]);
        setPreviews((prev) => [...prev, ...addedPreviews]);
      }

      // Clear input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [files.length],
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    setPreviews((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].url);
      copy.splice(index, 1);
      return copy;
    });
  }, []);

  const resetMedia = useCallback(() => {
    setPreviews((prev) => {
      prev.forEach((p) => {
        if (p.url.startsWith("blob:")) URL.revokeObjectURL(p.url);
      });
      return [];
    });
    setFiles([]);
    setOriginalMedia([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return useMemo(
    () => ({
      files,
      previews,
      originalMedia,
      fileInputRef,
      setFiles,
      setPreviews,
      setOriginalMedia,
      handleFileChange,
      removeFile,
      resetMedia,
    }),
    [
      files,
      previews,
      originalMedia,
      handleFileChange,
      removeFile,
      resetMedia,
    ],
  );
};

