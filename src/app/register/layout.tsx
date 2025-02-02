import { MobileNav } from "@/components/layout/MobileNav";

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='relative min-h-screen pb-16'>
      {children}
      <MobileNav>
        <div /> {/* 빈 div를 전달하여 children prop 요구사항 충족 */}
      </MobileNav>
    </div>
  );
}
