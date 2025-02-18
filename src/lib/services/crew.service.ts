import { supabase } from "@/lib/supabase/client";
import type {
  CrewWithDetails,
  CreateCrewInput,
  CrewFilterOptions,
} from "@/lib/types/crewInsert";
import { Crew } from "@/lib/types/crew";
import { logger } from "@/lib/utils/logger";
import { ErrorCode, AppError } from "@/lib/types/error";
import { compressImageFile } from "@/lib/utils/imageCompression";

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

interface DatabaseError {
  code?: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
}

interface ErrorContext extends Record<string, unknown> {
  action: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

class CrewService {
  private readonly BUCKET_NAME = "crewLogos";

  constructor() {
    this.initializeStorage().catch((error) => {
      logger.error(logger.createError(ErrorCode.STORAGE_ERROR), {
        action: "initializeStorage",
        details: { error },
      });
    });
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
        .upload(fileName, file, {
          cacheControl: "31536000", // 1년
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("업로드 실패:", {
          errorMessage: uploadError.message,
          errorDetails: uploadError,
        });
        return null;
      }
      console.log("업로드 성공:", uploadData);

      // 공개 URL 가져오기 (캐시 버스팅을 위한 타임스탬프 추가)
      console.log("공개 URL 생성 중...");
      const { data } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      console.log("======data", data);

      const publicUrl = new URL(data.publicUrl);
      publicUrl.searchParams.set("v", timestamp.toString());

      console.log("생성된 공개 URL:", publicUrl.toString());
      console.log("=== 이미지 업로드 완료 ===");

      return publicUrl.toString();
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

  private async validateInput(input: CreateCrewInput) {
    if (!input.name || input.name.length < 2 || input.name.length > 100) {
      throw logger.createError(ErrorCode.INVALID_CREW_NAME);
    }
    if (!input.description) {
      throw logger.createError(ErrorCode.INVALID_DESCRIPTION);
    }
    if (input.instagram?.includes("@")) {
      throw logger.createError(ErrorCode.INVALID_INSTAGRAM);
    }
    if (!input.location.main_address) {
      throw logger.createError(ErrorCode.INVALID_LOCATION);
    }
    if (!input.activity_days.length) {
      throw logger.createError(ErrorCode.INVALID_ACTIVITY_DAYS);
    }
    if (input.age_range.min_age > input.age_range.max_age) {
      throw logger.createError(ErrorCode.INVALID_AGE_RANGE);
    }
  }

  private async validateImage(file: File) {
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      throw logger.createError(ErrorCode.INVALID_FILE_TYPE);
    }
    if (file.size > 2 * 1024 * 1024) {
      throw logger.createError(ErrorCode.FILE_TOO_LARGE);
    }
  }

  private async handleDatabaseError(
    error: DatabaseError,
    context: ErrorContext
  ) {
    if (error.code === "23505") {
      throw logger.createError(ErrorCode.DUPLICATE_CREW_NAME, {
        originalError: error,
        metadata: context,
      });
    }
    if (error.code === "23503") {
      throw logger.createError(ErrorCode.FOREIGN_KEY_VIOLATION, {
        originalError: error,
        metadata: context,
      });
    }

    logger.error(logger.createError(ErrorCode.SERVER_ERROR), {
      action: context.action,
      details: { error, ...context },
    });
    throw logger.createError(ErrorCode.SERVER_ERROR);
  }

  // 크루 생성
  async createCrew(input: CreateCrewInput): Promise<CrewWithDetails> {
    try {
      await this.validateInput(input);

      // 이미지 검증 및 압축, 업로드 수행
      let logo_image_url: string | undefined;
      if (input.logo_image) {
        try {
          await this.validateImage(input.logo_image);

          // 이미지 압축
          const compressedImage = await compressImageFile(input.logo_image);

          // 압축된 이미지 업로드
          const uploadedUrl = await this.uploadImage(
            compressedImage,
            crypto.randomUUID()
          );
          console.log("uploadedUrl", uploadedUrl);

          if (!uploadedUrl) {
            throw logger.createError(ErrorCode.UPLOAD_FAILED);
          }
          logo_image_url = uploadedUrl;
        } catch (error) {
          if ((error as AppError).code === ErrorCode.COMPRESSION_FAILED) {
            throw error; // 압축 실패는 상위로 전파
          }
          logger.error(logger.createError(ErrorCode.UPLOAD_FAILED), {
            action: "upload_image",
            details: {
              error,
              fileName: input.logo_image.name,
              fileSize: input.logo_image.size,
              fileType: input.logo_image.type,
            },
          });
          throw logger.createError(ErrorCode.UPLOAD_FAILED);
        }
      }

      // 크루 기본 정보 저장
      const { data: crew, error: crewError } = await supabase
        .from("crews")
        .insert({
          name: input.name,
          description: input.description,
          instagram: input.instagram,
          logo_image_url,
          is_visible: false,
        })
        .select()
        .single();

      if (crewError) {
        throw crewError;
      }

      // 위치 정보 저장
      const { error: locationError } = await supabase
        .from("crew_locations")
        .insert({
          crew_id: crew.id,
          ...input.location,
        });

      if (locationError) {
        throw locationError;
      }

      // 활동 요일 저장
      const { error: daysError } = await supabase
        .from("crew_activity_days")
        .insert(
          input.activity_days.map((day) => ({
            crew_id: crew.id,
            day_of_week: day,
          }))
        );

      if (daysError) {
        throw daysError;
      }

      // 연령대 저장
      const { error: ageError } = await supabase
        .from("crew_age_ranges")
        .insert({
          crew_id: crew.id,
          ...input.age_range,
        });

      if (ageError) {
        throw ageError;
      }

      return {
        ...crew,
        logo_image_url,
        location: input.location,
        activity_days: input.activity_days,
        age_range: input.age_range,
      };
    } catch (error) {
      await this.handleDatabaseError(error as DatabaseError, {
        action: "create_crew",
        input: {
          ...input,
          logo_image: input.logo_image
            ? {
                name: input.logo_image.name,
                size: input.logo_image.size,
                type: input.logo_image.type,
              }
            : undefined,
        },
      });
      throw error;
    }
  }

  // 크루 목록 조회 (필터링 포함)
  async getCrews(options?: CrewFilterOptions): Promise<Crew[]> {
    let query = supabase
      .from("crews")
      .select(
        `
        *,
        crew_locations (*),
        crew_activity_days (day_of_week),
        crew_age_ranges (*)
      `
      )
      .eq("is_visible", true); // 승인된 크루만 조회

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

    // crews.json 형식으로 데이터 변환
    let crews = (data as DbCrew[]).map((crew) => {
      // 활동 요일 문자열로 변환
      const activityDays = crew.crew_activity_days.map((d) => d.day_of_week);
      const activityDay =
        activityDays.length > 1
          ? `매주 ${activityDays.join(", ")}`
          : `매주 ${activityDays[0]}`;

      // 연령대 문자열로 변환
      const ageRange = crew.crew_age_ranges[0]
        ? `${crew.crew_age_ranges[0].min_age}~${crew.crew_age_ranges[0].max_age}대`
        : "전 연령대";

      return {
        id: crew.id,
        name: crew.name,
        // 리얼 줄바꿈을 적용하기 위해서 줄바꿈 문자를 추가
        description: crew.description.replace(/\\n/g, "\n"),
        location: {
          lat: crew.crew_locations[0].latitude,
          lng: crew.crew_locations[0].longitude,
          address:
            crew.crew_locations[0].detail_address ||
            crew.crew_locations[0].main_address,
          main_address: crew.crew_locations[0].main_address,
        },
        instagram: crew.instagram,
        logo_image: crew.logo_image_url,
        created_at: crew.created_at,
        activity_day: activityDay,
        age_range: ageRange,
      };
    });

    // 위치 기반 필터링 (클라이언트 측에서 처리)
    if (options?.location) {
      const { latitude, longitude, radius } = options.location;
      crews = crews.filter((crew) => {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          crew.location.lat,
          crew.location.lng
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

  // 이미지 URL 유효성 검사
  private isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return (
        parsedUrl.protocol === "https:" &&
        parsedUrl.hostname.includes("supabase.co") &&
        /\.(jpg|jpeg|png|gif)$/i.test(parsedUrl.pathname)
      );
    } catch {
      return false;
    }
  }
}

export const crewService = new CrewService();
