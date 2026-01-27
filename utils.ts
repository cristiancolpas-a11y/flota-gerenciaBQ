
import { DocumentStatus } from './types';

export const normalizePlate = (plate: string): string => {
  if (!plate) return "";
  return String(plate)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
};

export const normalizeStr = (str: string): string => {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
};

/**
 * Compara si un valor de mes (texto o número) coincide con el mes seleccionado
 */
export const monthMatches = (val: string, targetMonthIdx: number, monthList: string[]): boolean => {
  const normVal = normalizeStr(val);
  const targetName = normalizeStr(monthList[targetMonthIdx]);
  const targetNum = (targetMonthIdx + 1).toString();
  const targetNumPad = (targetMonthIdx + 1).toString().padStart(2, '0');

  // Coincide con nombre (ENERO), incluye el nombre (ENERO 2024) o es el número (1 o 01)
  return normVal === targetName || normVal.includes(targetName) || normVal === targetNum || normVal === targetNumPad;
};

export const extractNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.floor(val);
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

export const calculateStatus = (expiryDate: string): DocumentStatus => {
  if (!expiryDate) return 'active';
  const now = new Date();
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime()) || expiry.getFullYear() < 1900) return 'active';
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'warning';
  return 'active';
};

export const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return 'No disponible';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  } catch (e) { return dateString; }
};

export const getDriveDirectLink = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  const cleanUrl = url.trim();
  if (!cleanUrl.includes('drive.google.com')) return cleanUrl;
  const patterns = [/\/d\/([a-zA-Z0-9_-]+)/, /id=([a-zA-Z0-9_-]+)/, /\/file\/d\/([a-zA-Z0-9_-]+)/];
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return cleanUrl;
};

export const isImageLink = (url: string): boolean => {
  if (!url) return false;
  return url.startsWith('data:image') || url.includes('drive.google.com') || /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(url);
};

export const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const createMosaic = async (base64Array: string[]): Promise<string> => {
  if (base64Array.length === 0) return "";
  if (base64Array.length === 1) return base64Array[0];

  const images = await Promise.all(base64Array.map(base64 => {
    return new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => resolve(img);
    });
  }));

  const numImages = images.length;
  const cols = numImages > 1 ? 2 : 1;
  const rows = Math.ceil(numImages / cols);

  const canvas = document.createElement('canvas');
  const cellWidth = 800;
  const cellHeight = 600;

  canvas.width = cols * cellWidth;
  canvas.height = rows * cellHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) return base64Array[0];

  images.forEach((img, i) => {
    const x = (i % cols) * cellWidth;
    const y = Math.floor(i / cols) * cellHeight;
    
    const imgRatio = img.width / img.height;
    const cellRatio = cellWidth / cellHeight;
    let drawW, drawH, offsetW, offsetH;

    if (imgRatio > cellRatio) {
      drawH = cellHeight;
      drawW = cellHeight * imgRatio;
      offsetW = (drawW - cellWidth) / 2;
      offsetH = 0;
    } else {
      drawW = cellWidth;
      drawH = cellWidth / imgRatio;
      offsetW = 0;
      offsetH = (drawH - cellHeight) / 2;
    }

    ctx.drawImage(img, x - offsetW, y - offsetH, drawW, drawH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 15;
    ctx.strokeRect(x, y, cellWidth, cellHeight);
  });

  return canvas.toDataURL('image/jpeg', 0.7);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};
