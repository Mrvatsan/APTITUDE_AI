/**
 * Email Service Utility
 * 
 * Handles sending transactional emails (OTPs) using Nodemailer.
 * Includes Aptirise branding templates.
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// Configure SMTP transport with environment variables

const transporter = nodemailer.createTransport({
    host: process.env.APTIRISE_SMTP_HOST || 'smtp.gmail.com',
    port: process.env.APTIRISE_SMTP_PORT || 587,
    secure: false, // Use TLS
    auth: {
        user: process.env.APTIRISE_SMTP_USER || process.env.APTIRISE_SMTP_EMAIL,
        pass: process.env.APTIRISE_SMTP_PASSWORD
    }
});

/**
 * Sends a 2-step verification OTP email.
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - The 6-digit OTP code
    // Branded email template with Aptirise styling

 * @param {string} username - User's display name
 * @returns {Promise<void>}
 */
async function sendOTP(toEmail, otp, username) {
    const mailOptions = {
        from: `"Aptirise Security" <${process.env.APTIRISE_SMTP_EMAIL}>`,
        to: toEmail,
        subject: 'Your 2-Step Verification Code - Aptirise',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 12px;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
                    <h2 style="color: #0f172a; margin: 0;">🧠 Aptirise</h2>
                    <p style="color: #64748b; margin: 5px 0 0;">Master Aptitude with AI</p>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <h3 style="color: #0f172a; margin-top: 0;">Hello ${username},</h3>
                    <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                        To complete your login, please enter the following verification code. This ensures your account remains secure.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; background: #e0e7ff; padding: 15px 30px; border-radius: 8px; display: inline-block;">
                            ${otp}
                        </span>
                    </div>
                    
                    <p style="text-align: center; color: #ef4444; font-weight: 600; font-size: 14px;">
                        ⚠️ Valid for 5 minutes only
                    </p>
                    
                    <p style="color: #94a3b8; font-size: 14px; margin-top: 30px; text-align: center;">
                        If you didn't request this code, please ignore this email.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
                    &copy; ${new Date().getFullYear()} Aptirise. All rights reserved.
                </div>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] OTP sent to ${toEmail}: ${info.messageId}`);
    } catch (error) {
        console.error('[Email] Failed to send OTP:', error);
        throw new Error('Failed to send verification email');
    }
}

module.exports = { sendOTP };
