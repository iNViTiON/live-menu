import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Auth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, user } from '@angular/fire/auth';
import { Firestore, doc, docData, updateDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { ref, Storage, uploadBytes, uploadBytesResumable } from '@angular/fire/storage';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { shareLatest } from '@invition/rxjs-sharelatest';
import { combineLatest, from, map, mergeMap, Observable } from 'rxjs';

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
  public readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);

  public readonly user$ = user(this.auth);
  public readonly disableSignin = signal(true);
  public readonly list = doc(this.firestore, 'users/list');
  public readonly users$ = (docData(this.list) as Observable<{ users: { [key: string]: string } }>).pipe(
    map(data => data.users),
    shareLatest(),
  );
  public readonly userArray$ = this.users$.pipe(
    map(users => Object.entries(users)),
    shareLatest(),
  );
  public readonly userMap$ = this.users$.pipe(
    map(users => new Map(Object.entries(users))),
    shareLatest(),
  );
  public readonly admin = doc(this.firestore, 'users/admin');
  public readonly admins$ = (docData(this.admin) as Observable<{ list: string[] }>).pipe(map(data => new Set(data.list)),
    shareLatest(),);
  public readonly maintainer = doc(this.firestore, 'users/maintainer');
  public readonly maintainers$ = (docData(this.maintainer) as Observable<{ list: string[] }>).pipe(map(data => new Set(data.list)),
    shareLatest(),);

  public readonly isAdmin$ = combineLatest({ user: this.user$, admins: this.admins$ }).pipe(
    map(({ user, admins }) => admins.has(user?.uid)),
    shareLatest(),
  );
  public readonly isMaintainer$ = combineLatest({ user: this.user$, maintainers: this.maintainers$ }).pipe(
    map(({ user, maintainers }) => maintainers.has(user?.uid)),
    shareLatest(),
  );

  async ngOnInit() {
    const storageEmail = window.localStorage.getItem('email');
    if (storageEmail && isSignInWithEmailLink(this.auth, window.location.href)) {
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

  public toggleMaintainer(uid: string, target: EventTarget | null | undefined) {
    const checked = !!(target as unknown as { checked: boolean })?.checked;
    if (checked)
      updateDoc(doc(this.firestore, 'users/maintainer'), {
        list: arrayUnion(uid),
      });
    else
      updateDoc(doc(this.firestore, 'users/maintainer'), {
        list: arrayRemove(uid),
      });
  }

  public uploadImages(input: HTMLInputElement) {
    if (!input?.files) return
    from(input.files).pipe(
      mergeMap(file => uploadBytes(ref(this.storage, `images/${file.name}`), file), 2),
    ).subscribe();
}
}
