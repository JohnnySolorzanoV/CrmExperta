import dotenv from 'dotenv'
import nodemailer from 'nodemailer'

dotenv.config()

const {
  SMTP_HOST = 'smtp.gmail.com',
  SMTP_PORT = '465',
  SMTP_SECURE = 'true',
  SMTP_USER,
  SMTP_PASS,
  SMTP_SENDER_EMAIL,
} = process.env

const SMTP_HABILITADO = !!(SMTP_USER && SMTP_PASS)
const SMTP_REMITENTE = SMTP_SENDER_EMAIL || SMTP_USER

function plantillaHtml(titulo, lineas) {
  return `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f7f8fa;padding:32px 0">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e6ed;border-radius:8px;overflow:hidden">
  <div style="background:#212529;padding:18px 24px;border-bottom:2px solid #dab656">
    <span style="color:#dab656;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase">CRM Experta &amp; Abogados</span>
  </div>
  <div style="padding:24px">
    <h2 style="color:#212529;margin:0 0 16px;font-size:18px">${titulo}</h2>
    ${lineas.filter(Boolean).map(l => `<p style="color:#444;margin:0 0 10px;line-height:1.65">${l}</p>`).join('')}
    <p style="margin-top:24px;font-size:11px;color:#aaa">Este es un mensaje automático de CRM Experta. Por favor no responda a este correo.</p>
  </div>
</div>
</body>
</html>`
}

let smtpTransporter = null

function getSmtpTransporter() {
  if (!SMTP_HABILITADO) return null
  if (smtpTransporter) return smtpTransporter

  smtpTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  return smtpTransporter
}

/**
 * Sends an HTML email via SMTP (Gmail App Password friendly).
 * @param {object} opts
 * @param {string} opts.para - recipient email address
 * @param {string} opts.asunto - subject line (plain text)
 * @param {string} opts.titulo - heading rendered inside the email body
 * @param {string[]} opts.lineas - body paragraphs (may contain HTML tags)
 */
export async function enviarEmail({ para, asunto, titulo, lineas }) {
  if (!SMTP_HABILITADO) {
    console.log('[Email SMTP] Envio omitido (SMTP_USER/SMTP_PASS no configurados):', asunto, '->', para)
    return null
  }

  try {
    const transporter = getSmtpTransporter()
    const info = await transporter.sendMail({
      from: `CRM Experta <${SMTP_REMITENTE}>`,
      to: para,
      subject: asunto,
      html: plantillaHtml(titulo, lineas),
    })
    console.log('[Email SMTP] Email enviado id=' + info.messageId + ' a ' + para)
    return info.messageId
  } catch (e) {
    console.error('[Email SMTP] Error enviando email a', para + ':', e.message)
    return null
  }
}
