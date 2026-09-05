import smtplib
import ssl
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from backend.core.config import settings

logger = logging.getLogger("backend.services.email")


def render_password_reset_html(username: str, reset_link: str) -> str:
    """Renders a clean, responsive HTML email template for password reset."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your DraftSetu Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f1f5f9; padding: 32px 16px;">
        <tr>
            <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); padding: 32px 32px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                                📜 DraftSetu
                            </h1>
                            <p style="margin: 6px 0 0 0; color: #bfdbfe; font-size: 13px;">
                                Legal Document Automation Platform
                            </p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 600;">
                                Password Reset Request
                            </h2>
                            <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                                Hello <strong>{username}</strong>,
                            </p>
                            <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                                We received a request to reset the password for your DraftSetu account. Click the button below to set a new password:
                            </p>

                            <!-- CTA Button -->
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{reset_link}" target="_blank" style="display: inline-block; background-color: #1e3a8a; color: #ffffff; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);">
                                            Reset My Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin: 24px 0;">
                                <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
                                    ⏳ <strong>Time sensitive:</strong> This password reset link is single-use and will expire in <strong>15 minutes</strong>.
                                </p>
                            </div>

                            <p style="margin: 24px 0 8px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                                If the button above does not work, copy and paste this link into your web browser:
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 1.4; word-break: break-all;">
                                <a href="{reset_link}" target="_blank" style="color: #2563eb; text-decoration: underline;">
                                    {reset_link}
                                </a>
                            </p>

                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;">

                            <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                🔒 If you did not request this password reset, please disregard this email. Your password will remain unchanged and your account is completely safe.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                                &copy; {settings.PROJECT_NAME}. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def render_password_reset_plain(username: str, reset_link: str) -> str:
    """Renders a clean plain-text email for password reset."""
    return f"""Hello {username},

We received a request to reset the password for your DraftSetu account.

To choose a new password, please visit the following link:
{reset_link}

This link is single-use and expires in 15 minutes.

If you did not request this password reset, please ignore this email. Your password will remain unchanged.

Best regards,
{settings.SMTP_FROM_NAME}
"""


def send_password_reset_email(to_email: str, username: str, reset_link: str) -> bool:
    """
    Sends a password reset email using Zoho SMTP SSL (port 465) or standard STARTTLS.
    Returns True if successfully sent, False otherwise.
    Safe: Never logs credentials or crashes the calling routine on failure.
    """
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.info("ℹ️ SMTP credentials not configured in environment; skipping email transmission.")
        return False

    if not to_email or "@" not in to_email:
        logger.warning(f"⚠️ Cannot send password reset email: invalid email recipient '{to_email}'")
        return False

    sender_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME
    from_header = formataddr((settings.SMTP_FROM_NAME, sender_email))

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Reset Your {settings.SMTP_FROM_NAME} Password"
    msg["From"] = from_header
    msg["To"] = to_email

    # Plain-text and HTML versions
    part_plain = MIMEText(render_password_reset_plain(username, reset_link), "plain", "utf-8")
    part_html = MIMEText(render_password_reset_html(username, reset_link), "html", "utf-8")

    msg.attach(part_plain)
    msg.attach(part_html)

    host = settings.SMTP_HOST.strip()
    port = settings.SMTP_PORT

    try:
        if settings.SMTP_SSL or port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)

        logger.info(f"📧 Password reset email successfully dispatched to {to_email} via {host}:{port}")
        return True

    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(f"❌ SMTP authentication failed for user '{settings.SMTP_USERNAME}' on host '{host}': {auth_err}")
        return False
    except (smtplib.SMTPException, OSError) as smtp_err:
        logger.error(f"❌ Failed to dispatch email to '{to_email}' via {host}:{port}: {smtp_err}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error sending password reset email: {e}")
        return False
