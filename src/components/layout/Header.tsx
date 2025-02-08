import Link from "next/link";

export function Header() {
  return (
    <nav className='border-b'>
      <div className='flex items-center pl-4 h-14'>
        <Link href='/' className='font-bold'>
          RUNNER HOUSE
        </Link>
      </div>
    </nav>
  );
}
