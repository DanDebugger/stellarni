# LocalStorage and Dashboard Expansion Plan

## Overview
Enhance the Stellarni frontend by integrating real Freighter Wallet authentication into the login flow, persisting user sessions via `localStorage` so refreshes don't reset the app, and expanding the Student/Employer dashboards with rich profile and evaluation features.

## Project Type
WEB

## Success Criteria
- [ ] Application state (view) is preserved on refresh using `localStorage`.
- [ ] `AuthPage` strictly uses Freighter Wallet for logging in.
- [ ] Student dashboard features an editable profile (Name, Job Preference, Bio).
- [ ] Employer dashboard features an Evaluation Form (Rating, Comments) before reward issuance.
- [ ] Wallet connection state integrates cleanly with the global state.

## Tech Stack
- React Hooks (`usePersistentState`, `useEffect`)
- Freighter API
- Tailwind CSS

## File Structure
```
└── frontend/
    ├── src/
    │   ├── hooks/
    │   │   ├── useFreighter.ts (Modified)
    │   │   └── usePersistentState.ts (New)
    │   ├── pages/
    │   │   ├── AuthPage.tsx (Modified)
    │   │   ├── EmployerDashboard.tsx (Modified)
    │   │   └── StudentDashboard.tsx (Modified)
    │   └── App.tsx (Modified)
```

## Task Breakdown

### 1. Global State Persistence
- **Agent**: `frontend-specialist`
- **Skill**: `react-best-practices`
- **Priority**: P1
- **Dependencies**: None
- **INPUT**: `App.tsx`, `usePersistentState.ts`
- **OUTPUT**: Custom hook and updated App routing to persist state.
- **VERIFY**: Refreshing the page keeps the user on their selected dashboard.

### 2. Freighter Auth Integration
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Priority**: P1
- **Dependencies**: Task 1
- **INPUT**: `AuthPage.tsx`
- **OUTPUT**: AuthPage now requires Freighter connection instead of email/password.
- **VERIFY**: Clicking "Connect Freighter" triggers the wallet and logs the user in.

### 3. Student Profile Expansion
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Priority**: P2
- **Dependencies**: None
- **INPUT**: `StudentDashboard.tsx`
- **OUTPUT**: Profile form for Name, Job Preferences, and Bio.
- **VERIFY**: Data saves to localStorage and persists on refresh.

### 4. Employer Evaluation Module
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Priority**: P2
- **Dependencies**: None
- **INPUT**: `EmployerDashboard.tsx`
- **OUTPUT**: Evaluation form appearing after successful hash verification.
- **VERIFY**: Issuing reward requires a filled-out evaluation.

## Phase X: Verification
- [ ] Lint: `npm run lint` passes
- [ ] Build: `npm run build` succeeds
- [ ] LocalStorage maintains state correctly
- [ ] No purple/violet hex codes used
