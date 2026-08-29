"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Location } from "@/lib/types";

export function LocationBrandingForm({ location }: { location: Location }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState(location.logo_url || "");
  const [websiteUrl, setWebsiteUrl] = useState(location.website_url || "");
  const [tagline, setTagline] = useState(location.tagline || "");
  const [description, setDescription] = useState(location.description || "");
  const [twitterUrl, setTwitterUrl] = useState(location.twitter_url || "");
  const [instagramUrl, setInstagramUrl] = useState(location.instagram_url || "");
  const [facebookUrl, setFacebookUrl] = useState(location.facebook_url || "");
  const [linkedinUrl, setLinkedinUrl] = useState(location.linkedin_url || "");
  const [youtubeUrl, setYoutubeUrl] = useState(location.youtube_url || "");
  const [contactEmail, setContactEmail] = useState(location.contact_email || "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch("/api/location-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: location.id,
          logoUrl,
          websiteUrl,
          tagline,
          description,
          twitterUrl,
          instagramUrl,
          facebookUrl,
          linkedinUrl,
          youtubeUrl,
          contactEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg("Saved");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={save} className="card" style={{ marginTop: "1.5rem" }}>
      <h2 style={{ fontSize: "1.15rem", marginBottom: "0.35rem" }}>Territory branding</h2>
      <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1.15rem" }}>
        Logo, website, social links and details shown on this territory page.
      </p>

      <div className="brand-grid">
        <label className="field">
          <span>Logo image URL</span>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
        </label>
        <label className="field">
          <span>Website</span>
          <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" />
        </label>
        <label className="field full">
          <span>Tagline</span>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short headline" />
        </label>
        <label className="field full">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="About this territory…" />
        </label>
        <label className="field">
          <span>X / Twitter</span>
          <input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/…" />
        </label>
        <label className="field">
          <span>Instagram</span>
          <input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/…" />
        </label>
        <label className="field">
          <span>Facebook</span>
          <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/…" />
        </label>
        <label className="field">
          <span>LinkedIn</span>
          <input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/…" />
        </label>
        <label className="field">
          <span>YouTube</span>
          <input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/…" />
        </label>
        <label className="field">
          <span>Contact email</span>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@…" type="email" />
        </label>
      </div>

      {logoUrl && (
        <div style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>Preview</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo preview" className="brand-logo-preview" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Saving…" : "Save branding"}
        </button>
        {msg && <span style={{ color: "var(--available)", fontSize: "0.9rem" }}>{msg}</span>}
        {err && <span style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{err}</span>}
      </div>
    </form>
  );
}
