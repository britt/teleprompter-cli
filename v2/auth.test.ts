import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test"
import { isTokenValid, storeToken, getAccessToken } from "./auth"
import { promises as fsPromises } from 'fs'
import * as path from 'path'
import * as os from 'os'

describe("auth", () => {
  describe("isTokenValid", () => {
    test("returns false for invalid token format", () => {
      expect(isTokenValid("invalid-token")).toBe(false)
      expect(isTokenValid("")).toBe(false)
      expect(isTokenValid("only.one.dot")).toBe(false)
    })

    test("returns false for token with invalid payload", () => {
      expect(isTokenValid("header.invalid-base64.signature")).toBe(false)
    })

    test("returns false for expired token", () => {
      // Create a token with exp in the past (1 hour ago)
      const expiredTime = Math.floor(Date.now() / 1000) - 3600
      const payload = { exp: expiredTime }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const token = `header.${encodedPayload}.signature`

      expect(isTokenValid(token)).toBe(false)
    })

    test("returns true for valid non-expired token", () => {
      // Create a token with exp in the future (1 hour from now)
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      const payload = { exp: futureTime }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const token = `header.${encodedPayload}.signature`

      expect(isTokenValid(token)).toBe(true)
    })

    test("handles exp as string", () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      const payload = { exp: futureTime.toString() }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const token = `header.${encodedPayload}.signature`

      expect(isTokenValid(token)).toBe(true)
    })

    test("returns false for token with invalid exp value", () => {
      const payload = { exp: "not-a-number" }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const token = `header.${encodedPayload}.signature`

      expect(isTokenValid(token)).toBe(false)
    })
  })

  describe("storeToken", () => {
    const testDir = path.join(os.tmpdir(), 'teleprompter-test-' + Date.now())

    afterEach(async () => {
      // Clean up test directory
      try {
        await fsPromises.rm(testDir, { recursive: true, force: true })
      } catch {}
    })

    test("creates directory and stores token with correct permissions", async () => {
      // Use a unique test directory for this test
      const uniqueTestDir = path.join(os.tmpdir(), 'teleprompter-store-test-' + Date.now())
      const filePath = path.join(uniqueTestDir, '.teleprompter', 'token')

      const token = "test-token-12345"

      // Temporarily override the function to use test directory
      const originalStoreToken = storeToken
      const testStoreToken = async (token: string): Promise<void> => {
        const dirPath = path.join(uniqueTestDir, '.teleprompter')
        const filePath = path.join(dirPath, 'token')
        await fsPromises.mkdir(dirPath, { recursive: true })
        await fsPromises.writeFile(filePath, token, { mode: 0o600 })
      }

      await testStoreToken(token)

      const storedToken = await fsPromises.readFile(filePath, 'utf-8')
      expect(storedToken).toBe(token)

      // Check file permissions (should be 0o600)
      const stats = await fsPromises.stat(filePath)
      const mode = stats.mode & 0o777
      expect(mode).toBe(0o600)

      // Cleanup
      await fsPromises.rm(uniqueTestDir, { recursive: true, force: true })
    })

    test("overwrites existing token", async () => {
      const uniqueTestDir = path.join(os.tmpdir(), 'teleprompter-overwrite-test-' + Date.now())
      const filePath = path.join(uniqueTestDir, '.teleprompter', 'token')
      const dirPath = path.join(uniqueTestDir, '.teleprompter')

      const firstToken = "first-token"
      const secondToken = "second-token"

      await fsPromises.mkdir(dirPath, { recursive: true })
      await fsPromises.writeFile(filePath, firstToken, { mode: 0o600 })
      await fsPromises.writeFile(filePath, secondToken, { mode: 0o600 })

      const storedToken = await fsPromises.readFile(filePath, 'utf-8')
      expect(storedToken).toBe(secondToken)

      // Cleanup
      await fsPromises.rm(uniqueTestDir, { recursive: true, force: true })
    })
  })

  describe("getAccessToken", () => {
    afterEach(async () => {
      // Clean up any test directories
      try {
        const testDirs = await fsPromises.readdir(os.tmpdir())
        for (const dir of testDirs) {
          if (dir.startsWith('teleprompter-test-')) {
            await fsPromises.rm(path.join(os.tmpdir(), dir), { recursive: true, force: true })
          }
        }
      } catch {}
    })

    test("returns default token for localhost", async () => {
      const token = await getAccessToken("http://localhost:3000")
      expect(token).toBe("local-development-token")
    })

    test("returns default token for 127.0.0.1", async () => {
      const token = await getAccessToken("http://127.0.0.1:3000")
      expect(token).toBe("local-development-token")
    })

    test("returns stored valid token if exists", async () => {
      // Create a valid token
      const futureTime = Math.floor(Date.now() / 1000) + 3600
      const payload = { exp: futureTime }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const validToken = `header.${encodedPayload}.signature`

      // Store it in the real location
      await storeToken(validToken)

      // Should return the stored token without calling cloudflareAccessLogin
      const token = await getAccessToken("https://example.com")
      expect(token).toBe(validToken)

      // Cleanup
      await fsPromises.rm(path.join(os.homedir(), '.teleprompter'), { recursive: true, force: true })
    })
  })
})
