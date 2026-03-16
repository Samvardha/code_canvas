"use client";

import React, { useEffect } from "react";
import { useProfile } from "./layout";
import { GitHubSection } from "../components/GitHubSection";
import { useProfileGithub } from "../../../hooks/useProfileGithub";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";

export default function ProfileDetailsPage() {
  const { profileData, isCurrentUser, error: profileError } = useProfile();
  const { username } = useParams();
  const { user, backendUid, profileComplete } = useAuth();

  const {
    githubData: gh,
    ghLoading,
    linkError,
    loadGitHub,
    handleGitHubLink,
    hasGitHub,
    connected,
    langEntries,
    totalLangCount,
    loadMore,
    hasMore,
    loadingMore,
    hasFetchedGhRef
  } = useProfileGithub({
    user,
    backendUid,
    profileComplete,
    isCurrentUser,
    username: username as string,
    publicGithubLinked: profileData?.providers?.github?.linked,
  });

  useEffect(() => {
    if (user && profileComplete && !hasFetchedGhRef.current) {
      loadGitHub();
    }
  }, [user, profileComplete, loadGitHub, hasFetchedGhRef]);

  if (profileError) {
    return (
      <div className="text-red-500 font-mono text-xs uppercase tracking-widest border border-red-500/30 p-4 bg-red-500/5">
        &gt; ERR: {profileError}
      </div>
    );
  }

  return (
    <GitHubSection
      ghLoading={ghLoading}
      githubData={gh}
      hasGitHub={hasGitHub}
      connected={connected}
      langEntries={langEntries}
      totalLangCount={totalLangCount}
      handleGitHubLink={handleGitHubLink}
      linkError={linkError}
      isCurrentUser={isCurrentUser}
      loadMore={loadMore}
      hasMore={hasMore}
      loadingMore={loadingMore}
    />
  );
}
