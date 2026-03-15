import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileImage, Loader2 } from "lucide-react";
import { Banner } from "@/components/Banner";
import { uploadAvatar } from "@/lib/api/users";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (url: string) => void;
  user: any;
}

export function AvatarUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  user,
}: AvatarUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup preview URL on unmount or file change
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const processFile = (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setUploadError("ONLY_JPEG_OR_PNG_ALLOWED");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("FILE_TOO_LARGE_MAX_5MB");
      return;
    }

    setUploadError("");
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadError("");

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error("AUTHENTICATION_TOKEN_UNAVAILABLE");

      const data = await uploadAvatar(selectedFile, idToken);
      onUploadSuccess(data.url);
      handleClose();
    } catch (err: any) {
      setUploadError(err.message || "UPLOAD_FAILED");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setUploadError("");
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl border border-border bg-surface shadow-2xl overflow-hidden"
          >
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h2 className="text-xl font-black font-mono text-white uppercase tracking-tighter">
                    AVATAR_RECONFIGURATION
                  </h2>
                  <p className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">
                    {selectedFile ? "STAGING_READY" : "SECURE_UPLINK_INITIALIZED"}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="text-text-secondary hover:text-white transition-colors p-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5 cursor-pointer" />
                </button>
              </div>

              {!selectedFile ? (
                <div
                  onDragOver={(e) => !isUploading && handleDragOver(e)}
                  onDragLeave={() => !isUploading && handleDragLeave()}
                  onDrop={(e) => !isUploading && handleDrop(e)}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center gap-5 group
                    ${isUploading ? "border-border bg-background pointer-events-none opacity-50" : "cursor-pointer"}
                    ${isDragging ? "border-accent bg-accent/10" : `border-border bg-background ${!isUploading ? "hover:border-accent/40" : ""}`}
                  `}
                >
                  <div
                    className={`p-5 rounded-full transition-colors ${
                      isDragging
                        ? "bg-accent text-black shadow-[0_0_15px_rgba(var(--accent-rgb),0.5)]"
                        : "bg-surface text-text-secondary group-hover:text-accent"
                    }`}
                  >
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-mono text-white font-bold uppercase tracking-tight">
                      DROP_NEW_IDENTITY
                    </p>
                    <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest mt-1">
                      OR_SELECT_FROM_MEMORY
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-text-secondary uppercase font-black">
                    <FileImage className="w-3.5 h-3.5" />
                    PNG/JPEG &lt; 5MB
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div className="w-48 h-48 border-2 border-accent bg-background overflow-hidden relative shadow-[0_0_30px_rgba(var(--accent-rgb),0.2)]">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className={`w-full h-full object-cover transition-opacity ${isUploading ? "opacity-40" : "opacity-100"}`}
                      />
                    </div>

                    {!isUploading && (
                      <button
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl("");
                        }}
                        className="absolute -top-3 -right-3 bg-red-500 text-white p-2 hover:bg-red-600 transition-colors border-2 border-black shadow-lg cursor-pointer"
                        title="Remove Image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-mono text-white font-bold uppercase tracking-widest">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] font-mono text-text-secondary uppercase tracking-widest">
                      FILE_SIZE: {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
                    </p>
                  </div>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {uploadError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 overflow-hidden"
                  >
                    <Banner variant="error" compact>
                      {uploadError}
                    </Banner>
                  </motion.div>
                )}
              </AnimatePresence>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                }}
                className="hidden"
                accept="image/jpeg,image/png"
              />

              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="flex-1 font-mono text-[10px] font-black uppercase text-text-secondary hover:text-white border border-border hover:border-white py-3 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  ABORT_STAGING
                </button>

                {selectedFile && (
                  <button
                    onClick={handleSave}
                    disabled={isUploading}
                    className="flex-1 font-mono text-[10px] font-black uppercase bg-accent text-black hover:bg-white transition-all cursor-pointer shadow-[0_0_20px_rgba(var(--accent-rgb),0.3)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {isUploading && <Loader2 className="w-3 h-3 animate-spin" />}
                    {isUploading ? "PROCESS_RUNNING..." : "CONFIRM_UPLINK"}
                  </button>

                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
