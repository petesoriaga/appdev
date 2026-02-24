# System Analysis

## Existing File Roles

- `index.html`: Landing page, portfolio preview, contact section, chatbot widget.
- `gallery.html`: Full gallery with category filter and chatbot widget.
- `login.html`: Sign in/sign up UI and auth flow via `API.auth` calls.
- `reservation.html`: Reservation form and staged local save (`tempReservation`) before payment.
- `payment.html`: Payment submission flow tied to reservation data.
- `dashboard.html`: User-facing tracking and reservation management UI.
- `admin_dashboard.html`: Admin workflow for reservation approval, history, metrics, and gallery management.
- `chatbot.html`: Standalone chatbot behavior and Q&A localStorage workflow.

## Current Workflow (Before Integration)

1. User visits landing or gallery page.
2. User signs in/up from `login.html`.
3. User creates reservation from `reservation.html`.
4. Reservation data is stored in browser localStorage and moved to `payment.html`.
5. Payment proof is submitted and user is redirected to dashboard.
6. Admin dashboard reads localStorage to manage reservation status.
7. Chatbot reads/writes Q&A in localStorage.

## Integrated Target Workflow (Node + Mongo + React)

1. Frontend React pages submit auth/reservation/payment/contact requests to backend APIs.
2. Express controllers apply business logic and validation.
3. MongoDB stores users, reservations, payments, gallery items, chatbot Q&A, and contacts.
4. Admin updates reservation/payment/chatbot content through secured endpoints.
5. Frontend re-renders from API data (single source of truth), replacing localStorage-only persistence.

## Core Entities

- `User`
- `Reservation`
- `Payment`
- `GalleryItem`
- `ChatQA`
- `ContactMessage`

## API Requirements Mapped from Existing UI

- Auth: signup, signin, current user
- Reservation: create/list/detail/status update
- Payment: create/list/status verify
- Gallery: list/create/update/delete
- Chatbot Q&A: list/create/update/delete
- Contact: create/list/status update
