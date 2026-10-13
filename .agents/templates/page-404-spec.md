# Branded 404 page requirements

- Correct server response HTTP 404 for missing public route (not 200 disguised as error).
- Clear headline; short, human copy; prominent link to safe home, optional search/back.
- Visual tone consistent with app; playful subtle entrance if supported and reduced-motion fallback.
- Supports keyboard, mobile, screen reader landmarks, dark mode if present.
- For private/missing resource, avoid confirming existence or leaking metadata; consider consistent unauthorized/not-found behavior.
- No broken navigation or tracking loaded outside consent rules.
