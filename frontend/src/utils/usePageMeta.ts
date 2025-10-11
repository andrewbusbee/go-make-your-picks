import { useEffect } from 'react';

interface PageMetaOptions {
  title?: string;
  description?: string;
}

/**
 * Custom hook to update page title and meta tags dynamically
 */
export function usePageMeta(options: PageMetaOptions) {
  useEffect(() => {
    // Update document title
    if (options.title) {
      document.title = options.title;
    }

    // Update meta description
    if (options.description) {
      updateMetaTag('name', 'description', options.description);
    }

    // Update Open Graph tags
    if (options.title) {
      updateMetaTag('property', 'og:title', options.title);
    }
    if (options.description) {
      updateMetaTag('property', 'og:description', options.description);
    }

    // Update Twitter Card tags
    if (options.title) {
      updateMetaTag('name', 'twitter:title', options.title);
    }
    if (options.description) {
      updateMetaTag('name', 'twitter:description', options.description);
    }
  }, [options.title, options.description]);
}

/**
 * Helper function to update or create a meta tag
 */
function updateMetaTag(
  attributeName: 'name' | 'property',
  attributeValue: string,
  content: string
) {
  let element = document.querySelector(
    `meta[${attributeName}="${attributeValue}"]`
  ) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.content = content;
}

