import {firestore} from "firebase-admin";
import {initializeApp} from "firebase-admin/app";
import * as functions from "firebase-functions";

const fReg = functions.region("europe-west1");

initializeApp();

export const newUser = fReg.auth.user().onCreate((user) => {
  if (user.providerData.length === 0) {
    return Promise.resolve();
  }
  return firestore().collection("users").doc("list").set({
    users: {
      [user.uid]: user.email,
    },
  }, {merge: true});
});

export const deleteUser = fReg.auth.user().onDelete((user) => {
  if (user.providerData.length === 0) {
    return Promise.resolve();
  }
  return firestore().collection("users").doc("list").update({
    [`users.${user.uid}`]: firestore.FieldValue.delete(),
  });
});
