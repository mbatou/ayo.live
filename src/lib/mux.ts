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

export async function createMuxLiveStream(): Promise<CreatedMuxStream> {
  const stream = await mux.video.liveStreams.create({
    // 'signed' means viewers need a JWT to play — that's how we enforce
    // ticket ownership at the player layer.
    playback_policy: ["signed"],
    new_asset_settings: { playback_policy: ["signed"] },
    reduced_latency: true,
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
