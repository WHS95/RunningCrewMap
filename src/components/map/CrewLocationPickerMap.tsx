"use client";

/**
 * CrewLocationPickerMap
 *
 * Cartographic Naver Maps picker. Users (or admins) drag/click to place a single
 * lime teardrop pin. Other crews render as dim cartographic dots so the picker
 * can avoid visual collisions.
 *
 * Naver Maps script must already be loaded on the page (the main `/` route
 * loads it; we read `window.naver.maps`). If it isn't loaded yet, we wait via
 * a poller for up to 10s.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { KickerLabel } from "@/components/design/cartographic";
import { Crosshair, Loader2 } from "lucide-react";

interface PickedLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface OtherCrew {
  id: string;
  lat: number;
  lng: number;
  name?: string;
}

interface Props {
  value: PickedLocation | null;
  onChange: (next: PickedLocation) => void;
  /** Other crews to render as gray context dots (excluding the current one). */
  otherCrews?: OtherCrew[];
  /** Optional default center when `value` is null. Defaults to Seoul City Hall. */
  defaultCenter?: { lat: number; lng: number };
  height?: number;
  /** Show a "use my location" button. */
  showLocateButton?: boolean;
}

const CART_LIME = "#C7FF00";
const CART_INK = "#0B0C0A";
const PIN_BG = "#FFFFFF"; // marker fill — matches main map pin
const MARKER_COUNTER_FILTER =
  "invert(1) hue-rotate(180deg) saturate(1.8) brightness(1.05) contrast(1.05)";
const MAP_DARK_FILTER =
  "invert(0.92) hue-rotate(180deg) saturate(0.55) brightness(0.95) contrast(0.95)";

// HTML for the lime teardrop pin (counter-filtered) — the THIS crew's
// active pin. Lime fill so it visually stands out from white context
// dots (which represent other crews).
function buildPinHTML(): string {
  return `<div style="
    filter: ${MARKER_COUNTER_FILTER};
    width: 36px;
    height: 42px;
    position: relative;
    pointer-events: none;
  ">
    <svg width="36" height="42" viewBox="0 0 36 42" style="position:absolute;inset:0;display:block;">
      <path
        d="M18 41 C 18 28, 35 28, 35 16 a 17 17 0 1 0 -34 0 c 0 12, 17 12, 17 25 z"
        fill="${CART_LIME}"
        stroke="${CART_INK}"
        stroke-width="1.4"
        stroke-linejoin="round"
      />
      <circle cx="18" cy="16" r="5" fill="${CART_INK}"/>
      <circle cx="18" cy="16" r="2.2" fill="${CART_LIME}"/>
    </svg>
  </div>`;
}

// HTML for a context dot representing another crew. Lime-filled so it
// reads as a "crew marker" at a glance (matches the brand grammar),
// with a soft lime halo so it pops on the dark basemap. Size + shape
// keep it visually subordinate to the active teardrop pin:
//   - Active:  large lime teardrop with dark+lime well (~36×42)
//   - Others:  small lime circles with halo (~22×22 incl. halo)
function buildDotHTML(): string {
  const HALO_PX = 3;
  const BOX = 22; // dot 16 + halo 3 on each side
  const DOT = 16;
  return `<div style="
    filter: ${MARKER_COUNTER_FILTER};
    width: ${BOX}px;
    height: ${BOX}px;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <div style="
      width: ${DOT}px;
      height: ${DOT}px;
      border-radius: 50%;
      background: ${CART_LIME};
      border: 1.5px solid ${CART_INK};
      box-shadow:
        0 0 0 ${HALO_PX}px rgba(199, 255, 0, 0.25),
        0 1px 3px rgba(0, 0, 0, 0.45);
    "></div>
  </div>`;
}

void PIN_BG; // retained for future palette tweaks

// Wait for Naver Maps SDK to be available on `window`.
function waitForNaver(timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (
        typeof window !== "undefined" &&
        window.naver?.maps?.Map &&
        window.naver?.maps?.Service
      ) {
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(check, 100);
    };
    check();
  });
}

