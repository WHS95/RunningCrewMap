"use client";

/**
 * LogoCropDialog — square crop modal for crew logos.
 *
 * Matches how the logo is displayed on the map: rendered inside a circular
 * mask within the teardrop pin. The user crops a 1:1 area; we save it as a
 * square JPEG and the map's CSS `border-radius: 50%` masks it to a circle.
 *
 * Built on `react-easy-crop` for pan/zoom/pinch + canvas extraction. Output
 * is a fresh File the parent can hand straight to the upload pipeline.
 *
 * Cartographic Dark styled: hairline borders, mono kickers, lime CTA, the
 * preview circle uses the same edge treatment as the pin's logo well.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KickerLabel } from "@/components/design/cartographic";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

const OUTPUT_SIZE = 512; // px — final square output edge length
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;

interface Props {
  /** When set, the dialog opens. Null/undefined keeps it closed. */
  file: File | null;
  onCancel: () => void;
  /** Called with a freshly created File once the user confirms the crop. */
  onConfirm: (cropped: File) => void;
}

// Load a File into an HTMLImageElement (returns a promise).
function readImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

// Extract the cropped square region from the source image into a new File.
async function cropToFile(
  source: File,
  area: Area,
  rotation: number
): Promise<File> {
  const img = await readImage(source);

  // Build canvas at OUTPUT_SIZE so the saved file is consistent.
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Apply rotation around image center if requested. react-easy-crop reports
  // the crop area in the *unrotated* source's coords AFTER rotation has been
  // applied visually — so we rotate the source onto a working canvas first.
  const rad = (rotation * Math.PI) / 180;
  const safeArea =
    2 * ((Math.max(img.width, img.height) / 2) * Math.sqrt(2));

  const work = document.createElement("canvas");
  work.width = safeArea;
  work.height = safeArea;
  const wctx = work.getContext("2d");
  if (!wctx) throw new Error("Working canvas context unavailable");

  wctx.translate(safeArea / 2, safeArea / 2);
  wctx.rotate(rad);
  wctx.translate(-img.width / 2, -img.height / 2);
  wctx.drawImage(img, 0, 0);

  const data = wctx.getImageData(0, 0, safeArea, safeArea);

  // Reset and paste the cropped region at OUTPUT_SIZE.
  work.width = area.width;
  work.height = area.height;
  wctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + img.width / 2 - area.x),
    Math.round(0 - safeArea / 2 + img.height / 2 - area.y)
  );

  ctx.drawImage(
    work,
    0,
    0,
    work.width,
    work.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode cropped image"));
          return;
        }
        // Reuse the original filename minus its extension; force .jpg.
        const baseName = source.name.replace(/\.[^.]+$/, "") || "logo";
        resolve(new File([blob], `${baseName}.jpg`, { type: OUTPUT_TYPE }));
      },
      OUTPUT_TYPE,
      OUTPUT_QUALITY
    );
  });
}

export function LogoCropDialog({ file, onCancel, onConfirm }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  // Manage object URL lifecycle so we don't leak memory.
  useEffect(() => {
    if (!file) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setImageUrl(null);
      // Reset state for next open
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedArea(null);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      objectUrlRef.current = null;
    };
  }, [file]);

  const onCropComplete = useCallback(
    (_: Area, areaPixels: Area) => {
      setCroppedArea(areaPixels);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!file || !croppedArea) return;
    setIsProcessing(true);
    try {
      const out = await cropToFile(file, croppedArea, rotation);
      onConfirm(out);
    } catch (err) {
      console.error("Logo crop failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [file, croppedArea, rotation, onConfirm]);

  const open = !!file;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className='sm:max-w-[420px] p-0 overflow-hidden bg-cart-paper border border-cart-rule rounded-[4px]'>
        <DialogHeader className='px-5 pt-5 pb-3 border-b border-cart-rule'>
          <KickerLabel tone='lime' className='mb-1.5'>
            · CREW LOGO · CROP
          </KickerLabel>
          <DialogTitle className='font-display text-[20px] font-bold tracking-[-0.02em] text-cart-ink'>
            로고 영역 조정
          </DialogTitle>
          <p className='text-[12px] text-cart-ink-60 mt-1'>
            지도 핀에 보이는 원형 영역과 동일하게 자릅니다. 드래그로 이동, 핀치/슬라이더로 확대.
          </p>
        </DialogHeader>

        {/* Crop area — square with circular preview mask */}
        <div className='relative w-full bg-background' style={{ aspectRatio: "1 / 1" }}>
          {imageUrl && (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape='round'
              showGrid={false}
              objectFit='contain'
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: {
                  background: "hsl(var(--background))",
                },
                cropAreaStyle: {
                  border: "1px solid hsl(var(--lime))",
                  color: "hsl(var(--lime) / 0.15)", // tints overlay outside crop
                  boxShadow: "0 0 0 9999px hsl(var(--background) / 0.7)",
                },
              }}
            />
          )}
        </div>

        {/* Controls */}
        <div className='px-5 py-4 space-y-3 border-t border-cart-rule'>
          <div className='flex items-center gap-3'>
            <ZoomOut className='w-4 h-4 text-cart-ink-60 flex-shrink-0' />
            <input
              type='range'
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className='flex-1 h-1 rounded-full appearance-none bg-cart-rule accent-[hsl(var(--lime))]'
              aria-label='확대'
            />
            <ZoomIn className='w-4 h-4 text-cart-ink-60 flex-shrink-0' />
            <span className='font-mono text-[10px] tracking-[0.05em] text-cart-ink-60 w-10 text-right tabular-nums'>
              {zoom.toFixed(2)}×
            </span>
          </div>

          <div className='flex items-center justify-between'>
            <button
              type='button'
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-cart-rule bg-background text-cart-ink active:scale-95 transition-transform'
            >
              <RotateCw className='w-3.5 h-3.5' />
              <span className='font-mono text-[10px] tracking-[0.18em] uppercase font-semibold'>
                회전 · ROTATE
              </span>
            </button>
            <KickerLabel tone='muted' className='tracking-[0.18em]'>
              {rotation}°
            </KickerLabel>
          </div>
        </div>

        {/* Actions */}
        <div className='flex gap-2 px-5 pb-5'>
          <button
            type='button'
            onClick={onCancel}
            disabled={isProcessing}
            className='flex-1 py-3 rounded-[4px] border border-cart-rule bg-cart-paper text-cart-ink font-mono text-[11px] tracking-[0.18em] uppercase font-semibold active:scale-[0.98] transition-transform disabled:opacity-50'
          >
            취소 · CANCEL
          </button>
          <button
            type='button'
            onClick={handleConfirm}
            disabled={isProcessing || !croppedArea}
            className='flex-[1.4] py-3 rounded-[4px] bg-[hsl(var(--lime))] text-[hsl(var(--lime-foreground))] font-display text-[14px] font-bold active:scale-[0.98] transition-transform disabled:opacity-50 inline-flex items-center justify-center gap-2'
          >
            {isProcessing ? (
              <>
                <span className='size-1.5 rounded-full bg-[hsl(var(--lime-foreground))] animate-pulse' />
                <span className='font-mono text-[10px] tracking-[0.18em]'>
                  PROCESSING…
                </span>
              </>
            ) : (
              <>
                <span>적용</span>
                <span className='font-mono text-[10px] font-semibold tracking-[0.12em]'>
                  APPLY →
                </span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
