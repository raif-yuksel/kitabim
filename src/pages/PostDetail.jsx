import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, increment, getDocs
} from 'firebase/firestore';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  Container, Card, Button, Form, Row, Col, Badge, Alert, Spinner,
  Tabs, Tab, Modal, Image, ButtonGroup
} from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { MentionsInput, Mention } from 'react-mentions';
import '../mentions.css';
import FlipBook from '../components/FlipBook';
import '../components/FlipBook.css';
import '../styles/PostDetail.css';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import BadgeCongratsModal from '../components/BadgeCongratsModal';
import QRCode from "react-qr-code";
import confetti from "canvas-confetti";

const SPAM_WORDS = ['spam', 'küfür', 'http'];

function splitContentIntoPages(text, charsPerPage = 1000) {
  const pages = [];
  let start = 0;
  const len = text.length;
  while (start < len) {
    if (start + charsPerPage >= len) {
      pages.push(text.slice(start).trim());
      break;
    }
    let slice = text.slice(start, start + charsPerPage);
    const lastSpace = slice.lastIndexOf(' ');
    if (lastSpace > 0) {
      const part = text.slice(start, start + lastSpace).trim();
      pages.push(part);
      start += lastSpace + 1;
    } else {
      const part = slice.trim();
      pages.push(part);
      start += charsPerPage;
    }
  }
  return pages;
}

