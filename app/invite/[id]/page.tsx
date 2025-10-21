import { supabase } from "@/lib/supabaseClient"; // your existing browser client
import { createClient } from "@supabase/supabase-js";

// ✅ use a small server-side supabase for metadata
const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { global: { fetch } }
);

export async function generateMetadata({ params }: { params: { id: string } }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://nowish.vercel.app";

  const { data: invite } = await supabaseServer
    .from("open_invites")
    .select("id, title, window_start, window_end")
    .eq("id", params.id)
    .maybeSingle();

  const title = invite?.title ? `Nowish: ${invite.title}` : "Nowish Invite";
  const desc =
    invite?.window_start && invite?.window_end
      ? new Date(invite.window_start).toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        }) +
        " – " +
        new Date(invite.window_end).toLocaleTimeString([], {
          timeStyle: "short",
        })
      : "Join this Nowish invite";

  const ogImage = `${base}/invite/${params.id}/opengraph-image`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `${base}/invite/${params.id}`,
      siteName: "Nowish",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };
}

// ==================== PAGE ====================

"use client";

import { useState, useEffect } from "react";

export default function InvitePage({ params }: { params: { id: string } }) {
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvite() {
      const { data } = await supabase
        .from("open_invites")
        .select("id, title, window_start, window_end, creator_id")
        .eq("id", params.id)
        .maybeSingle();

      setInvite(data);
      setLoading(false);
    }
    loadInvite();
  }, [params.id]);

  async function sendRSVP(status: "join" | "maybe" | "decline") {
    setState(status);
    await supabase.from("rsvps").insert({
      invite_id: params.id,
      state: status,
    });
    alert("Thanks — your RSVP was recorded!");
  }

  if (loading) return <p>Loading...</p>;
  if (!invite) return <p>Invite not found.</p>;

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "1.5rem auto",
        padding: 16,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "clamp(24px,5vw,36px)" }}>{invite.title}</h1>
      <p style={{ color: "#555" }}>
        {invite.window_start
          ? new Date(invite.window_start).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            }) +
            " – " +
            new Date(invite.window_end).toLocaleTimeString([], {
              timeStyle: "short",
            })
          : ""}
      </p>

      <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          onClick={() => sendRSVP("join")}
          style={{
            background: "#111",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          I’m in
        </button>
        <button
          onClick={() => sendRSVP("maybe")}
          style={{
            background: "#f4f4f4",
            border: "1px solid #ccc",
            padding: "10px 18px",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Maybe
        </button>
        <button
          onClick={() => sendRSVP("decline")}
          style={{
            background: "transparent",
            border: "1px solid #ccc",
            padding: "10px 18px",
            borderRadius: 8,
            color: "#777",
            fontWeight: 600,
          }}
        >
          Can’t make it
        </button>
      </div>

      {state && (
        <p style={{ marginTop: 24, color: "#0070f3", fontWeight: 600 }}>
          Great — see you there!
        </p>
      )}
    </main>
  );
}