import { afterEach, describe, expect, it } from "vitest";

import { createS3Client } from "./s3";

const originalS3Region = process.env.S3_REGION;
const originalS3InternalEndpoint = process.env.S3_INTERNAL_ENDPOINT;
const originalS3Endpoint = process.env.S3_ENDPOINT;

afterEach(() => {
  if (originalS3Region === undefined) {
    delete process.env.S3_REGION;
  } else {
    process.env.S3_REGION = originalS3Region;
  }

  if (originalS3InternalEndpoint === undefined) {
    delete process.env.S3_INTERNAL_ENDPOINT;
  } else {
    process.env.S3_INTERNAL_ENDPOINT = originalS3InternalEndpoint;
  }

  if (originalS3Endpoint === undefined) {
    delete process.env.S3_ENDPOINT;
  } else {
    process.env.S3_ENDPOINT = originalS3Endpoint;
  }
});

describe("createS3Client", () => {
  it("defaults to us-east-1 when S3_REGION is unset", async () => {
    delete process.env.S3_REGION;

    const client = createS3Client();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    client.destroy();
  });

  it("defaults to us-east-1 when S3_REGION is empty", async () => {
    process.env.S3_REGION = "";

    const client = createS3Client();

    await expect(client.config.region()).resolves.toBe("us-east-1");
    client.destroy();
  });

  it("uses S3_REGION when it is configured", async () => {
    process.env.S3_REGION = "eu-west-1";

    const client = createS3Client();

    await expect(client.config.region()).resolves.toBe("eu-west-1");
    client.destroy();
  });

  it("does not add optional checksums to presigned browser uploads", async () => {
    const client = createS3Client();

    await expect(client.config.requestChecksumCalculation()).resolves.toBe(
      "WHEN_REQUIRED",
    );
    client.destroy();
  });

  it("prefers S3_INTERNAL_ENDPOINT when set", async () => {
    process.env.S3_INTERNAL_ENDPOINT = "http://internal-s3:9000";
    process.env.S3_ENDPOINT = "https://public-s3.example.com";

    const client = createS3Client();
    const endpoint = await client.config.endpoint();
    expect(endpoint.hostname).toBe("internal-s3");
    client.destroy();
  });

  it("uses endpointOverride if provided", async () => {
    process.env.S3_INTERNAL_ENDPOINT = "http://internal-s3:9000";
    process.env.S3_ENDPOINT = "https://public-s3.example.com";

    const client = createS3Client(process.env.S3_ENDPOINT);
    const endpoint = await client.config.endpoint();
    expect(endpoint.hostname).toBe("public-s3.example.com");
    client.destroy();
  });
});
