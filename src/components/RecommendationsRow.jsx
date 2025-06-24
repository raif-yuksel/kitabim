// src/components/RecommendationsRow.jsx
import React from "react";
import RecommendationCard from "./RecommendationCard";
import '../styles/RecommendationsRow.css'

export default function RecommendationsRow({ books, onBookClick }) {
  if (!books.length) {
    return (
      <div className="text-center py-3 text-muted" style={{ fontSize: "1.1rem" }}>
        Henüz önerilecek kitap yok!
      </div>
    );
  }
  return (
    <div className="recommendations-row mb-4" style={{ overflowX: "auto", display: "flex", gap: 18 }}>
      {books.map((book) => (
        <RecommendationCard
          key={book.id}
          image={book.imageUrl}
          title={book.title}
          author={book.authorName || book.author || ""}
          onClick={() => onBookClick(book)}
        />
      ))}
    </div>
  );
}
