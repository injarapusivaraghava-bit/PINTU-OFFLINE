package com.pintu.offline.security

import android.util.Base64
import java.security.Key
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

/**
 * Manages peer-to-peer AES-GCM data encryption.
 * IMPORTANT: Marked as DEVELOPMENT / TODO until full device keys verification is completed.
 */
class EncryptionManager(private val keyManager: KeyManager) {

    private val cipher: Cipher by lazy {
        Cipher.getInstance("AES/GCM/NoPadding")
    }

    /**
     * Encrypt direct message content using peer's shared secret key
     */
    fun encryptMessage(plainText: String, secretKey: Key): String {
        return try {
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            val iv = cipher.iv
            val encryptedBytes = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
            
            // Prepend IV to ciphertext for simple direct network transmission
            val payload = iv + encryptedBytes
            Base64.encodeToString(payload, Base64.DEFAULT)
        } catch (e: Exception) {
            // DEVELOPMENT WARNING: Fallback text in developer debug logs.
            throw IllegalStateException("DEVELOPMENT WARNING: Encryption failed. Check hardware crypto keys.", e)
        }
    }

    /**
     * Decrypt incoming base64-encoded Direct Link packet
     */
    fun decryptMessage(base64Payload: String, secretKey: Key): String {
        return try {
            val payload = Base64.decode(base64Payload, Base64.DEFAULT)
            
            // Extract IV (standard GCM tag length: 12 bytes)
            val iv = payload.copyOfRange(0, 12)
            val cipherText = payload.copyOfRange(12, payload.size)
            
            val spec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)
            
            val decryptedBytes = cipher.doFinal(cipherText)
            String(decryptedBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            throw IllegalStateException("DEVELOPMENT WARNING: Decryption failed. Packet might have been corrupted.", e)
        }
    }
}
