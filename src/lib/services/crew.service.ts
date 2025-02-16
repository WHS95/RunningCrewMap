import { supabase } from "@/lib/supabase/client";
import type {
  CrewWithDetails,
  CreateCrewInput,
  CrewFilterOptions,
} from "@/lib/types/crewInsert";

// Supabase 응답 타입 정의
interface DbCrew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image_url?: string;
  created_at: string;
  updated_at: string;
  crew_locations: Array<{
    main_address: string;
    detail_address?: string;
    latitude: number;
    longitude: number;
  }>;
  crew_activity_days: Array<{
    day_of_week: string;
  }>;
  crew_age_ranges: Array<{
    min_age: number;
    max_age: number;
  }>;
}

class CrewService {
  private readonly BUCKET_NAME = "crewLogos";

  constructor() {
    this.initializeStorage();
  }

  private async initializeStorage() {
    try {
      // 버킷 존재 여부 확인
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(
        (bucket) => bucket.name === this.BUCKET_NAME
      );

      // 버킷이 없으면 생성
      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(
          this.BUCKET_NAME,
          {
            public: true, // 공개 접근 허용
            fileSizeLimit: 1024 * 1024 * 2, // 2MB 제한
            allowedMimeTypes: ["image/jpeg", "image/png", "image/gif"], // 허용할 파일 형식
          }
        );

        if (error) {
          console.error("Failed to create storage bucket:", error);
        }
      }
    } catch (error) {
      console.error("Failed to initialize storage:", error);
    }
  }

  private async uploadImage(
    file: File,
    crewId: string
  ): Promise<string | null> {
    try {
      console.log("=== 이미지 업로드 시작 ===");
      console.log("파일 정보:", {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      });
      console.log("크루 ID:", crewId);

      // 파일 크기 검증
      if (file.size > 2 * 1024 * 1024) {
        console.error(
          "파일 크기 초과:",
          `${(file.size / 1024 / 1024).toFixed(2)}MB`
        );
        throw new Error("파일 크기는 2MB를 초과할 수 없습니다.");
      }
      console.log("파일 크기 검증 완료");

      // 파일 형식 검증
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        console.error("잘못된 파일 형식:", file.type);
        throw new Error("JPG, PNG, GIF 형식의 이미지만 업로드 가능합니다.");
      }
      console.log("파일 형식 검증 완료");

      // 파일명 생성 (타임스탬프 추가로 중복 방지)
      const timestamp = new Date().getTime();
      const fileExt = file.name.split(".").pop();
      const fileName = `${crewId}_${timestamp}.${fileExt}`;
      console.log("생성된 파일명:", fileName);

      // 버킷 확인
      const { data: buckets } = await supabase.storage.listBuckets();
      console.log(
        "사용 가능한 버킷:",
        buckets?.map((b) => b.name)
      );
      console.log("현재 사용할 버킷:", this.BUCKET_NAME);

      // 이미지 업로드
      console.log("업로드 시작...");
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file);

      if (uploadError) {
        console.error("업로드 실패:", {
          errorMessage: uploadError.message,
          errorDetails: uploadError,
        });
        return null;
      }
      console.log("업로드 성공:", uploadData);

      // 공개 URL 가져오기
      console.log("공개 URL 생성 중...");
      const { data } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      console.log("생성된 공개 URL:", data.publicUrl);
      console.log("=== 이미지 업로드 완료 ===");

      return data.publicUrl;
    } catch (error) {
      console.error("=== 이미지 업로드 실패 ===");
      console.error("에러 상세 정보:", {
        error,
        errorMessage:
          error instanceof Error ? error.message : "알 수 없는 에러",
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
        crewId,
        bucket: this.BUCKET_NAME,
      });

      if (error instanceof Error) {
        throw error;
      }
      return null;
    }
  }

  // 크루 생성
  async createCrew(input: CreateCrewInput): Promise<CrewWithDetails> {
    const { data: crew, error: crewError } = await supabase
      .from("crews")
      .insert({
        name: input.name,
        description: input.description,
        instagram: input.instagram,
      })
      .select()
      .single();

    if (crewError) throw crewError;

    // 로고 이미지 업로드
    let logo_image_url: string | undefined;
    if (input.logo_image) {
      const uploadedUrl = await this.uploadImage(input.logo_image, crew.id);
      if (uploadedUrl) {
        logo_image_url = uploadedUrl;
        // 이미지 URL 업데이트
        await supabase
          .from("crews")
          .update({ logo_image_url })
          .eq("id", crew.id);
      }
    }

    // 위치 정보 저장
    const { error: locationError } = await supabase
      .from("crew_locations")
      .insert({
        crew_id: crew.id,
        ...input.location,
      });

    if (locationError) throw locationError;

    // 활동 요일 저장
    const { error: daysError } = await supabase
      .from("crew_activity_days")
      .insert(
        input.activity_days.map((day) => ({
          crew_id: crew.id,
          day_of_week: day,
        }))
      );

    if (daysError) throw daysError;

    // 연령대 저장
    const { error: ageError } = await supabase.from("crew_age_ranges").insert({
      crew_id: crew.id,
      ...input.age_range,
    });

    if (ageError) throw ageError;

    // 생성된 크루 정보 반환
    return {
      ...crew,
      logo_image_url,
      location: input.location,
      activity_days: input.activity_days,
      age_range: input.age_range,
    };
  }

  // 크루 목록 조회 (필터링 포함)
  async getCrews(options?: CrewFilterOptions): Promise<CrewWithDetails[]> {
    let query = supabase.from("crews").select(`
        *,
        crew_locations (*),
        crew_activity_days (day_of_week),
        crew_age_ranges (*)
      `);

    // 활동 요일 필터링
    if (options?.activity_day) {
      query = query.filter(
        "crew_activity_days.day_of_week",
        "eq",
        options.activity_day
      );
    }

    // 연령대 필터링
    if (options?.min_age !== undefined || options?.max_age !== undefined) {
      if (options.min_age !== undefined) {
        query = query.filter("crew_age_ranges.max_age", "gte", options.min_age);
      }
      if (options.max_age !== undefined) {
        query = query.filter("crew_age_ranges.min_age", "lte", options.max_age);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    // 응답 데이터 형식 변환 및 위치 기반 필터링
    let crews = (data as DbCrew[]).map((crew) => ({
      ...crew,
      location: {
        main_address: crew.crew_locations[0].main_address,
        detail_address: crew.crew_locations[0].detail_address,
        latitude: crew.crew_locations[0].latitude,
        longitude: crew.crew_locations[0].longitude,
      },
      activity_days: crew.crew_activity_days.map((d) => d.day_of_week),
      age_range: {
        min_age: crew.crew_age_ranges[0].min_age,
        max_age: crew.crew_age_ranges[0].max_age,
      },
    }));

    // 위치 기반 필터링 (클라이언트 측에서 처리)
    if (options?.location) {
      const { latitude, longitude, radius } = options.location;
      crews = crews.filter((crew) => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          crew.location.latitude,
          crew.location.longitude
        );
        return distance <= radius;
      });
    }

    return crews;
  }

  // Haversine 공식을 사용한 거리 계산 (km)
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // 지구의 반경 (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  // 단일 크루 조회
  async getCrew(id: string): Promise<CrewWithDetails | null> {
    const { data, error } = await supabase
      .from("crews")
      .select(
        `
        *,
        crew_locations (*),
        crew_activity_days (day_of_week),
        crew_age_ranges (*)
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const crew = data as DbCrew;
    return {
      ...crew,
      location: {
        main_address: crew.crew_locations[0].main_address,
        detail_address: crew.crew_locations[0].detail_address,
        latitude: crew.crew_locations[0].latitude,
        longitude: crew.crew_locations[0].longitude,
      },
      activity_days: crew.crew_activity_days.map((d) => d.day_of_week),
      age_range: {
        min_age: crew.crew_age_ranges[0].min_age,
        max_age: crew.crew_age_ranges[0].max_age,
      },
    };
  }
}

export const crewService = new CrewService();
