import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100', 10);
const maxFileSizeBytes = MAX_UPLOAD_MB * 1024 * 1024;

const customUploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : null;
const basePublicDir = customUploadDir || (fs.existsSync(path.resolve(__dirname, '../../public'))
  ? path.resolve(__dirname, '../../public')
  : path.resolve(__dirname, '../public'));

const uploadDir = customUploadDir ? path.join(customUploadDir, 'models') : path.join(basePublicDir, 'uploads/models');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    // Sanitize fieldname to prevent directory traversal or special characters
    const safeField = (file.fieldname || 'file').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${safeField}-${uniqueSuffix}${ext}`);
  }
});

const allowedExtensions = ['.glb', '.gltf', '.obj', '.stl', '.step', '.stp', '.zip', '.png', '.jpg', '.jpeg', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file format "${ext}". Supported: 3D (.glb, .gltf, .obj, .stl, .step) and images (.png, .jpg, .jpeg, .webp)`));
  }
};

export const upload3D = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeBytes
  }
});

