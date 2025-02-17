import imageCompression from "browser-image-compression";
import { logger } from "./logger";
import { ErrorCode } from "../types/error";

export async function compressImageFile(file: File): Promise<File> {
  try {
    // 2MB 이하면 압축하지 않음
    if (file.size <= 2 * 1024 * 1024) {
      return file;
    }

    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type as string,
    };

    const compressedFile = await imageCompression(file, options);

    // 압축 결과 로깅
    logger.error(
      logger.createError(ErrorCode.FILE_COMPRESSED, {
        metadata: {
          originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
          compressionRatio: `${(
            (1 - compressedFile.size / file.size) *
            100
          ).toFixed(1)}%`,
        },
      })
    );

    return new File([compressedFile], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  } catch (error) {
    logger.error(
      logger.createError(ErrorCode.COMPRESSION_FAILED, {
        originalError: error,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      })
    );
    throw error;
  }
}
