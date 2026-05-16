"use client";

/**
 * SearchBox — cartographic text search on the map page.
 *
 * Pure text query against crew name + address. Filter chips removed —
 * keeping the surface focused on the primary discovery action.
 *
 * The dropdown uses fixed positioning anchored to the input's bounding rect
 * so it floats above the Naver Map regardless of any z-index ancestors.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Crew } from "@/lib/types/crew";
import { KickerLabel } from "@/components/design/cartographic";

interface SearchBoxProps {
  crews: Crew[];
  onSelect: (crew: Crew) => void;
}

// Pull a coarse region label from a Korean address (e.g. "서울특별시 강남구 …" → "강남").
function extractRegion(addr?: string): string | null {
  if (!addr) return null;
  const m = addr.match(/([가-힣]+(?:구|시|군))/);
  if (!m) return null;
  return m[1].replace(/(시|구|군)$/, "");
}

// ── Korean 초성 (initial consonant) search support ─────────────────────
// "한강 새벽런" → "ㅎㄱ ㅅㅂㄹ" so typing "ㅎㄱ" matches the crew name.

const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

// Convert a Korean string to its sequence of initial-consonant jamos.
// Non-Hangul characters pass through unchanged so addresses still match.
function toChosung(str: string): string {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xac00 && code <= 0xd7a3) {
      // Compiled syllable — extract the cho (initial) index.
      out += CHOSUNG[Math.floor((code - 0xac00) / (21 * 28))];
    } else if (code >= 0x3131 && code <= 0x314e) {
      // Already a standalone jamo (typed by user mid-IME).
      out += str[i];
    } else {
      out += str[i];
    }
  }
  return out;
}

// True if the query is *only* jamo consonants (ㄱ-ㅎ).
// When this is the case we run pure-초성 matching instead of substring.
function isChosungOnly(str: string): boolean {
  if (!str) return false;
  return /^[ㄱ-ㅎ]+$/.test(str);
}

// Compact a freeform activity_day string like "매주 화요일, 수요일, 월요일, 일요일"
// down to its day characters joined with a dot — "화 · 수 · 월 · 일". This
// keeps day info visible without crowding out the crew name in the row.
function compactDays(s?: string): string {
  if (!s) return "";
  const matches = s.match(/[월화수목금토일]/g);
  if (!matches || matches.length === 0) {
    // No day chars found — fall back to a truncated version of the raw text.
    return s.length > 14 ? s.slice(0, 14) + "…" : s;
  }
  // Dedupe while preserving the order the user typed them.
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const d of matches) {
    if (!seen.has(d)) {
      seen.add(d);
      ordered.push(d);
    }
  }
  return ordered.join(" · ");
}

function SearchBoxComponent({ crews, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  // Re-measure the anchor for the floating dropdown whenever it might change.
  const measure = useCallback(() => {
    if (!searchRef.current) return;
    const rect = searchRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const trimmedQuery = query.trim();
  const chosungMode = isChosungOnly(trimmedQuery);

  // Match query against crew name + address. Pure-초성 input switches to
  // initial-consonant matching ("ㅎㄱ" → 한강 새벽런).
  const matched = useMemo(() => {
    if (!trimmedQuery) return [];

    if (chosungMode) {
      // Compare query directly against each crew name's 초성 stream.
      // Address matching is skipped in 초성 mode — addresses rarely benefit
      // from initial-consonant matching and including them dilutes results.
      return crews.filter((c) => toChosung(c.name).includes(trimmedQuery));
    }

    const q = trimmedQuery.toLowerCase();
    return crews.filter((c) => {
      if (c.name.toLowerCase().includes(q)) return true;
      if ((c.location.main_address || "").toLowerCase().includes(q)) return true;
      if ((c.location.address || "").toLowerCase().includes(q)) return true;
      // Also try 초성 fallback so partial Korean input like "한ㄱ" still
      // resolves once the user has typed enough to disambiguate.
      if (toChosung(c.name).includes(toChosung(trimmedQuery))) return true;
      return false;
    });
  }, [crews, trimmedQuery, chosungMode]);

  // Results dropdown visible only while typing AND focused.
  const showResults = query.trim().length > 0 && isFocused;

  // Close on click-outside (but allow clicking inside the floating dropdown).
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchRef.current?.contains(target)) return;
      const dropdown = document.getElementById("search-floating-dropdown");
      if (dropdown?.contains(target)) return;
      setIsFocused(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={searchRef} className='relative mx-auto w-full max-w-sm px-4'>
      {/* Search input */}
      <div
        className={cn(
          "relative flex items-center gap-2 px-3 py-2 bg-background/85 backdrop-blur-md border rounded-[4px] transition-colors",
          isFocused
            ? "border-[hsl(var(--lime))]/60"
            : "border-cart-rule hover:border-[hsl(var(--lime))]/30"
        )}
      >
        <Search className='w-4 h-4 text-cart-ink-60 flex-shrink-0' />
        <input
          ref={inputRef}
          type='text'
          placeholder='크루명 또는 지역 검색…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            measure();
          }}
          className='flex-1 bg-transparent outline-none text-[13px] text-cart-ink placeholder:text-cart-ink-40'
        />

        {query && (
          <button
            type='button'
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className='flex items-center justify-center w-5 h-5 rounded-[2px] text-cart-ink-60 hover:text-cart-ink active:scale-90 transition-transform'
            aria-label='검색어 지우기'
          >
            <X className='w-3.5 h-3.5' />
          </button>
        )}
      </div>

      {/* Floating results dropdown */}
      {showResults && (
        <div
          id='search-floating-dropdown'
          className='fixed z-[10000] bg-background/95 backdrop-blur-md border border-cart-rule rounded-[4px] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] max-h-[60vh] overflow-y-auto scrollbar-hide mt-1'
          style={{
            top: `${dropdownPosition.top + 6}px`,
            left: `${dropdownPosition.left + 16}px`,
            width: `${dropdownPosition.width - 32}px`,
          }}
        >
          <div className='flex items-center justify-between px-3 py-2 border-b border-cart-rule'>
            <KickerLabel tone='lime' className='tracking-[0.2em]'>
              · RESULTS · {matched.length.toString().padStart(3, "0")}
            </KickerLabel>
            {chosungMode && (
              <KickerLabel tone='muted' className='tracking-[0.2em]'>
                초성 MODE
              </KickerLabel>
            )}
          </div>

          {matched.length === 0 ? (
            <div className='px-4 py-8 text-center'>
              <KickerLabel tone='muted' className='tracking-[0.22em]'>
                · NO CREWS MATCHED ·
              </KickerLabel>
              <p className='mt-1 text-[11px] text-cart-ink-60'>
                검색어를 다시 확인해보세요.
              </p>
            </div>
          ) : (
            <div className='px-3'>
              {matched.slice(0, 30).map((crew, idx) => {
                const region = extractRegion(
                  crew.location.main_address || crew.location.address
                );
                const address =
                  crew.location.main_address || crew.location.address || "—";
                const days = compactDays(crew.activity_day);
                return (
                  <div
                    key={crew.id}
                    role='button'
                    tabIndex={0}
                    onClick={() => {
                      onSelect(crew);
                      setIsFocused(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(crew);
                        setIsFocused(false);
                      }
                    }}
                    className={cn(
                      "flex items-start gap-3 py-2.5 cursor-pointer transition-colors active:bg-white/[0.04] hover:bg-white/[0.02]",
                      idx > 0 && "border-t border-cart-rule"
                    )}
                  >
                    <div className='w-7 pt-0.5 font-mono text-[10px] tracking-[0.05em] text-cart-ink-60 tabular-nums flex-shrink-0'>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    {/* Crew name + meta stack — name always wins width */}
                    <div className='flex-1 min-w-0'>
                      <div className='text-[13px] font-semibold text-cart-ink truncate'>
                        {crew.name}
                      </div>
                      <div className='font-mono text-[9px] tracking-[0.05em] text-cart-ink-60 truncate mt-0.5'>
                        {region ? `${region.toUpperCase()} · ` : ""}
                        {address}
                      </div>
                      {days && (
                        <div className='font-mono text-[10px] tracking-[0.08em] text-[hsl(var(--lime))] font-semibold mt-0.5 truncate'>
                          · {days}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {matched.length > 30 && (
                <div className='py-3 text-center'>
                  <KickerLabel tone='muted' className='tracking-[0.18em]'>
                    · +{matched.length - 30} MORE — 검색어를 좁혀주세요 ·
                  </KickerLabel>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const SearchBox = memo(SearchBoxComponent);
