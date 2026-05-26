"use client";

/**
 * StoreLocationPickerMap
 *
 * Thin wrapper around the shared CrewLocationPickerMap. We reuse the Naver
 * Maps pin/dot logic verbatim and layer a text input for an optional
 * "detail address" (apt floor, suite number, etc.) since the picker only
 * reverse-geocodes the main road/jibun address.
 */

import { useEffect, useState } from "react";
import CrewLocationPickerMap from "@/components/map/CrewLocationPickerMap";
import { KickerLabel } from "@/components/design/cartographic";

interface StorePickedLocation {
  lat: number;
  lng: number;
  main_address: string;
  detail_address?: string;
}

interface Props {
  initial?: { lat: number; lng: number; main_address?: string; detail_address?: string };
  onChange: (loc: StorePickedLocation) => void;
  height?: number;
}

export function StoreLocationPickerMap({ initial, onChange, height = 280 }: Props) {
  const [pin, setPin] = useState<{ lat: number; lng: number; address?: string } | null>(
    initial ? { lat: initial.lat, lng: initial.lng, address: initial.main_address } : null
  );
  const [mainAddress, setMainAddress] = useState<string>(initial?.main_address ?? "");
  const [detailAddress, setDetailAddress] = useState<string>(initial?.detail_address ?? "");

  // When the picker reverse-geocodes, sync the address text box too (unless
  // the user has typed their own value already).
  const userEditedMain = useState<boolean>(false);
  const [, setUserEditedMain] = userEditedMain;

  useEffect(() => {
    if (!pin) return;
    onChange({
      lat: pin.lat,
      lng: pin.lng,
      main_address: mainAddress,
      detail_address: detailAddress || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng, mainAddress, detailAddress]);

  return (
    <div className="space-y-2">
      <CrewLocationPickerMap
        value={pin}
        height={height}
        onChange={(next) => {
          setPin({ lat: next.lat, lng: next.lng, address: next.address });
          if (next.address && !userEditedMain[0]) {
            setMainAddress(next.address);
          }
        }}
      />
      <div className="space-y-1">
        <KickerLabel tone="muted" className="tracking-[0.18em]">
          MAIN ADDRESS
        </KickerLabel>
        <input
          type="text"
          value={mainAddress}
          onChange={(e) => {
            setUserEditedMain(true);
            setMainAddress(e.target.value);
          }}
          placeholder="도로명 또는 지번 주소"
          className="w-full rounded-md border border-cart-rule bg-transparent px-3 py-2 text-sm text-cart-ink placeholder:text-cart-ink-40"
        />
      </div>
      <div className="space-y-1">
        <KickerLabel tone="muted" className="tracking-[0.18em]">
          DETAIL (선택)
        </KickerLabel>
        <input
          type="text"
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          placeholder="동/호수 등 상세 (선택)"
          className="w-full rounded-md border border-cart-rule bg-transparent px-3 py-2 text-sm text-cart-ink placeholder:text-cart-ink-40"
        />
      </div>
    </div>
  );
}
