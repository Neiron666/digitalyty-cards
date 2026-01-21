import Section from "./Section";
import styles from "./VideoSection.module.css";

function toYouTubeEmbedUrl(raw) {
    if (typeof raw !== "string") return null;
    const input = raw.trim();
    if (!input) return null;

    // Allow common user inputs without protocol, but never allow relative URLs.
    const looksLikeYouTubeDomain =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\b/i.test(input);
    if (!looksLikeYouTubeDomain) return null;

    let url;
    try {
        const withProtocol = /^https?:\/\//i.test(input)
            ? input
            : `https://${input}`;
        url = new URL(withProtocol);
    } catch {
        return null;
    }

    const hostname = url.hostname.toLowerCase();
    const isYouTube =
        hostname === "youtube.com" || hostname.endsWith(".youtube.com");
    const isYoutuBe = hostname === "youtu.be";
    if (!isYouTube && !isYoutuBe) return null;

    let videoId = null;

    if (isYoutuBe) {
        // https://youtu.be/{id}
        const parts = url.pathname.split("/").filter(Boolean);
        videoId = parts[0] || null;
    } else {
        const path = url.pathname;

        // https://www.youtube.com/watch?v={id}
        if (path === "/watch") {
            videoId = url.searchParams.get("v");
        }

        // https://www.youtube.com/shorts/{id}
        if (!videoId && path.startsWith("/shorts/")) {
            videoId = path.split("/shorts/")[1]?.split("/")[0] || null;
        }

        // https://www.youtube.com/embed/{id}
        if (!videoId && path.startsWith("/embed/")) {
            videoId = path.split("/embed/")[1]?.split("/")[0] || null;
        }
    }

    if (!videoId) return null;

    // YouTube video IDs are 11 chars: [A-Za-z0-9_-]
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

    return `https://www.youtube.com/embed/${videoId}`;
}

function VideoSection({ card }) {
    const videoUrl = card.content?.videoUrl;

    const embedUrl = toYouTubeEmbedUrl(videoUrl);

    if (!embedUrl) return null;

    return (
        <Section title="וידאו">
            <iframe
                width="100%"
                height="auto"
                src={embedUrl}
                title="Business video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className={styles.video}
            />
        </Section>
    );
}

export default VideoSection;
