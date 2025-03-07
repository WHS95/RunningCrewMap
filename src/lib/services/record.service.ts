import { createClient } from "@supabase/supabase-js";
import { AppError } from "../errors/app-error";
import { ErrorCode } from "../errors/error-codes";

// 데이터베이스에서 가져온 서브3 기록 타입
interface DbRecord {
  id: string;
  runner_name: string;
  birth_year: number;
  crew_name: string | null;
  crew_instagram: string | null;
  race_name: string;
  race_date: string;
  race_time: string; // ISO8601 Duration format
  race_certificate_image_url: string;
  profile_image_url: string | null;
  review: string | null;
  shoe_model: string | null;
  created_at: string;
  updated_at: string;
  is_visible: boolean;
}

// 클라이언트에 반환되는 서브3 기록 타입
export interface Record {
  id: string;
  runnerName: string;
  birthYear: number;
  age: number; // 현재 나이 (계산됨)
  crewName: string | null;
  crewInstagram: string | null;
  raceName: string;
  raceDate: string;
  raceTime: string; // "2:45:30" 형식
  raceCertificateImageUrl: string;
  profileImageUrl: string | null;
  review: string | null;
  shoeModel: string | null;
  createdAt: string;
}

// 서브3 기록 생성에 필요한 입력값 타입
export interface CreateRecordInput {
  runnerName: string;
  birthYear: number;
  crewName: string | null;
  crewInstagram: string | null;
  raceName: string;
  raceDate: string;
  raceTime: string;
  raceCertificateImage: File;
  profileImage?: File;
  review?: string;
  shoeModel?: string;
}

// 서브3 기록 필터링 옵션
export interface RecordFilterOptions {
  ageGroup?: number; // 연령대 (20대, 30대 등)
  crewName?: string; // 특정 크루 이름으로 필터링
  sortBy?: "time" | "date" | "age"; // 정렬 기준
  sortOrder?: "asc" | "desc"; // 정렬 순서
  limit?: number; // 조회 개수 제한
  offset?: number; // 페이지네이션 오프셋
}

// 데이터베이스 에러 타입
interface DatabaseError {
  code?: string;
  message?: string;
  details?: unknown;
  [key: string]: unknown;
}

// 에러 컨텍스트 타입
interface ErrorContext extends Record<string, unknown> {
  action: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// 서브3 기록 서비스 클래스
export class RecordService {
  private readonly CERTIFICATE_BUCKET_NAME = "raceCertificates";
  private readonly PROFILE_BUCKET_NAME = "runnerProfiles";
  private supabase;
  private storageInitialized = false;

  constructor() {
    // Supabase 클라이언트 초기화
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    );
  }

