// Configuração do Firebase - substitua com seus dados
const firebaseConfig = {
  apiKey: "AIzaSyBefXhy7pq02b6DDWcLz1_H5rvaxI8t9VQ",
  authDomain: "radiation-monitor1.firebaseapp.com",
  projectId: "radiation-monitor1",
  storageBucket: "radiation-monitor1.firebasestorage.app",
  messagingSenderId: "154008625881",
  appId: "1:154008625881:web:6f95b4586d766487d994c8",
  measurementId: "G-S2D6T7P56K"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();