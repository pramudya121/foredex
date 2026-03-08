import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description?: string;
}

export function SEOHead({ title, description }: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title === 'FOREDEX' ? 'FOREDEX — Decentralized Exchange on Nexus' : `${title} | FOREDEX`;
    document.title = fullTitle;

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);

  return null;
}
