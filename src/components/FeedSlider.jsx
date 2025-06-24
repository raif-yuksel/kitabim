import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/FeedSlider.css";

export default function FeedSlider({ posts = [], users = [] }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1); // 1: sağa, -1: sola
  const timeoutRef = useRef();
  const navigate = useNavigate();

  // Yazar adını getir (users array varsa displayName yoksa authorId başı)
  const getAuthorName = (authorId) => {
    if (!authorId) return "Anonim";
    const found = users.find(u => u.uid === authorId);
    return found ? found.displayName : authorId.slice(0, 6);
  };

  // Oto-kaydırma (6sn)
  useEffect(() => {
    if (!posts.length) return;
    timeoutRef.current = setTimeout(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % posts.length);
    }, 6000);
    return () => clearTimeout(timeoutRef.current);
  }, [current, posts.length]);

  // Dot veya arrow ile seç
  const goTo = (i) => {
    if (i === current) return;
    setDirection(i > current ? 1 : -1);
    setCurrent(i);
  };
  const prev = () => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + posts.length) % posts.length);
  };
  const next = () => {
    setDirection(1);
    setCurrent((c) => (c + 1) % posts.length);
  };

  // Kart tıklandığında detay sayfasına yönlendir
  const handleCardClick = (post) => {
    if (post.id) {
      navigate(`/post/${post.id}`);
    }
  };

  // Slider hiç veri yoksa gösterme
  if (!posts.length) {
    return <div className="feed-slider-empty">Gösterilecek içerik yok.</div>;
  }

  return (
    <div className="feed-slider-carousel">
      {posts.map((post, i) => {
        // Tarihi güzel göster
        let dateStr = "";
        if (post.createdAt) {
          if (typeof post.createdAt === "string") {
            dateStr = post.createdAt;
          } else if (post.createdAt.toDate) {
            dateStr = post.createdAt.toDate().toLocaleDateString("tr-TR");
          } else if (post.createdAt instanceof Date) {
            dateStr = post.createdAt.toLocaleDateString("tr-TR");
          }
        }

        return (
          <div
            key={post.id || i}
            className={`feed-slider-slide
              ${i === current ? "active" : ""}
              ${i !== current && direction === 1 ? "exit-left" : ""}
              ${i !== current && direction === -1 ? "exit-right" : ""}
            `}
            style={{
              backgroundImage: `url(${post.imageUrl || ""})`,
              cursor: i === current ? "pointer" : "default",
              zIndex: i === current ? 3 : 0,
              pointerEvents: i === current ? "auto" : "none",
            }}
            onClick={() => i === current && handleCardClick(post)}
          >
            <div className="feed-slider-overlay" />
            <div className="feed-slider-content">
              <h1>{post.title || "Başlık Yok"}</h1>
              <div className="feed-slider-meta">
                {[
                  getAuthorName(post.authorId),
                  dateStr,
                  post.type
                ].filter(Boolean).join(" • ")}
              </div>
              {/* Excerpt varsa göster */}
              {post.excerpt && <p>{post.excerpt.length > 120 ? post.excerpt.slice(0, 100) + "…" : post.excerpt}</p>}
            </div>
          </div>
        );
      })}
      <div className="feed-slider-controls">
        <div className="feed-slider-dots">
          {posts.map((_, i) => (
            <div
              key={i}
              className={`feed-slider-dot ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <div className="feed-slider-arrows">
          <button className="feed-slider-arrow-btn" onClick={prev}>&lt;</button>
          <button className="feed-slider-arrow-btn" onClick={next}>&gt;</button>
        </div>
      </div>
    </div>
  );
}
