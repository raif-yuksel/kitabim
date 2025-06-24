// src/components/BookCard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, FaCommentAlt, FaShareAlt } from 'react-icons/fa';
import '../styles/BookCard.css';

/**
 * BookCard bileşeni, "Kitabım" uygulaması için optimize edilmiştir.
 *
 * Props:
 *  - imageSrc: kapak resmi URL'si (string, isteğe bağlı). Yoksa placeholder gösterilir.
 *  - title: kitap başlığı (string, zorunlu).
 *  - author: yazar adı (string, isteğe bağlı).
 *  - excerpt: kısa açıklama veya tanıtım metni (string, isteğe bağlı).
 *  - publishedDate: yayımlanma tarihi (string veya Date), isteğe bağlı gösterim.
 *  - likesCount: beğeni sayısı (number).
 *  - isLiked: kullanıcı beğendiyse true (boolean).
 *  - onToggleLike: beğeni butonuna tıklandığında çağrılacak fonksiyon.
 *  - isBookmarked: yer işaretliyse true (boolean).
 *  - onToggleBookmark: yer işareti butonuna tıklandığında çağrılacak fonksiyon.
 *  - commentsCount: yorum sayısı (number).
 *  - onClickComments: yorum ikonuna tıklandığında çağrılacak callback.
 *  - onShare: paylaş butonuna tıklandığında çağrılacak callback.
 *  - onClick: card’ın tamamına tıklandığında (detaya gitme vs.) çağrılabilir.
 *  - className: ek CSS sınıfları.
 *  - style: inline stiller.
 */
const BookCard = ({
  imageSrc,
  title,
  author,
  excerpt,
  publishedDate,
  likesCount = 0,
  isLiked = false,
  onToggleLike,
  isBookmarked = false,
  onToggleBookmark,
  commentsCount = 0,
  onClickComments,
  onShare,
  onClick,
  className,
  style,
}) => {
  // format publishedDate eğer string veya Date ise
  const formatDate = (d) => {
    if (!d) return '';
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj)) return '';
    return dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={classNames('book-card', className)}
      style={style}
      onClick={(e) => {
        // Card içindeki buton tıklamalarında onClick’i tetiklemeden önlemek için:
        // Eğer tıklanan element buton ise onClick'i tetiklemiyoruz.
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'button' || e.target.closest('button')) {
          return;
        }
        if (onClick) onClick(e);
      }}
    >
      <div className="book-card-header">
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="book-card-image" loading="lazy" />
        ) : (
          <div className="book-card-image placeholder">
            <span>Resim Yok</span>
          </div>
        )}
      </div>
      <div className="book-card-body">
        <h3 className="book-card-title">{title}</h3>
        {author && <p className="book-card-author">by {author}</p>}
        {publishedDate && (
          <p className="book-card-date">{formatDate(publishedDate)}</p>
        )}
        {excerpt && (
          <p className="book-card-excerpt">{excerpt.length > 150 ? `${excerpt.slice(0, 100)}…` : excerpt}</p>
        )}
      </div>
      <div className="book-card-footer">
        <button
          type="button"
          className="btn-icon like-btn animated-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleLike) onToggleLike();
          }}
          aria-label={isLiked ? 'Beğenmeyi kaldır' : 'Beğen'}
        >
          {isLiked ? <FaHeart /> : <FaRegHeart />}
          <span className="icon-text">{likesCount}</span>
        </button>
        <button
          type="button"
          className="btn-icon comment-btn animated-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onClickComments) onClickComments();
          }}
          aria-label="Yorumları görüntüle"
        >
          <FaCommentAlt />
          <span className="icon-text">{commentsCount}</span>
        </button>
        <button
          type="button"
          className="btn-icon bookmark-btn animated-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleBookmark) onToggleBookmark();
          }}
          aria-label={isBookmarked ? 'Yer işaretinden kaldır' : 'Yer işaretle'}
        >
          {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
        </button>
        <button
          type="button"
          className="btn-icon share-btn animated-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (onShare) onShare();
          }}
          aria-label="Paylaş"
        >
          <FaShareAlt />
        </button>
      </div>
    </div>
  );
};

BookCard.propTypes = {
  imageSrc: PropTypes.string,
  title: PropTypes.string.isRequired,
  author: PropTypes.string,
  excerpt: PropTypes.string,
  publishedDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  likesCount: PropTypes.number,
  isLiked: PropTypes.bool,
  onToggleLike: PropTypes.func,
  isBookmarked: PropTypes.bool,
  onToggleBookmark: PropTypes.func,
  commentsCount: PropTypes.number,
  onClickComments: PropTypes.func,
  onShare: PropTypes.func,
  onClick: PropTypes.func,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default BookCard;
