/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Document Picture-in-Picture (Chromium 116+, p.ej. Brave): no esta en
// lib.dom de TypeScript todavia, se declara a mano.
interface DocumentPictureInPictureWindow extends Window {
  document: Document;
}

interface DocumentPictureInPicture {
  window: DocumentPictureInPictureWindow | null;
  requestWindow(options?: {
    width?: number;
    height?: number;
    disallowReturnToOpener?: boolean;
  }): Promise<DocumentPictureInPictureWindow>;
}

interface Window {
  documentPictureInPicture?: DocumentPictureInPicture;
}
