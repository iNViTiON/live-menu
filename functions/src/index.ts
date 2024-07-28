import { firestore } from 'firebase-admin';
import * as functions from 'firebase-functions';

export const newUser = functions.auth.user().onCreate((user) => {
  if (user.providerData.length === 0) {
    return Promise.resolve();
  }
  return firestore().collection('users').doc('list').set({
    users: {
      [user.uid]: {
        email: user.email
      }
    }
  }, { merge: true });
});

export const deleteUser = functions.auth.user().onDelete((user) => {
  if (user.providerData.length === 0) {
    return Promise.resolve();
  }
  return firestore().collection('users').doc('list').update({
    [`users.${user.uid}`]: firestore.FieldValue.delete()
  });
});