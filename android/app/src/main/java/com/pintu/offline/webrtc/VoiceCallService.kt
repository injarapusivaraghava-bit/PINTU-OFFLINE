package com.pintu.offline.webrtc

import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for offline peer-to-peer WebRTC Audio call sessions.
 * Manages standard PCM streaming, microphone controls, and speaker handshakes.
 */
interface VoiceCallService {

    /**
     * Call states
     */
    enum class CallStatus {
        IDLE,
        RINGING,
        CONNECTED,
        ENDED,
        FAILED
    }

    /**
     * Stream tracking active call status
     */
    val callStatus: StateFlow<CallStatus>

    /**
     * Stream tracking active call duration in seconds
     */
    val callDurationSeconds: StateFlow<Int>

    /**
     * Initiate a Voice Call request over local network
     */
    fun startVoiceCall(peerIpAddress: String, targetPort: Int)

    /**
     * Accept an incoming voice call
     */
    fun acceptVoiceCall()

    /**
     * Reject or hang up call session
     */
    fun endVoiceCall()

    /**
     * Toggle microphone on/off (mute state)
     */
    fun toggleMicrophone(isEnabled: Boolean)

    /**
     * Toggle audio speaker routing
     */
    fun toggleSpeakerphone(isEnabled: Boolean)
}
