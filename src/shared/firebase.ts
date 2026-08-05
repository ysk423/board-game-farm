import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// クライアントに公開される前提の設定値（Firebase Web SDKの一般的な仕様）
const firebaseConfig = {
  projectId: 'board-game-farm',
  appId: '1:749538831761:web:fcfa330c1f976fb01bfe30',
  storageBucket: 'board-game-farm.firebasestorage.app',
  apiKey: 'AIzaSyCFEjpJ6b-yVtWxWpH0XQ8InN9QhSfQ-Io',
  authDomain: 'board-game-farm.firebaseapp.com',
  messagingSenderId: '749538831761',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
