import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../constants/index.js';
import { formatBytes } from '../../utils/format.js';

/**
 * Optional photo attachment. The file never leaves the browser — it is read
 * into a data URL purely so the prototype can show a preview.
 */
export function PhotoPicker({ value, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  const handleFile = (file) => {
    if (!file) return;
    setError('');

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('That file type is not supported. Choose a PNG, JPEG, WebP or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(
        `That image is ${formatBytes(file.size)}. Please choose one under ${formatBytes(MAX_IMAGE_BYTES)}.`,
      );
      return;
    }

    // Keep the File itself for upload, plus a local preview URL.
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        file,
        name: file.name,
        size: file.size,
        previewUrl: String(reader.result),
      });
    };
    reader.onerror = () => setError('That image could not be read. Try a different file.');
    reader.readAsDataURL(file);
  };

  const clear = () => {
    onChange(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div>
      <span className="cf-label" id="photo-label">
        Photo (optional)
      </span>

      {value ? (
        <div className="flex items-start gap-3 rounded-lg border border-slate-300 p-3">
          <img
            src={value.previewUrl}
            alt={`Preview of ${value.name}`}
            className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-900">{value.name}</p>
            <p className="text-xs text-slate-500">{formatBytes(value.size)}</p>
            <p className="mt-1 text-xs text-slate-500">
              Uploaded with the request once you submit.
            </p>
          </div>
          <button type="button" onClick={clear} className="cf-btn-ghost px-2 py-1 text-xs">
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        </div>
      ) : (
        <label
          htmlFor="photo-input"
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-teal-400 hover:bg-teal-50/40"
        >
          <ImagePlus className="h-5 w-5 text-slate-400" aria-hidden="true" />
          <span className="text-sm font-medium text-navy-800">Attach a photo of the problem</span>
          <span className="text-xs text-slate-500">
            PNG, JPEG, WebP or GIF up to {formatBytes(MAX_IMAGE_BYTES)}
          </span>
        </label>
      )}

      <input
        ref={inputRef}
        id="photo-input"
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        aria-labelledby="photo-label"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />

      {error ? (
        <p className="mt-1 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