export default function PostDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [post, setPost] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [comments, setComments] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [activeTab, setActiveTab] = useState('detail');
  const [showFlipModal, setShowFlipModal] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef(null);

  const [showQrModal, setShowQrModal] = useState(false);

  const [modalBadge, setModalBadge] = useState(null);

  const [readingMode, setReadingMode] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const charsPerPage = 1000;

  const [likeAnim, setLikeAnim] = useState(false);

  // Bildirim fonksiyonu
  async function sendNotification(targetUserId, notifData) {
    if (!targetUserId) return;
    await addDoc(collection(db, "users", targetUserId, "notifications"), {
      ...notifData,
      createdAt: serverTimestamp(),
      read: false
    });
  }

  // --- Like tıklama efekti
  const handleLikeClick = async () => {
    setLikeAnim(true);
    await toggleLike();
    setTimeout(() => setLikeAnim(false), 400);
  };

  // 1) Post ve Yazar yükle
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingPost(true);
      try {
        const postRef = doc(db, 'posts', id);
        const postSnap = await getDoc(postRef);
        if (!postSnap.exists()) {
          if (!cancelled) setPost(null);
          return;
        }
        const p = { id: postSnap.id, ...postSnap.data() };
        if (!cancelled) setPost(p);

        const userRef = doc(db, 'users', p.authorId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && !cancelled) {
          const u = userSnap.data();
          let avatarUrl = '';
          if (u.avatarUrl) {
            avatarUrl = u.avatarUrl;
          } else if (u.avatarPath) {
            try {
              avatarUrl = await getDownloadURL(storageRef(storage, u.avatarPath));
            } catch {
              avatarUrl = '';
            }
          }
          setAuthorProfile({
            uid: userSnap.id,
            displayName: u.displayName || u.email.split('@')[0],
            avatarUrl
          });
        }
      } catch (e) {
        console.error('Post yükleme hatası:', e);
      } finally {
        if (!cancelled) setLoadingPost(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    const q = query(
      collection(db, 'posts', id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      snap => setComments(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => console.error('Yorum dinleme hatası:', err)
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!currentUser) {
      setBookmarks([]);
      return;
    }
    const uref = doc(db, 'users', currentUser.uid);
    getDoc(uref)
      .then(d => setBookmarks(d.exists() ? d.data().bookmarks || [] : []))
      .catch(e => console.error('Bookmark yükleme hatası:', e));
  }, [currentUser]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const arr = await Promise.all(snap.docs.map(async d => {
          const data = d.data();
          const displayName = data.displayName || data.email.split('@')[0];
          let avatarUrl = '';
          if (data.avatarUrl) {
            avatarUrl = data.avatarUrl;
          } else if (data.avatarPath) {
            try {
              avatarUrl = await getDownloadURL(storageRef(storage, data.avatarPath));
            } catch {
              avatarUrl = '';
            }
          }
          return { uid: d.id, displayName, avatarUrl };
        }));
        setUsers(arr);
      } catch (e) {
        console.error('Kullanıcı yükleme hatası:', e);
      }
    }
    loadUsers();
  }, []);

  useEffect(() => { setPageIndex(0); }, [post?.content]);

  // --- BEĞENİNCE bildirim
  async function toggleLike() {
    if (!post || !currentUser) return;
    const postRef = doc(db, 'posts', id);
    const likesArr = Array.isArray(post.likes) ? post.likes : [];
    const likedNow = likesArr.includes(currentUser.uid);
    try {
      await updateDoc(postRef, {
        likes: likedNow
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid)
      });
      setPost(p => ({
        ...p,
        likes: likedNow
          ? p.likes.filter(u => u !== currentUser.uid)
          : [...(p.likes || []), currentUser.uid]
      }));

      // Biri BEĞENİNCE, yazarına bildirim
      if (!likedNow && post.authorId !== currentUser.uid) {
        await sendNotification(post.authorId, {
          message: `${currentUser.displayName || currentUser.email} gönderini beğendi!`,
          postId: id,
          type: "like"
        });
      }

    } catch (e) {
      console.error('Like işlemi hatası:', e);
    }
  }

  // --- FAVORİYE EKLEYİNCE bildirim
  async function toggleBookmark() {
    if (!currentUser) return;
    const uref = doc(db, 'users', currentUser.uid);
    const isBook = bookmarks.includes(id);
    try {
      await updateDoc(uref, {
        bookmarks: isBook
          ? arrayRemove(id)
          : arrayUnion(id)
      });
      setBookmarks(b => isBook ? b.filter(pid => pid !== id) : [...b, id]);
      // Sadece favoriye eklerken yazarına bildir
      if (!isBook && post.authorId && post.authorId !== currentUser.uid) {
        await sendNotification(post.authorId, {
          message: `${currentUser.displayName || currentUser.email} kitabını favorilerine ekledi!`,
          postId: id,
          type: "bookmark"
        });
      }
    } catch (e) {
      console.error('Bookmark işlemi hatası:', e);
    }
  }

  async function handleRate(star) {
    if (!post || !currentUser) return;
    const postRef = doc(db, 'posts', id);
    try {
      await updateDoc(postRef, {
        [`ratings.${currentUser.uid}`]: star
      });
      setPost(p => ({
        ...p,
        ratings: { ...(p.ratings || {}), [currentUser.uid]: star }
      }));
    } catch (e) {
      console.error('Rating hatası:', e);
    }
  }

  // --- Yorum ekleme ve BİLDİRİMLER ---
  async function handleComment(e) {
    e.preventDefault();
    setError('');
    if (!currentUser) {
      setError('Lütfen giriş yapın.');
      return;
    }
    const text = commentText.trim();
    if (!text) {
      setError('Yorum boş olamaz.');
      return;
    }
    if (SPAM_WORDS.some(w => text.toLowerCase().includes(w))) {
      setError('Yorumunuz uygun olmayan içerik içeriyor.');
      return;
    }
    const mentions = [];
    const re = /@\[.*?\]\((.*?)\)/g;
    let m;
    while ((m = re.exec(text)) !== null) mentions.push(m[1]);
    const commentsRef = collection(db, 'posts', id, 'comments');
    const payload = {
      authorId: currentUser.uid,
      text,
      mentions,
      parentId: replyTo || null,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(commentsRef, payload);
      const postRef = doc(db, 'posts', id);
      await updateDoc(postRef, { commentsCount: increment(1) });

      // --- Gönderiye YORUM gelince, yazarına bildir
      if (post.authorId && post.authorId !== currentUser.uid) {
        await sendNotification(post.authorId, {
          message: `${currentUser.displayName || currentUser.email} gönderine yorum yaptı!`,
          postId: id,
          type: "comment"
        });
      }

      // --- Birinin YORUMUNA YANIT gelince, o kişiye bildir
      if (replyTo) {
        const parentComment = comments.find(c => c.id === replyTo);
        if (parentComment && parentComment.authorId !== currentUser.uid) {
          await sendNotification(parentComment.authorId, {
            message: `${currentUser.displayName || currentUser.email} yorumuna cevap verdi!`,
            postId: id,
            commentId: replyTo,
            type: "reply"
          });
        }
      }

      // --- ROZET KONTROLÜ ---
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userBadges = userSnap.exists() ? userSnap.data().badges || [] : [];
      const hasFirstComment = userBadges.some(b => b.id === "first-comment");
      const isFirstCommentHere = !comments.some(c => c.authorId === currentUser.uid);

      if (!hasFirstComment && isFirstCommentHere) {
        const badgeObj = {
          id: "first-comment",
          title: "İlk Yorumunu Yaptın!",
          description: "Tebrikler! İlk kez bir kitapta yorum yaptın.",
          date: Date.now()
        };
        await updateDoc(userRef, { badges: arrayUnion(badgeObj) });
        setModalBadge(badgeObj);
      }
      // ----------------------

      setCommentText('');
      setReplyTo(null);
      setActiveTab('comments');
    } catch (e) {
      console.error('Yorum ekleme hatası:', e);
      setError('Yorum eklenemedi: ' + e.message);
    }
  }

  async function reportPost() {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'post',
        postId: id,
        reportedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        handled: false
      });
      alert('Bu gönderi raporlandı.');
    } catch (e) {
      console.error('Post raporlama hatası:', e);
    }
  }

  function fireConfetti() {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  async function reportComment(commentId) {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'reports'), {
        type: 'comment',
        postId: id,
        commentId,
        reportedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        handled: false
      });
      alert('Bu yorum raporlandı.');
    } catch (e) {
      console.error('Yorum raporlama hatası:', e);
    }
  }

  if (loadingPost) {
    return (
      <Container className="postdetail-loading">
        <Spinner animation="border" />
      </Container>
    );
  }
  if (!post) {
    return (
      <Container className="postdetail-container">
        <Alert variant="warning">Gönderi bulunamadı.</Alert>
      </Container>
    );
  }

  const contentPagesArr = splitContentIntoPages(post.content || '', charsPerPage);
  const flipPages = [];
  for (let i = 0; i < contentPagesArr.length; i += 2) {
    flipPages.push({
      front: <div className="flipbook-page">{contentPagesArr[i]}</div>,
      back: <div className="flipbook-page">{contentPagesArr[i + 1] || ''}</div>,
      isCoverFront: i === 0,
      isCoverBack: i + 1 >= contentPagesArr.length
    });
  }
  const ratings = post.ratings || {};
  const vals = Object.values(ratings).filter(v => typeof v === 'number');
  const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  const myRating = currentUser ? ratings[currentUser.uid] || 0 : 0;
  const createdAt = post.createdAt?.toDate
    ? format(post.createdAt.toDate(), "dd MMM yyyy HH:mm", { locale: tr })
    : '';
  const liked = Array.isArray(post.likes) && post.likes.includes(currentUser?.uid);

  const renderComment = (c, level = 0) => {
    const replies = comments.filter(x => x.parentId === c.id);
    const commenter = users.find(u => u.uid === c.authorId);
    const avatarUrl = commenter?.avatarUrl || '';
    return (
      <div key={c.id} className="comment-item" style={{ marginLeft: level * 20 }}>
        <Card className="comment-card mb-2">
          <Card.Body>
            <Row>
              <Col xs="auto">
                {avatarUrl ? (
                  <Image src={avatarUrl} roundedCircle width={40} height={40} />
                ) : (
                  <div className="comment-avatar-placeholder">
                    {commenter?.displayName?.slice(0,2).toUpperCase() || c.authorId.slice(0,2).toUpperCase()}
                  </div>
                )}
              </Col>
              <Col>
                <div className="d-flex justify-content-between">
                  <Link to={`/author/${c.authorId}`} className="comment-author-name">
                    <strong>{commenter?.displayName || c.authorId.slice(0,6)}</strong>
                  </Link>
                  <small className="text-muted">
                    {c.createdAt?.toDate
                      ? format(c.createdAt.toDate(), "dd MMM yyyy HH:mm", { locale: tr })
                      : ''}
                  </small>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }} className="mt-1">
                  {c.text.split(/(@\[.*?\]\(.*?\))/g).map((part, i) => {
                    const mm = /\@\[.*?\]\((.*?)\)/.exec(part);
                    if (mm) {
                      const uid = mm[1];
                      const u = users.find(x => x.uid === uid);
                      return (
                        <Link key={i} to={`/author/${uid}`} className="comment-mention">
                          @{u?.displayName || uid.slice(0,6)}
                        </Link>
                      );
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>
                <div className="mt-2">
                  <Button size="sm" className='animated-btn' variant="link" onClick={() => setReplyTo(c.id)}>Yanıtla</Button>
                  <Button size="sm" variant="outline-warning" className="ms-2 animated-btn" onClick={() => reportComment(c.id)}>Rapor Et</Button>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        {replies.map(r => renderComment(r, level+1))}
      </div>
    );
  };

  const handleSpeakToggle = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToSpeak = post.content || '';
      if (!textToSpeak) return;
      const utterance = new window.SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'tr-TR';
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const fontSizeValue =
    fontSize === 'small' ? '15px' :
    fontSize === 'large' ? '22px' : '18px';
  const readingBg = readingMode === 'dark' ? '#222' : '#fff';
  const readingColor = readingMode === 'dark' ? '#e0e0e0' : '#222';

  return (
    <Container className="postdetail-container">
      <Card className="post-card shadow-sm mb-4">
        {post.imageUrl && <Card.Img variant="top" src={post.imageUrl} className="post-image" />}
        <Card.Body>
          <Row className="post-header-row align-items-center">
            <Col xs={12} md={6} className="text-md-start mb-2 mb-md-0">
              <h2 className="post-title">{post.title}</h2>
            </Col>
            <Col xs={12} md={6} className="d-flex justify-content-center justify-content-md-end flex-wrap gap-2">
              <Badge bg="secondary" className="text-capitalize">{post.type}</Badge>
              {post.tags?.map((t, idx) => (
                <Badge key={idx} bg="info" className="text-lowercase">{t}</Badge>
              ))}
              <Button
                size="sm"
                variant={liked ? 'danger' : 'outline-danger'}
                onClick={handleLikeClick}
                className={likeAnim ? "heart-pop-anim " : ""}
              >
                {liked ? '💔' : '❤️'} {post.likes?.length || 0}
              </Button>
              <Button className='animated-btn' size="sm" variant={bookmarks.includes(id) ? 'warning' : 'outline-warning'} onClick={toggleBookmark}>
                🔖
              </Button>
              <Button size="sm" className='animated-btn' variant="outline-warning" onClick={reportPost}>Rapor Et</Button>
              <Button size="sm" className='animated-btn' variant="primary" onClick={() => setShowFlipModal(true)}>Detaylı Oku</Button>
              <Button
                className='animated-btn'
                size="sm"
                variant="outline-dark"
                onClick={() => {
                  setShowQrModal(true);
                  fireConfetti();
                }}
              >
                QR ile Paylaş
              </Button>

            </Col>
          </Row>
          <div className="d-flex align-items-center mb-3 post-author-row">
            {authorProfile?.avatarUrl ? (
              <Image src={authorProfile.avatarUrl} roundedCircle width={40} height={40} className="me-2" />
            ) : (
              <div className="comment-avatar-placeholder me-2">
                {authorProfile?.displayName?.slice(0,2).toUpperCase() || post.authorId.slice(0,2).toUpperCase()}
              </div>
            )}
            <div>
              <Link to={`/author/${post.authorId}`} className="post-author-name me-2">
                {authorProfile?.displayName || post.authorId.slice(0,6)}
              </Link>
              <small className="text-muted">• {createdAt}</small>
            </div>
          </div>
          <div className="post-rating mb-3">
            {[1,2,3,4,5].map(star => (
              <span key={star} onClick={() => handleRate(star)}
                    className={`star ${myRating>=star ? 'star-filled':'star-empty'}`}>★</span>
            ))}
            {avg && <small className="ms-2">({avg})</small>}
          </div>

          {/* OKUMA MODU & FONT SEÇİCİ */}
          <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-3">
            <Tab eventKey="detail" title="Kitap Detay">
              <div style={{display: 'flex', gap: 12, alignItems: 'center', margin: '16px 0', flexWrap: 'wrap'}}>
                <span>Okuma Modu:</span>
                <button className='animated-btn'
                  onClick={() => setReadingMode('light')}
                  style={{
                    background: readingMode === 'light' ? '#ffe066' : '#eee',
                    border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer'
                  }}
                >Açık</button>
                <button className='animated-btn'
                  onClick={() => setReadingMode('dark')}
                  style={{
                    background: readingMode === 'dark' ? '#333' : '#eee',
                    color: readingMode === 'dark' ? '#fff' : '#000',
                    border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer'
                  }}
                >Koyu</button>
                <span style={{ marginLeft: 24 }}>Yazı Boyutu:</span>
                <button className='animated-btn' onClick={() => setFontSize('small')}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: fontSize === 'small' ? '#b2f2ff' : '#eee', cursor: 'pointer' }}>A-</button>
                <button className='animated-btn' onClick={() => setFontSize('medium')}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: fontSize === 'medium' ? '#b2f2ff' : '#eee', cursor: 'pointer' }}>A</button>
                <button className='animated-btn' onClick={() => setFontSize('large')}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: fontSize === 'large' ? '#b2f2ff' : '#eee', cursor: 'pointer' }}>A+</button>
                <Button className='animated-btn' size="sm" variant={isSpeaking ? 'outline-danger' : 'outline-success'} onClick={handleSpeakToggle}>
                  {isSpeaking ? 'Durdur' : 'Oku'}
                </Button>
              </div>
              {contentPagesArr.length > 0 ? (
                <>
                  <div
                    className="markdown-container"
                    style={{
                      background: readingBg,
                      color: readingColor,
                      fontSize: fontSizeValue,
                      lineHeight: 1.7,
                      padding: 24,
                      borderRadius: 12,
                      transition: 'background 0.3s, color 0.3s, font-size 0.2s'
                    }}
                  >
                    <ReactMarkdown
                      children={contentPagesArr[pageIndex]}
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter style={prism} language={match[1]} PreTag="div" {...props}>
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>{children}</code>
                          );
                        }
                      }}
                    />
                  </div>
                  <div className="d-flex justify-content-center my-3">
                    <ButtonGroup>
                      <Button variant="outline-primary" size="sm" className='animated-btn'
                              onClick={() => setPageIndex(i => Math.max(i-1,0))}
                              disabled={pageIndex<=0}>Önceki</Button>
                      <Button variant="light" size="sm" disabled style={{cursor:'default'}} className='animated-btn'>
                        {pageIndex+1} / {contentPagesArr.length}
                      </Button>
                      <Button variant="outline-primary" size="sm" className='animated-btn'
                              onClick={() => setPageIndex(i => Math.min(i+1,contentPagesArr.length-1))}
                              disabled={pageIndex>=contentPagesArr.length-1}>Sonraki</Button>
                    </ButtonGroup>
                  </div>
                </>
              ) : <p>İçerik yok.</p>}
            </Tab>
            <Tab eventKey="comments" title={`Yorumlar (${comments.length})`}>
              {error && <Alert variant="danger">{error}</Alert>}
              {comments.filter(c => !c.parentId).length === 0 ? (
                <p className="no-comments-text">Henüz yorum yok.</p>
              ) : (
                <div className="comments-container">
                  {comments.filter(c => !c.parentId).map(c => renderComment(c,0))}
                </div>
              )}
              {replyTo && (
                <Alert variant="info" dismissible onClose={() => setReplyTo(null)}>
                  <small>Şu yoruma cevaplıyorsunuz: “{comments.find(c=>c.id===replyTo)?.text.slice(0,20)}…”</small>
                </Alert>
              )}
              <Card className="mt-3 p-3 comment-form-card">
                <Form onSubmit={handleComment}>
                  <MentionsInput
                    value={commentText}
                    onChange={(e,newVal)=>setCommentText(newVal)}
                    markup="@[__display__](__id__)"
                    placeholder="Yorumunuzu yazın… (@ ile etiketleyin)"
                    className="mentions-input"
                    style={{
                      control:{backgroundColor:'var(--input-bg)',color:'var(--input-fg)',minHeight:'80px'},
                      highlighter:{overflow:'hidden'},
                      input:{margin:0}
                    }}
                  >
                    <Mention
                      trigger="@"
                      data={users.map(u=>({ id:u.uid, display:u.displayName }))}
                      markup="@[__display__](__id__)"
                      displayTransform={(id,display)=>`@${display}`}
                      style={{backgroundColor:'#daf4fa'}}
                    />
                  </MentionsInput>
                  <Button type="submit" className="mt-2 animated-btn" variant="primary" onClick={() => {fireConfetti();}}>Gönder</Button>
                </Form>
              </Card>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <Modal show={showFlipModal} onHide={() => setShowFlipModal(false)} fullscreen centered>
        <Modal.Header closeButton>
          <Modal.Title>Kitap Detay: {post.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="flipbook-modal-body">
          <div className="flipbook-wrapper">
            <FlipBook pages={flipPages} readingMode={readingMode} fontSize={fontSize}/>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div style={{display: 'flex', gap: 12, alignItems: 'center', margin: '16px 0', flexWrap: 'wrap'}}>
                <span>Okuma Modu:</span>
                <button
                  onClick={() => setReadingMode('light')}
                  style={{
                    background: readingMode === 'light' ? '#ffe066' : '#eee',
                    border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer'
                  }}
                >Açık</button>
                <button
                  onClick={() => setReadingMode('dark')}
                  style={{
                    background: readingMode === 'dark' ? '#333' : '#eee',
                    color: readingMode === 'dark' ? '#fff' : '#000',
                    border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer'
                  }}
                >Koyu</button>
                <span style={{ marginLeft: 24 }}>Yazı Boyutu:</span>
                <button onClick={() => setFontSize('small')}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: fontSize === 'small' ? '#b2f2ff' : '#eee', cursor: 'pointer' }}>A-</button>
                <button onClick={() => setFontSize('medium')}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: fontSize === 'medium' ? '#b2f2ff' : '#eee', cursor: 'pointer' }}>A</button>
                <button onClick={() => setFontSize('large')}
                  style={{ padding: '4px 10px', borderRadius: 4, border: 'none', background: fontSize === 'large' ? '#b2f2ff' : '#eee', cursor: 'pointer' }}>A+</button>
              </div>
          <Button variant={isSpeaking ? 'outline-danger' : 'outline-primary'}
                  onClick={handleSpeakToggle} className="tts-btn">
            {isSpeaking ? 'Durdur' : 'Oku'}
          </Button>
          <Button variant="secondary" onClick={() => setShowFlipModal(false)}>Kapat</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>QR Kod ile Paylaş</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <QRCode
            value={window.location.origin + `/post/${id}`}
            size={200}
            bgColor="#fff"
            fgColor="#222"
            style={{ margin: '0 auto' }}
          />
          <p className="mt-3" style={{ wordBreak: "break-all", fontSize: 12, color: "#555" }}>
            {window.location.origin + `/post/${id}`}
          </p>
        </Modal.Body>
      </Modal>
                      

      {/* --- Rozet Kazanım Popup --- */}
      <BadgeCongratsModal
        badge={modalBadge}
        show={!!modalBadge}
        onClose={() => setModalBadge(null)}
        avatarUrl={currentUser?.photoURL}
      />

    </Container>
  );
}
