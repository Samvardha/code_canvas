"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import NotFound from "@/app/not-found";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil } from "lucide-react";
import { StatCell } from "../components/StatCell";
import ConnectionButton from "@/components/ConnectionButton";
import { AvatarUploadModal } from "@/components/AvatarUploadModal";
import { getUserProfile, updateUserProfile } from "@/lib/api/users";
import { CONNECTION_STATUS_ERROR } from "@/lib/messages";
import { PublicProfileResponse } from "../types";

interface ProfileContextType {
  profileData: any;
  loading: boolean;
  error: string;
  isCurrentUser: boolean;
  targetUserId: string | null;
  isPostsTab: boolean;
}

const ProfileContext = createContext<ProfileContextType | null>(null);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileLayout");
  return context;
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const { username } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading, userProfile, refreshProfile } = useAuth();
  
  const isCurrentUser = userProfile?.profile?.username === username;
  const isPostsTab = pathname.endsWith("/posts");

  const [publicProfileData, setPublicProfileData] = useState<PublicProfileResponse | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  const hasFetchedRef = useRef(false);

  const fetchPublicProfile = useCallback(async () => {
    if (!user || isCurrentUser) return;
    setPublicLoading(true);
    setPublicError("");
    hasFetchedRef.current = true;
    try {
      const idToken = await user.getIdToken();
      const data = await getUserProfile(username as string, idToken);
      setPublicProfileData(data);
    } catch (err: any) {
      setPublicError(err.message === "User not found" ? "User handle not found." : CONNECTION_STATUS_ERROR);
    } finally {
      setPublicLoading(false);
    }
  }, [username, user, isCurrentUser]);

  useEffect(() => {
    if (!authLoading && user && !isCurrentUser && !hasFetchedRef.current) {
      fetchPublicProfile();
    }
  }, [user, authLoading, isCurrentUser, fetchPublicProfile]);

  const handleUploadSuccess = async (url: string) => {
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) return;
      await updateUserProfile({ ...(userProfile?.profile ?? {}), avatar_url: url }, idToken);
      await refreshProfile();
      setShowUploadModal(false);
    } catch (err) {
      console.error("Failed to update profile", err);
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

  const profileToDisplay = isCurrentUser ? userProfile?.profile : publicProfileData?.profile;
  const statsToDisplay = isCurrentUser ? userProfile?.stats : publicProfileData?.stats;
  const targetUserId = isCurrentUser ? userProfile?._id : publicProfileData?._id;

  if (publicError === "User handle not found.") {
    return <NotFound profile={true} />;
  }

  if (!profileToDisplay && !publicError) return null;

  return (
    <ProfileContext.Provider value={{ 
      profileData: isCurrentUser ? userProfile : publicProfileData, 
      loading: publicLoading, 
      error: publicError,
      isCurrentUser,
      targetUserId,
      isPostsTab
    }}>
      <main className="min-h-screen bg-black text-foreground relative selection:bg-accent selection:text-black">
        <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />

        <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
          <div className="border border-border bg-surface relative">
            {/* Tabs Navigation */}
            <div className="flex border-b border-border bg-background/50">
              <button 
                onClick={() => router.push(`/profile/${username}`)}
                className={`flex-1 py-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em] border-r border-border transition-colors ${!isPostsTab ? 'text-accent bg-accent/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                [ 01_PROFILE_DATA ]
              </button>
              <button 
                onClick={() => router.push(`/profile/${username}/posts`)}
                className={`flex-1 py-4 text-[10px] font-mono font-bold uppercase tracking-[0.2em] transition-colors ${isPostsTab ? 'text-accent bg-accent/5' : 'text-text-secondary hover:text-white hover:bg-white/5'}`}
              >
                [ 02_USER_POSTS ]
              </button>
            </div>

            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

            {!isPostsTab && (
              <>
                {/* Header Identity */}
                <div className="p-6 sm:p-10 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                  <div className="flex items-center gap-6 flex-1 min-w-0">
                    <div className="relative group shrink-0">
                      {profileToDisplay?.avatar_url ? (
                        <img src={profileToDisplay.avatar_url} alt="avatar" className="h-24 w-24 border border-border object-cover" />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center bg-accent text-black text-2xl font-bold font-mono">
                          {(profileToDisplay?.name?.[0] || profileToDisplay?.username?.[0] || "U").toUpperCase()}
                        </div>
                      )}

                      {isCurrentUser && (
                        <button onClick={() => setShowUploadModal(true)} className="absolute -bottom-1 -right-1 bg-accent text-black p-1.5 hover:bg-white border-2 border-black cursor-pointer shadow-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl sm:text-4xl font-black font-(family-name:--font-space-grotesk) uppercase text-white leading-none tracking-tighter">
                          {profileToDisplay?.name || "ANONYMOUS_ENGINEER"}
                        </h1>
                        <span className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 border border-accent/20 font-bold uppercase tracking-wider hidden sm:inline-block">LVL_01</span>
                      </div>
                      <p className="text-sm font-mono text-accent mt-2 font-bold tracking-widest uppercase">@{profileToDisplay?.username || username}</p>
                    </div>
                  </div>

                  {!isCurrentUser && targetUserId && (
                    <div className="flex items-center shrink-0">
                      <ConnectionButton targetUserId={targetUserId} />
                    </div>
                  )}
                </div>

                {/* Bio & Skills Grid */}
                <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 bg-surface/50">
                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">MISSION_BIO</label>
                    <p className="text-sm text-text-secondary font-medium leading-relaxed border-l-2 border-border pl-4">
                      {profileToDisplay?.bio || "NO TRANSMISSION DATA AVAILABLE."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">OPERATIONAL_LOC</label>
                    <div className="flex items-center gap-3 text-sm text-white font-mono uppercase border-l-2 border-border pl-4">
                      {profileToDisplay?.location || "UNDISCLOSED"}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">CORE_SPECIALIZATIONS</label>
                    <div className="flex flex-wrap gap-2">
                      {profileToDisplay?.skills?.map((skill: string) => (
                        <span key={skill} className="bg-surface border border-border px-3 py-1.5 text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                          {skill}
                        </span>
                      ))}
                      {!profileToDisplay?.skills?.length && <span className="text-[10px] font-mono text-text-secondary italic">NO_SKILLS_STOCKED</span>}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="border-t border-border grid grid-cols-3 divide-x divide-border bg-background/50 text-white">
                  <StatCell label="POSTS" value={statsToDisplay?.posts_count || 0} />
                  <StatCell label="PEERS" value={statsToDisplay?.peers_count || 0} />
                  <StatCell label="COLLABS" value={statsToDisplay?.collabs_count || 0} />
                </div>
              </>
            )}

            {/* Content Slot for Posts */}
            {isPostsTab && (
              <div className="p-6">
                {children}
              </div>
            )}
          </div>

          {/* Profile Tab only Content (GitHub Section) */}
          {!isPostsTab && children}
        </div>

        {isCurrentUser && (
          <AvatarUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUploadSuccess={handleUploadSuccess}
            user={user}
          />
        )}
      </main>
    </ProfileContext.Provider>
  );
}
