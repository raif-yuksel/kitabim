// src/pages/Bookmarks.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import BookCard from '../components/BookCard'; // BookCard bileşeni
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  documentId,
  updateDoc,
  arrayRemove
} from 'firebase/firestore';

export default function Bookmarks() {
  const { currentUser } = useAuth();
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Firestore’dan kullanıcı yer işaretlerini çek
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    async function fetchBookmarks() {
      setLoading(true);
      try {
        // 1) Kullanıcının bookmarks dizisini al
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const bm = userSnap.exists() ? userSnap.data().bookmarks || [] : [];
        if (!isMounted) return;
        if (bm.length === 0) {
          setBookmarkedPosts([]);
          setLoading(false);
          return;
        }
        // 2) Firestore query ile postId in bm
        // Firestore in sorgusu maksimum 10 öğe kabul eder; eğer fazla ise client-side
        let posts = [];
        if (bm.length <= 10) {
          const q = query(
            collection(db, 'posts'),
            where(documentId(), 'in', bm),
            where('status', '==', 'approved')
          );
          const snap = await getDocs(q);
          posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          // >10: parçalar halinde çek veya client-side filtre
          // Örnek olarak: ilk 10 id ile çek, sonrakileri client-side filtre
          const q = query(
            collection(db, 'posts'),
            where('status', '==', 'approved')
          );
          const snap = await getDocs(q);
          posts = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => bm.includes(p.id));
        }
        if (isMounted) {
          setBookmarkedPosts(posts);
        }
      } catch (e) {
        console.error('Bookmark fetch error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchBookmarks();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Yer işareti kaldırma handler
  const handleToggleBookmark = async (postId) => {
    if (!currentUser) {
      alert('Yer işareti işlemi için giriş yapmalısınız.');
      return;
    }
    try {
      // Kullanıcı dokümanındaki bookmarks array'den postId kaldır
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        bookmarks: arrayRemove(postId)
      });
      // State'ten de kaldırarak UI'ı anında güncelle
      setBookmarkedPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) {
      console.error('Bookmark removal error:', e);
      alert('Yer işareti kaldırma sırasında hata oldu.');
    }
  };

  const handleToggleLike = async (postId) => {
    if (!currentUser) {
      alert('Beğeni için giriş yapmalısınız.');
      return;
    }
  };

  const handleClickComments = (postId) => {
    navigate(`/post/${postId}#comments`);
  };

  const handleShare = (post) => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.content?.slice(0, 100) + '…',
        url: window.location.origin + `/post/${post.id}`
      }).catch(err => console.error('Share error:', err));
    } else {
      const shareUrl = window.location.origin + `/post/${post.id}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Bağlantı panoya kopyalandı');
      });
    }
  };

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Yer İşaretlerim</h2>
      {bookmarkedPosts.length === 0 ? (
        <Alert variant="info">
          Henüz hiçbir yazıyı yer işaretlerine eklemediniz.
        </Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {bookmarkedPosts.map(p => {
            const likesCount = p.likes?.length || 0;
            const isLiked = currentUser ? (p.likes?.includes(currentUser.uid) ?? false) : false;
            // Burada isBookmarked her zaman true, çünkü bu sayfa zaten yer işaretleriniz
            const isBookmarked = true;
            const commentsCount = p.commentsCount || 0;
            return (
              <Col key={p.id}>
                <BookCard
                  imageSrc={p.imageUrl}
                  title={p.title}
                  author={p.authorName}
                  excerpt={p.content}
                  publishedDate={p.createdAt?.toDate?.() || null}
                  likesCount={likesCount}
                  isLiked={isLiked}
                  onToggleLike={() => handleToggleLike(p.id)}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={() => handleToggleBookmark(p.id)}
                  commentsCount={commentsCount}
                  onClickComments={() => handleClickComments(p.id)}
                  onShare={() => handleShare(p)}
                  onClick={() => navigate(`/post/${p.id}`)}
                />
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
}
