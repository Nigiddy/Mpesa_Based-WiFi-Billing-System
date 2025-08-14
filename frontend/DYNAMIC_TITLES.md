# Dynamic Browser Tab Title System

This project now includes a comprehensive dynamic browser tab title system that automatically updates page titles based on routes and content.

## Features

- **Automatic Route-based Titles**: Titles automatically change based on the current route
- **Dynamic Content Titles**: Support for titles that change based on fetched data
- **SSR Compatible**: Works with both server-side rendering and client-side navigation
- **Easy to Use**: Simple hook-based API for setting titles in any component
- **SEO Optimized**: Proper metadata handling for search engines

## How It Works

### 1. Client-Side Dynamic Titles

Use the `useDynamicTitle` hook in client components:

```tsx
import { useDynamicTitle } from "@/hooks/use-dynamic-title"

export default function MyPage() {
  useDynamicTitle("My Page Title")
  
  return (
    <div>
      {/* Your page content */}
    </div>
  )
}
```

### 2. Server-Side Metadata

For server components or static pages, use the metadata system:

```tsx
import { Metadata } from 'next'
import { generatePageMetadata } from '@/lib/metadata'

export const metadata: Metadata = generatePageMetadata(
  'Page Title',
  'Page description for SEO'
)
```

### 3. Predefined Metadata

Use predefined metadata for common pages:

```tsx
import { aboutMetadata, adminMetadata } from '@/lib/metadata'

export const metadata: Metadata = aboutMetadata
```

## Available Hooks and Utilities

### `useDynamicTitle(title?: string | (() => string))`

Updates the document title dynamically in client components.

**Parameters:**
- `title`: Optional title string or function that returns a title

**Returns:**
- `title`: Current title string
- `setDataTitle`: Function to update dynamic data-based title

**Example:**
```tsx
const { title, setDataTitle } = useDynamicTitle("Custom Title")

// Update title based on fetched data
useEffect(() => {
  if (productName) {
    setDataTitle(productName)
  }
}, [productName])
```

### `generateMetadata(options?: PageMetadataOptions)`

Generates complete metadata object for pages.

**Options:**
- `title`: Page title
- `description`: Page description
- `keywords`: SEO keywords
- `image`: Open Graph image
- `noIndex`: Whether to prevent search engine indexing

### `generatePageMetadata(pageTitle, description?, options?)`

Convenience function for generating page metadata with automatic project name suffix.

## Route-based Title Mapping

The system automatically sets titles based on routes:

- `/` → "Home - Qonnect"
- `/about` → "About Us - Qonnect"
- `/admin` → "Admin - Qonnect"
- `/support` → "Support - Qonnect"
- `/packages` → "Packages - Qonnect"
- `/products/[id]` → "[ProductName] - Qonnect" (dynamic)

## Dynamic Product Titles

For product pages, the system supports dynamic titles based on fetched data:

```tsx
const { title, setDataTitle } = useDynamicTitle()

useEffect(() => {
  const fetchProduct = async () => {
    const product = await api.getProduct(id)
    setDataTitle(product.name)
  }
  fetchProduct()
}, [id])
```

## SEO and Social Media

The metadata system automatically generates:

- Open Graph tags for social media sharing
- Twitter Card metadata
- Proper robots meta tags
- Keyword optimization

## Best Practices

1. **Use `useDynamicTitle` for client components** that need dynamic titles
2. **Use metadata exports for server components** and static pages
3. **Keep titles concise** - under 60 characters for optimal display
4. **Include the project name** in titles for brand consistency
5. **Use descriptive titles** that reflect the page content

## Migration from Old System

If you were using the old `usePageTitle` hook:

**Before:**
```tsx
const { TitleHead } = usePageTitle()
return (
  <>
    <TitleHead />
    {/* content */}
  </>
)
```

**After:**
```tsx
useDynamicTitle("Page Title")
return (
  <>
    {/* content */}
  </>
)
```

## Extending the System

### Adding New Routes

Update the `useDynamicTitle` hook to include new route patterns:

```tsx
if (pathname.startsWith("/new-route")) {
  return `New Route - ${PROJECT_NAME}`
}
```

### Custom Title Formats

Modify the title generation logic in the hook:

```tsx
const routeTitle = useMemo(() => {
  // Your custom logic here
  return customTitle
}, [pathname, explicitTitle, dataTitle])
```

### Additional Metadata

Extend the `PageMetadataOptions` interface in `lib/metadata.ts`:

```tsx
export interface PageMetadataOptions {
  // ... existing options
  customField?: string
}
```

## Troubleshooting

### Title Not Updating

1. Ensure the hook is called at the top level of your component
2. Check that the component is a client component (`"use client"`)
3. Verify the route pattern is correctly matched

### SSR Issues

1. Use metadata exports for server components
2. Ensure proper Next.js 13+ App Router setup
3. Check that metadata is exported from the correct file

### Performance

1. The hook only updates when necessary
2. Route changes trigger automatic title updates
3. Data-based titles are cached to prevent unnecessary re-renders
