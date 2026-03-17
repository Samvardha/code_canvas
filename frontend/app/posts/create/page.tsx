"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "@/components/Toast";
import { useCreatePost } from "@/hooks/useCreatePost";

import { CategorySignals } from "./components/CategorySignals";
import { TransmissionData } from "./components/TransmissionData";
import { GithubSelector } from "./components/GithubSelector";
import { ExternalUplink } from "./components/ExternalUplink";
import { MediaUpload } from "./components/MediaUpload";
import { CollabFields } from "./components/CollabFields";
import { EventFields } from "./components/EventFields";
import { FormToolbar } from "./components/FormToolbar";
import { GuideAside } from "./components/GuideAside";
import { LoadingScreen } from "./components/LoadingScreen";

export default function CreatePostPage() {
  const { state, actions, refs } = useCreatePost();

  if (state.authLoading || (!state.token && !state.user)) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-black text-foreground selection:bg-accent selection:text-black font-sans relative">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col md:flex-row min-h-screen max-w-[1400px] mx-auto border-x border-border bg-black/40 backdrop-blur-[2px]">
        <section className="flex-1 overflow-y-auto border-r border-border min-h-screen hide-scrollbar">
          <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-border p-6 flex items-center justify-between">
            <h1 className="text-2xl font-black font-(family-name:--font-space-grotesk) uppercase text-white tracking-tight">
              INITIALIZE_
              <span className="text-accent text-outline">BROADCAST</span>
            </h1>
          </header>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col"
          >
            {/* Scrollable Content */}
            <div className="p-6 space-y-8 bg-surface/50 min-h-[calc(100vh-89px)]">
              <CategorySignals
                selectedCategory={state.selectedCategory}
                toggleCategory={actions.toggleCategory}
                isGithubConnected={state.isGithubConnected}
                editId={state.editId}
              />

              {/* Common Content */}
              <div className="grid grid-cols-1 gap-8">
                <TransmissionData
                  text={state.text}
                  setText={actions.setText}
                  handleSuggest={actions.handleSuggest}
                  isGenerating={state.isGenerating}
                  loading={state.loading}
                  suggestions={state.suggestions}
                  setSuggestions={actions.setSuggestions}
                  applySuggestion={actions.applySuggestion}
                  validationErrors={state.validationErrors}
                  clearError={actions.clearError}
                />

                <GithubSelector
                  selectedRepo={state.selectedRepo}
                  repos={state.repos}
                  githubLoading={state.githubLoading}
                  hasMoreRepos={state.hasMoreRepos}
                  githubPage={state.githubPage}
                  showRepoDropdown={state.showRepoDropdown}
                  setShowRepoDropdown={actions.setShowRepoDropdown}
                  fetchRepos={actions.fetchRepos}
                  handleRepoSelect={actions.handleRepoSelect}
                  isGithubConnected={state.isGithubConnected}
                  selectedCategory={state.selectedCategory}
                  dropdownRef={refs.dropdownRef}
                />

                <ExternalUplink
                  link={state.link}
                  setLink={actions.setLink}
                  loading={state.loading}
                />
              </div>

              <MediaUpload
                previews={state.previews}
                files={state.files}
                fileInputRef={refs.fileInputRef}
                loading={state.loading}
                editId={state.editId}
                removeFile={actions.removeFile}
                handleFileChange={actions.handleFileChange}
              />

              <AnimatePresence>
                {state.selectedCategory === "collab" && (
                  <CollabFields
                    collabMeta={state.collabMeta}
                    setCollabMeta={actions.setCollabMeta}
                    lookingForInput={state.lookingForInput}
                    setLookingForInput={actions.setLookingForInput}
                    requirementsInput={state.requirementsInput}
                    setRequirementsInput={actions.setRequirementsInput}
                    addTag={actions.addTag}
                    removeTag={actions.removeTag}
                    validationErrors={state.validationErrors}
                    clearError={actions.clearError}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {state.selectedCategory === "event" && (
                  <EventFields
                    eventMeta={state.eventMeta}
                    setEventMeta={actions.setEventMeta}
                    showModeDropdown={state.showModeDropdown}
                    setShowModeDropdown={actions.setShowModeDropdown}
                    validationErrors={state.validationErrors}
                    clearError={actions.clearError}
                    setValidationErrors={actions.setValidationErrors}
                    editId={state.editId}
                    modeDropdownRef={refs.modeDropdownRef}
                  />
                )}
              </AnimatePresence>
            </div>

            <FormToolbar
              loading={state.loading}
              editId={state.editId}
              handleReset={actions.handleReset}
              handleSubmit={actions.handleSubmit}
            />
          </motion.div>
        </section>

        <GuideAside editId={state.editId} />
      </div>

      <Toast
        isVisible={state.showSuccessToast}
        message={
          state.editId
            ? "SIGNAL_UPDATED_SUCCESSFULLY"
            : "SIGNAL_BROADCAST_SUCCESSFUL"
        }
        onClose={() => actions.setShowSuccessToast(false)}
      />
      <Toast
        isVisible={state.toast.isVisible}
        message={state.toast.message}
        onClose={() => actions.setToast({ ...state.toast, isVisible: false })}
      />
    </main>
  );
}
