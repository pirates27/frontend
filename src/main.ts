// Polyfill for Mapbox WebWorker esbuild compiler bug (__async is not defined)
(window as any).__async = function(thisArg: any, _arguments: any, P: any, generator: any) {
  return new (P || (P = Promise))(function (resolve: any, reject: any) {
      function fulfilled(value: any) { try { step(generator.next(value)); } catch (e) { reject(e); } }
      function rejected(value: any) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
      function step(result: any) { result.done ? resolve(result.value) : new P(function (resolve: any) { resolve(result.value); }).then(fulfilled, rejected); }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
