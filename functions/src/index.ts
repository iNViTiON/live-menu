import {
  firestore,
  storage,
} from "firebase-admin";
import {initializeApp} from "firebase-admin/app";
import * as functions from "firebase-functions";
import * as crypto from "crypto";
import {
  onObjectDeleted,
  onObjectFinalized,
} from "firebase-functions/v2/storage";

const region = "europe-west1";
const fReg = functions.region(region);

initializeApp();

const getMd5 = (data: string) =>
  crypto.createHash("md5")
    .update(data)
    .digest("hex");

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

export const onFileUploaded = onObjectFinalized(
  {region},
  async (event) => {
    const fileId = getMd5(event.data.id);
    await storage().bucket(event.bucket).file(event.data.name).makePublic();
    return firestore().collection("images").doc("images").set({
      [fileId]: {
        imageUrl: event.data.mediaLink,
        index: 0,
        time: firestore.Timestamp.now(),
      },
    }, {merge: true});
  }
);

export const onFileDeleted = onObjectDeleted(
  {region},
  (event) => {
    const fileId = getMd5(event.data.id);
    return firestore().collection("images").doc("images").update({
      [fileId]: firestore.FieldValue.delete(),
    });
  }
);
