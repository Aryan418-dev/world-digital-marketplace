"use client";

import { useEffect, useRef } from "react";

function getSessionId() {
  if (typeof window === "undefined") return null;
  const key = "world_sid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function TrackLocationEvent({
  locationId,
  eventType = "view",
}: {
  locationId: string;
  eventType?: "view" | "click" | "search" | "wishlist";
}) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current || !locationId) return;
    sent.current = true;
    const sessionId = getSessionId();
    void fetch("/api/location-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, eventType, sessionId }),
      keepalive: true,
    }).catch(() => {});
  }, [locationId, eventType]);

  return null;
}

export function trackClick(locationId: string) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  void fetch("/api/location-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locationId, eventType: "click", sessionId }),
    keepalive: true,
  }).catch(() => {});
}
