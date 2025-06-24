// src/pages/AdminReports.jsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Badge,
  Modal,
  Alert
} from 'react-bootstrap';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import '../styles/AdminReports.css';

export default function AdminReports() {
  const [reports, setReports] = useState(null); // rapor belgeleri
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null); // { report, comment, post, authorProfile }

  useEffect(() => {
    // Firestore'dan reports koleksiyonunda type 'comment' ve handled==false raporları dinle
    const q = query(
      collection(db, 'reports'),
      where('type', '==', 'comment'),
      where('handled', '==', false)
    );
    const unsub = onSnapshot(
      q,
      snap => {
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setReports(arr);
        setLoading(false);
      },
      err => {
        console.error('AdminReports snapshot error:', err);
        setError('Raporlar yüklenirken bir hata oluştu.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Modal aç/kapat
  const openModal = async (report) => {
    // Rapor objesinden yorum ve post bilgisi çek
    try {
      // 1) Yorum dokümanı
      const commentRef = doc(db, 'posts', report.postId, 'comments', report.commentId);
      const commentSnap = await getDoc(commentRef);
      let commentData = null;
      if (commentSnap.exists()) {
        commentData = { id: commentSnap.id, ...commentSnap.data() };
      }
      // 2) Post başlığı
      let postData = null;
      const postRef = doc(db, 'posts', report.postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        postData = { id: postSnap.id, ...postSnap.data() };
      }
      // 3) Yorum yazarı profili
      let authorProfile = null;
      if (commentData && commentData.authorId) {
        const userRef = doc(db, 'users', commentData.authorId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const u = userSnap.data();
          authorProfile = {
            uid: userSnap.id,
            displayName: u.displayName || u.email.split('@')[0],
            avatarUrl: u.avatarUrl || ''
          };
        }
      }
      setModalData({ report, comment: commentData, post: postData, authorProfile });
      setShowModal(true);
    } catch (e) {
      console.error('Modal veri çekme hatası:', e);
      setError('Detaylar yüklenirken hata oluştu.');
    }
  };
  const closeModal = () => {
    setShowModal(false);
    setModalData(null);
  };

  // Yorum silme işlevi (comment doc sil ve post.commentsCount--, raporu işaretle handled:true)
  const handleDeleteComment = async (report) => {
    const confirmed = window.confirm('Yorumu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
    if (!confirmed) return;
    try {
      // 1) Yorum dokümanını sil
      const commentRef = doc(db, 'posts', report.postId, 'comments', report.commentId);
      await deleteDoc(commentRef);
      // 2) Post commentsCount decrement
      const postRef = doc(db, 'posts', report.postId);
      // Firestore decrement:
      await updateDoc(postRef, {
        commentsCount: -1 // firebase.firestore.FieldValue.increment(-1) benzeri
      }).catch(async err => {
        // Eğer increment/decrement kullanmak isterseniz:
        // import { increment } from 'firebase/firestore'; updateDoc(postRef, { commentsCount: increment(-1) });
        try {
          await updateDoc(postRef, { commentsCount: -1 });
        } catch(e) {
          console.warn('commentsCount decrement hatası:', e);
        }
      });
      // 3) Raporu işaretle handled:true
      const reportRef = doc(db, 'reports', report.id);
      await updateDoc(reportRef, { handled: true, handledAt: serverTimestamp() });
      // Kapat modal
      closeModal();
    } catch (e) {
      console.error('Yorum silme hatası:', e);
      setError('Yorum silinirken hata oluştu.');
    }
  };

  // Raporu kapatma/dismiss: sadece handled:true yap
  const handleDismissReport = async (report) => {
    const confirmed = window.confirm('Bu raporu kapatmak istediğinize emin misiniz?');
    if (!confirmed) return;
    try {
      const reportRef = doc(db, 'reports', report.id);
      await updateDoc(reportRef, { handled: true, handledAt: serverTimestamp() });
      closeModal();
    } catch (e) {
      console.error('Rapor kapatma hatası:', e);
      setError('Rapor kapatılırken hata oluştu.');
    }
  };

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }
  return (
    <Container className="py-4 admin-reports-container">
      <h2 className="mb-4">Raporlu Yorumlar</h2>
      {reports.length === 0 ? (
        <Alert variant="info">Güncel raporlu yorum bulunmuyor.</Alert>
      ) : (
        <Row className="g-4">
          {reports.map(report => (
            <Col key={report.id} md={6}>
              <Card className="admin-report-card shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div>
                      <strong>Yorum ID:</strong> {report.commentId}
                    </div>
                    <Badge bg="warning">Raporlu</Badge>
                  </div>
                  <div className="mb-2">
                    <strong>Post ID:</strong> {report.postId}
                  </div>
                  <div className="mb-2">
                    <strong>Raporlayan:</strong> {report.reportedBy.slice(0, 6)}
                  </div>
                  <Button variant="outline-primary" size="sm" onClick={() => openModal(report)}>
                    Detayı Gör
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Modal: rapor detayı, yorum içeriği, post başlığı, sil/dismiss */}
      <Modal show={showModal} onHide={closeModal} size="lg" centered className="admin-report-modal">
        <Modal.Header closeButton>
          <Modal.Title>Yorum Detayı ve Rapor İşlemleri</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalData ? (
            <>
              <h5 style={{ wordBreak: 'break-all' }}>Post Başlığı:{" "}
                {modalData.post ? (
                  <Link to={`/post/${modalData.post.id}`} target="_blank" rel="noopener noreferrer">
                    {modalData.post.title || modalData.post.id}
                  </Link>
                ) : "Yüklenemedi"}
              </h5>
              <div className="my-3">
                <strong>Yorum Yazarı:</strong>{" "}
                {modalData.authorProfile ? (
                  <Link to={`/author/${modalData.authorProfile.uid}`}>
                    {modalData.authorProfile.displayName}
                  </Link>
                ) : modalData.comment ? modalData.comment.authorId.slice(0,6) : 'Bilinmiyor'}
              </div>
              <div className="mb-3">
                <strong>Yorum Metni:</strong>
                <Card className="mt-2">
                  <Card.Body className="admin-report-comment-text">
                    {modalData.comment ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{modalData.comment.text}</div>
                    ) : (
                      <em>Yorum yüklenemedi veya silinmiş.</em>
                    )}
                  </Card.Body>
                </Card>
              </div>
              <div className="mb-3">
                <strong>Rapor Bilgisi:</strong>
                <ul>
                  <li><strong>Raporlayan:</strong> {modalData.report.reportedBy.slice(0,6)}</li>
                  <li><strong>Rapor Tarihi:</strong> {modalData.report.createdAt?.toDate
                    ? modalData.report.createdAt.toDate().toLocaleString()
                    : 'Bilinmiyor'}</li>
                </ul>
              </div>
            </>
          ) : (
            <Spinner animation="border" />
          )}
          {error && <Alert variant="danger">{error}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" className='animated-btn' onClick={closeModal}>Kapat</Button>
          {modalData && (
            <>
              <Button variant="danger" className='animated-btn' onClick={() => handleDeleteComment(modalData.report)}>
                Yorumu Sil
              </Button>
              <Button variant="outline-secondary" className='animated-btn' onClick={() => handleDismissReport(modalData.report)}>
                Raporu Kapat
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
