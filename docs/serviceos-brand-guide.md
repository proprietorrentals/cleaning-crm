# ServiceOS Brand Guide

## Approved Components And Assets
- UI logo components:
  - `src/components/serviceos-logo.tsx`
  - `ServiceOSLogo`
  - `ServiceOSIcon`
  - `ServiceOSWordmark`
- Canonical icon asset:
  - `public/icon.svg`
- App/platform icon outputs:
  - `public/icon-192.png`
  - `public/icon-512.png`
  - `public/apple-touch-icon.png`

## Logo Variants And Intended Use
- `ServiceOSLogo` `variant="horizontal"`:
  - Primary choice for headers and top navigation.
- `ServiceOSLogo` `size="compact-sidebar"`:
  - Sidebars, narrow rail headers, dense portal navigation.
- `ServiceOSLogo` `variant="icon-only"`:
  - Icon-only contexts, app chrome, and icon previews.
- `ServiceOSLogo` `variant="stacked"`:
  - Hero/auth sections where vertical space is available.
- `ServiceOSWordmark`:
  - Text-only branding where icon is already nearby.
- `ServiceOSIcon`:
  - Standalone mark where no wordmark should appear.

## Minimum Clear Space
- Maintain clear space equal to at least `0.5x` icon height on all sides.
- In dense mobile headers, never reduce below `0.25x` icon height.

## Minimum Sizes
- Icon-only:
  - Digital minimum: `16px`.
  - Recommended app/UI baseline: `24px`.
- Horizontal logo:
  - Digital minimum: `120px` total width equivalent.
- Stacked logo:
  - Digital minimum: `96px` total width equivalent.

## Light And Dark Surface Rules
- Light surfaces:
  - Use default `surface="light"`.
- Dark surfaces:
  - Use `surface="dark"` so wordmark and supporting text stay legible.
- Never place logo text on low-contrast backgrounds without a contrasting container.

## Icon-Only Usage
- Use icon-only in favicon, app icon, PWA icon, and constrained UI contexts.
- Icon-only metadata and PWA source should resolve to `public/icon.svg` first.

## Wordmark Usage
- Wordmark text is live text from `ServiceOSWordmark`.
- Do not reintroduce baked-text SVG logo files.
- Keep typographic sizing consistent with `size` tokens from `ServiceOSLogo`.

## Tagline Usage
- Approved tagline text: `Operate with Confidence.`
- Use tagline only when space permits and where hierarchy supports it.
- Avoid repeating tagline in adjacent elements when logo already renders it.

## Prohibited Treatments
- Stretching logo or icon non-uniformly.
- Cropping any part of logo mark or wordmark.
- Duplicate logo text near rendered wordmark.
- Duplicate tagline near rendered tagline.
- Unapproved colors replacing the brand mark palette.
- Low-contrast placement that reduces readability.
- Enlarging raster icons beyond source quality.

## Favicon, PWA, Email, Report, Social Guidance
- Favicon/app metadata:
  - Use `public/icon.svg` as canonical icon source.
- PWA:
  - Keep `public/icon-192.png`, `public/icon-512.png`, and `public/apple-touch-icon.png` in sync with icon mark.
- Email templates:
  - Prefer icon-only plus live `ServiceOS` text where practical.
- Reports/PDFs:
  - Keep branding to a single logo presentation per header.
  - Avoid duplicate wordmark/tagline in the same report header block.
- Social images/Open Graph:
  - Use icon or brand layout sourced from approved components/assets only.
