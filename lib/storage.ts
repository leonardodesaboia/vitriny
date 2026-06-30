import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ""
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true"
});

export async function uploadToStorage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const bucket = process.env.S3_BUCKET_NAME ?? "";
  const publicBase = (process.env.S3_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );

  return `${publicBase}/${key}`;
}

export async function deleteFromStorage(key: string): Promise<void> {
  const bucket = process.env.S3_BUCKET_NAME ?? "";

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
}
