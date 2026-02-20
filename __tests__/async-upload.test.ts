/**
 * Async Upload API Tests
 * Task 2.1: Create file upload endpoint with multipart form handling
 * Requirements: 1.1, 1.4, 11.1
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/async-upload/route';
import { getServerSession } from 'next-auth';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/r2-client');
jest.mock('@/lib/redis-client');
jest.mock('@/lib/async-queue-db');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('POST /api/async-upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication validation (Requirement 11.1)', () => {
    it('should reject requests without authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/async-upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests with invalid session', async () => {
      mockGetServerSession.mockResolvedValue({ user: null } as any);

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');

      const request = new NextRequest('http://localhost:3000/api/async-upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('File validation', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', role: 'standard' },
      } as any);
    });

    it('should reject requests without a file', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/async-upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('No file provided');
    });

    it('should reject files larger than 50MB (Requirement 1.4)', async () => {
      const largeFileSize = 51 * 1024 * 1024; // 51MB
      const largeFile = new Blob(['x'.repeat(largeFileSize)], { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('file', largeFile, 'large.pdf');

      const request = new NextRequest('http://localhost:3000/api/async-upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.success).toBe(false);
      expect(data.message).toContain('50MB limit');
    });

    it('should reject empty files', async () => {
      const emptyFile = new Blob([], { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('file', emptyFile, 'empty.txt');

      const request = new NextRequest('http://localhost:3000/api/async-upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('empty');
    });

    it('should accept files exactly at 50MB limit', async () => {
      const maxFileSize = 50 * 1024 * 1024; // Exactly 50MB
      const maxFile = new Blob(['x'.repeat(maxFileSize)], { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('file', maxFile, 'max.pdf');

      // Mock successful upload flow
      const { getR2Client } = require('@/lib/r2-client');
      const { getRedisClient } = require('@/lib/redis-client');
      const { getAsyncQueueDB } = require('@/lib/async-queue-db');

      getR2Client.mockReturnValue({
        uploadFile: jest.fn().mockResolvedValue('https://r2.example.com/signed-url'),
      });

      getAsyncQueueDB.mockReturnValue({
        createJob: jest.fn().mockResolvedValue(undefined),
      });

      getRedisClient.mockReturnValue({
        pushToQueue: jest.fn().mockResolvedValue(undefined),
      });

      const request = new NextRequest('http://localhost:3000/api/async-upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.jobId).toBeDefined();
    });
  });

  describe('Multipart form data parsing', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user123', role: 'standard' },
      } as any);
    });

    it('should correctly parse multipart form data', async () => {
      const fileContent = 'test file content';
      const fileName = 'test-document.pdf';
      const file = new Blob([fileContent], { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('file', file, fileName);

      // Mock successful upload flow
      const { getR2Client } = require('@/lib/r2-client');
      const { getRedisClient } = require('@/lib/redis-client');
      const { getAsyncQueueDB } = require('@/lib/async-queue-db');

      const mockUploadFile = jest.fn().mockResolvedValue('https://r2.example.com/signed-url');
      const mockCreateJob = jest.fn().mockResolvedValue(undefined);
      const mockPushToQueue = jest.fn().mockResolvedValue(undefined);

      getR2Client.mockReturnValue({ uploadFile: mockUploadFile });
      getAsyncQueueDB.mockReturnValue({ createJob: mockCreateJob });
      getRedisClient.mockReturnValue({ pushToQueue: mockPushToQueue });

      const request = new NextRequest('http://localhost:3000/api/async-upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify the file was processed
      expect(mockUploadFile).toHaveBeenCalled();
      expect(mockCreateJob).toHaveBeenCalled();
      expect(mockPushToQueue).toHaveBeenCalled();
    });
  });
});
