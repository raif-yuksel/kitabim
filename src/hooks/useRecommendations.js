// src/hooks/useRecommendations.js
import { useEffect, useState } from "react";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export function useRecommendations(currentUser) {
  const [recs, setRecs] = useState([]);
  useEffect(() => {
    if (!currentUser) {
      setRecs([]);
      return;
    }
    async function fetch() {
      // Kullanıcı okuma geçmişi (ör: userReads koleksiyonu)
      const readsQ = query(
        collection(db, "userReads"),
        where("uid", "==", currentUser.uid),
        limit(20)
      );
      const readsSnap = await getDocs(readsQ);
      const readBookIds = readsSnap.docs.map(doc => doc.data().bookId);

      // Öneri için benzer kategoriden kitaplar
      if (readBookIds.length === 0) {
        setRecs([]); // hiç kitap okunmamışsa boş
        return;
      }
      // Basit: Okuduğu kategorilerde popüler kitapları getir
      const booksQ = query(
        collection(db, "posts"),
        where("type", "in", ["kitap", "roman"]), // örnek tür
        where("status", "==", "approved"),
        limit(12)
      );
      const booksSnap = await getDocs(booksQ);
      const books = booksSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(b => !readBookIds.includes(b.id)); // tekrar okunan önerilmesin
      setRecs(books);
    }
    fetch();
  }, [currentUser]);
  return recs;
}
