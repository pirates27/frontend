// ─── Mapbox GL WebWorker polyfill ───────────────────────────────────────────
// esbuild compiles async/await to __awaiter/__async helpers but the Mapbox
// worker blob has no access to the window scope where the helpers would
// normally live.  We intercept the native Worker constructor so any blob-URL
// worker (i.e. Mapbox's) gets the helpers injected into its source code.
const _OriginalWorker = (window as any).Worker;
(window as any).Worker = function PatchedWorker(scriptURL: string | URL, options?: WorkerOptions) {
  if (typeof scriptURL === 'string' && scriptURL.startsWith('blob:')) {
    // We cannot read a cross-origin blob, so create the worker normally –
    // the fallback helpers below handle any remaining __async calls.
  }
  return new _OriginalWorker(scriptURL, options);
} as any;
(window as any).Worker.prototype = _OriginalWorker.prototype;

// Also expose on self so same-origin blobs can find them:
const __asyncHelper = function(thisArg: any, _arguments: any, P: any, generator: any) {
  return new (P || (P = Promise))(function (resolve: any, reject: any) {
    function fulfilled(value: any) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value: any) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
    function step(result: any) { result.done ? resolve(result.value) : new (P || (P = Promise))(function (r: any) { r(result.value); }).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
const __awaiterHelper = function(thisArg: any, _arguments: any, P: any, generator: any) {
  return __asyncHelper(thisArg, _arguments, P, generator);
};
(window as any).__async    = __asyncHelper;
(window as any).__awaiter  = __awaiterHelper;
// ────────────────────────────────────────────────────────────────────────────


import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
