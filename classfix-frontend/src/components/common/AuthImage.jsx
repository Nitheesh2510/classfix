import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { api } from '../../services/api.js';

/**
 * Attachments are behind the API's auth check, so an <img src> cannot fetch
 * them directly — a bearer token cannot be attached to an image request.
 * This fetches the file with auth and renders it from an object URL, which it
 * revokes on unmount so blobs do not accumulate.
 */
export function AuthImage({ requestId, attachmentId, alt, className }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    api
      .attachmentUrl(requestId, attachmentId)
      .then((value) => {
        if (cancelled) {
          URL.revokeObjectURL(value);
          return;
        }
        objectUrl = value;
        setUrl(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [requestId, attachmentId]);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 ${className}`}
        role="img"
        aria-label={`${alt} (could not be loaded)`}
      >
        <ImageOff className="h-5 w-5" aria-hidden="true" />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        className={`animate-pulse rounded-lg border border-slate-200 bg-slate-100 ${className}`}
        aria-hidden="true"
      />
    );
  }

  return <img src={url} alt={alt} className={className} />;
}
