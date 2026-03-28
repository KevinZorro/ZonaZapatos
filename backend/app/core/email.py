import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_email(*, to: str, subject: str, html_body: str) -> None:
    """Send a plain HTML email via SMTP."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.email_from
    msg["To"] = to
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.email_from, to, msg.as_string())


def send_confirmation_email(to: str, token: str) -> None:
    """Send the account-confirmation email with the verification link."""
    link = f"{settings.frontend_url}/confirmar/{token}"
    html = f"""
    <h2>¡Bienvenido a Zapatos Artesanales Cúcuta!</h2>
    <p>Haz clic en el siguiente enlace para confirmar tu cuenta:</p>
    <a href="{link}">{link}</a>
    <p>Este enlace expira en 24 horas.</p>
    """
    send_email(to=to, subject="Confirma tu cuenta — Zapatos", html_body=html)
