import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ErrorHandlerService } from './error-handler.service';

export interface UserProfile {
  id: string; email: string; name: string; role: 'admin'|'supervisor'|'asesor';
}
export interface UpdateUserProfileDto { name?: string; email?: string; }
export interface UpdatePasswordDto { currentPassword: string; newPassword: string; }

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  constructor(private http: HttpClient, private errors: ErrorHandlerService) {}

  me(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${environment.api.users}/me`).pipe(catchError((e: HttpErrorResponse) => this.handleHttp(e)));
  }

  update(body: UpdateUserProfileDto): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${environment.api.users}/me`, body).pipe(catchError((e: HttpErrorResponse) => this.handleHttp(e)));
  }

  updatePassword(body: UpdatePasswordDto): Observable<void> {
    return this.http.patch<void>(`${environment.api.users}/me/password`, body).pipe(catchError((e: HttpErrorResponse) => this.handleHttp(e)));
  }

  private handleHttp(error: HttpErrorResponse) {
    this.errors.handleHttpError(error);
    return throwError(() => error);
  }
}

