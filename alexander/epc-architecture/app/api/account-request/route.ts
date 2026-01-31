import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const TO_EMAIL = 'alexanderverstraete1@gmail.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { naam, email: applicantEmail, naamKantoor, reden } = body

    if (!naam || !applicantEmail || !naamKantoor || !reden) {
      return NextResponse.json(
        { error: 'Vul alle velden in: naam, e-mail, naam kantoor en reden.' },
        { status: 400 }
      )
    }

    // Afzender = altijd .env SENDER_EMAIL (bv. projectvakmail@gmail.com). Het e-mailadres uit het formulier
    // (applicantEmail) wordt alleen in de inhoud van de mail getoond, nooit als afzender gebruikt.
    const fromEmail = process.env.SENDER_EMAIL
    const senderPassword = process.env.SENDER_PASSWORD
    const smtpServer = process.env.SMTP_SERVER || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT) || 587

    if (!fromEmail || !senderPassword) {
      return NextResponse.json(
        { error: 'E-mail is niet geconfigureerd. Zet SENDER_EMAIL en SENDER_PASSWORD in .env (repo-root).' },
        { status: 500 }
      )
    }

    const transporter = nodemailer.createTransport({
      host: smtpServer,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort === 587,
      auth: {
        user: fromEmail,
        pass: senderPassword,
      },
    })

    const mailBody = `Er is een aanvraag voor een Document Hub-account ingediend.

Naam: ${String(naam).trim()}
E-mail aanvrager: ${String(applicantEmail).trim()}
Naam kantoor: ${String(naamKantoor).trim()}

Reden / waarom ze toegang willen:
${String(reden).trim()}

---
Verzonden via het aanmeldformulier op de inlogpagina.`

    await transporter.sendMail({
      from: fromEmail,
      to: TO_EMAIL,
      subject: `[Document Hub] Accountaanvraag: ${String(naamKantoor).trim()}`,
      text: mailBody,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isDev = process.env.NODE_ENV === 'development'
    console.error('Account-request email error:', err)
    const lower = message.toLowerCase()
    const isGmailAuth =
      lower.includes('535') ||
      lower.includes('username and password not accepted') ||
      lower.includes('badcredentials')
    const friendlyError = isGmailAuth
      ? 'Gmail weigert inloggen. Log in op projectvakmail@gmail.com, zet 2-stapsverificatie aan, maak een App-wachtwoord aan (https://myaccount.google.com/apppasswords) en zet dat in .env als SENDER_PASSWORD.'
      : isDev
        ? `Versturen mislukt: ${message}`
        : 'Versturen mislukt. Probeer later opnieuw.'
    return NextResponse.json({ error: friendlyError }, { status: 500 })
  }
}
