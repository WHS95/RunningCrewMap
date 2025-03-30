/**
 * 이미지 파일을 WebP 형식으로 변환합니다.
 * @param file 변환할 이미지 파일 (JPG, PNG, WebP 등)
 * @returns WebP 형식으로 변환된 File 객체
 */
export async function convertToWebP(file: File): Promise<File> {
  // 이미 WebP 형식이면 변환하지 않고 그대로 반환
  if (file.type === "image/webp") {
    return file;
  }

  try {
    // 이미지를 Canvas에 그리기 위해 URL 생성
    const url = URL.createObjectURL(file);
    
    // 이미지 객체 생성
    const img = new Image();
    
    // 이미지 로딩 처리를 Promise로 래핑
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    
    // URL 해제
    URL.revokeObjectURL(url);
    
    // 캔버스 생성
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    // 이미지를 캔버스에 그리기
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Canvas context 2d를 가져올 수 없습니다.");
    }
    ctx.drawImage(img, 0, 0);
    
    // WebP 형식으로 변환 (품질 설정 - 0.8은 80% 품질)
    const webpBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("WebP 변환 실패"));
        },
        "image/webp",
        0.8  // WebP 품질 (0-1 사이 값)
      );
    });
    
    // 원본 파일명에서 확장자를 webp로 변경
    const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    
    // 새 File 객체 생성
    const webpFile = new File([webpBlob], fileName, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
    
    // 변환 결과 로깅
    console.log("WebP 변환 완료:", {
      originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      convertedSize: `${(webpFile.size / 1024 / 1024).toFixed(2)}MB`,
      conversionRatio: `${(
        (1 - webpFile.size / file.size) *
        100
      ).toFixed(1)}%`,
      originalFormat: file.type,
      newFormat: "image/webp",
    });
    
    return webpFile;
  } catch (error) {
    console.error("WebP 변환 실패:", {
      error,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
    // 변환 실패 시 원본 파일 반환
    return file;
  }
} 