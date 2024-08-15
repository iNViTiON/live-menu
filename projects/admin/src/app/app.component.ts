import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Auth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, user } from '@angular/fire/auth';
import { arrayRemove, arrayUnion, doc, docData, Firestore, increment, setDoc, Timestamp, updateDoc } from '@angular/fire/firestore';
import { deleteObject, ref, Storage, uploadBytes } from '@angular/fire/storage';
import { Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { shareLatest } from '@invition/rxjs-sharelatest';
import { combineLatest, concat, from, interval, map, mergeMap, Observable, retry, switchMap, timer } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
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

  public readonly images$ = (docData(doc(this.firestore, 'images/images')) as Observable<Record<string, {
    name: string,
    imageUrl: string,
    index: number,
    time: Timestamp,
  }>>).pipe(
    map(data => Object.entries(data).map(([id, data]) => ({id, ...data})).sort((a, b) =>
      (a.index - b.index) || a.time?.seconds - b.time?.seconds || a.time?.nanoseconds - b.time?.nanoseconds
    )),
    shareLatest(),
  );

  #updates = inject(SwUpdate);
  
  async ngOnInit() {
    const storageEmail = window.localStorage.getItem('email');
    if (storageEmail && isSignInWithEmailLink(this.auth, window.location.href)) {
      await signInWithEmailLink(this.auth, storageEmail, window.location.href)
        .then(() => window.localStorage.removeItem('email')).catch(() => undefined);
    } else
      this.disableSignin.set(false);
    this.router.navigate(['/']);
    concat(
      timer(10_000),
      interval(300_000),
    ).pipe(
      switchMap(() => this.#updates.checkForUpdate().catch()),
      retry(),
    ).subscribe();
    this.#updates.versionUpdates.subscribe(evt => {
      switch (evt.type) {
        case 'VERSION_DETECTED':
          console.log(`Downloading new version: ${evt.version.hash}`);
          break;
        case 'VERSION_READY':
          location.reload();
          break;
      }
    });
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

  public  uploadImages(input: HTMLInputElement) {
    if (!input?.files) return
    from(input.files).pipe(
      mergeMap(file => uploadBytes(ref(this.storage, `images/${new Date().getTime()}-${file.name}`), file), 2),
    ).subscribe();
  }

  public async deleteImage(name: string) {
    await deleteObject(ref(this.storage, `images/${name}`));
  }

  private increaseImageIndex = (id: string, diff: number) => setDoc(doc(this.firestore, 'images/images'), {
    [id]: {
      index: increment(diff),
    },
  }, { merge: true });

  public async increaseIndex(id: string) {
    await this.increaseImageIndex(id, 1);
  }

  public async decreaseIndex(id: string) {
    await this.increaseImageIndex(id, -1);
  }
}
