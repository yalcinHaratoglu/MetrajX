export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_MB = 10;

export class UploadTooLargeError extends Error {
  readonly code = "UPLOAD_TOO_LARGE";

  constructor() {
    super("UPLOAD_TOO_LARGE");
    this.name = "UploadTooLargeError";
  }
}

export function isUploadTooLarge(file: File): boolean {
  return file.size > MAX_UPLOAD_BYTES;
}

export function assertUploadSize(file: File): void {
  if (isUploadTooLarge(file)) {
    throw new UploadTooLargeError();
  }
}

export function uploadErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof UploadTooLargeError) return t("common.uploadTooLarge");
  return t("common.error");
}