export default function CrewLocationPickerMap({
  value,
  onChange,
  otherCrews = [],
  defaultCenter = { lat: 37.5665, lng: 126.978 },
  height = 280,
  showLocateButton = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const pinMarkerRef = useRef<naver.maps.Marker | null>(null);
  const contextMarkersRef = useRef<naver.maps.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Reverse geocode a coordinate into a Korean address using Naver's Service.
  const reverseGeocode = useCallback(
    (lat: number, lng: number): Promise<string | undefined> => {
      if (!window.naver?.maps?.Service) return Promise.resolve(undefined);
      return new Promise((resolve) => {
        try {
          window.naver.maps.Service.reverseGeocode(
            {
              coords: new window.naver.maps.LatLng(lat, lng),
              orders: [
                window.naver.maps.Service.OrderType.ROAD_ADDR,
                window.naver.maps.Service.OrderType.ADDR,
              ].join(","),
            },
            (status: naver.maps.Service.Status, response: { v2?: { address?: { roadAddress?: string; jibunAddress?: string } } }) => {
              if (status !== window.naver.maps.Service.Status.OK) {
                resolve(undefined);
                return;
              }
              const addr = response?.v2?.address;
              resolve(addr?.roadAddress || addr?.jibunAddress || undefined);
            }
          );
        } catch {
          resolve(undefined);
        }
      });
    },
    []
  );

  // Move the pin and notify parent (with optional reverse-geocoded address).
  const movePinAndCommit = useCallback(
    async (lat: number, lng: number) => {
      if (!mapInstanceRef.current || !window.naver?.maps) return;
      const latLng = new window.naver.maps.LatLng(lat, lng);
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setPosition(latLng);
      }
      setReverseGeocoding(true);
      const address = await reverseGeocode(lat, lng);
      setReverseGeocoding(false);
      onChange({ lat, lng, address });
    },
    [reverseGeocode, onChange]
  );

  // Locate button — use browser geolocation
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latLng = new window.naver.maps.LatLng(latitude, longitude);
        mapInstanceRef.current!.setCenter(latLng);
        mapInstanceRef.current!.setZoom(16);
        movePinAndCommit(latitude, longitude);
      },
      () => {
        /* silently ignore */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }, [movePinAndCommit]);

  // Initialize map once Naver SDK is ready
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const ok = await waitForNaver();
      if (!ok || !mounted || !containerRef.current) return;

      const center = value ?? defaultCenter;
      // Start slightly zoomed out so admin sees a wider neighbourhood and
      // can spot any other crew dots before deciding where to drop the pin.
      const map = new window.naver.maps.Map(containerRef.current, {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom: 14,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        logoControl: false,
        mapDataControl: false,
        minZoom: 9,
        maxZoom: 19,
        draggable: true,
        scrollWheel: true,
        pinchZoom: true,
      });
      mapInstanceRef.current = map;

      // Drop pin (draggable). Anchor at the tip (bottom-center) of the teardrop.
      const pin = new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(center.lat, center.lng),
        map,
        draggable: true,
        icon: {
          content: buildPinHTML(),
          size: new window.naver.maps.Size(36, 42),
          anchor: new window.naver.maps.Point(18, 42),
        },
        zIndex: 100,
      });
      pinMarkerRef.current = pin;

      // Drag end on pin
      window.naver.maps.Event.addListener(pin, "dragend", async () => {
        const pos = pin.getPosition() as naver.maps.Coord;
        await movePinAndCommit(pos.y, pos.x);
      });

      // Click on map = move pin
      window.naver.maps.Event.addListener(map, "click", async (e: { coord: naver.maps.Coord }) => {
        await movePinAndCommit(e.coord.y, e.coord.x);
      });

      setReady(true);
    };

    init();

    return () => {
      mounted = false;
      // Cleanup markers
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setMap(null);
        pinMarkerRef.current = null;
      }
      contextMarkersRef.current.forEach((m) => m.setMap(null));
      contextMarkersRef.current = [];
      // Naver Maps doesn't expose a destroy; null the ref so re-init can happen
      mapInstanceRef.current = null;
    };
    // We intentionally only run init once; subsequent value/otherCrews updates
    // are handled by the dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render context dots (other crews) when ready / list changes
  useEffect(() => {
    if (!ready || !mapInstanceRef.current || !window.naver?.maps) return;
    // Clear previous
    contextMarkersRef.current.forEach((m) => m.setMap(null));
    contextMarkersRef.current = [];
    if (otherCrews.length === 0) return;

    const markers = otherCrews.map((c) =>
      new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(c.lat, c.lng),
        map: mapInstanceRef.current!,
        clickable: false,
        // Tooltip on hover so admin can identify which crew the dot is
        // (useful when many dots cluster in one neighbourhood).
        title: c.name ?? "",
        icon: {
          // 22 = 16px dot + 3px halo on each side. Anchor at center.
          content: buildDotHTML(),
          size: new window.naver.maps.Size(22, 22),
          anchor: new window.naver.maps.Point(11, 11),
        },
        zIndex: 10,
      })
    );
    contextMarkersRef.current = markers;
  }, [ready, otherCrews]);

  // Sync pin when `value` changes externally (e.g. address search auto-fill)
  useEffect(() => {
    if (!ready || !pinMarkerRef.current || !value || !window.naver?.maps)
      return;
    const current = pinMarkerRef.current.getPosition() as naver.maps.Coord;
    if (
      Math.abs(current.y - value.lat) < 1e-6 &&
      Math.abs(current.x - value.lng) < 1e-6
    ) {
      return;
    }
    const latLng = new window.naver.maps.LatLng(value.lat, value.lng);
    pinMarkerRef.current.setPosition(latLng);
    mapInstanceRef.current?.setCenter(latLng);
  }, [ready, value]);

  return (
    <div
      className="relative w-full rounded-[4px] border border-cart-rule overflow-hidden bg-cart-paper"
      style={{ height }}
    >
      {/* Map */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ filter: MAP_DARK_FILTER }}
      />

      {/* Loading overlay until Naver SDK ready */}
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-cart-paper z-10">
          <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--lime))]" />
          <KickerLabel tone="muted" className="ml-2 tracking-[0.18em]">
            LOADING MAP
          </KickerLabel>
        </div>
      )}

      {/* HUD — instruction kicker only. Legend + LAT/LNG removed per
          admin feedback: the lime active pin and lime context dots are
          self-explanatory once visible, and LAT/LNG already shows below
          the picker on the host pages. */}
      <div className="pointer-events-none absolute top-2 left-2 z-[5]">
        <div className="bg-background/85 backdrop-blur-md border border-cart-rule rounded-[4px] px-2 py-1">
          <KickerLabel tone="lime" className="tracking-[0.18em]">
            · 지도를 탭하거나 핀을 끌어주세요
          </KickerLabel>
        </div>
      </div>

      {/* Locate button */}
      {showLocateButton && ready && (
        <button
          type="button"
          onClick={handleLocate}
          className="absolute bottom-2 right-2 z-[10] w-9 h-9 rounded-[4px] border border-cart-rule bg-background/90 backdrop-blur-md flex items-center justify-center text-[hsl(var(--lime))] active:scale-95 transition-transform"
          aria-label="현재 위치로 이동"
          title="현재 위치로 이동"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      )}

      {/* Reverse-geocode pulse */}
      {reverseGeocoding && (
        <div className="absolute bottom-2 left-2 z-[10] bg-background/85 backdrop-blur-md border border-cart-rule rounded-[4px] px-2 py-1 flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[hsl(var(--lime))] animate-pulse" />
          <KickerLabel tone="muted" className="tracking-[0.18em]">
            주소 변환 중…
          </KickerLabel>
        </div>
      )}
    </div>
  );
}
