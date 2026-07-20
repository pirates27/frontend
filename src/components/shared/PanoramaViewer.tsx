import React, { useState, useEffect } from 'react';
import { AlertCircle, EyeOff, Maximize } from 'lucide-react';

interface PanoramaViewerProps {
  url?: string;
}

export const PanoramaViewer: React.FC<PanoramaViewerProps> = React.memo(({ url }) => {
  const [safeUrl, setSafeUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedUrl, setExtractedUrl] = useState<string>('');

  useEffect(() => {
    let currentUrl = url || '';
    if (currentUrl && typeof currentUrl === 'string' && currentUrl.trim().toLowerCase().startsWith('<iframe')) {
      const match = currentUrl.match(/src\s*=\s*["']([^"']+)["']/i);
      if (match && match[1]) {
        currentUrl = match[1];
      }
    }
    setExtractedUrl(currentUrl);

    setErrorMsg(null);
    setSafeUrl(null);

    if (!currentUrl) return;

    try {
      const parsedUrl = new URL(currentUrl);
      const hostname = parsedUrl.hostname.toLowerCase();

      const isMomento = hostname.includes('momento360.com');
      const isKuula = hostname.includes('kuula.co');
      const is360PhotoCam = hostname.includes('360photocam.com');
      const isGoogleMaps = hostname.includes('google.com') || hostname.includes('google.co.in');

      if (!isMomento && !isKuula && !is360PhotoCam && !isGoogleMaps) {
        setErrorMsg('This 360° provider is not officially supported. We support Google Maps, Momento360, Kuula, and 360PhotoCam.');
        return;
      }

      let embedUrl = currentUrl;

      if (isMomento && !currentUrl.includes('/e/')) {
        setErrorMsg('Invalid Momento360 format. Please copy the embed or share link of the form: https://momento360.com/e/u/...');
        return;
      }

      if (isGoogleMaps && !currentUrl.includes('/maps/')) {
        setErrorMsg('Invalid Google Maps format. Please provide a Google Maps street view embed URL.');
        return;
      }

      // Add smooth autorotation if possible
      if (!embedUrl.includes('?')) {
        embedUrl += '?autoplay=1&autorotate=1&autorotation=1';
      } else {
        embedUrl += '&autoplay=1&autorotate=1&autorotation=1';
      }

      setSafeUrl(embedUrl);
    } catch (e) {
      setErrorMsg('The provided virtual tour link is not a valid URL.');
    }
  }, [url]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden shadow-lg border border-slate-800 flex flex-col">
      {errorMsg ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-300">
          <AlertCircle className="w-12 h-12 text-rose-500 mb-4 animate-pulse" />
          <h4 className="text-lg font-semibold text-white mb-2">Virtual Tour Load Error</h4>
          <p className="text-sm text-slate-400 max-w-sm mb-6">{errorMsg}</p>
          {extractedUrl && (
            <a href={extractedUrl} target="_blank" rel="noreferrer" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-md transition-all">
              Open Tour in New Tab
            </a>
          )}
        </div>
      ) : safeUrl ? (
        <>
          {/* Iframe perfectly filling the container */}
          <div className="absolute inset-0 w-full h-full z-10 overflow-hidden">
            <iframe
              src={safeUrl}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
            </iframe>
          </div>

        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <EyeOff className="w-16 h-16 text-slate-600 mb-4" />
          <h4 className="text-base font-semibold text-slate-200 mb-1">No Virtual Tour Uploaded</h4>
          <p className="text-xs text-slate-500 max-w-xs">360° panorama views are verified by AI for boundary overlaps and duplicate claims.</p>
        </div>
      )}
    </div>
  );
});
