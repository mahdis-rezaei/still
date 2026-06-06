import { useCallback, useEffect, useRef, useState } from "react";
import { customFetch } from "@workspace/api-client-react";
import { isNativeApp } from "@/lib/native";
import { apiUrl } from "@/lib/api-url";

export type Attachment = {
  id: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  createdAt: string;
};

// Downscale + re-encode a chosen photo in the browser before upload, so we never
// ship a 12-megapixel camera original over the wire or into storage. Caps the
// longest edge at maxDim and re-encodes to JPEG. Returns the blob + its size.
async function prepareImage(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<{ blob: Blob; width: number; height: number }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode failed"));
    i.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
      "image/jpeg",
      quality,
    ),
  );
  return { blob, width, height };
}

interface Props {
  entryId: string | null;
  editable?: boolean;
  // For the Today composer: the page may not be saved yet. Called before the
  // first upload to create/return the entry id (or null if there's nothing to
  // attach to yet).
  ensureEntry?: () => Promise<string | null>;
}

export function EntryImages({ entryId, editable = false, ensureEntry }: Props) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (id: string) => {
    try {
      const list = await customFetch<Attachment[]>(
        `/api/entries/${id}/attachments`,
        { responseType: "json" },
      );
      setItems(list);
    } catch {
      // A missing list is not worth alarming the writer over.
    }
  }, []);

  useEffect(() => {
    if (entryId) load(entryId);
    else setItems([]);
  }, [entryId, load]);

  async function uploadFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      let id = entryId;
      if (!id && ensureEntry) id = await ensureEntry();
      if (!id) {
        setError("Write a few words first, then add an image.");
        return;
      }
      for (const file of images) {
        const { blob, width, height } = await prepareImage(file);
        await customFetch(
          `/api/entries/${id}/attachments?w=${width}&h=${height}`,
          {
            method: "POST",
            headers: { "content-type": "image/jpeg" },
            body: blob,
            responseType: "json",
          },
        );
      }
      await load(id);
    } catch {
      setError("That image couldn't be added. Try another.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    void uploadFiles(Array.from(files));
  }

  // Native: capture straight from the device camera (in-the-moment journaling).
  async function captureFromCamera() {
    try {
      const { Camera, CameraResultType, CameraSource } = await import(
        "@capacitor/camera"
      );
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });
      if (!photo.webPath) return;
      const blob = await (await fetch(photo.webPath)).blob();
      const file = new File([blob], `photo.${photo.format || "jpg"}`, {
        type: blob.type || "image/jpeg",
      });
      await uploadFiles([file]);
    } catch {
      /* user cancelled, or no camera available */
    }
  }

  async function remove(id: string) {
    try {
      await customFetch(`/api/attachments/${id}`, {
        method: "DELETE",
        responseType: "text",
      });
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError("Couldn't remove that image.");
    }
  }

  // Read-only with nothing to show: render nothing (keeps the reading page clean).
  if (!editable && items.length === 0) return null;

  return (
    <div className="mt-6">
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="relative group rounded-xl overflow-hidden border border-border bg-surface"
            >
              <img
                src={apiUrl(`/api/attachments/${a.id}`)}
                alt="Attached to this page"
                loading="lazy"
                onClick={() => setZoom(a.id)}
                className="w-full h-36 object-cover cursor-zoom-in"
                data-testid="img-attachment"
              />
              {editable && (
                <button
                  onClick={() => remove(a.id)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-background/85 text-soft-ink hover:text-ink w-7 h-7 flex items-center justify-center text-sm shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label="Remove image"
                  data-testid="button-remove-image"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div className="mt-3 flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onPick(e.target.files)}
            className="hidden"
            data-testid="input-attach-image"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="font-sans text-sm text-soft-ink hover:text-ink border border-border hover:border-accent-sepia rounded-full px-4 py-1.5 transition-colors disabled:opacity-50"
            data-testid="button-add-image"
          >
            {busy ? "adding…" : "＋ Add image"}
          </button>
          {isNativeApp() && (
            <button
              onClick={() => void captureFromCamera()}
              disabled={busy}
              className="font-sans text-sm text-soft-ink hover:text-ink border border-border hover:border-accent-sepia rounded-full px-4 py-1.5 transition-colors disabled:opacity-50"
              data-testid="button-take-photo"
            >
              📷 Take photo
            </button>
          )}
          {error && (
            <span className="font-sans text-xs text-faint-ink">{error}</span>
          )}
        </div>
      )}

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-6 cursor-zoom-out"
          data-testid="overlay-image-zoom"
        >
          <img
            src={apiUrl(`/api/attachments/${zoom}`)}
            alt="Attached to this page"
            className="max-h-full max-w-full rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
