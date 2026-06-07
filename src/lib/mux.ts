import Mux from "@mux/mux-node";

// SERVER ONLY. Never import from a client component — it would leak
// MUX_TOKEN_SECRET into the browser bundle.
export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export type CreatedMuxStream = {
  mux_stream_id: string;
  mux_stream_key: string;
  mux_playback_id: string | null;
};

// Cost controls. Egress + transcoding scale with viewers × resolution ×
// duration. At a 10% platform cut of a GH₵63–150 ticket, an uncapped
// "high camera, 4K-ish, all night" stream can cost more than the show
// earns. Pick defensible caps:
//
//   - max_resolution_tier '1080p' on the recording asset caps the
//     transcode ladder — Mux won't process or deliver above 1080p
//     regardless of what OBS sends. (Choices: 1080p, 1440p, 2160p.)
//   - max_continuous_duration 4h is the hard-stop on a single broadcast
//     so a forgotten-running OBS doesn't burn credits all night. Mux's
//     own ceiling here is 12h.
//   - reconnect_window 60s lets the artist recover a flaky upload
//     without ending the show; long enough to be useful, short enough
//     to mark a real disconnect.
const MAX_RESOLUTION_TIER = "1080p" as const;
const MAX_CONTINUOUS_DURATION_SECONDS = 4 * 60 * 60;
const RECONNECT_WINDOW_SECONDS = 60;

export async function createMuxLiveStream(): Promise<CreatedMuxStream> {
  const stream = await mux.video.liveStreams.create({
    // 'signed' means viewers need a JWT to play — that's how we enforce
    // ticket ownership at the player layer.
    playback_policy: ["signed"],
    new_asset_settings: {
      playback_policy: ["signed"],
      max_resolution_tier: MAX_RESOLUTION_TIER,
    },
    reduced_latency: true,
    reconnect_window: RECONNECT_WINDOW_SECONDS,
    max_continuous_duration: MAX_CONTINUOUS_DURATION_SECONDS,
  });

  if (!stream.stream_key) {
    throw new Error("Mux returned no stream_key");
  }

  return {
    mux_stream_id: stream.id,
    mux_stream_key: stream.stream_key,
    mux_playback_id: stream.playback_ids?.[0]?.id ?? null,
  };
}

// Returns a fully-signed HLS URL that's good for `expirySeconds`. The
// WatchClient refreshes well before this expires.
export async function signMuxPlaybackUrl(
  playbackId: string,
  expirySeconds = 900,
): Promise<string> {
  const token = await mux.jwt.signPlaybackId(playbackId, {
    keyId: process.env.MUX_SIGNING_KEY_ID!,
    keySecret: process.env.MUX_SIGNING_PRIVATE_KEY!,
    expiration: `${expirySeconds}s`,
    type: "video",
  });
  return `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
}

