package com.pintu.offline

import android.content.Context
import android.media.AudioManager
import android.util.Log
import android.view.SurfaceView
import com.pintu.offline.webrtc.VideoCallService
import com.pintu.offline.webrtc.VoiceCallService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * CallManager coordinates all native audio/video calling activities.
 * It manages hardware controls (Microphone, Camera, Audio routing, and Video streams)
 * and bridges them with [MainActivity] and Pintu WebRTC Services.
 */
class CallManager(
    private val context: Context,
    private val voiceCallService: VoiceCallService,
    private val videoCallService: VideoCallService
) {

    companion object {
        private const val TAG = "CallManager"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    // Manage general active call status
    enum class ActiveCallType {
        NONE,
        VOICE,
        VIDEO
    }

    private val _activeCallType = MutableStateFlow(ActiveCallType.NONE)
    val activeCallType: StateFlow<ActiveCallType> = _activeCallType.asStateFlow()

    // Call hardware configurations
    private val _isMicrophoneMuted = MutableStateFlow(false)
    val isMicrophoneMuted: StateFlow<Boolean> = _isMicrophoneMuted.asStateFlow()

    private val _isSpeakerphoneOn = MutableStateFlow(false)
    val isSpeakerphoneOn: StateFlow<Boolean> = _isSpeakerphoneOn.asStateFlow()

    private val _isCameraEnabled = MutableStateFlow(true)
    val isCameraEnabled: StateFlow<Boolean> = _isCameraEnabled.asStateFlow()

    private val _activeCamera = MutableStateFlow(VideoCallService.CameraType.FRONT)
    val activeCamera: StateFlow<VideoCallService.CameraType> = _activeCamera.asStateFlow()

    /**
     * Start a direct peer-to-peer voice call
     */
    fun startVoiceCall(peerIp: String, port: Int) {
        Log.i(TAG, "Initiating offline peer voice call to $peerIp:$port")
        _activeCallType.value = ActiveCallType.VOICE
        
        // Optimize hardware audio mode for voice communications
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        setSpeakerphoneEnabled(false) // Default to ear-piece

        voiceCallService.startVoiceCall(peerIp, port)
    }

    /**
     * Start a direct peer-to-peer video call
     */
    fun startVideoCall(peerIp: String, localView: SurfaceView, remoteView: SurfaceView) {
        Log.i(TAG, "Initiating offline peer video call with local/remote views to $peerIp")
        _activeCallType.value = ActiveCallType.VIDEO
        _isCameraEnabled.value = true
        _activeCamera.value = VideoCallService.CameraType.FRONT

        // Optimize audio routing for standard video speaker output
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
        setSpeakerphoneEnabled(true) // Default to loudspeaker for video calls

        // Bind physical surfaces
        videoCallService.setupWebRtcSurfaces(localView, remoteView)
        videoCallService.initiateVideoCall(peerIp)
    }

    /**
     * Accept incoming voice or video call
     */
    fun acceptCall(type: ActiveCallType) {
        Log.i(TAG, "Accepting incoming call of type: $type")
        _activeCallType.value = type
        audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

        when (type) {
            ActiveCallType.VOICE -> {
                setSpeakerphoneEnabled(false)
                voiceCallService.acceptVoiceCall()
            }
            ActiveCallType.VIDEO -> {
                setSpeakerphoneEnabled(true)
                videoCallService.answerVideoCall()
            }
            ActiveCallType.NONE -> {
                Log.w(TAG, "Accept call requested but type is NONE")
            }
        }
    }

    /**
     * Terminate active voice/video call and release hardware resources
     */
    fun endActiveCall() {
        Log.i(TAG, "Terminating active call and releasing hardware channels.")
        
        when (_activeCallType.value) {
            ActiveCallType.VOICE -> voiceCallService.endVoiceCall()
            ActiveCallType.VIDEO -> videoCallService.hangUpVideoCall()
            ActiveCallType.NONE -> {}
        }

        _activeCallType.value = ActiveCallType.NONE
        
        // Reset system audio settings to default
        audioManager.mode = AudioManager.MODE_NORMAL
        audioManager.isMicrophoneMute = false
        _isMicrophoneMuted.value = false
        setSpeakerphoneEnabled(false)
    }

    /**
     * Toggle microphone (mute / unmute audio streaming)
     */
    fun toggleMicrophone(mute: Boolean) {
        Log.d(TAG, "Setting microphone mute state: $mute")
        _isMicrophoneMuted.value = mute
        audioManager.isMicrophoneMute = mute
        voiceCallService.toggleMicrophone(!mute)
    }

    /**
     * Set speakerphone routing state (loudspeaker / earpiece)
     */
    fun setSpeakerphoneEnabled(enabled: Boolean) {
        Log.d(TAG, "Setting speakerphone status: $enabled")
        _isSpeakerphoneOn.value = enabled
        audioManager.isSpeakerphoneOn = enabled
        voiceCallService.toggleSpeakerphone(enabled)
    }

    /**
     * Toggle local camera frame capture on/off during video calls
     */
    fun toggleLocalCamera(enabled: Boolean) {
        Log.d(TAG, "Setting camera local streaming status: $enabled")
        _isCameraEnabled.value = enabled
        videoCallService.toggleLocalCamera(enabled)
    }

    /**
     * Swap between front and rear lenses
     */
    fun switchCamera() {
        Log.d(TAG, "Swapping active camera lens source")
        videoCallService.switchCamera()
        
        // Update local tracking state
        val nextLens = if (_activeCamera.value == VideoCallService.CameraType.FRONT) {
            VideoCallService.CameraType.BACK
        } else {
            VideoCallService.CameraType.FRONT
        }
        _activeCamera.value = nextLens
    }
}
