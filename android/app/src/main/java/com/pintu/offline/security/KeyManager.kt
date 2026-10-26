package com.pintu.offline.security

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.KeyStore
import javax.crypto.KeyAgreement

/**
 * KeyManager handles generating Elliptic Curve Diffie-Hellman (ECDH) keypairs
 * inside the hardware-backed Android Keystore Provider (SDK 35).
 */
class KeyManager {

    companion object {
        private const val KEY_PROVIDER = "AndroidKeyStore"
        private const val PINTU_ALIAS = "pintu_mesh_ecdh_key"
    }

    private val keyStore: KeyStore by lazy {
        KeyStore.getInstance(KEY_PROVIDER).apply { load(null) }
    }

    /**
     * Generates a persistent keypair inside the hardware Secure Element / Keystore.
     */
    fun generateEcKeyPair(): KeyPair {
        if (!keyStore.containsAlias(PINTU_ALIAS)) {
            val kpg = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                KEY_PROVIDER
            )
            val parameterSpec = KeyGenParameterSpec.Builder(
                PINTU_ALIAS,
                KeyProperties.PURPOSE_AGREE_KEY
            ).setAlgorithmParameterSpec(java.security.spec.ECGenParameterSpec("secp256r1"))
                .build()

            kpg.initialize(parameterSpec)
            kpg.generateKeyPair()
        }

        val entry = keyStore.getEntry(PINTU_ALIAS, null) as KeyStore.PrivateKeyEntry
        val cert = keyStore.getCertificate(PINTU_ALIAS)
        return KeyPair(cert.publicKey, entry.privateKey)
    }

    /**
     * Completes ECDH Key Agreement with a discovered peer's public key
     */
    fun generateSharedSecret(peerPublicKeyBytes: ByteArray): ByteArray {
        val ecKeyPair = generateEcKeyPair()
        
        // DEVELOPMENT WARNING: Reconstruct peer public key from raw bytes in production
        val keyFactory = java.security.KeyFactory.getInstance("EC")
        val peerPubKeySpec = java.security.spec.X509EncodedKeySpec(peerPublicKeyBytes)
        val peerPubKey = keyFactory.generatePublic(peerPubKeySpec)

        val agreement = KeyAgreement.getInstance("ECDH")
        agreement.init(ecKeyPair.private)
        agreement.doPhase(peerPubKey, true)
        
        return agreement.generateSecret()
    }
}
