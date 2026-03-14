"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, TrendingUp, Users, Clock } from "lucide-react";
import { motion } from "framer-motion";
import ConnectionButton from "@/components/ConnectionButton";
import { CONNECTION_STATUS_ERROR } from "@/lib/messages";

// Helper components reused from profile/page.tsx or similar
function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold mb-1">
        {label}
      </span>
      <span className="text-xl font-black text-white font-mono">
        {value}
      </span>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-accent">{icon}</span>
      <span className="text-text-secondary uppercase tracking-widest text-[10px] font-bold w-12">{label}</span>
      <span className="text-white truncate">{value}</span>
    </div>
  );
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError("");
    
    try {
      const idToken = await user.getIdToken();
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      const res = await fetch(`${backendUrl}/users/profile/${username}`, {
        headers: { 
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json"
        },
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      } else if (res.status === 404) {
        setError("User handle not found in the collective.");
      } else {
        setError(CONNECTION_STATUS_ERROR);
      }
    } catch (err) {
      setError(CONNECTION_STATUS_ERROR);
    } finally {
      setLoading(false);
    }
  }, [username, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (user) {
      fetchProfile();
    }
  }, [user, authLoading, fetchProfile, router]);

  if (authLoading || (loading && !profileData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="font-mono text-accent text-sm uppercase tracking-widest font-bold animate-pulse flex items-center gap-3">
          <div className="w-3 h-3 bg-accent rotate-45" />[ SYNCING_PROFILE ]
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-center p-6">
        <div className="max-w-md space-y-6">
          <div className="text-red-500 font-mono text-xs uppercase tracking-widest border border-red-500/30 p-4 bg-red-500/5">
            &gt; ERR: {error}
          </div>
          <button 
            onClick={() => router.back()}
            className="text-[10px] font-mono text-accent hover:text-white uppercase tracking-widest border border-accent/20 px-6 py-2 transition-all"
          >
            [ REVERT_TO_PREVIOUS_NODE ]
          </button>
        </div>
      </div>
    );
  }

  const profile = profileData?.profile;

  return (
    <main className="min-h-screen bg-black text-foreground relative selection:bg-accent selection:text-black">
      {/* Grid background */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="border border-border bg-surface relative">
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-accent"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-accent"></div>

          <div className="p-6 sm:p-10 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-6 flex-1 min-w-0">
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="h-24 w-24 border border-border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center bg-accent text-black text-2xl font-bold font-mono">
                    {(profile?.name?.[0] || profile?.username?.[0] || "U").toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-black uppercase text-white leading-none tracking-tighter">
                    {profile?.name || "ANONYMOUS_ENGINEER"}
                  </h1>
                </div>
                <p className="text-sm font-mono text-accent mt-2 font-bold tracking-widest uppercase">
                  @{profile?.username || username}
                </p>
              </div>
            </div>

            <div className="flex items-center shrink-0">
              {profileData?._id && (
                <ConnectionButton targetUserId={profileData._id} />
              )}
            </div>
          </div>

          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                MISSION_BIO
              </label>
              <p className="text-sm text-text-secondary font-medium leading-relaxed border-l-2 border-border pl-4">
                {profile?.bio || "NO TRANSMISSION DATA AVAILABLE."}
              </p>
            </div>
            
            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                OPERATIONAL_LOC
              </label>
              <div className="flex items-center gap-3 text-sm text-white font-mono uppercase border-l-2 border-border pl-4">
                {profile?.location || "UNDISCLOSED"}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-mono text-text-secondary uppercase tracking-widest font-bold">
                CORE_SPECIALIZATIONS
              </label>
              <div className="flex flex-wrap gap-2">
                {profile?.skills?.map((skill: string) => (
                  <span
                    key={skill}
                    className="bg-surface border border-border px-3 py-1.5 text-[10px] font-mono font-bold text-white uppercase tracking-wider"
                  >
                    {skill}
                  </span>
                ))}
                {!profile?.skills?.length && (
                  <span className="text-[10px] font-mono text-text-secondary italic">
                    NO_SKILLS_STOCKED
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border grid grid-cols-3 divide-x divide-border bg-background/50 text-white">
            <StatCell label="POSTS" value={profileData?.stats?.posts_count || 0} />
            <StatCell label="PEERS" value={profileData?.stats?.peers_count || 0} />
            <StatCell label="COLLABS" value={profileData?.stats?.collabs_count || 0} />
          </div>
        </div>

        {/* Placeholder for more public data if needed */}
        <div className="flex justify-center pt-8">
           <button 
             onClick={() => router.back()}
             className="group flex items-center gap-4 text-[10px] font-mono text-text-secondary hover:text-white uppercase tracking-widest transition-all"
           >
             <span className="group-hover:-translate-x-1 transition-transform">&lt;</span> REVERT_TO_PREVIOUS_NODE
           </button>
        </div>
      </div>
    </main>
  );
}
