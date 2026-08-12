import React, { useMemo } from "react";

const VIDEO_ID = "roNngUDcO00";

function getNameFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("name") || "";
  return raw.trim();
}

export default function SmsWelcome() {
  const name = useMemo(() => getNameFromQuery(), []);

  const title = name ? `Hello, ${name} 👋` : "Hello 👋";

  // Autoplay requires mute=1 in most browsers
  const embedUrl = `https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&mute=1&playsinline=1&rel=0`;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.h1}>{title}</h1>
        <p style={styles.p}>
          Welcome to our system! Watch this short introduction video.
        </p>

        <div style={styles.videoWrap}>
          <iframe
            title="Welcome Video"
            src={embedUrl}
            style={styles.iframe}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div style={styles.note}>
          If the video doesn’t autoplay, tap play (mobile/browser autoplay
          rules).
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    fontFamily: "Arial, sans-serif",
    background: "linear-gradient(135deg, #4f46e5, #9333ea)",
    color: "#fff",
  },
  card: {
    width: "100%",
    maxWidth: 560,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 20,
    padding: 26,
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
    backdropFilter: "blur(10px)",
  },
  h1: { margin: "0 0 10px", fontSize: 28, lineHeight: 1.2 },
  p: { margin: "0 0 16px", opacity: 0.9, fontSize: 14 },
  videoWrap: {
    position: "relative",
    width: "100%",
    paddingBottom: "56.25%", // 16:9
    borderRadius: 14,
    overflow: "hidden",
    background: "rgba(0,0,0,0.25)",
  },
  iframe: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: 0,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    opacity: 0.75,
  },
};
