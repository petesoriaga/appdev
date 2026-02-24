# SnapQueue Android Studio Version (Java + Firebase)

This folder contains a standalone Android Studio project that mirrors the existing web system workflow and migrates backend persistence to Firebase.

## Implemented Modules
- Authentication (Login/Register) with Firebase Authentication.
- Reservation creation and tracking with Firestore.
- Payment submission with image upload to Firebase Storage.
- User dashboard reservation status tracking.
- Admin dashboard reservation approval/rejection.

## Firebase Data Model
- `users/{uid}`: `{ uid, fullName, email, role }`
- `reservations/{reservationId}`: `{ userId, eventType, eventDate, location, notes, status }`
- `payments/{paymentId}`: `{ reservationId, userId, amount, proofUrl, status }`
- `galleryItems/{id}`
- `chatbotQAs/{id}`
- `contactMessages/{id}`

## Required Setup
1. Open `android_studio_version/` in Android Studio.
2. Add a valid `google-services.json` file under `android_studio_version/app/`.
3. Create Firebase Authentication (Email/Password), Firestore, and Storage in your Firebase project.
4. Run the app.

## Role Handling
- Default registration assigns role `user`.
- Create or edit an admin document in Firestore with `role: "admin"` to access admin dashboard.

## Notes
- The original web project files remain untouched.
- UI styling uses the same dark/gold palette and flow to stay aligned with the website behavior.
