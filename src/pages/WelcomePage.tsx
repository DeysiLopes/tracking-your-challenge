/**
 * WelcomePage — estado vazio: o tracker começa sem conteúdo e só
 * mostra dados depois do primeiro .md importado.
 */
import React from 'react';

export const WelcomePage: React.FC<{ onOpenConfig: () => void }> = ({ onOpenConfig }) => (
  <section className="view active" id="view-welcome">
    <div className="welcome-card">
      <div className="welcome-icon">📂</div>
      <h1>Bem-vindo ao seu Tracker</h1>
      <p className="page-subtitle">
        O tracker começa vazio: importe seus arquivos <code>.md</code> e ele se adapta a qualquer plano de N dias (30, 60, 90+ dias...).
      </p>
      <div className="welcome-actions">
        <button className="btn btn-primary" onClick={onOpenConfig}>📂 Importar .md</button>
      </div>
      <ul className="welcome-hints">
        <li><strong>Conteúdo programático</strong> — <code>## FASE 1 — Dias 1–30: ...</code> gera fases, semanas, tarefas e entregáveis.</li>
        <li><strong>Mão na massa</strong> — <code>## 🏦 Desafio 1 — ...</code> gera desafios gamificados (XP por nível).</li>
      </ul>
      <p className="welcome-note">
        🐱 Novo upload de desafios só é permitido quando os atuais estiverem <strong>todos concluídos</strong> — a cada desafio finalizado você ganha um badge de gatinho pixel art com o nome dele.
      </p>
    </div>
  </section>
);
