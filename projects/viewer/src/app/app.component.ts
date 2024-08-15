import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { doc, docData, Firestore, Timestamp } from '@angular/fire/firestore';
import { SwUpdate } from '@angular/service-worker';
import { shareLatest } from '@invition/rxjs-sharelatest';
import { concat, interval, map, Observable, retry, switchMap, timer } from 'rxjs';

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
  private readonly firestore = inject(Firestore);
  public readonly images$ = (docData(doc(this.firestore, 'images/images')) as Observable<Record<string, {
    name: string,
    imageUrl: string,
    index: number,
    time: Timestamp,
  }>>).pipe(
    map(data => Object.entries(data).map(([id, data]) => ({ id, ...data })).sort((a, b) =>
      (a.index - b.index) || a.time.seconds - b.time.seconds || a.time.nanoseconds - b.time.nanoseconds
    )),
    shareLatest(),
  );

  #updates = inject(SwUpdate);

  ngOnInit() {
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
}
