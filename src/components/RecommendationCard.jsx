// src/components/RecommendationCard.jsx
import React from "react";
import { Card, Button } from "react-bootstrap";

export default function RecommendationCard({ image, title, author, onClick }) {
  return (
    <Card className="rec-book-card h-100 shadow-sm" style={{ minWidth: 210, maxWidth: 250, cursor: "pointer" }} onClick={onClick}>
      {image && <Card.Img variant="top" src={image} style={{ height: 140, objectFit: "cover" }} />}
      <Card.Body>
        <Card.Title style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 8 }}>{title}</Card.Title>
        <Card.Text className="text-muted" style={{ fontSize: "0.92rem" }}>
          {author}
        </Card.Text>
        <Button size="sm" variant="primary" className="mt-2 w-100 animated-btn">İncele</Button>
      </Card.Body>
    </Card>
  );
}