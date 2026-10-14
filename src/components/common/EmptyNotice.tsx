/**
 * EmptyNotice — estado vazio das views (equivalente ao emptyNotice()
 * do app.js legado).
 */
import React from 'react';

export const EmptyNotice: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="empty-state">
    <div className="empty-icon">📂</div>
    <h3>{title}</h3>
    <p>{children}</p>
  </div>
);
