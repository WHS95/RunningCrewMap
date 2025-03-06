import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "관리자 대시보드 | Running Crew Map",
  description: "관리자 대시보드 페이지",
};

export default function AdminDashboardPage() {
  return (
    <div className='container px-4 py-8 mx-auto'>
      <h1 className='mb-8 text-3xl font-bold'>관리자 대시보드</h1>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {/* 관리자 메뉴 항목 */}
        <AdminMenuItem
          title='크루 관리'
          description='크루 정보를 관리하고 업데이트합니다.'
          link='/admin/crew'
        />

        {/* 필요한 경우 더 많은 관리자 메뉴 항목을 추가할 수 있습니다 */}
      </div>
    </div>
  );
}

interface AdminMenuItemProps {
  title: string;
  description: string;
  link: string;
}

function AdminMenuItem({ title, description, link }: AdminMenuItemProps) {
  return (
    <Link href={link}>
      <div className='p-6 transition-shadow bg-white border rounded-lg shadow-sm hover:shadow-md'>
        <h2 className='mb-2 text-xl font-semibold'>{title}</h2>
        <p className='text-gray-600'>{description}</p>
      </div>
    </Link>
  );
}
