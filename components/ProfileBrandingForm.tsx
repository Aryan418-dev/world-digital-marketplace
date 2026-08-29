"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

export function ProfileBrandingForm({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url || profile?.avatar_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(profile?.website_url || "");
  const [twitterUrl, setTwitterUrl] = useState(profile?.twitter_url || "");
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagram_url || "");
  const [facebookUrl, setFacebookUrl] = useState(profile?.facebook_url || "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url || "");
  const [youtubeUrl, setYoutubeUrl] = useState(profile?.youtube_url || "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/profile-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio,
          logoUrl,
          websiteUrl,
          twitterUrl,
          instagramUrl,
          facebookUrl,
          linkedinUrl,
          youtubeUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Profile updated");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="card" style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "0.35rem" }}>Your profile &amp; brand</h2>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1.15rem" }}>
        Logo, bio and social links for your collector profile.
      </p>
      <div className="brand-grid">
        <label className="field">
          <span>Display name</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="field">
          <span>Logo / avatar URL</span>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
        </label>
        <label className="field full">
          <span>Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} />
        </label>
        <label className="field">
          <span>Website</span>
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
        </label>
        <label className="field">
          <span>X / Twitter</span>
          <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>Instagram</span>
          <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>Facebook</span>
          <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>LinkedIn</span>
          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        </label>
        <label className="field">
          <span>YouTube</span>
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} />
        </label>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Save profile"}
        </button>
        {msg && <span style={{ color: "var(--available)", fontSize: "0.9rem" }}>{msg}</span>}
        {err && <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{err}</span>}
      </div>
    </form>
  );
}
