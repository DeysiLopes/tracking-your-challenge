/**
 * config.example.js — copie para `config.js` e preencha.
 *
 * `config.js` é gitignored: cada ambiente (local, produção) tem o seu.
 * O googleClientId vem do Google Cloud Console → APIs e Serviços →
 * Credenciais → OAuth 2.0 Client ID (tipo "Aplicativo da Web"), com a
 * origem do deploy em "Origens JavaScript autorizadas" (ex.:
 * http://localhost:8765 e https://seu-app.pages.dev).
 *
 * Sem esse arquivo o app funciona normalmente offline — só o botão
 * "☁️ Drive" mostra a instrução de configuração.
 */
window.TRACKER_CONFIG = {
  googleClientId: '', // ex.: '123456789-abcdef.apps.googleusercontent.com'
};
