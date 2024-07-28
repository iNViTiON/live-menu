import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp({
      "projectId": "realtimemenuscreen",
      "appId": "1:180761938918:web:5d6caee839cf3368966427",
      "storageBucket": "realtimemenuscreen.appspot.com",
      "apiKey": "AIzaSyA9H30R1vabNfP8XhihQKXxm5idBKmfttA",
      "authDomain": "realtimemenuscreen.firebaseapp.com",
      "messagingSenderId": "180761938918"
    })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
  ]
};
