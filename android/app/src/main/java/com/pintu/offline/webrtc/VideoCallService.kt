package com.pintu.offline.webrtc

import android.view.SurfaceView
import kotlinx.coroutines.flow.StateFlow

/**
 * Interface definition for offline WebRTC PeerConnection direct-link video calls.
 * Binds actual Camera2 hardware drivers to rendering surface overlays.
 */
interface VideoCallService {

    /**
     * Active video session configuration parameters
     */
    data class VideoSessionState(
        val isLocalVideoEnabled: Boolean,
        val isRemoteVideoEnabled: Boolean,
        val isMuted: Boolean,
        val isSpeakerOn: Boolean,
        val activeCameraType: CameraType
    )

    enum class CameraType {
        FRONT,
        BACK
    }

    /**
     * Track active WebRTC signaling connection state
     */
    val sessionState: StateFlow<VideoSessionState>

    /**
     * Initialize camera drivers and bind to SurfaceViews
     */
    fun setupWebRtcSurfaces(localRenderer: SurfaceView, remoteRenderer: SurfaceView)

    /**
     * Invite direct peer to WebRTC Video connection
     */
    fun initiateVideoCall(peerIpAddress: String)

    /**
     * Accept call request
     */
    fun answerVideoCall()

    /**
     * Terminate stream
     */
    fun hangUpVideoCall()

    /**
     * Swap between FRONT and BACK hardware camera lenses
     */
    fun switchCamera()

    /**
     * Toggle local camera frame capture on/off
     */
    fun toggleLocalCamera(isEnabled: Boolean)
}
