// No DOM work at module evaluation. The host starts loading after hydration.
export function loadCompanionImage(url, signal) {
  if (signal?.aborted) return Promise.reject(new DOMException('Image load cancelled', 'AbortError'));
  return new Promise((resolve, reject) => {
    const image = new Image();
    let done = false;
    const finish = (error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      image.onload = image.onerror = null;
      if (error) { image.src = ''; reject(error); }
      else resolve(image);
    };
    const aborted = () => finish(new DOMException('Image load cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('Companion texture loading timed out')), 15000);
    signal?.addEventListener('abort', aborted, { once: true });
    image.onload = () => finish();
    image.onerror = () => finish(new Error('Companion texture could not be loaded'));
    image.src = url;
  });
}
