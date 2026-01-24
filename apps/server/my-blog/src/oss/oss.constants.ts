/** OSS 直传签名有效期（秒） */
export const OSS_SIGNATURE_EXPIRE = 300;

/** 允许的文件类型 */
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

/** 文件大小限制（字节） */
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 50 * 1024 * 1024, // 50MB
  document: 20 * 1024 * 1024, // 20MB
};

/** 上传目录前缀 */
export const UPLOAD_DIR_PREFIX = {
  image: 'images',
  video: 'videos',
  audio: 'audios',
  document: 'documents',
};
