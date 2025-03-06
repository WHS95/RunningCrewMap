import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "관리자 대시보드 | Running Crew Map",
  description: "관리자 대시보드 페이지",
};

export default function AdminDashboardPage() {
  return (
    <div className='container mx-auto py-8 px-4'>
      <h1 className='text-3xl font-bold mb-8'>관리자 대시보드</h1>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
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
      <div className='border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow'>
        <h2 className='text-xl font-semibold mb-2'>{title}</h2>
        <p className='text-gray-600'>{description}</p>
      </div>
    </Link>
  );
}
