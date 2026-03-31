import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAVqzVqfu9QBK9tM9twekDbSr_Iemm3jFE",
  authDomain: "omduaikan.firebaseapp.com",
  projectId: "omduaikan",
  storageBucket: "omduaikan.firebasestorage.app",
  messagingSenderId: "122703450364",
  appId: "1:122703450364:web:9c9f7bc699f67a0c8f8779"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function findLostData() {
  console.log("Looking for active couples...");
  const usersSnapshot = await getDocs(collection(db, "users"));
  
  usersSnapshot.forEach(user => {
    const data = user.data();
    console.log(`User: ${data.displayName || user.id} (${user.id}) - CoupleID: ${data.coupleId} - PartnerID: ${data.partnerId}`);
  });

  const couplesSnapshot = await getDocs(collection(db, "couples"));
  console.log("\nActive Couples:");
  couplesSnapshot.forEach(c => {
    console.log(`Couple: ${c.id} - Member1: ${c.data().member1} - Member2: ${c.data().member2}`);
  });
  
  // Exit script safely
  process.exit(0);
}

findLostData();