# Security Specification — Mother & Child Firestore Rules

## 1. Data Invariants
1. **Identity Integrity**: Users may only create or update `PublicUser`, `Post`, `Comment`, `Question`, `Appointment`, `BabyProfile`, `GrowthLog`, `Order`, and `Report` documents where the owner/author UID field strictly equals `request.auth.uid`.
2. **PII Isolation**: User email, phone, and Bangladesh delivery address details live exclusively in `/users/{userId}/private/{docId}` and are readable/writable only by `request.auth.uid == userId` or verified admins.
3. **Privilege Escalation Prevention**: Users cannot write to `/admins/{userId}` and cannot assign `moderationStatus: 'removed'` or self-verify doctors/sellers.
4. **Master Gate & Atomic Subcollections**: Comments under `/posts/{postId}/comments/{commentId}` verify the parent post exists and is not removed; growth logs under `/babies/{babyId}/growth_logs/{logId}` verify `get(/databases/$(database)/documents/babies/$(babyId)).data.parentId == request.auth.uid`.
5. **Terminal State Locking**: Once an `Order` reaches `delivered` or `cancelled`, or an `Appointment` reaches `completed` or `cancelled`, non-admin users cannot mutate status.
6. **COD Payment Integrity**: Orders with `paymentMethod == 'cod'` cannot be created with `paymentStatus == 'paid_sandbox'` by a buyer.

## 2. Dirty Dozen Adversarial Payloads
1. **Shadow Field Injection on User**: Creating `/users/u1` with `{ ..., isAdmin: true }`. Expect: `PERMISSION_DENIED`.
2. **ID Poisoning**: Creating `/posts/<1500-char-invalid-id>` with special chars `$$$`. Expect: `PERMISSION_DENIED`.
3. **Spoofed Author**: Creating `/posts/p1` with `authorId: "other_user"`. Expect: `PERMISSION_DENIED`.
4. **Unverified Email Write**: Creating `/posts/p1` with `request.auth.token.email_verified == false`. Expect: `PERMISSION_DENIED`.
5. **PII Read Leak**: Non-owner reading `/users/u2/private/info`. Expect: `PERMISSION_DENIED`.
6. **Child Growth Log Tampering**: Non-parent writing to `/babies/b1/growth_logs/g1`. Expect: `PERMISSION_DENIED`.
7. **Orphaned Comment**: Creating `/posts/nonexistent/comments/c1`. Expect: `PERMISSION_DENIED`.
8. **Client-Spoofed Timestamp**: Creating `/posts/p1` with backdated `createdAt`. Expect: `PERMISSION_DENIED`.
9. **Terminal Appointment Reopen**: Buyer updating `status` from `completed` back to `confirmed`. Expect: `PERMISSION_DENIED`.
10. **COD Paid Bypass**: Buyer creating `/orders/o1` with `paymentMethod: 'cod', paymentStatus: 'paid_sandbox'`. Expect: `PERMISSION_DENIED`.
11. **Report Queue Scraping**: Non-admin listing `/reports`. Expect: `PERMISSION_DENIED`.
12. **Admin Escalation**: Regular user creating `/admins/u1`. Expect: `PERMISSION_DENIED`.
