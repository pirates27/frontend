import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';

let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  let authReq = req;

  // Add authorization header if request is going to our backend API and we have a token
  if (token && req.url.startsWith(environment.apiBaseUrl)) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: any) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.includes('/api/auth/login')) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshAccessToken().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        const newToken = res.accessToken || res.token || authService.accessToken();
        refreshTokenSubject.next(newToken);
        
        return next(injectToken(request, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        if (err && (err.status === 401 || err.status === 403)) {
          authService.logout().subscribe();
        } else {
          console.warn('Refresh token attempt encountered network delay/HMR abort. Retaining session:', err);
        }
        return throwError(() => err);
      })
    );
  } else {
    // Wait for the refresh to finish and retry
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => next(injectToken(request, token)))
    );
  }
}

function injectToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}
