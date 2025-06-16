# S3-Compatible Storage Configuration

AWS SDK v3.729.0 introduced mandatory checksum headers that are not supported by many S3-compatible storage services. This causes upload failures with the error:

```
An error was encountered in a non-retryable streaming request.
    499: UnknownError
```

## Solution

Oclif now provides two ways to handle S3-compatible storage:

### 1. Automatic Detection (Recommended)

When you configure an S3 endpoint that's not from AWS (doesn't contain "amazonaws.com"), oclif automatically disables the problematic checksum headers:

```bash
# Set your S3-compatible endpoint
export AWS_S3_ENDPOINT=https://your-s3-compatible-endpoint.com
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key

# Oclif will automatically detect this is not AWS and disable checksums
oclif upload tarballs
```

### 2. Manual Configuration

You can explicitly control checksum behavior using the `AWS_REQUEST_CHECKSUM_CALCULATION` environment variable:

```bash
# Disable checksums for S3-compatible storage
export AWS_REQUEST_CHECKSUM_CALCULATION=WHEN_REQUIRED

# This tells AWS SDK to only calculate checksums when explicitly required
oclif upload tarballs
```

## Configuration Examples

### Cloudflare R2

```bash
export AWS_S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
export AWS_ACCESS_KEY_ID=your-r2-access-key
export AWS_SECRET_ACCESS_KEY=your-r2-secret-key
# Auto-detection will handle checksum disabling
```

### AWS S3 (Default)

For standard AWS S3, no special configuration is needed:

```bash
# Don't set AWS_S3_ENDPOINT, or set it to an amazonaws.com domain
export AWS_ACCESS_KEY_ID=your-aws-access-key
export AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# Checksums remain enabled for security
```

## Environment Variables

| Variable                           | Description               | Default       |
| ---------------------------------- | ------------------------- | ------------- |
| `AWS_S3_ENDPOINT`                  | S3 endpoint URL           | AWS S3        |
| `AWS_S3_FORCE_PATH_STYLE`          | Use path-style URLs       | false         |
| `AWS_REQUEST_CHECKSUM_CALCULATION` | Checksum calculation mode | Auto-detected |
| `AWS_REGION`                       | AWS region                | us-east-1     |
| `AWS_ACCESS_KEY_ID`                | Access key ID             | Required      |
| `AWS_SECRET_ACCESS_KEY`            | Secret access key         | Required      |
| `AWS_SESSION_TOKEN`                | Session token             | Optional      |