  // 스토리지 초기화
  private async initializeStorage() {
    if (this.storageInitialized) return;

    try {
      // 기록증 버킷이 존재하는지 확인
      const { data: certBuckets } = await this.supabase.storage.listBuckets();
      if (
        !certBuckets?.find(
          (bucket) => bucket.name === this.CERTIFICATE_BUCKET_NAME
        )
      ) {
        await this.supabase.storage.createBucket(this.CERTIFICATE_BUCKET_NAME, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        });
      }

      // 프로필 버킷이 존재하는지 확인
      const { data: profileBuckets } =
        await this.supabase.storage.listBuckets();
      if (
        !profileBuckets?.find(
          (bucket) => bucket.name === this.PROFILE_BUCKET_NAME
        )
      ) {
        await this.supabase.storage.createBucket(this.PROFILE_BUCKET_NAME, {
          public: true,
          fileSizeLimit: 2097152, // 2MB
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        });
      }

      this.storageInitialized = true;
    } catch (error) {
      console.error("스토리지 초기화 오류:", error);
      throw new AppError({
        code: ErrorCode.STORAGE_INITIALIZATION_FAILED,
        message: "이미지 스토리지 초기화에 실패했습니다.",
        details: error,
      });
    }
  }

  // 기록증 이미지 업로드
  private async uploadCertificateImage(
    file: File,
    recordId: string
  ): Promise<string | null> {
    await this.initializeStorage();
    await this.validateImage(file, 5); // 5MB 제한

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${recordId}_${Date.now()}.${fileExt}`;
      const filePath = `${recordId}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from(this.CERTIFICATE_BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = this.supabase.storage
        .from(this.CERTIFICATE_BUCKET_NAME)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("기록증 이미지 업로드 오류:", error);
      throw new AppError({
        code: ErrorCode.FILE_UPLOAD_FAILED,
        message: "기록증 이미지 업로드에 실패했습니다.",
        details: error,
      });
    }
  }

  // 프로필 이미지 업로드
  private async uploadProfileImage(
    file: File,
    recordId: string
  ): Promise<string | null> {
    if (!file) return null;

    await this.initializeStorage();
    await this.validateImage(file, 2); // 2MB 제한

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${recordId}_${Date.now()}.${fileExt}`;
      const filePath = `${recordId}/${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from(this.PROFILE_BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = this.supabase.storage
        .from(this.PROFILE_BUCKET_NAME)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("프로필 이미지 업로드 오류:", error);
      throw new AppError({
        code: ErrorCode.FILE_UPLOAD_FAILED,
        message: "프로필 이미지 업로드에 실패했습니다.",
        details: error,
      });
    }
  }

  // 입력값 유효성 검증
  private async validateInput(input: CreateRecordInput) {
    // 필수 필드 검증
    if (!input.runnerName) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "러너 이름은 필수입니다.",
      });
    }

    if (!input.raceName) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "대회명은 필수입니다.",
      });
    }

    if (!input.raceDate) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "대회 일자는 필수입니다.",
      });
    }

    if (!input.raceTime) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "완주 기록은 필수입니다.",
      });
    }

    // 서브3 기록 검증 (3시간 미만)
    const [hours, minutes, seconds] = input.raceTime.split(":").map(Number);

    if (hours >= 3 || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "서브3(3시간 미만) 기록만 등록 가능합니다.",
      });
    }

    // 생년 검증
    const currentYear = new Date().getFullYear();
    if (input.birthYear < 1900 || input.birthYear > currentYear) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "올바른 출생년도를 입력하세요.",
      });
    }

    // 대회 날짜 검증
    const raceDate = new Date(input.raceDate);
    const today = new Date();
    if (isNaN(raceDate.getTime()) || raceDate > today) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          "올바른 대회 날짜를 입력하세요. 미래 날짜는 입력할 수 없습니다.",
      });
    }

    // 기록증 이미지 필수 검증
    if (!input.raceCertificateImage) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "대회 기록증 이미지는 필수입니다.",
      });
    }
  }

  // 이미지 유효성 검증
  private async validateImage(file: File, maxSizeMB: number) {
    if (!file) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "이미지 파일이 없습니다.",
      });
    }

    // 파일 크기 검증
    const maxSize = maxSizeMB * 1024 * 1024; // MB to bytes
    if (file.size > maxSize) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: `이미지 크기는 ${maxSizeMB}MB 이하여야 합니다.`,
      });
    }

    // 이미지 형식 검증
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new AppError({
        code: ErrorCode.VALIDATION_FAILED,
        message: "이미지는 JPG, PNG, WebP 형식만 가능합니다.",
      });
    }
  }

  // 데이터베이스 에러 처리
  private async handleDatabaseError(
    error: DatabaseError,
    context: ErrorContext
  ) {
    console.error(`DB Error during ${context.action}:`, error);

    // 중복 키 에러
    if (error.code === "23505") {
      if (error.message?.includes("runner_name")) {
        throw new AppError({
          code: ErrorCode.DUPLICATE_ENTRY,
          message: "동일한 이름의 기록이 이미 존재합니다.",
          details: error,
        });
      }
    }

    // 외래 키 제약조건 에러
    if (error.code === "23503") {
      throw new AppError({
        code: ErrorCode.FOREIGN_KEY_VIOLATION,
        message: "관련 데이터를 찾을 수 없습니다.",
        details: error,
      });
    }

    // 기본 에러
    throw new AppError({
      code: ErrorCode.DATABASE_ERROR,
      message: "데이터베이스 오류가 발생했습니다.",
      details: error,
    });
  }

  // 서브3 기록 생성
  async createRecord(input: CreateRecordInput): Promise<Record> {
    try {
      // 입력값 유효성 검증
      await this.validateInput(input);

      // UUID 생성
      const { data: uuidData } = await this.supabase.rpc("generate_uuid");
      const recordId = uuidData;

      // 기록증 이미지 업로드
      const certificateImageUrl = await this.uploadCertificateImage(
        input.raceCertificateImage,
        recordId
      );

      // 프로필 이미지 업로드 (선택 사항)
      let profileImageUrl = null;
      if (input.profileImage) {
        profileImageUrl = await this.uploadProfileImage(
          input.profileImage,
          recordId
        );
      }

      // ISO8601 Duration 형식으로 레이스 타임 변환
      const [hours, minutes, seconds] = input.raceTime.split(":").map(Number);
      const duration = `PT${hours}H${minutes}M${seconds}S`;

      // 데이터베이스에 저장
      const { data, error } = await this.supabase
        .from("hall_of_fame_entries")
        .insert({
          id: recordId,
          runner_name: input.runnerName,
          birth_year: input.birthYear,
          crew_name: input.crewName,
          crew_instagram: input.crewInstagram,
          race_name: input.raceName,
          race_date: input.raceDate,
          race_time: duration,
          race_certificate_image_url: certificateImageUrl,
          profile_image_url: profileImageUrl,
          review: input.review || null,
          shoe_model: input.shoeModel || null,
          is_visible: false, // 관리자 승인 대기 상태
        })
        .select()
        .single();

      if (error) {
        await this.handleDatabaseError(error, {
          action: "createRecord",
          input,
        });
      }

      return this.transformDbRecordToRecord(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("서브3 기록 생성 오류:", error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: "서브3 기록 등록 중 오류가 발생했습니다.",
        details: error,
      });
    }
  }

  // 서브3 기록 목록 조회
  async getRecords(options?: RecordFilterOptions): Promise<Record[]> {
    try {
      let query = this.supabase
        .from("hall_of_fame_entries")
        .select("*")
        .eq("is_visible", true); // 승인된 기록만 표시

      // 연령대 필터링
      if (options?.ageGroup) {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - options.ageGroup * 10 - 9;
        const endYear = currentYear - options.ageGroup * 10;

        query = query.gte("birth_year", startYear).lte("birth_year", endYear);
      }

      // 크루 이름 필터링
      if (options?.crewName) {
        query = query.eq("crew_name", options.crewName);
      }

      // 정렬
      if (options?.sortBy) {
        const order = options.sortOrder || "asc";

        switch (options.sortBy) {
          case "time":
            query = query.order("race_time", { ascending: order === "asc" });
            break;
          case "date":
            query = query.order("race_date", { ascending: order === "asc" });
            break;
          case "age":
            query = query.order("birth_year", { ascending: order !== "asc" }); // 나이는 birth_year의 역순
            break;
        }
      } else {
        // 기본 정렬: 기록순
        query = query.order("race_time", { ascending: true });
      }

      // 페이지네이션
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error } = await query;

      if (error) {
        await this.handleDatabaseError(error, {
          action: "getRecords",
          input: options,
        });
      }

      return data.map(this.transformDbRecordToRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("서브3 기록 목록 조회 오류:", error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: "서브3 기록 목록 조회 중 오류가 발생했습니다.",
        details: error,
      });
    }
  }

  // 특정 서브3 기록 조회
  async getRecord(id: string): Promise<Record | null> {
    try {
      const { data, error } = await this.supabase
        .from("hall_of_fame_entries")
        .select("*")
        .eq("id", id)
        .eq("is_visible", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // 해당 ID의 데이터가 없음
          return null;
        }

        await this.handleDatabaseError(error, {
          action: "getRecord",
          input: { id },
        });
      }

      return data ? this.transformDbRecordToRecord(data) : null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("서브3 기록 조회 오류:", error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: "서브3 기록 조회 중 오류가 발생했습니다.",
        details: error,
      });
    }
  }

  // 서브3 기록 승인 (관리자 기능)
  async approveRecord(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("hall_of_fame_entries")
        .update({ is_visible: true })
        .eq("id", id);

      if (error) {
        await this.handleDatabaseError(error, {
          action: "approveRecord",
          input: { id },
        });
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("서브3 기록 승인 오류:", error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: "서브3 기록 승인 중 오류가 발생했습니다.",
        details: error,
      });
    }
  }

  // 서브3 기록 거부 (관리자 기능)
  async rejectRecord(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("hall_of_fame_entries")
        .delete()
        .eq("id", id);

      if (error) {
        await this.handleDatabaseError(error, {
          action: "rejectRecord",
          input: { id },
        });
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("서브3 기록 거부 오류:", error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: "서브3 기록 거부 중 오류가 발생했습니다.",
        details: error,
      });
    }
  }

  // 승인 대기 중인 서브3 기록 목록 조회 (관리자 기능)
  async getPendingRecords(): Promise<Record[]> {
    try {
      const { data, error } = await this.supabase
        .from("hall_of_fame_entries")
        .select("*")
        .eq("is_visible", false)
        .order("created_at", { ascending: false });

      if (error) {
        await this.handleDatabaseError(error, {
          action: "getPendingRecords",
        });
      }

      return data.map(this.transformDbRecordToRecord);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("서브3 대기 기록 목록 조회 오류:", error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: "서브3 대기 기록 목록 조회 중 오류가 발생했습니다.",
        details: error,
      });
    }
  }

  // 서브3 기록 삭제 (관리자 기능)
  async deleteRecord(id: string): Promise<void> {
    try {
      // 이미지 파일 삭제 및 DB 레코드 삭제
      const { error } = await this.supabase
        .from("hall_of_fame_entries")
        .delete()
        .eq("id", id);

      if (error) {
        await this.handleDatabaseError(error, {
          action: "deleteRecord",
          input: { id },
        });
      }

      // 이미지 스토리지에서 관련 파일 삭제
      try {
        // 기록증 이미지 삭제
        await this.supabase.storage
          .from(this.CERTIFICATE_BUCKET_NAME)
          .remove([`${id}`]);

        // 프로필 이미지 삭제
        await this.supabase.storage
          .from(this.PROFILE_BUCKET_NAME)
          .remove([`${id}`]);
      } catch (storageError) {
        console.error("이미지 삭제 오류:", storageError);
        // 이미지 삭제 실패는 무시하고 진행
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error("서브3 기록 삭제 오류:", error);
      throw new AppError({
        code: ErrorCode.UNKNOWN_ERROR,
        message: "서브3 기록 삭제 중 오류가 발생했습니다.",
        details: error,
      });
    }
  }

  // DB 레코드를 클라이언트 레코드로 변환
  private transformDbRecordToRecord(dbRecord: DbRecord): Record {
    // 현재 나이 계산
    const currentYear = new Date().getFullYear();
    const age = currentYear - dbRecord.birth_year;

    // race_time을 "2:45:30" 형식으로 변환
    let raceTime = dbRecord.race_time;
    if (raceTime.startsWith("PT")) {
      // PT2H45M30S 형식에서 시:분:초 형식으로 변환
      const hours = raceTime.match(/(\d+)H/)
        ? raceTime.match(/(\d+)H/)![1]
        : "0";
      const minutes = raceTime.match(/(\d+)M/)
        ? raceTime.match(/(\d+)M/)![1]
        : "00";
      const seconds = raceTime.match(/(\d+)S/)
        ? raceTime.match(/(\d+)S/)![1]
        : "00";

      raceTime = `${hours}:${minutes.padStart(2, "0")}:${seconds.padStart(
        2,
        "0"
      )}`;
    }

    return {
      id: dbRecord.id,
      runnerName: dbRecord.runner_name,
      birthYear: dbRecord.birth_year,
      age,
      crewName: dbRecord.crew_name,
      crewInstagram: dbRecord.crew_instagram,
      raceName: dbRecord.race_name,
      raceDate: dbRecord.race_date,
      raceTime,
      raceCertificateImageUrl: dbRecord.race_certificate_image_url,
      profileImageUrl: dbRecord.profile_image_url,
      review: dbRecord.review,
      shoeModel: dbRecord.shoe_model,
      createdAt: dbRecord.created_at,
    };
  }
}
