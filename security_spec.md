# Security Specification & Threat Model - Pintu Offline Backup System

This specification outlines the Attribute-Based Access Control (ABAC) and security invariants applied to the Firestore collections in Pintu Offline to secure user profile data, historical chat backups, and file logs.

---

## 1. Core Data Invariants

1. **User Profiles (`/users/{userId}`)**:
   - A user profile can only be created or modified by the user who owns it (`request.auth.uid == userId`).
   - The user's registered email must match `request.auth.token.email`.
   - The email must be verified (`request.auth.token.email_verified == true`).
   - Immutable fields: `createdAt` cannot be modified after creation.
   - All string values must be bounded (e.g., `displayName` and `email` <= 100 characters).

2. **Backup Chats (`/chats/{chatId}`)**:
   - Only authenticated owners can create or modify their own backup chat heads (`request.auth.uid == resource.data.ownerId`).
   - Immutable fields: `ownerId` and `peerId` cannot be changed post-creation.
   - Document ID poisoning prevention: `chatId` must be a valid alphanumeric string matching `isValidId()`.

3. **Message Backups (`/chats/{chatId}/messages/{messageId}`)**:
   - Messages can only be stored inside a parent Chat document that belongs to the authenticated user.
   - The `senderId` must match the actual message initiator or owner.
   - Text messages cannot exceed 5000 characters to prevent Denial of Wallet resource attacks.
   - Message timestamps must be validated against `request.time` or stored as positive Unix epoch integers.

4. **File Transfer Register (`/files/{fileId}`)**:
   - File records are private and visible only to the authenticated initiator (`request.auth.uid == resource.data.ownerId`).
   - `fileName` must not exceed 255 characters.
   - `progress` must be a positive integer in the interval `[0, 100]`.

---

## 2. The "Dirty Dozen" Malicious Payloads (TDD Test Vectors)

Here are twelve highly dangerous payloads designed to attack the database. The security rules are configured to reject all of these payloads with `PERMISSION_DENIED`.

### Attack Pillar 1: Identity Spoofing & Privilege Escalation
* **Payload 1 (User Profile Takeover)**: Attempting to create or update a profile for `userId_abc` while logged in as `userId_xyz`.
* **Payload 2 (Unverified Email Spoofing)**: Attempting to register a profile with a spoofed email while `email_verified == false` on the auth token.
* **Payload 3 (Email Claim Discrepancy)**: Authenticated as `user1@example.com` but attempting to save `user2@example.com` into the database profile.

### Attack Pillar 2: Path & ID Poisoning
* **Payload 4 (Junk Character ID Attack)**: Injecting a 2KB junk character string as a document ID to crash queries or cause resource exhaustion.
* **Payload 5 (Imposter Chat Injection)**: Attempting to write a chat backup where the `ownerId` field is set to a victim's UID to read or pollute their inbox.

### Attack Pillar 3: Schema Violations & Value Poisoning
* **Payload 6 (Oversized Payload Exhaustion)**: Sending a message with a 10MB string to deplete Firestore space or trigger out-of-memory states.
* **Payload 7 (Invalid Type Pollution)**: Saving `progress: "halfway"` (a string) instead of an integer on a file transfer.
* **Payload 8 (Out-of-Bounds Status Hijack)**: Setting status on a message to an unapproved custom enum state like `"super-sent"`.

### Attack Pillar 4: Immutability Breaches & Time Spoofing
* **Payload 9 (Date-Spoofing / Backdating)**: Overwriting `createdAt` to a historical date to spoof system logs or status timing.
* **Payload 10 (Relational Owner Swap)**: Editing an existing backup chat to change `ownerId` from `attackerId` to `victimId`.
* **Payload 11 (File Progress Integer Bypass)**: Writing `progress: 999` to exceed the maximum percentage limit of 100.

### Attack Pillar 5: Query Scrapes & Blanket Reads
* **Payload 12 (Blanket Query Scrape)**: An authenticated user requesting a full table scan (`getDocs` or `onSnapshot`) of `/chats` without specifying their ownerId constraint in the query.

---

## 3. Test Runner Design

Security tests can be formulated to run using the Firestore emulator:

```typescript
// firestore.rules.test.ts
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

describe('Pintu Offline Fortress Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'charismatic-diorama-dq7jp',
      firestore: {
        rules: require('fs').readFileSync('firestore.rules', 'utf8')
      }
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('blocks Payload 1: Unauthorized Profile Write', async () => {
    const unauthedDb = testEnv.authenticatedContext('attacker').firestore();
    const targetRef = doc(unauthedDb, 'users', 'victim');
    await expect(setDoc(targetRef, { displayName: 'Hacker', email: 'victim@example.com' }))
      .rejects.toThrow();
  });
});
```
