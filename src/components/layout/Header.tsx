import Link from "next/link";
import { LAYOUT } from "@/lib/constants";

export function Header() {
  return (
    <nav
      className='fixed top-0 left-0 right-0 z-50 bg-black border-b'
      style={{ height: LAYOUT.HEADER_HEIGHT }}
    >
      <div className='flex items-center h-full pl-4'>
        <Link href='/' className='font-bold text-white'>
          RUNNER HOUSE
        </Link>
      </div>
    </nav>
  );
}
