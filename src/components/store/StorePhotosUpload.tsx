"use client";

import { useState } from "react";

export interface StorePhotoSlot {
  // 새 파일이거나 기존 URL
  file?: File;
  url?: string;
  preview: string;
  display_order: number;
}

export function StorePhotosUpload({
  initial,
  onChange,
}: {
  initial?: Array<{ url: string; display_order: number }>;
  onChange: (slots: StorePhotoSlot[]) => void;
}) {
  const [slots, setSlots] = useState<StorePhotoSlot[]>(
    initial?.map((p) => ({
      url: p.url,
      preview: p.url,
      display_order: p.display_order,
    })) ?? []
  );

  const push = (next: StorePhotoSlot[]) => {
    setSlots(next);
    onChange(next);
  };

  const onPick = (files: FileList | null) => {
    if (!files) return;
    const remain = 6 - slots.length;
    const picked = Array.from(files).slice(0, Math.max(0, remain));
    const next = [...slots];
    for (const f of picked) {
      next.push({
        file: f,
        preview: URL.createObjectURL(f),
        display_order: next.length,
      });
    }
    push(next);
  };

  const remove = (i: number) => {
    const next = slots
      .filter((_, idx) => idx !== i)
      .map((s, idx) => ({ ...s, display_order: idx }));
    push(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    push(next.map((s, idx) => ({ ...s, display_order: idx })));
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => onPick(e.target.files)}
        disabled={slots.length >= 6}
        className="text-sm"
      />
      <div className="grid grid-cols-3 gap-2">
        {slots.map((s, i) => (
          <div
            key={i}
            className="relative aspect-square overflow-hidden rounded-md border border-cart-rule"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.preview}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-xs text-white">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === slots.length - 1}
                  className="disabled:opacity-40"
                >
                  ↓
                </button>
              </div>
              <button type="button" onClick={() => remove(i)}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-cart-ink-60">
        최대 6장. 첫 번째가 가장 먼저 표시됩니다.
      </p>
    </div>
  );
}
