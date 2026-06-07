package com.crypto.simulator.config;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.After;
import org.aspectj.lang.annotation.AfterThrowing;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;

/**
 * Aspect for audit logging of security-sensitive operations.
 * Logs authentication events, failed login attempts, and other important events.
 */
@Aspect
@Component
@Slf4j
public class AuditLogger {

    private static final DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Before("execution(* com.crypto.simulator.auth.UserService.registerUser(..))")
    public void logUserRegistration(JoinPoint joinPoint) {
        log.info("[AUDIT] User registration attempt at {}", LocalDateTime.now().format(dateFormatter));
    }

    @After("execution(* com.crypto.simulator.auth.UserService.initiateLoginWithOtp(..))")
    public void logLoginOtpRequest(JoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        if (args.length > 0) {
            log.info("[AUDIT] Login OTP requested at {}", LocalDateTime.now().format(dateFormatter));
        }
    }

    @After("execution(* com.crypto.simulator.auth.UserService.verifyLoginOtp(..))")
    public void logSuccessfulLogin(JoinPoint joinPoint) {
        log.info("[AUDIT] User successfully logged in via OTP at {}", LocalDateTime.now().format(dateFormatter));
    }

    @AfterThrowing("execution(* com.crypto.simulator.auth.UserService.verifyLoginOtp(..))")
    public void logFailedLoginAttempt(JoinPoint joinPoint) {
        log.warn("[AUDIT] Failed login OTP verification attempt at {}", LocalDateTime.now().format(dateFormatter));
    }


    @After("execution(* com.crypto.simulator.auth.UserService.resetPassword(..))")
    public void logPasswordReset(JoinPoint joinPoint) {
        log.info("[AUDIT] Password reset completed at {}", LocalDateTime.now().format(dateFormatter));
    }

    @Before("execution(* com.crypto.simulator.auth.UserService.forgotPassword(..))")
    public void logPasswordResetRequest(JoinPoint joinPoint) {
        log.info("[AUDIT] Password reset requested at {}", LocalDateTime.now().format(dateFormatter));
    }
}
