# AI Rules for ArtriXa Community Application

This document outlines the core technologies used in this project and provides guidelines for using specific libraries and tools.

## Tech Stack Overview

*   **Frontend Framework**: React
*   **Language**: TypeScript
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS for all styling, with custom utility classes defined in `src/index.css`.
*   **UI Components**: shadcn/ui, built on Radix UI primitives, for all common UI elements.
*   **Routing**: React Router DOM for client-side navigation.
*   **Data Fetching & State Management**: React Query (`@tanstack/react-query`) for server state management and data fetching.
*   **Backend & Database**: Supabase for authentication, database, and storage.
*   **Icons**: Lucide React for all icons.
*   **Form Handling**: React Hook Form, often paired with Zod for validation.
*   **Date Manipulation**: `date-fns` for all date formatting and operations.
*   **Toast Notifications**: `sonner` for simple toasts and a custom `useToast` hook (built on `@radix-ui/react-toast`) for more interactive notifications.

## Library Usage Rules

To maintain consistency and leverage the existing ecosystem, please adhere to the following rules when making changes or adding new features:

*   **UI Components**:
    *   Always prioritize using existing shadcn/ui components (e.g., `Button`, `Input`, `Card`, `Dialog`, `Select`).
    *   If a specific component is not available in shadcn/ui or requires significant customization, create a new component in `src/components/` that wraps or extends shadcn/ui primitives, rather than modifying the original shadcn/ui files.
*   **Styling**:
    *   All styling must be done using Tailwind CSS classes. Avoid writing custom CSS in `.css` files unless it's for global styles or animations already defined in `src/index.css`.
    *   Use the `cn` utility function from `src/lib/utils.ts` for conditionally combining Tailwind classes.
*   **Routing**:
    *   Use `react-router-dom` for all client-side navigation.
    *   All top-level routes should be defined in `src/App.tsx`.
*   **Data Fetching**:
    *   For fetching and managing server-side data, always use `@tanstack/react-query`.
*   **Database Interactions**:
    *   Interact with the Supabase backend using the `supabase` client instance from `src/integrations/supabase/client.ts`.
*   **Icons**:
    *   Use icons from the `lucide-react` library.
*   **Forms**:
    *   Implement forms using `react-hook-form` for state management, validation, and submission.
    *   For schema validation, use `zod` in conjunction with `@hookform/resolvers`.
*   **Date Handling**:
    *   Use `date-fns` for any date formatting, parsing, or manipulation tasks.
*   **Notifications**:
    *   For simple, non-blocking notifications (e.g., "Success!"), use `sonner`.
    *   For toasts that require user interaction or have a longer display time, use the custom `useToast` hook from `src/hooks/use-toast.ts`.
*   **Rich Text Editor**:
    *   When rich text input is required, use the `RichTextEditor` component located at `src/components/editor/RichTextEditor.tsx`. Do not introduce new rich text editor libraries.