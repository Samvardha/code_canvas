"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil } from "lucide-react";
import { StatCell } from "../components/StatCell";
import ConnectionButton from "@/components/ConnectionButton";
import { AvatarUploadModal } from "@/components/AvatarUploadModal";
import { getUserProfile, updateUserProfile } from "@/lib/api/users";
import { CONNECTION_STATUS_ERROR } from "@/lib/messages";
import { PublicProfileResponse } from "../types";
import { useProfileGithub } from "../../../hooks/useProfileGithub";
import { GitHubSection } from "../components/GitHubSection";

export default function ProfilePage() {
  const { username } = useParams();

  const {
    user,
    loading: authLoading,
    profileComplete,
    userProfile,
    backendUid,
    fetchGitHubProfile,
    linkGitHub,
    refreshProfile,
  } = useAuth();

  const router = useRouter();
  const isCurrentUser = userProfile?.profile?.username === username;

  const [publicProfileData, setPublicProfileData] =
    useState<PublicProfileResponse | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);

  const hasFetchedPublicRef = useRef(false);

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
    hasFetchedGhRef,
    loadMore,
    hasMore,
    loadingMore,
  } = useProfileGithub({
    user,
    backendUid,
    profileComplete,
    isCurrentUser,
    username: username as string,
    publicGithubLinked: publicProfileData?.providers?.github?.linked,
  });

  useEffect(() => {
    hasFetchedPublicRef.current = false;
    setPublicProfileData(null);
    setPublicError("");
  }, [username]);

  const fetchPublicProfile = useCallback(async () => {
    if (!user || isCurrentUser) return;

    setPublicLoading(true);
    setPublicError("");
    hasFetchedPublicRef.current = true;

    try {
      const idToken = await user.getIdToken();
      const data = await getUserProfile(username as string, idToken);
      setPublicProfileData(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "User not found") {
        setPublicError("User handle not found in the collective.");
      } else {
        setPublicError(CONNECTION_STATUS_ERROR);
      }
    } finally {
      setPublicLoading(false);
    }
  }, [username, user, isCurrentUser]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user && profileComplete) {
      if (isCurrentUser) {
        if (userProfile && !hasFetchedGhRef.current) loadGitHub();
      } else {
        if (!hasFetchedPublicRef.current) {
          fetchPublicProfile();
        } else if (publicProfileData && !hasFetchedGhRef.current) {
          loadGitHub();
        }
      }
    }
  }, [
    user,
    authLoading,
    profileComplete,
    userProfile,
    publicProfileData,
    isCurrentUser,
    loadGitHub,
    fetchPublicProfile,
  ]);

  const handleUploadSuccess = async (url: string) => {
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) return;
      await updateUserProfile(
        { ...(userProfile?.profile ?? {}), avatar_url: url },
        idToken,
      );
      await refreshProfile();
      setShowUploadModal(false);
    } catch (err) {
      console.error("Failed to update profile after upload", err);
    }
  };

  if (authLoading || (!isCurrentUser && publicLoading) || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45" />[ SYNCING_PROFILE ]
        </div>
      </div>
    );
  }

  if (!isCurrentUser && publicError) {
    return (
      <div className="flex min-h-fit items-center justify-center bg-black text-center px-6 py-24">
        <div className="max-w-2xl space-y-6">
          <div className="text-red-500 font-mono text-xs uppercase tracking-widest border border-red-500/30 p-4 bg-red-500/5">
            &gt; ERR: {publicError}
          </div>
        </div>
      </div>
    );
  }

  const profileToDisplay = isCurrentUser
    ? userProfile?.profile
    : publicProfileData?.profile;
  const statsToDisplay = isCurrentUser
    ? userProfile?.stats
    : publicProfileData?.stats;
  const targetUserId = isCurrentUser
    ? userProfile?._id
    : publicProfileData?._id;

  if (!profileToDisplay) return null;

  return (
    <main className="min-h-screen bg-black text-foreground relative selection:bg-accent selection:text-black hover:overflow-hidden">
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <div className="border border-border bg-surface relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

          <div className="p-6 sm:p-10 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <div className="relative group shrink-0">
                {profileToDisplay?.avatar_url ? (
                  <img
                    src={profileToDisplay.avatar_url}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center bg-accent text-black text-2xl font-bold font-mono">
                    {(
                      profileToDisplay?.name?.[0] ||
                      profileToDisplay?.username?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                )}

                {isCurrentUser && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="absolute -bottom-1 -right-1 bg-accent text-black p-1.5 hover:bg-white border-2 border-black cursor-pointer shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white leading-none tracking-tighter">
                    {profileToDisplay?.name || "ANONYMOUS_ENGINEER"}
                  </h1>
                  <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 border border-accent/20 font-bold uppercase tracking-wider hidden sm:inline-block">
                    LVL_01
                  </span>
                </div>
                <p className="text-sm font-mono text-accent mt-2 font-bold tracking-widest uppercase">
                  @{profileToDisplay?.username || username}
                </p>
                {isCurrentUser && user?.email && (
                  <p className="text-xs font-mono text-text-secondary mt-1">
                    {user?.email}
                  </p>
                )}
              </div>
            </div>

            {!isCurrentUser && targetUserId && (
              <div className="flex items-center shrink-0">
                <ConnectionButton targetUserId={targetUserId} />
              </div>
            )}
          </div>

          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                MISSION_BIO
              </label>
              <p className="text-sm text-text-secondary font-medium leading-relaxed border-l-2 border-border pl-4">
                {profileToDisplay?.bio || "NO TRANSMISSION DATA AVAILABLE."}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                OPERATIONAL_LOC
              </label>
              <div className="flex items-center gap-3 text-sm text-white font-mono uppercase border-l-2 border-border pl-4">
                {profileToDisplay?.location || "UNDISCLOSED"}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                CORE_SPECIALIZATIONS
              </label>
              <div className="flex flex-wrap gap-2">
                {profileToDisplay?.skills?.map((skill: string) => (
                  <span
                    key={skill}
                    className="bg-surface border border-border px-3 py-1.5 text-[10px] font-mono font-bold text-white uppercase tracking-wider"
                  >
                    {skill}
                  </span>
                ))}
                {!profileToDisplay?.skills?.length && (
                  <span className="text-[10px] font-mono text-text-secondary italic">
                    NO_SKILLS_STOCKED
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border grid grid-cols-3 divide-x divide-border bg-background/50 text-white">
            <StatCell label="POSTS" value={statsToDisplay?.posts_count || 0} />
            <StatCell label="PEERS" value={statsToDisplay?.peers_count || 0} />
            <StatCell
              label="COLLABS"
              value={statsToDisplay?.collabs_count || 0}
            />
          </div>
        </div>

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
      </div>

      {isCurrentUser && (
        <AvatarUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
          user={user}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 h-16 bg-linear-to-t from-black via-black/70 to-transparent pointer-events-none z-20"></div>
    </main>
  );
}
