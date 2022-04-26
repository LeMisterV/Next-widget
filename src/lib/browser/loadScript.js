const scriptLoadTimeoutDefault = 10000;

export const loadScript = (src, maxTimeout = scriptLoadTimeoutDefault) =>
  new Promise((resolve, reject) => {
    let timeout;
    const script = document.createElement('script');

    const done = (event) => {
      if (typeof event === 'string') {
        return;
      }

      // avoid mem leaks in IE.
      script.onerror = null;
      script.onload = null;
      document.head.removeChild(script);

      if (timeout) {
        clearTimeout(timeout);
      }

      switch (event.type) {
        case 'timeout':
          reject(new Error(`Script load timeout: "${src}"`));
          break;

        case 'load':
          resolve();
          break;

        default:
          reject(new Error(`Script load failed: "${src}"`));
          break;
      }
    };

    script.async = true;
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.src = src;

    script.onerror = done;
    script.onload = done;

    document.head.appendChild(script);

    if (maxTimeout > 0) {
      timeout = setTimeout(() => done({ type: 'timeout' }), maxTimeout);
    }
  });

export const ensureFeature = (feature) => {
  const initialCheckResult = feature.check();
  if (initialCheckResult) {
    return Promise.resolve(initialCheckResult);
  }

  const control = () =>
    feature.check() || Promise.reject(new Error(`Feature not available after loading source: ${feature.src}`));

  if (!('load' in feature)) {
    return loadScript(feature.src, feature.maxTimeout).then(control);
  }

  return feature.load().then(control);
};
