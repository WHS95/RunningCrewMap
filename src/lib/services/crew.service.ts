import { supabase } from "@/lib/supabase/client";
import type {
  CrewWithDetails,
  CreateCrewInput,
  CrewFilterOptions,
  ActivityDay,
} from "@/lib/types/crewInsert";
import { Crew } from "@/lib/types/crew";
import { logger } from "@/lib/utils/logger";
import { ErrorCode } from "@/lib/types/error";
import { compressImageFile } from "@/lib/utils/imageCompression";

// Supabase 응답 타입 정의
interface DbCrew {
  id: string;
  name: string;
  description: string;
  instagram?: string;
  logo_image_url?: string;
  founded_date: string;
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
  crew_activity_locations?: Array<{
    location_name: string;
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
  private readonly CREW_PHOTOS_BUCKET = "crewActivePicture";

  private async uploadImage(
    file: File,
    crewId: string
  ): Promise<string | null> {
    try {
      // console.log("=== 이미지 업로드 시작 ===");
      // console.log("파일 정보:", {
      //   name: file.name,
      //   type: file.type,
      //   size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      // });
      // console.log("크루 ID:", crewId);

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
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        console.error("잘못된 파일 형식:", file.type);
        throw new Error("JPG, PNG 형식의 이미지만 업로드 가능합니다.");
      }
      console.log("파일 형식 검증 완료");

      // 파일명 생성 (타임스탬프 추가로 중복 방지)
      const timestamp = new Date().getTime();
      const fileExt = file.name.split(".").pop();
      const fileName = `${crewId}_${timestamp}.${fileExt}`;
      // console.log("생성된 파일명:", fileName);

      // 버킷 확인
      // const { data: buckets } = await supabase.storage.listBuckets();
      // console.log(
      //   "사용 가능한 버킷:",
      //   buckets?.map((b) => b.name)
      // );
      // console.log("현재 사용할 버킷:", this.BUCKET_NAME);

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

      // console.log("======data", data);

      const publicUrl = new URL(data.publicUrl);
      publicUrl.searchParams.set("v", timestamp.toString());

      // console.log("생성된 공개 URL:", publicUrl.toString());
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

  // 크루 로고 업로드를 위한 공개 메서드 추가
  async uploadCrewLogo(file: File, crewId: string): Promise<string | null> {
    try {
      // 이미지 유효성 검사
      await this.validateImage(file);

      // 이미지 압축 (옵션)
      const compressedFile = await compressImageFile(file);

      // 이미지 업로드
      return await this.uploadImage(compressedFile || file, crewId);
    } catch (error) {
      console.error("로고 업로드 실패:", error);
      throw error;
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

    // 위치 정보 유효성 검사
    try {
      this.validateLocation(input.location);
    } catch (error) {
      if (error instanceof Error) {
        throw logger.createError(ErrorCode.INVALID_LOCATION, {
          errorMessage: error.message,
        });
      }
      throw error;
    }

    if (!input.activity_days.length) {
      throw logger.createError(ErrorCode.INVALID_ACTIVITY_DAYS);
    }
    if (input.age_range.min_age > input.age_range.max_age) {
      throw logger.createError(ErrorCode.INVALID_AGE_RANGE);
    }
    if (!input.founded_date) {
      throw logger.createError(ErrorCode.INVALID_FOUNDED_DATE);
    }

    // 개설일이 미래 날짜인지 검증
    const selectedDate = new Date(input.founded_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 정보 제거하여 날짜만 비교

    if (selectedDate > today) {
      throw logger.createError(ErrorCode.FUTURE_FOUNDED_DATE);
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
      console.log("=== 크루 생성 시작 ===");
      console.log("크루 기본 정보:", {
        name: input.name,
        instagram: input.instagram,
        founded_date: input.founded_date,
      });

      await this.validateInput(input);
      console.log("입력값 검증 완료");

      // 이미지 검증 및 압축, 업로드 수행
      let logo_image_url: string | undefined;
      if (input.logo_image) {
        try {
          console.log("로고 이미지 처리 시작");
          await this.validateImage(input.logo_image);
          const compressedImage = await compressImageFile(input.logo_image);
          const uploadedUrl = await this.uploadImage(
            compressedImage,
            crypto.randomUUID()
          );
          if (!uploadedUrl) {
            throw logger.createError(ErrorCode.UPLOAD_FAILED);
          }
          logo_image_url = uploadedUrl;
          console.log("로고 이미지 업로드 완료:", logo_image_url);
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === ErrorCode.FILE_TOO_LARGE
          ) {
            throw error;
          }
          console.error("이미지 처리 중 오류:", error);
        }
      }

      // 트랜잭션 시작
      const { data: crewData, error: crewError } = await supabase
        .from("crews")
        .insert({
          name: input.name,
          description: input.description,
          instagram: input.instagram,
          logo_image_url,
          founded_date: input.founded_date,
        })
        .select("id")
        .single();

      if (crewError) {
        await this.handleDatabaseError(crewError as unknown as DatabaseError, {
          action: "createCrew",
          input: input as unknown as Record<string, unknown>,
        });
      }

      const crewId = crewData!.id;

      // 위치 정보 저장
      const { error: locationError } = await supabase
        .from("crew_locations")
        .insert({
          crew_id: crewId,
          main_address: input.location.main_address,
          detail_address: input.location.detail_address,
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        });

      if (locationError) {
        await this.handleDatabaseError(
          locationError as unknown as DatabaseError,
          {
            action: "createCrewLocation",
            input: { crewId, location: input.location } as Record<
              string,
              unknown
            >,
          }
        );
      }

      // 연령대 정보 저장
      const { error: ageRangeError } = await supabase
        .from("crew_age_ranges")
        .insert({
          crew_id: crewId,
          min_age: input.age_range.min_age,
          max_age: input.age_range.max_age,
        });

      if (ageRangeError) {
        await this.handleDatabaseError(
          ageRangeError as unknown as DatabaseError,
          {
            action: "createCrewAgeRange",
            input: { crewId, ageRange: input.age_range } as Record<
              string,
              unknown
            >,
          }
        );
      }

      // 활동 요일 저장
      const activityDaysData = input.activity_days.map((day) => ({
        crew_id: crewId,
        day_of_week: day,
      }));

      const { error: activityDaysError } = await supabase
        .from("crew_activity_days")
        .insert(activityDaysData);

      if (activityDaysError) {
        await this.handleDatabaseError(
          activityDaysError as unknown as DatabaseError,
          {
            action: "createCrewActivityDays",
            input: { crewId, activityDays: input.activity_days } as Record<
              string,
              unknown
            >,
          }
        );
      }

      // 활동 장소 저장
      if (input.activity_locations && input.activity_locations.length > 0) {
        const activityLocationsData = input.activity_locations.map(
          (location) => ({
            crew_id: crewId,
            location_name: location,
          })
        );

        const { error: activityLocationsError } = await supabase
          .from("crew_activity_locations")
          .insert(activityLocationsData);

        if (activityLocationsError) {
          await this.handleDatabaseError(
            activityLocationsError as unknown as DatabaseError,
            {
              action: "createCrewActivityLocations",
              input: {
                crewId,
                activityLocations: input.activity_locations,
              } as Record<string, unknown>,
            }
          );
        }
      }

      // 가입 방식 저장
      if (input.join_methods && input.join_methods.length > 0) {
        const joinMethodsData = input.join_methods.map((method) => ({
          crew_id: crewId,
          method_type: method.method_type,
          link_url: method.link_url,
          description: method.description,
        }));

        const { error: joinMethodsError } = await supabase
          .from("crew_join_methods")
          .insert(joinMethodsData);

        if (joinMethodsError) {
          await this.handleDatabaseError(
            joinMethodsError as unknown as DatabaseError,
            {
              action: "createCrewJoinMethods",
              input: {
                crewId,
                joinMethods: input.join_methods,
              } as Record<string, unknown>,
            }
          );
        }
      }

      // 크루 대표 활동 사진 업로드 및 저장
      if (input.photos && input.photos.length > 0) {
        console.log(
          `=== 크루 대표 활동 사진 ${input.photos.length}개 처리 시작 ===`
        );
        const photoUrls: string[] = [];

        // 각 사진 파일을 순차적으로 업로드
        for (let i = 0; i < input.photos.length; i++) {
          const photo = input.photos[i];
          console.log(
            `사진 ${i + 1}/${input.photos.length} 업로드 시작:`,
            photo.name
          );
          const photoUrl = await this.uploadCrewPhoto(photo, crewId);

          if (photoUrl) {
            console.log(`사진 ${i + 1} 업로드 성공:`, photoUrl);
            photoUrls.push(photoUrl);
          } else {
            console.error(`사진 ${i + 1} 업로드 실패`);
          }
        }

        console.log(
          `총 ${photoUrls.length}/${input.photos.length}개 사진 업로드 완료`
        );

        // 업로드된 사진 URL을 DB에 저장
        if (photoUrls.length > 0) {
          console.log("크루 사진 DB 저장 시작");
          const photoData = photoUrls.map((url, index) => ({
            crew_id: crewId,
            photo_url: url,
            display_order: index,
          }));

          const { error: photosError } = await supabase
            .from("crew_photos")
            .insert(photoData);

          if (photosError) {
            console.error("크루 사진 DB 저장 실패:", photosError);
            await this.handleDatabaseError(
              photosError as unknown as DatabaseError,
              {
                action: "createCrewPhotos",
                input: {
                  crewId,
                  photos: photoUrls,
                } as Record<string, unknown>,
              }
            );
          } else {
            console.log("크루 사진 DB 저장 완료");
          }
        }
      } else {
        console.log("크루 대표 활동 사진 없음");
      }

      console.log("=== 크루 생성 완료 ===");

      // 생성된 크루 정보 반환
      return {
        id: crewId,
        name: input.name,
        description: input.description,
        instagram: input.instagram,
        logo_image_url,
        founded_date: input.founded_date,
        location: {
          main_address: input.location.main_address,
          detail_address: input.location.detail_address,
          latitude: input.location.latitude,
          longitude: input.location.longitude,
        },
        age_range: {
          min_age: input.age_range.min_age,
          max_age: input.age_range.max_age,
        },
        activity_days: input.activity_days,
        activity_locations: input.activity_locations || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        throw error;
      }
      logger.error(logger.createError(ErrorCode.SERVER_ERROR), {
        action: "createCrew",
        details: { error, input },
      });
      throw logger.createError(ErrorCode.SERVER_ERROR);
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
        crew_age_ranges (*),
        crew_activity_locations (location_name),
        crew_photos (
          photo_url,
          display_order
        )
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
    let crews = (
      data as (DbCrew & {
        crew_photos: Array<{ photo_url: string; display_order: number }>;
      })[]
    ).map((crew) => {
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

      // 활동 장소들 추출
      const activityLocations = crew.crew_activity_locations
        ? crew.crew_activity_locations.map((loc) => loc.location_name)
        : [];

      // 사진들을 display_order로 정렬
      const photos = crew.crew_photos
        ? crew.crew_photos
            .sort((a, b) => a.display_order - b.display_order)
            .map((photo) => photo.photo_url)
        : [];

      return {
        id: crew.id,
        name: crew.name,
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
        founded_date: crew.founded_date,
        activity_day: activityDay,
        age_range: ageRange,
        activity_locations: activityLocations,
        photos: photos,
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
        crew_age_ranges (*),
        crew_activity_locations (location_name),
        crew_photos (
          photo_url,
          display_order
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return null;

    const crew = data as DbCrew & {
      crew_photos: Array<{ photo_url: string; display_order: number }>;
    };

    // 활동 장소들 추출
    const activityLocations = crew.crew_activity_locations
      ? crew.crew_activity_locations.map((loc) => loc.location_name)
      : [];

    // 사진들을 display_order로 정렬
    const photos = crew.crew_photos
      ? crew.crew_photos
          .sort((a, b) => a.display_order - b.display_order)
          .map((photo) => photo.photo_url)
      : [];

    return {
      ...crew,
      location: {
        main_address: crew.crew_locations[0].main_address,
        detail_address: crew.crew_locations[0].detail_address,
        latitude: crew.crew_locations[0].latitude,
        longitude: crew.crew_locations[0].longitude,
      },
      activity_days: crew.crew_activity_days.map(
        (d) => d.day_of_week as ActivityDay
      ),
      age_range: {
        min_age: crew.crew_age_ranges[0].min_age,
        max_age: crew.crew_age_ranges[0].max_age,
      },
      activity_locations: activityLocations,
      photos: photos,
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

  // 관리자용 크루 목록 조회
  async getAdminCrews(): Promise<(Crew & { is_visible: boolean })[]> {
    const { data, error } = await supabase
      .from("crews")
      .select(
        `
        id,
        name,
        logo_image_url,
        is_visible,
        description,
        instagram,
        created_at,
        founded_date,
        crew_locations (
          main_address,
          detail_address,
          latitude,
          longitude
        ),
        crew_activity_days (
          day_of_week
        ),
        crew_age_ranges (
          min_age,
          max_age
        ),
        crew_activity_locations (
          location_name
        ),
        crew_photos (
          photo_url,
          display_order
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    interface AdminCrewData {
      id: string;
      name: string;
      description: string;
      instagram?: string;
      logo_image_url?: string;
      is_visible: boolean;
      created_at: string;
      founded_date: string;
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
      crew_activity_locations?: Array<{
        location_name: string;
      }>;
      crew_photos?: Array<{
        photo_url: string;
        display_order: number;
      }>;
    }

    return data.map((crew: AdminCrewData) => ({
      id: crew.id,
      name: crew.name,
      description: crew.description,
      instagram: crew.instagram,
      logo_image: crew.logo_image_url,
      created_at: crew.created_at,
      founded_date: crew.founded_date,
      is_visible: crew.is_visible,
      activity_day: crew.crew_activity_days
        ?.map((d: { day_of_week: string }) => d.day_of_week)
        .join(", "),
      age_range: crew.crew_age_ranges?.[0]
        ? `${crew.crew_age_ranges[0].min_age}~${crew.crew_age_ranges[0].max_age}세`
        : undefined,
      location: {
        lat: crew.crew_locations[0]?.latitude || 0,
        lng: crew.crew_locations[0]?.longitude || 0,
        main_address: crew.crew_locations[0]?.main_address || "주소 없음",
        address: crew.crew_locations[0]?.detail_address || "",
      },
      activity_locations:
        crew.crew_activity_locations?.map(
          (loc: { location_name: string }) => loc.location_name
        ) || [],
      photos: crew.crew_photos
        ? crew.crew_photos
            .sort((a, b) => a.display_order - b.display_order)
            .map((photo) => photo.photo_url)
        : [],
    }));
  }

  // 크루 표시 상태 업데이트
  async updateCrewVisibility(
    crewId: string,
    isVisible: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from("crews")
      .update({ is_visible: isVisible })
      .eq("id", crewId);

    if (error) throw error;
  }

  // 위치 정보 유효성 검사
  private validateLocation(location: { latitude: number; longitude: number }) {
    // 데이터베이스 스키마 제약 검사
    // latitude는 numeric(10, 8) - 소수점 앞 최대 2자리, 소수점 뒤 최대 8자리
    // longitude는 numeric(11, 8) - 소수점 앞 최대 3자리, 소수점 뒤 최대 8자리

    // 위도 범위 검사 (-99.99999999 ~ 99.99999999)
    if (location.latitude < -99.99999999 || location.latitude > 99.99999999) {
      throw new Error(
        "위도 값이 유효한 범위를 벗어났습니다. -99.99999999에서 99.99999999 사이의 값을 입력해주세요."
      );
    }

    // 경도 범위 검사 (-999.99999999 ~ 999.99999999)
    if (
      location.longitude < -999.99999999 ||
      location.longitude > 999.99999999
    ) {
      throw new Error(
        "경도 값이 유효한 범위를 벗어났습니다. -999.99999999에서 999.99999999 사이의 값을 입력해주세요."
      );
    }

    // 소수점 자릿수 검사
    const latStr = location.latitude.toString();
    const lngStr = location.longitude.toString();

    // 소수점 이하 자릿수 확인
    const latDecimalPlaces = latStr.includes(".")
      ? latStr.split(".")[1].length
      : 0;
    const lngDecimalPlaces = lngStr.includes(".")
      ? lngStr.split(".")[1].length
      : 0;

    if (latDecimalPlaces > 8) {
      throw new Error(
        "위도 값의 소수점 이하 자릿수는 최대 8자리까지 가능합니다."
      );
    }

    if (lngDecimalPlaces > 8) {
      throw new Error(
        "경도 값의 소수점 이하 자릿수는 최대 8자리까지 가능합니다."
      );
    }

    // 한국의 위경도 범위 검사
    // 위도(latitude): 33° ~ 39° (북위)
    // 경도(longitude): 124° ~ 132° (동경)
    const isInKoreaRange =
      location.latitude >= 33 &&
      location.latitude <= 39 &&
      location.longitude >= 124 &&
      location.longitude <= 132;

    // 한국 범위를 벗어나면 경고만 하고 진행 (다른 국가의 크루도 등록 가능하도록)
    if (!isInKoreaRange) {
      console.warn(
        "입력된 위경도 값이 한국의 일반적인 범위를 벗어났습니다:",
        location
      );
    }
  }

  // 크루 정보 업데이트
  async updateCrew(
    crewId: string,
    updateData: {
      name: string;
      description: string;
      instagram?: string;
      location: {
        main_address: string;
        detail_address?: string;
        latitude: number;
        longitude: number;
      };
      activity_locations?: string[];
      activity_days: ActivityDay[];
      founded_date?: string;
      age_range?: {
        min_age: number;
        max_age: number;
      };
      logo_image_url?: string; // 로고 이미지 URL 추가
    }
  ): Promise<void> {
    try {
      // 위치 정보 유효성 검사
      this.validateLocation(updateData.location);

      // 트랜잭션 처리를 위해 여러 업데이트를 순차적으로 실행

      // 1. 기본 크루 정보 업데이트
      const { error: crewError } = await supabase
        .from("crews")
        .update({
          name: updateData.name,
          description: updateData.description,
          instagram: updateData.instagram || null,
          founded_date: updateData.founded_date || undefined,
          logo_image_url: updateData.logo_image_url || undefined,
        })
        .eq("id", crewId);

      if (crewError) throw crewError;

      // 2. 위치 정보 업데이트
      const { error: locationError } = await supabase
        .from("crew_locations")
        .update({
          main_address: updateData.location.main_address,
          detail_address: updateData.location.detail_address,
          latitude: updateData.location.latitude,
          longitude: updateData.location.longitude,
        })
        .eq("crew_id", crewId);

      if (locationError) throw locationError;

      // 3. 활동 요일 업데이트 (기존 데이터 삭제 후 새로 추가)
      // 3-1. 기존 활동 요일 삭제
      const { error: deleteActivityDaysError } = await supabase
        .from("crew_activity_days")
        .delete()
        .eq("crew_id", crewId);

      if (deleteActivityDaysError) throw deleteActivityDaysError;

      // 3-2. 새 활동 요일 추가
      const { error: insertActivityDaysError } = await supabase
        .from("crew_activity_days")
        .insert(
          updateData.activity_days.map((day) => ({
            crew_id: crewId,
            day_of_week: day,
          }))
        );

      if (insertActivityDaysError) throw insertActivityDaysError;

      // 4. 연령대 업데이트 (있는 경우)
      if (updateData.age_range) {
        const { error: ageRangeError } = await supabase
          .from("crew_age_ranges")
          .update({
            min_age: updateData.age_range.min_age,
            max_age: updateData.age_range.max_age,
          })
          .eq("crew_id", crewId);

        if (ageRangeError) throw ageRangeError;
      }

      // 5. 활동 장소 업데이트 (기존 데이터 삭제 후 새로 추가)
      if (
        updateData.activity_locations &&
        updateData.activity_locations.length > 0
      ) {
        // 5-1. 기존 활동 장소 삭제
        const { error: deleteActivityLocationsError } = await supabase
          .from("crew_activity_locations")
          .delete()
          .eq("crew_id", crewId);

        if (deleteActivityLocationsError) throw deleteActivityLocationsError;

        // 5-2. 새 활동 장소 추가
        const { error: insertActivityLocationsError } = await supabase
          .from("crew_activity_locations")
          .insert(
            updateData.activity_locations.map((location) => ({
              crew_id: crewId,
              location_name: location,
            }))
          );

        if (insertActivityLocationsError) throw insertActivityLocationsError;
      }
    } catch (error) {
      console.error("크루 정보 업데이트 실패:", error);
      throw error;
    }
  }

  // 크루 삭제
  async deleteCrew(crewId: string): Promise<void> {
    try {
      // 크루 정보 조회 (로고 이미지 URL 확인을 위해)
      const { data: crew, error: getError } = await supabase
        .from("crews")
        .select("logo_image_url")
        .eq("id", crewId)
        .single();

      if (getError) {
        throw logger.createError(ErrorCode.SERVER_ERROR, {
          originalError: getError,
          metadata: { action: "deleteCrew", crewId },
        });
      }

      // 로고 이미지가 있으면 스토리지에서 삭제
      if (crew?.logo_image_url) {
        try {
          // URL에서 파일 이름 추출
          const url = new URL(crew.logo_image_url);
          const pathParts = url.pathname.split("/");
          const fileName = pathParts[pathParts.length - 1].split("?")[0]; // 쿼리 파라미터 제거

          // 스토리지에서 이미지 삭제
          const { error: deleteImageError } = await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([fileName]);

          if (deleteImageError) {
            // 이미지 삭제 실패는 로깅만 하고 크루 삭제는 계속 진행
            console.error("크루 로고 이미지 삭제 실패:", deleteImageError);
          }
        } catch (imageError) {
          // 이미지 처리 중 오류는 로깅만 하고 크루 삭제는 계속 진행
          console.error("크루 로고 이미지 처리 중 오류:", imageError);
        }
      }

      // 크루 삭제 (ON DELETE CASCADE로 인해 관련 데이터도 모두 삭제됨)
      const { error: deleteError } = await supabase
        .from("crews")
        .delete()
        .eq("id", crewId);

      if (deleteError) {
        throw logger.createError(ErrorCode.SERVER_ERROR, {
          originalError: deleteError,
          metadata: { action: "deleteCrew", crewId },
        });
      }
    } catch (error) {
      if (error instanceof Error && "code" in error) {
        throw error;
      }
      logger.error(logger.createError(ErrorCode.SERVER_ERROR), {
        action: "deleteCrew",
        details: { error, crewId },
      });
      throw logger.createError(ErrorCode.SERVER_ERROR);
    }
  }

  private async uploadCrewPhoto(
    file: File,
    crewId: string
  ): Promise<string | null> {
    try {
      console.log("=== 크루 대표 활동 사진 업로드 시작 ===");
      console.log("파일 정보:", {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      });
      console.log("크루 ID:", crewId);
      console.log("저장 버킷:", this.CREW_PHOTOS_BUCKET);

      // 파일 크기 검증
      if (file.size > 5 * 1024 * 1024) {
        console.error(
          "파일 크기 초과:",
          `${(file.size / 1024 / 1024).toFixed(2)}MB`
        );
        throw logger.createError(ErrorCode.FILE_TOO_LARGE);
      }
      console.log("파일 크기 검증 완료");

      // 파일 형식 검증
      if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
        console.error("잘못된 파일 형식:", file.type);
        throw logger.createError(ErrorCode.INVALID_FILE_TYPE);
      }
      console.log("파일 형식 검증 완료");

      // 파일명 생성
      const timestamp = new Date().getTime();
      const fileExt = file.name.split(".").pop();
      const fileName = `${crewId}_${timestamp}.${fileExt}`;
      console.log("생성된 파일명:", fileName);

      // 이미지 업로드
      console.log("크루 대표 활동 사진 업로드 시작...");
      const { error: uploadError } = await supabase.storage
        .from(this.CREW_PHOTOS_BUCKET)
        .upload(fileName, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("크루 대표 활동 사진 업로드 실패:", {
          errorMessage: uploadError.message,
          errorDetails: uploadError,
        });
        return null;
      }
      console.log("크루 대표 활동 사진 업로드 성공");

      // 공개 URL 생성
      console.log("공개 URL 생성 중...");
      const { data } = supabase.storage
        .from(this.CREW_PHOTOS_BUCKET)
        .getPublicUrl(fileName);

      const publicUrl = new URL(data.publicUrl);
      publicUrl.searchParams.set("v", timestamp.toString());
      console.log("생성된 공개 URL:", publicUrl.toString());
      console.log("=== 크루 대표 활동 사진 업로드 완료 ===");

      return publicUrl.toString();
    } catch (error) {
      console.error("=== 크루 대표 활동 사진 업로드 실패 ===");
      console.error("에러 상세 정보:", {
        error,
        errorMessage:
          error instanceof Error ? error.message : "알 수 없는 에러",
        file: {
          name: file.name,
          type: file.type,
          size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        crewId,
        bucket: this.CREW_PHOTOS_BUCKET,
      });
      return null;
    }
  }
}

export const crewService = new CrewService();
