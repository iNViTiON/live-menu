import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { doc, docData, Firestore, Timestamp } from '@angular/fire/firestore';
import { shareLatest } from '@invition/rxjs-sharelatest';
import { map, Observable } from 'rxjs';

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
    map(data => Object.entries(data).map(([id, data]) => ({id, ...data})).sort((a, b) => a.time.seconds - b.time.seconds || a.time.nanoseconds - b.time.nanoseconds),),
    shareLatest(),
  );
}
