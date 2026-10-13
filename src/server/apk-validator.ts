import fs from 'fs';
import path from 'path';

export interface ApkValidationResult {
  isValid: boolean;
  fileSize: number;
  fileName: string;
  hasZipHeader: boolean;
  hasManifest: boolean;
  mimeType: string;
  error?: string;
}

/**
 * Validates that an uploaded file is a valid Android Package (APK).
 * An APK is a standard ZIP archive containing AndroidManifest.xml and classes.dex.
 */
export function validateApkFile(filePath: string, originalName: string): ApkValidationResult {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        isValid: false,
        fileSize: 0,
        fileName: originalName,
        hasZipHeader: false,
        hasManifest: false,
        mimeType: 'application/octet-stream',
        error: 'File does not exist on disk.',
      };
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    // Enforce 150MB hard limit
    const MAX_SIZE = 150 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return {
        isValid: false,
        fileSize,
        fileName: originalName,
        hasZipHeader: false,
        hasManifest: false,
        mimeType: 'application/vnd.android.package-archive',
        error: `File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed limit of 150MB.`,
      };
    }

    // Check magic bytes for ZIP: 0x50 0x4B 0x03 0x04 ('PK\x03\x04')
    const fd = fs.openSync(filePath, 'r');
    const headerBuffer = Buffer.alloc(4);
    fs.readSync(fd, headerBuffer, 0, 4, 0);

    const hasZipHeader =
      headerBuffer[0] === 0x50 &&
      headerBuffer[1] === 0x4b &&
      headerBuffer[2] === 0x03 &&
      headerBuffer[3] === 0x04;

    if (!hasZipHeader) {
      fs.closeSync(fd);
      return {
        isValid: false,
        fileSize,
        fileName: originalName,
        hasZipHeader: false,
        hasManifest: false,
        mimeType: 'application/octet-stream',
        error: 'Invalid file signature: Not a valid ZIP/APK archive.',
      };
    }

    // Scan for AndroidManifest.xml string inside the ZIP header index (first 64KB or entire small file)
    const scanSize = Math.min(fileSize, 65536);
    const scanBuffer = Buffer.alloc(scanSize);
    fs.readSync(fd, scanBuffer, 0, scanSize, 0);
    fs.closeSync(fd);

    const scanString = scanBuffer.toString('binary');
    const hasManifest = scanString.includes('AndroidManifest.xml');

    return {
      isValid: true,
      fileSize,
      fileName: path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_'),
      hasZipHeader: true,
      hasManifest,
      mimeType: 'application/vnd.android.package-archive',
    };
  } catch (err: any) {
    return {
      isValid: false,
      fileSize: 0,
      fileName: originalName,
      hasZipHeader: false,
      hasManifest: false,
      mimeType: 'application/octet-stream',
      error: `Validation exception: ${err.message}`,
    };
  }
}
