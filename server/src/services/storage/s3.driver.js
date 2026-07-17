const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const AppError = require("../../utils/AppError");
const env = require("../../config/env");

// S3-compatible driver: plain AWS S3 works as-is; Cloudflare R2 (or MinIO)
// works by setting S3_ENDPOINT + S3_FORCE_PATH_STYLE. The bucket must be
// PRIVATE — documents are only ever served through the authenticated
// download endpoint, never via public or presigned URLs.
const client = new S3Client({
  region: env.s3.region,
  credentials: {
    accessKeyId: env.s3.accessKeyId,
    secretAccessKey: env.s3.secretAccessKey,
  },
  ...(env.s3.endpoint
    ? { endpoint: env.s3.endpoint, forcePathStyle: env.s3.forcePathStyle }
    : {}),
});

const put = async ({ key, body, contentType }) => {
  await client.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
};

const getStream = async (key) => {
  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: env.s3.bucket, Key: key })
    );
    return response.Body; // Readable stream in Node
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      throw new AppError("File not found", 404);
    }
    throw error;
  }
};

const remove = async (keys) => {
  if (keys.length === 0) return;
  try {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: env.s3.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      })
    );
  } catch (error) {
    // Best-effort by contract: DB state is the source of truth and is cleaned
    // up by the caller regardless; orphaned objects are harmless and can be
    // reaped by a bucket lifecycle rule.
    console.error("Failed to remove object(s) from storage:", error.message);
  }
};

module.exports = { put, getStream, remove };
