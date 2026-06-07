package com.crypto.simulator.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Service for sending email notifications.
 * Includes OTP emails, welcome emails, and other transactional notifications.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@antigravitytrade.com}")
    private String fromEmail;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    /**
     * Send OTP email to user.
     */
    public void sendOtpEmail(String toEmail, String otp, String purpose, int validityMinutes) {
        if (!mailEnabled) {
            logToConsole(toEmail, otp, purpose, validityMinutes);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Antigravity Trade - " + purpose + " Verification Code");

            String htmlContent = buildOtpEmailTemplate(otp, purpose, validityMinutes);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("OTP email sent successfully to: {}", toEmail);
        } catch (MessagingException e) {
            log.error("Failed to send OTP email to: {}", toEmail, e);
            throw new RuntimeException("Email sending failed", e);
        }
    }

    /**
     * Send welcome email after registration.
     */
    public void sendWelcomeEmail(String toEmail, String userEmail) {
        if (!mailEnabled) {
            System.out.println("[EMAIL] Welcome email would be sent to: " + toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Welcome to Antigravity Trade!");
            message.setText("Welcome to Antigravity Trade crypto simulator!\n\n" +
                    "Your account has been created with email: " + userEmail + "\n\n" +
                    "Start trading with your virtual balance and track your performance.\n\n" +
                    "Happy trading!");

            mailSender.send(message);
            log.info("Welcome email sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome email to: {}", toEmail, e);
        }
    }

    /**
     * Send password reset success notification.
     */
    public void sendPasswordResetConfirmation(String toEmail) {
        if (!mailEnabled) {
            System.out.println("[EMAIL] Password reset confirmation would be sent to: " + toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Antigravity Trade - Password Reset Successful");
            message.setText("Your password has been reset successfully.\n\n" +
                    "If you did not perform this action, please contact support immediately.\n\n" +
                    "Secure your account: Antigravity Trade");

            mailSender.send(message);
            log.info("Password reset confirmation sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send password reset confirmation to: {}", toEmail, e);
        }
    }

    /**
     * Send OAuth login notification.
     */
    public void sendOAuthLoginNotification(String toEmail, String provider) {
        if (!mailEnabled) {
            System.out.println("[EMAIL] OAuth login notification would be sent to: " + toEmail);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Antigravity Trade - " + provider + " Login Detected");
            message.setText("Your Antigravity Trade account has been accessed via " + provider + " login.\n\n" +
                    "Time: " + System.currentTimeMillis() + "\n\n" +
                    "If this wasn't you, please secure your account immediately.");

            mailSender.send(message);
            log.info("OAuth login notification sent to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OAuth login notification to: {}", toEmail, e);
        }
    }

    /**
     * Log OTP to console for development (when email is disabled).
     */
    private void logToConsole(String email, String otp, String purpose, int validityMinutes) {
        System.out.println("\n" + "=".repeat(70));
        System.out.println("   [EMAIL SIMULATION] " + purpose + " OTP");
        System.out.println("=".repeat(70));
        System.out.println("   TO: " + email);
        System.out.println("   FROM: " + fromEmail);
        System.out.println("   SUBJECT: Antigravity Trade - " + purpose + " Verification Code");
        System.out.println("-".repeat(70));
        System.out.println("   Your verification code is: " + otp);
        System.out.println("   Valid for: " + validityMinutes + " minutes");
        System.out.println("   Do not share this code with anyone.");
        System.out.println("=".repeat(70) + "\n");
    }

    /**
     * Build HTML template for OTP email.
     */
    private String buildOtpEmailTemplate(String otp, String purpose, int validityMinutes) {
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "    <style>" +
                "        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }" +
                "        .container { max-width: 600px; margin: 20px auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }" +
                "        .header { background-color: #1a1a2e; color: white; padding: 20px; text-align: center; border-radius: 8px; }" +
                "        .otp-box { background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }" +
                "        .otp-code { font-size: 36px; font-weight: bold; color: #16c784; letter-spacing: 2px; }" +
                "        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }" +
                "    </style>" +
                "</head>" +
                "<body>" +
                "    <div class=\"container\">" +
                "        <div class=\"header\">" +
                "            <h2>Antigravity Trade</h2>" +
                "            <p>" + purpose + " Verification</p>" +
                "        </div>" +
                "        <p>Hello,</p>" +
                "        <p>Your " + purpose.toLowerCase() + " verification code is:</p>" +
                "        <div class=\"otp-box\">" +
                "            <div class=\"otp-code\">" + otp + "</div>" +
                "        </div>" +
                "        <p><strong>Valid for: " + validityMinutes + " minutes</strong></p>" +
                "        <p style=\"color: #e74c3c;\">⚠️ Never share this code with anyone, including Antigravity Trade support.</p>" +
                "        <div class=\"footer\">" +
                "            <p>If you didn't request this code, please ignore this email.</p>" +
                "            <p>&copy; 2024 Antigravity Trade. All rights reserved.</p>" +
                "        </div>" +
                "    </div>" +
                "</body>" +
                "</html>";
    }
}
