import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Auth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, user } from '@angular/fire/auth';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { map } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    JsonPipe,
    RouterOutlet,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  public auth = inject(Auth);
  public user$ = user(this.auth);
  public disableSignin = signal(true);
  private router = inject(Router);

  async ngOnInit() {
    const storageEmail = window.localStorage.getItem('email');
    if(storageEmail && isSignInWithEmailLink(this.auth, window.location.href)) {
      await signInWithEmailLink(this.auth, storageEmail, window.location.href)
        .then(() => window.localStorage.removeItem('email')).catch(() => undefined);
    } else
    this.disableSignin.set(false);
    this.router.navigate(['/']);
  }

  public login(email: string) {
    this.disableSignin.set(true);
    window.localStorage.setItem('email', email);
    void sendSignInLinkToEmail(this.auth, email, {
      url: window.location.href,
      handleCodeInApp: true
    }).finally(() => this.disableSignin.set(false));
  }
}
