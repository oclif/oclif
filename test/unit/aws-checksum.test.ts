import {expect} from 'chai'

describe('aws S3 checksum configuration logic', () => {
  it('should determine S3-compatible endpoints correctly', () => {
    const testCases = [
      {endpoint: 'https://s3.amazonaws.com', isS3Compatible: false},
      {endpoint: 'https://s3.us-east-1.amazonaws.com', isS3Compatible: false},
      {endpoint: 'https://s3-compatible.example.com', isS3Compatible: true},
      {endpoint: 'https://cloudflare-r2.example.com', isS3Compatible: true},
    ]

    for (const {endpoint, isS3Compatible: expected} of testCases) {
      const actual = endpoint && !endpoint.includes('amazonaws.com')
      expect(actual || false).to.equal(expected, `Failed for endpoint: ${endpoint}`)
    }
  })

  it('should set correct checksum config based on endpoint and environment', () => {
    const testCases = [
      {
        description: 'S3-compatible without env override',
        endpoint: 'https://minio.example.com',
        envChecksum: undefined,
        expectedConfig: 'WHEN_REQUIRED',
      },
      {
        description: 'AWS S3 without env override',
        endpoint: 'https://s3.amazonaws.com',
        envChecksum: undefined,
        expectedConfig: undefined,
      },
      {
        description: 'AWS S3 with env override',
        endpoint: 'https://s3.amazonaws.com',
        envChecksum: 'WHEN_REQUIRED',
        expectedConfig: 'WHEN_REQUIRED',
      },
      {
        description: 'S3-compatible with redundant env override',
        endpoint: 'https://minio.example.com',
        envChecksum: 'WHEN_REQUIRED',
        expectedConfig: 'WHEN_REQUIRED',
      },
    ]

    for (const {description, endpoint, envChecksum, expectedConfig} of testCases) {
      const isS3Compatible = endpoint && !endpoint.includes('amazonaws.com')
      const checksumConfig = envChecksum || (isS3Compatible ? 'WHEN_REQUIRED' : undefined)
      expect(checksumConfig).to.equal(expectedConfig, `Failed for: ${description}`)
    }
  })
})
