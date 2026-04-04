"use client";

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
    handleGitHubLink,
    hasGitHub,
    connected,
    langEntries,
    totalLangCount,
    loadMore,
    hasMore,
    loadingMore,
  } = useProfileGithub({
    user,
    backendUid,
    profileComplete,
    isCurrentUser,
    username: username as string,
    publicGithubLinked: profileData?.providers?.github?.linked,
  });

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
      loadMore={async () => { await loadMore(); }}
      hasMore={hasMore}
      loadingMore={loadingMore}
    />
  );
}
