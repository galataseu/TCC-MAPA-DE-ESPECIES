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
const STATUS_COLORS = {
  EX: '#403E4C', EW: '#831F34', CR: '#FF4068', EN: '#FF6426',
  VU: '#FFA63A', NT: '#217757', LC: '#1A5FB4', DD: '#555555'
};

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      // Senhas de app do Gmail vêm com espaços ("xxxx xxxx..."): remove.
      pass: String(process.env.SMTP_PASS || '').replace(/\s+/g, '')
    } : undefined
  });
  return transporter;
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
 * Monta e envia (ou registra) o e-mail de mudança de status.
 * Conteúdo propositalmente restrito: só a mudança de status da espécie.
 */
async function sendStatusChangeEmail(to, { animalNome, oldNivel, newNivel }) {
  const subject = `Status de conservação atualizado: ${animalNome} agora é ${newNivel.nome}`;
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
        <p style="color:#D1D1D8;font-size:15px;margin:0 0 18px;">A espécie <strong style="color:#FFFFFF;">${esc(animalNome)}</strong> teve seu status alterado:</p>
        <div style="margin:6px 0;">${statusBadge(oldNivel)}</div>
        <div style="color:#FFAA44;font-size:20px;font-weight:bold;margin:4px 0;">↓</div>
        <div style="margin:6px 0 4px;">${statusBadge(newNivel)}</div>
      </div>
      <p style="color:#77767F;font-size:11px;text-align:center;margin-top:16px;">Você recebeu este e-mail porque ativou o sininho de notificações para esta espécie. Desfavorite-a no site para interromper os avisos.</p>
    </div>
  </div>`;
  const text = `Status de conservação atualizado: ${animalNome} mudou de ${oldNivel.sigla} (${oldNivel.nome}) para ${newNivel.sigla} (${newNivel.nome}).`;

  const tx = getTransporter();
  if (!tx) {
    console.log(`[mailer] SMTP não configurado — e-mail NÃO enviado para ${to}: ${subject}`);
    return { sent: false, reason: 'smtp-missing' };
  }
  await tx.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html
  });
  console.log(`[mailer] Alerta de status enviado para ${to} (${animalNome})`);
  return { sent: true };
}

module.exports = { sendStatusChangeEmail, STATUS_COLORS };
