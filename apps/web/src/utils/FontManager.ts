/**
 * 🎨 Font Management System
 * 
 * Features:
 * - Google Fonts integration
 * - Custom font upload
 * - Font preview and caching
 * - Font categories and organization
 */

export interface FontFamily {
  name: string;
  category: 'serif' | 'sans-serif' | 'script' | 'display' | 'monospace' | 'handwriting';
  source: 'google' | 'custom' | 'system';
  url?: string;
  weights: number[];
  styles: string[];
  loaded?: boolean;
  preview?: string;
}

export interface FontManager {
  loadFont: (font: FontFamily) => Promise<void>;
  getAvailableFonts: () => FontFamily[];
  preloadFont: (fontName: string) => Promise<void>;
  isFontLoaded: (fontName: string) => boolean;
  getFontPreview: (fontName: string, text?: string) => string;
}

// Popular Google Fonts organized by category
const GOOGLE_FONTS: FontFamily[] = [
  // Serif Fonts
  {
    name: 'Playfair Display',
    category: 'serif',
    source: 'google',
    weights: [400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    preview: 'Elegant serif for headings'
  },
  {
    name: 'Merriweather',
    category: 'serif',
    source: 'google',
    weights: [300, 400, 700, 900],
    styles: ['normal', 'italic'],
    preview: 'Readable serif for body text'
  },
  {
    name: 'Lora',
    category: 'serif',
    source: 'google',
    weights: [400, 500, 600, 700],
    styles: ['normal', 'italic'],
    preview: 'Modern serif with character'
  },
  
  // Sans-serif Fonts
  {
    name: 'Inter',
    category: 'sans-serif',
    source: 'google',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    preview: 'Modern, clean sans-serif'
  },
  {
    name: 'Poppins',
    category: 'sans-serif',
    source: 'google',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    preview: 'Friendly, rounded sans-serif'
  },
  {
    name: 'Roboto',
    category: 'sans-serif',
    source: 'google',
    weights: [100, 300, 400, 500, 700, 900],
    styles: ['normal', 'italic'],
    preview: 'Google\'s signature font'
  },
  {
    name: 'Open Sans',
    category: 'sans-serif',
    source: 'google',
    weights: [300, 400, 600, 700, 800],
    styles: ['normal', 'italic'],
    preview: 'Humanist sans-serif'
  },
  
  // Display Fonts
  {
    name: 'Montserrat',
    category: 'display',
    source: 'google',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    preview: 'Geometric display font'
  },
  {
    name: 'Oswald',
    category: 'display',
    source: 'google',
    weights: [200, 300, 400, 500, 600, 700],
    styles: ['normal'],
    preview: 'Condensed display font'
  },
  {
    name: 'Bebas Neue',
    category: 'display',
    source: 'google',
    weights: [400],
    styles: ['normal'],
    preview: 'Bold, condensed display'
  },
  
  // Script Fonts
  {
    name: 'Dancing Script',
    category: 'script',
    source: 'google',
    weights: [400, 500, 600, 700],
    styles: ['normal'],
    preview: 'Elegant script font'
  },
  {
    name: 'Pacifico',
    category: 'script',
    source: 'google',
    weights: [400],
    styles: ['normal'],
    preview: 'Casual script font'
  },
  {
    name: 'Great Vibes',
    category: 'script',
    source: 'google',
    weights: [400],
    styles: ['normal'],
    preview: 'Formal script font'
  },
  
  // Handwriting Fonts
  {
    name: 'Caveat',
    category: 'handwriting',
    source: 'google',
    weights: [400, 500, 600, 700],
    styles: ['normal'],
    preview: 'Casual handwriting'
  },
  {
    name: 'Kalam',
    category: 'handwriting',
    source: 'google',
    weights: [300, 400, 700],
    styles: ['normal'],
    preview: 'Friendly handwriting'
  },
  
  // Monospace Fonts
  {
    name: 'Source Code Pro',
    category: 'monospace',
    source: 'google',
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    styles: ['normal', 'italic'],
    preview: 'Professional monospace'
  },
  {
    name: 'Fira Code',
    category: 'monospace',
    source: 'google',
    weights: [300, 400, 500, 600, 700],
    styles: ['normal'],
    preview: 'Programming font with ligatures'
  }
];

// System fonts
const SYSTEM_FONTS: FontFamily[] = [
  {
    name: 'Arial',
    category: 'sans-serif',
    source: 'system',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    preview: 'Classic system sans-serif'
  },
  {
    name: 'Times New Roman',
    category: 'serif',
    source: 'system',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    preview: 'Classic system serif'
  },
  {
    name: 'Courier New',
    category: 'monospace',
    source: 'system',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    preview: 'Classic system monospace'
  },
  {
    name: 'Georgia',
    category: 'serif',
    source: 'system',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    preview: 'Web-safe serif font'
  },
  {
    name: 'Verdana',
    category: 'sans-serif',
    source: 'system',
    weights: [400, 700],
    styles: ['normal', 'italic'],
    preview: 'Web-safe sans-serif font'
  }
];

class FontManagerImpl implements FontManager {
  private loadedFonts: Set<string> = new Set();
  private fontCache: Map<string, FontFamily> = new Map();
  private googleFontsLoaded: Set<string> = new Set();

  constructor() {
    this.initializeFontCache();
  }

  private initializeFontCache(): void {
    // Add Google Fonts to cache
    GOOGLE_FONTS.forEach(font => {
      this.fontCache.set(font.name.toLowerCase(), font);
    });

    // Add system fonts to cache
    SYSTEM_FONTS.forEach(font => {
      this.fontCache.set(font.name.toLowerCase(), font);
      this.loadedFonts.add(font.name.toLowerCase());
    });
  }

  async loadFont(font: FontFamily): Promise<void> {
    const fontKey = font.name.toLowerCase();
    
    if (this.loadedFonts.has(fontKey)) {
      return;
    }

    try {
      if (font.source === 'google') {
        await this.loadGoogleFont(font);
      } else if (font.source === 'custom' && font.url) {
        await this.loadCustomFont(font);
      }
      
      this.loadedFonts.add(fontKey);
      font.loaded = true;
      console.log(`🎨 Font loaded: ${font.name}`);
    } catch (error) {
      console.error(`❌ Failed to load font ${font.name}:`, error);
      throw error;
    }
  }

  private async loadGoogleFont(font: FontFamily): Promise<void> {
    const fontKey = font.name.toLowerCase();
    
    if (this.googleFontsLoaded.has(fontKey)) {
      return;
    }

    // Create Google Fonts URL
    const weights = font.weights.join(';');
    const styles = font.styles.includes('italic') ? 'ital,' : '';
    const fontUrl = `https://fonts.googleapis.com/css2?family=${font.name.replace(/\s+/g, '+')}:wght@${weights}${styles ? '&' + styles : ''}&display=swap`;

    // Load font via link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.crossOrigin = 'anonymous';
    
    document.head.appendChild(link);

    // Wait for font to load
    await new Promise<void>((resolve, reject) => {
      link.onload = () => {
        this.googleFontsLoaded.add(fontKey);
        resolve();
      };
      link.onerror = () => {
        document.head.removeChild(link);
        reject(new Error(`Failed to load Google Font: ${font.name}`));
      };
    });
  }

  private async loadCustomFont(font: FontFamily): Promise<void> {
    if (!font.url) {
      throw new Error('Custom font URL is required');
    }

    // Create @font-face rule
    const fontFace = new FontFace(font.name, `url(${font.url})`);
    
    try {
      const loadedFont = await fontFace.load();
      document.fonts.add(loadedFont);
      console.log(`🎨 Custom font loaded: ${font.name}`);
    } catch (error) {
      throw new Error(`Failed to load custom font: ${font.name}`);
    }
  }

  getAvailableFonts(): FontFamily[] {
    return Array.from(this.fontCache.values());
  }

  async preloadFont(fontName: string): Promise<void> {
    const font = this.fontCache.get(fontName.toLowerCase());
    if (font) {
      await this.loadFont(font);
    }
  }

  isFontLoaded(fontName: string): boolean {
    return this.loadedFonts.has(fontName.toLowerCase());
  }

  getFontPreview(fontName: string, text: string = 'The quick brown fox'): string {
    const font = this.fontCache.get(fontName.toLowerCase());
    if (!font) {
      return text;
    }

    // Create preview with font family
    return `<span style="font-family: '${font.name}', ${font.category === 'serif' ? 'serif' : font.category === 'monospace' ? 'monospace' : 'sans-serif'}; font-weight: 400;">${text}</span>`;
  }

  // Utility methods
  getFontsByCategory(category: FontFamily['category']): FontFamily[] {
    return this.getAvailableFonts().filter(font => font.category === category);
  }

  searchFonts(query: string): FontFamily[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAvailableFonts().filter(font => 
      font.name.toLowerCase().includes(lowercaseQuery) ||
      font.category.includes(lowercaseQuery) ||
      (font.preview && font.preview.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Preload popular fonts for better performance
  async preloadPopularFonts(): Promise<void> {
    const popularFonts = ['Inter', 'Poppins', 'Roboto', 'Montserrat', 'Playfair Display'];
    
    const loadPromises = popularFonts.map(fontName => 
      this.preloadFont(fontName).catch(error => 
        console.warn(`⚠️ Failed to preload font ${fontName}:`, error)
      )
    );

    await Promise.all(loadPromises);
    console.log('🎨 Popular fonts preloaded');
  }
}

// Export singleton instance
export const fontManager = new FontManagerImpl();

// Auto-preload popular fonts on initialization
fontManager.preloadPopularFonts().catch(console.error);
