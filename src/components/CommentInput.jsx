// src/components/CommentInput.jsx
import React from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import '../mentions.css';

export default function CommentInput({ value, onChange, users, placeholder }) {
  return (
    <MentionsInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        control: { backgroundColor: 'var(--input-bg)', color: 'var(--input-fg)' },
        highlighter: { overflow: 'hidden' },
        input: { margin: 0 }
      }}
    >
      <Mention
        trigger="@"
        data={users.map(u=>({ id: u.uid, display: u.displayName }))}
        style={{ backgroundColor: '#daf4fa' }}
      />
    </MentionsInput>
  );
}
