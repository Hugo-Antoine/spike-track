import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { env } from "~/env";

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const lambda = new LambdaClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const bucket = env.S3_BUCKET_NAME;

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function uploadFrameFile(
  key: string,
  body: Buffer,
): Promise<void> {
  await uploadFile(key, body, "image/jpeg");
}

export async function getPresignedUrl(
  key: string,
  expiresIn = 7200,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

// Presigned PUT URL for direct browser upload (single file < 200 MB)
export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

// Multipart upload: initiate
export async function initiateMultipartUpload(
  key: string,
  contentType: string,
): Promise<string> {
  const result = await s3.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
  );
  if (!result.UploadId) throw new Error("Failed to initiate multipart upload");
  return result.UploadId;
}

// Multipart upload: get presigned URLs for each part
export async function getMultipartPartUrls(
  key: string,
  uploadId: string,
  totalParts: number,
  expiresIn = 3600,
): Promise<string[]> {
  const urls: string[] = [];
  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    urls.push(await getSignedUrl(s3, command, { expiresIn }));
  }
  return urls;
}

// Multipart upload: complete
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>,
): Promise<void> {
  await s3.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
}

// Multipart upload: abort
export async function abortMultipartUpload(
  key: string,
  uploadId: string,
): Promise<void> {
  await s3.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    }),
  );
}

// Lambda: fire-and-forget async invocation
export async function invokeLambdaAsync(
  functionName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await lambda.send(
    new InvokeCommand({
      FunctionName: functionName,
      InvocationType: "Event", // async fire-and-forget
      Payload: new TextEncoder().encode(JSON.stringify(payload)),
    }),
  );
}

export async function deletePrefix(prefix: string): Promise<void> {
  const listed = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
  );

  if (!listed.Contents?.length) return;

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: listed.Contents.map((obj) => ({ Key: obj.Key })),
      },
    }),
  );
}

export { s3, bucket };
