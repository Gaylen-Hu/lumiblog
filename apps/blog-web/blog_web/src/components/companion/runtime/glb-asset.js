export async function fetchGlbBytes(url, {signal, immutable = false} = {}) {
  const response = await fetch(url, {
    signal, credentials: 'same-origin', cache: immutable ? 'force-cache' : 'default',
  });
  if (!response.ok) throw new Error('Cat model could not be loaded');
  let bytes = await response.arrayBuffer();
  signal?.throwIfAborted();

  // Static servers may send raw gzip or set Content-Encoding and decode it
  // before fetch returns. The GLB magic is left untouched in the latter case.
  const signature = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
  if (signature[0] === 0x1f && signature[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'), {signal});
    bytes = await new Response(stream).arrayBuffer();
    signal?.throwIfAborted();
  }
  return bytes;
}
