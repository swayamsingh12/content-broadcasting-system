const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;
// Default 1h — long enough for slow students, short enough to limit URL leakage.
const PRESIGN_TTL_SECONDS =
  parseInt(process.env.AWS_PRESIGN_TTL_SECONDS, 10) || 3600;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadBuffer = async ({ key, buffer, contentType }) => {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return key;
};

const presignDownload = (key) =>
  getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: PRESIGN_TTL_SECONDS },
  );

const deleteObject = (key) =>
  s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));

module.exports = {
  s3,
  BUCKET,
  PRESIGN_TTL_SECONDS,
  uploadBuffer,
  presignDownload,
  deleteObject,
};
