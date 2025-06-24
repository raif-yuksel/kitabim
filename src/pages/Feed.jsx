// src/pages/Feed.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
  getDocs,
} from 'firebase/firestore';
import {
  Button,
  Container,
  Row,
  Col,
  Form,
  Alert,
  Spinner,
  InputGroup,
  Collapse,
} from 'react-bootstrap';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BookCard from '../components/BookCard';
import NotificationBell from '../components/NotificationBell';
import {
  BsSearch,
  BsFilter,
  BsSortDown,
  BsTag,
  BsList,
} from 'react-icons/bs';
import RecommendationsRow from "../components/RecommendationsRow";
import { useRecommendations } from "../hooks/useRecommendations";
import FeedSlider from "../components/FeedSlider";
import '../styles/Feed.css';

const PAGE_SIZE = 10;

export default function Feed() {
  const { currentUser, userData } = useAuth();
  const [posts, setPosts]             = useState([]);
  const [lastDoc, setLastDoc]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [tagFilter, setTagFilter]     = useState('all');
  const [sortBy, setSortBy]           = useState('date');

  const [onlyFollowing, setOnlyFollowing] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const loaderRef = useRef();
  const navigate = useNavigate();

  // Like / bookmark stubları...
  const handleToggleLike = async postId => { /* ... */ };
  const handleToggleBookmark = async postId => { /* ... */ };
  const handleClickComments = postId => navigate(`/post/${postId}#comments`);
  const handleShare = post => { /* ... */ };

  const recommendations = useRecommendations(currentUser);

  // VERİ ÇEKME fonksiyonları (sizin eski haliyle aynı)
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Takip edilenleri gösterme logic’iniz...
      let q;
      if (onlyFollowing && userData?.following?.length) {
        q = query(
          collection(db, 'posts'),
          where('authorId', 'in', userData.following),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'posts'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
      }
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(docs);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
    } catch (e) {
      console.error('Gönderi çekme hatası:', e);
    } finally {
      setLoading(false);
    }
  }, [onlyFollowing, userData]);

  const fetchMore = useCallback(async () => {
    if (!lastDoc) return;
    setLoadingMore(true);
    try {
      let q;
      if (onlyFollowing && userData?.following?.length) {
        q = query(
          collection(db, 'posts'),
          where('authorId', 'in', userData.following),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, 'posts'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(prev => [...prev, ...docs]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
    } catch (e) {
      console.error('Daha fazla gönderi çekme hatası:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [lastDoc, onlyFollowing, userData]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries[0].isIntersecting && fetchMore(),
      { threshold: 1 }
    );
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [fetchMore]);

  // Client-side filtreleme/sıralama
  const uniqueTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));
  const visible = posts
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()) ||
                 p.content.toLowerCase().includes(search.toLowerCase()))
    .filter(p => typeFilter === 'all' ? true : p.type === typeFilter)
    .filter(p => tagFilter === 'all' ? true : (p.tags||[]).includes(tagFilter))
    .sort((a, b) => {
      if (sortBy === 'likes') {
        return (b.likes?.length||0) - (a.likes?.length||0);
      }
      return (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0);
    });

  return (
    <>
      <div className="feed-container">
        {/* SLIDER BAŞA */}
        <FeedSlider posts={posts.slice(0, 5)} /> {/* En popüler 5 kitabı/gönderiyi göster */}
        {/* ALTA FEED-LİSTE vb. */}
      </div>
      <Container className="py-4">
      {/* ► HEADER: Takip Toggle, Filtre/Arama & Yeni Paylaşım + Bildirim */}
      <Row className="mb-4 align-items-center">
        <Col xs="auto">
          {currentUser
            ? <Button
                className='animated-btn'
                size="sm"
                variant={onlyFollowing ? 'outline-primary' : 'primary'}
                onClick={() => setOnlyFollowing(f => !f)}
              >
                {onlyFollowing ? 'Tümünü Göster' : 'Takip Ettiklerim'}
              </Button>
            : <small className="text-muted">Giriş yapıldığında akışınız burada.</small>
          }
        </Col>
        {/* Mobilde Filtre Butonu */}
        <Col xs="auto" className="d-md-none ms-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowFilters(f => !f)}
            className="me-2"
          >
            <BsFilter className="me-1" /> Filtreler
          </Button>
          {currentUser && (
            <Link to="/new"><Button size="sm" variant="success">+ Yeni Paylaşım</Button></Link>
          )}
        </Col>
        {/* Masaüstü: Ara, Tür, Etiket, Sıralama, Yeni Paylaşım, Bildirim */}
        <Col className="d-none d-md-block">
          <Row className="g-2 align-items-center">
            <Col md>
              <InputGroup>
                <InputGroup.Text><BsSearch /></InputGroup.Text>
                <Form.Control
                  placeholder="Ara..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <Button className='animated-btn' variant="outline-secondary" onClick={() => setSearch('')}>
                    ×
                  </Button>
                )}
              </InputGroup>
            </Col>
            <Col xs="auto">
              <Form.Select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">Hepsi</option>
                <option value="kitap">Kitap</option>
                <option value="şiir">Şiir</option>
                <option value="fıkra">Fıkra</option>
                <option value="roman">Roman</option>
              </Form.Select>
            </Col>
            <Col xs="auto">
              <InputGroup>
                <InputGroup.Text><BsTag /></InputGroup.Text>
                <Form.Select
                  value={tagFilter}
                  onChange={e => setTagFilter(e.target.value)}
                >
                  <option value="all">Tüm Etiketler</option>
                  {uniqueTags.map(tag => (
                    <option key={tag} value={tag}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>
            <Col xs="auto">
              <InputGroup>
                <InputGroup.Text><BsSortDown /></InputGroup.Text>
                <Form.Select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="date">Yeni</option>
                  <option value="likes">Beğeni</option>
                </Form.Select>
              </InputGroup>
            </Col>
            <Col xs="auto" className="text-end">
              {currentUser && (
                <Link to="/new"><Button variant="success" className='animated-btn'>+ Yeni Paylaşım</Button></Link>
              )}
            </Col>
            <Col xs="auto" className="text-end">
              {currentUser && <NotificationBell />}
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ► MOBİLDE COLLAPSE İÇİN FİLTRELER */}
      <Row className="mb-3 d-md-none">
        <Col>
          <Collapse in={showFilters}>
            <div className="p-2 border rounded bg-light">
              <Row className="g-2">
                <Col xs={12}>
                  <InputGroup>
                    <InputGroup.Text><BsSearch /></InputGroup.Text>
                    <Form.Control
                      placeholder="Ara..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col xs={12}>
                  <InputGroup>
                    <InputGroup.Text><BsList /></InputGroup.Text>
                    <Form.Select
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                    >
                      <option value="all">Hepsi</option>
                      <option value="kitap">Kitap</option>
                      <option value="şiir">Şiir</option>
                      <option value="fıkra">Fıkra</option>
                      <option value="roman">Roman</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
                <Col xs={12}>
                  <InputGroup>
                    <InputGroup.Text><BsTag /></InputGroup.Text>
                    <Form.Select
                      value={tagFilter}
                      onChange={e => setTagFilter(e.target.value)}
                    >
                      <option value="all">Tüm Etiketler</option>
                      {uniqueTags.map(tag => (
                        <option key={tag} value={tag}>
                          {tag.charAt(0).toUpperCase() + tag.slice(1)}
                        </option>
                      ))}
                    </Form.Select>
                  </InputGroup>
                </Col>
                <Col xs={12}>
                  <InputGroup>
                    <InputGroup.Text><BsSortDown /></InputGroup.Text>
                    <Form.Select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="date">Yeni</option>
                      <option value="likes">Beğeni</option>
                    </Form.Select>
                  </InputGroup>
                </Col>
              </Row>
            </div>
          </Collapse>
        </Col>
      </Row>

      {/* ► POSTLARIN GÖSTERİMİ */}
      {loading ? (
        <Row xs={1} md={2} lg={3} className="g-4">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Col key={i}><Skeleton height={200} /></Col>
          ))}
        </Row>
      ) : visible.length === 0 ? (
        <Alert variant="info" className="text-center">
          {onlyFollowing
            ? 'Takip ettikleriniz arasında henüz paylaşılan onaylı gönderi yok.'
            : (search || typeFilter!=='all' || tagFilter!=='all')
              ? 'Filtrelere uygun içerik bulunamadı.'
              : 'Henüz hiç paylaşım yok. İlk sen paylaş!'}
        </Alert>
      ) : (
        <>
          <Row xs={1} md={2} lg={3} className="g-4">
            {visible.map(p => (
              <Col key={p.id}>
                <BookCard
                  imageSrc={p.imageUrl}
                  title={p.title}
                  author={p.authorName}
                  excerpt={p.content}
                  publishedDate={p.createdAt?.toDate()}
                  likesCount={p.likes?.length || 0}
                  isLiked={currentUser ? p.likes?.includes(currentUser.uid) : false}
                  onToggleLike={() => handleToggleLike(p.id)}
                  isBookmarked={currentUser ? userData?.bookmarks?.includes(p.id) : false}
                  onToggleBookmark={() => handleToggleBookmark(p.id)}
                  commentsCount={p.commentsCount || 0}
                  onClickComments={() => handleClickComments(p.id)}
                  onShare={() => handleShare(p)}
                  onClick={() => navigate(`/post/${p.id}`)}
                />
              </Col>
            ))}
          </Row>
          {loadingMore && (
            <div className="text-center my-3"><Spinner animation="border" /></div>
          )}
          <div ref={loaderRef} />
        </>
      )}
      {/* Kitap önerileri bölümü */}
      {currentUser && recommendations && recommendations.length > 0 && (
        <>
          <h4 style={{ fontWeight: 700, letterSpacing: ".02em", marginTop: 20 }}>
            <span role="img" aria-label="book">📚</span> Sana önerilen kitaplar
          </h4>
          <RecommendationsRow
            books={recommendations}
            onBookClick={(book) => navigate(`/post/${book.id}`)}
          />
        </>
      )}
      </Container>
    </>
    
  );
}
