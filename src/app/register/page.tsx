"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { crewService } from "@/lib/services";
import type { CreateCrewInput } from "@/lib/types/crew";

const LocationPicker = dynamic(
  () => import("../../components/map/LocationPicker"),
  {
    ssr: false,
  }
);

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<CreateCrewInput>({
    name: "",
    description: "",
    location: {
      lat: 37.5665,
      lng: 126.978,
    },
    instagram: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("[RegisterPage] 제출할 크루 데이터:", formData);
      await crewService.createCrew(formData);
      router.push("/");
    } catch (error) {
      console.error("Failed to create crew:", error);
      alert("크루 등록에 실패했습니다.");
    }
  };

  return (
    <div className='min-h-screen p-4'>
      <div className='max-w-2xl mx-auto bg-white rounded-lg shadow p-6'>
        <h1 className='text-2xl font-bold mb-6'>러닝 크루 등록</h1>
        <form onSubmit={handleSubmit} className='space-y-6'>
          <div>
            <label className='block text-sm font-medium text-gray-700'>
              크루 이름
            </label>
            <input
              type='text'
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              크루 소개
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2'
              rows={4}
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700'>
              인스타그램
            </label>
            <input
              type='text'
              value={formData.instagram}
              onChange={(e) =>
                setFormData({ ...formData, instagram: e.target.value })
              }
              className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-2'
              placeholder='@username'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              활동 위치
            </label>
            <div className='h-[400px] rounded-lg overflow-hidden'>
              <LocationPicker
                initialLocation={formData.location}
                onLocationSelect={(location) =>
                  setFormData({ ...formData, location })
                }
              />
            </div>
          </div>

          <div className='flex justify-end space-x-4'>
            <button
              type='button'
              onClick={() => router.push("/")}
              className='px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50'
            >
              취소
            </button>
            <button
              type='submit'
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
            >
              등록하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
