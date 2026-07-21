import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, EyeOff, Maximize } from 'lucide-react';
import { Viewer } from '@photo-sphere-viewer/core';
import '@photo-sphere-viewer/core/index.css';

interface PanoramaViewerProps {
  url?: string;
}

export const PanoramaViewer: React.FC<PanoramaViewerProps> = React.memo(({ url }) => {
  const [safeUrl, setSafeUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedUrl, setExtractedUrl] = useState<string>('');
  const [isNativeImage, setIsNativeImage] = useState<boolean>(false);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<Viewer | null>(null);

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
    setIsNativeImage(false);

    if (!currentUrl) return;

    try {
      const parsedUrl = new URL(currentUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      const pathname = parsedUrl.pathname.toLowerCase();

      // Native Image Check (Cloudinary or direct image extensions)
      if (hostname.includes('cloudinary.com') || pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.endsWith('.png') || pathname.endsWith('.webp')) {
        setIsNativeImage(true);
        setSafeUrl(currentUrl);
        return;
      }

      // Existing Iframe Logic
      const isMomento = hostname.includes('momento360.com');
      const isKuula = hostname.includes('kuula.co');
      const is360PhotoCam = hostname.includes('360photocam.com');
      const isGoogleMaps = hostname.includes('google.com') || hostname.includes('google.co.in');

      if (!isMomento && !isKuula && !is360PhotoCam && !isGoogleMaps) {
        setErrorMsg('This 360° provider is not officially supported. We support direct image uploads, Google Maps, Momento360, Kuula, and 360PhotoCam.');
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

      // Handle Kuula specific UI hiding
      if (isKuula) {
        const baseUrl = currentUrl.split('?')[0];
        embedUrl = `${baseUrl}?fs=0&vr=0&zoom=0&sd=1&info=0&logo=-1&thumbs=0&autoplay=1&autorotate=1&autorotation=1`;
      } else {
        // Add smooth autorotation if possible for others
        if (!embedUrl.includes('?')) {
          embedUrl += '?autoplay=1&autorotate=1&autorotation=1';
        } else {
          embedUrl += '&autoplay=1&autorotate=1&autorotation=1';
        }
      }

      setSafeUrl(embedUrl);
    } catch (e) {
      setErrorMsg('The provided virtual tour link is not a valid URL.');
    }
  }, [url]);

  useEffect(() => {
    if (isNativeImage && safeUrl && viewerRef.current) {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
      }

      viewerInstance.current = new Viewer({
        container: viewerRef.current,
        panorama: safeUrl,
        navbar: ['autorotate', 'zoom', 'fullscreen'],
        autorotateDelay: 1000,
        autorotateSpeed: '1rpm',
        defaultZoomLvl: 50
      });
    }

    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      }
    };
  }, [isNativeImage, safeUrl]);

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
        isNativeImage ? (
          <div ref={viewerRef} className="absolute inset-0 w-full h-full z-10"></div>
        ) : (
          <div className="absolute inset-0 w-full h-full z-10 overflow-hidden">
            <iframe
              src={safeUrl}
              style={{ width: 'calc(100% + 55px)', height: 'calc(100% + 45px)', border: 'none', display: 'block', position: 'absolute', top: 0, left: 0 }}
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
            </iframe>
          </div>
        )
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
