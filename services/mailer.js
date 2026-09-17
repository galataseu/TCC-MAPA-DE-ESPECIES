/**
 * Envio de e-mails de alerta de mudança de status de conservação.
 *
 * Configuração via variáveis de ambiente (SMTP genérico):
 *   SMTP_HOST, SMTP_PORT (padrão 587), SMTP_SECURE ("true"/"false"),
 *   SMTP_USER, SMTP_PASS, SMTP_FROM (ex: "Mapa de Espécies <contato@...>")
 * Sem configuração, o envio é apenas registrado no log (não quebra nada).
 */
const nodemailer = require('nodemailer');

// Mesmas cores do site por sigla de status (extinctionColorMap do frontend).
// RE (#B0214F): vinho-rosado entre EW (#831F34) e CR (#FF4068) — extinta na
// região, mas ainda ocorre fora dela.
const STATUS_COLORS = {
  EX: '#403E4C', EW: '#831F34', RE: '#B0214F', CR: '#FF4068', EN: '#FF6426',
  VU: '#FFA63A', NT: '#217757', LC: '#1A5FB4', DD: '#555555'
};

let transporter = null;

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  // Porta 465 (SMTPS) exige secure=true mesmo sem SMTP_SECURE explícito;
  // 587 usa STARTTLS (secure=false). Sem isso o Gmail na Vercel só dá timeout.
  const secureRaw = String(process.env.SMTP_SECURE || '').toLowerCase();
  const secure = secureRaw === 'true' || (secureRaw === '' && port === 465);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      // Senhas de app do Gmail vêm com espaços ("xxxx xxxx..."): remove.
      pass: String(process.env.SMTP_PASS || '').replace(/\s+/g, '')
    } : undefined,
    // Timeouts curtos e explícitos: na serverless (Vercel) o default pendura
    // a função até o maxDuration em vez de falhar rápido com erro útil.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: false
  });
  return transporter;
}

// Checa a conexão SMTP sem enviar nada (usado pelo endpoint de diagnóstico).
// Retorna { ok: true } ou { ok: false, error } — nunca vaza credenciais.
async function verifySmtpConnection() {
  const tx = getTransporter();
  if (!tx) return { ok: false, error: 'SMTP não configurado (faltam SMTP_HOST/SMTP_USER/SMTP_PASS nas variáveis de ambiente).' };
  try {
    await tx.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadge(nivel) {
  const sigla = String((nivel && nivel.sigla) || '').toUpperCase();
  const nome = (nivel && nivel.nome) || sigla;
  const color = STATUS_COLORS[sigla] || '#555555';
  const dark = ['#FFA63A'].includes(color);
  return `<span style="display:inline-block;background-color:${color};color:${dark ? '#111111' : '#FFFFFF'};font-weight:bold;font-size:13px;padding:6px 14px;border-radius:999px;">${esc(sigla)} — ${esc(nome)}</span>`;
}

/**
 * Monta o conteúdo do e-mail de mudança de status (função pura, testável).
 * Conteúdo propositalmente restrito: só a mudança de status da espécie.
 */
function buildStatusChangeEmail({ animalNome, oldNivel, newNivel }) {
  const safeAnimal = String(animalNome == null || animalNome === '' ? 'esta espécie' : animalNome);
  const oldSigla = String((oldNivel && oldNivel.sigla) || '??').toUpperCase();
  const oldNome = (oldNivel && oldNivel.nome) || oldSigla;
  const newSigla = String((newNivel && newNivel.sigla) || '??').toUpperCase();
  const newNome = (newNivel && newNivel.nome) || newSigla;
  const subject = `Status de conservação atualizado: ${safeAnimal} agora é ${newNome}`;
  const html = `
  <div style="margin:0;padding:0;background-color:#121118;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:28px 20px;">
      <div style="text-align:center;margin-bottom:20px;">
        <span style="color:#FFAA44;font-size:22px;font-weight:900;font-style:italic;letter-spacing:1px;">GRALHA DOS VENTOS</span>
        <div style="color:#A09FA9;font-size:12px;margin-top:4px;">Mapa de Espécies da Região Sul</div>
      </div>
      <div style="background-color:#23222B;border:1px solid #3B3A48;border-radius:16px;padding:28px 24px;text-align:center;">
        <div style="font-size:40px;margin-bottom:10px;">🔔</div>
        <h2 style="color:#FFFFFF;margin:0 0 6px;font-size:20px;">Status de conservação atualizado</h2>
        <p style="color:#D1D1D8;font-size:15px;margin:0 0 18px;">A espécie <strong style="color:#FFFFFF;">${esc(safeAnimal)}</strong> teve seu status alterado:</p>
        <div style="margin:6px 0;">${statusBadge({ sigla: oldSigla, nome: oldNome })}</div>
        <div style="color:#FFAA44;font-size:20px;font-weight:bold;margin:4px 0;">↓</div>
        <div style="margin:6px 0 4px;">${statusBadge({ sigla: newSigla, nome: newNome })}</div>
      </div>
      <p style="color:#77767F;font-size:11px;text-align:center;margin-top:16px;">Você recebeu este e-mail porque ativou o sininho de notificações para esta espécie. Desfavorite-a no site para interromper os avisos.</p>
    </div>
  </div>`;
  const text = `Status de conservação atualizado: ${safeAnimal} mudou de ${oldSigla} (${oldNome}) para ${newSigla} (${newNome}).`;
  return { subject, text, html };
}

/**
 * Monta e envia (ou registra) o e-mail de mudança de status.
 */
async function sendStatusChangeEmail(to, { animalNome, oldNivel, newNivel }) {
  const { subject, text, html } = buildStatusChangeEmail({ animalNome, oldNivel, newNivel });

  const tx = getTransporter();
  if (!tx) {
    console.log(`[mailer] SMTP não configurado — e-mail NÃO enviado para ${to}: ${subject}. Configure SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM nas variáveis de ambiente da Vercel (Settings → Environment Variables).`);
    return { sent: false, reason: 'smtp-missing' };
  }
  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
  } catch (e) {
    console.error(`[mailer] Falha ao enviar para ${to} (${animalNome}):`, e && e.message ? e.message : e);
    throw e;
  }
  console.log(`[mailer] Alerta de status enviado para ${to} (${animalNome})`);
  return { sent: true };
}

module.exports = { sendStatusChangeEmail, buildStatusChangeEmail, statusBadge, STATUS_COLORS, isSmtpConfigured, verifySmtpConnection, getTransporter };
